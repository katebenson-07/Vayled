import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripeRequest, priceIdFor, PlanKey, IntervalKey } from "@/lib/stripeServer";

/**
 * Starts a Stripe Checkout for the signed-in studio's subscription. Applies a
 * Vayled discount code (if given and valid) by creating a matching Stripe
 * coupon, and starts the free trial set in STRIPE_TRIAL_DAYS (default 14).
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 501 });
  }

  let body: { plan?: PlanKey; interval?: IntervalKey; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const plan = body.plan;
  const interval = body.interval;
  if (!plan || !["solo", "pro", "studio"].includes(plan) || !interval || !["month", "year"].includes(interval)) {
    return NextResponse.json({ error: "Pick a plan." }, { status: 400 });
  }
  const price = priceIdFor(plan, interval);
  if (!price) return NextResponse.json({ error: "That plan isn't available yet." }, { status: 501 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, serviceKey);
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData.user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const user = userData.user;

  try {
    // Reuse the studio's Stripe customer if it has one.
    const { data: existing } = await admin
      .from("studio_subscriptions")
      .select("stripe_customer_id")
      .eq("studio_id", user.id)
      .maybeSingle();
    let customerId = existing?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripeRequest<{ id: string }>("POST", "/customers", {
        email: user.email,
        metadata: { studio_id: user.id },
      });
      customerId = customer.id;
      await admin.from("studio_subscriptions").upsert({ studio_id: user.id, stripe_customer_id: customerId });
    }

    // Discount code -> one-off Stripe coupon.
    let discounts: { coupon: string }[] | undefined;
    if (body.code?.trim()) {
      const { data: check } = await admin.rpc("check_discount_code", { p_code: body.code.trim() });
      const c = check as { valid?: boolean; kind?: string; value?: number; code?: string } | null;
      if (c?.valid) {
        const coupon =
          c.kind === "percent"
            ? await stripeRequest<{ id: string }>("POST", "/coupons", {
                percent_off: c.value,
                duration: "once",
                name: c.code,
              })
            : await stripeRequest<{ id: string }>("POST", "/coupons", {
                percent_off: 100,
                duration: "repeating",
                duration_in_months: c.value,
                name: c.code,
              });
        discounts = [{ coupon: coupon.id }];
      }
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vayled.com";
    const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? 14);
    const session = await stripeRequest<{ url: string }>("POST", "/checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      ...(discounts ? { discounts } : {}),
      subscription_data: {
        metadata: { studio_id: user.id },
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
      },
      success_url: `${site}/inquiry-settings?tab=billing&checkout=success`,
      cancel_url: `${site}/inquiry-settings?tab=billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't start checkout." }, { status: 500 });
  }
}
