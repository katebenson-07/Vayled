import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripeRequest } from "@/lib/stripeServer";

/** Opens Stripe's hosted billing page (change plan, update card, cancel, invoices). */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 501 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, serviceKey);
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData.user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const { data: sub } = await admin
    .from("studio_subscriptions")
    .select("stripe_customer_id")
    .eq("studio_id", userData.user.id)
    .maybeSingle();
  if (!sub?.stripe_customer_id) return NextResponse.json({ error: "No subscription yet." }, { status: 404 });

  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vayled.com";
    const session = await stripeRequest<{ url: string }>("POST", "/billing_portal/sessions", {
      customer: sub.stripe_customer_id,
      return_url: `${site}/inquiry-settings?tab=billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't open billing." }, { status: 500 });
  }
}
