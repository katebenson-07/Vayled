import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyStripeSignature, planFromPriceId } from "@/lib/stripeServer";

export const runtime = "nodejs";

type StripeSub = {
  id: string;
  customer: string;
  status: string;
  trial_end: number | null;
  current_period_end?: number;
  cancel_at_period_end: boolean;
  metadata?: { studio_id?: string };
  items?: { data: { price: { id: string }; current_period_end?: number }[] };
};

const iso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);

/** Stripe calls this whenever a subscription starts, changes, or ends. */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !serviceKey) return NextResponse.json({ error: "Not configured." }, { status: 501 });

  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }

  const event = JSON.parse(payload) as { type: string; data: { object: StripeSub } };
  if (!event.type.startsWith("customer.subscription.")) {
    return NextResponse.json({ received: true });
  }

  const sub = event.data.object;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, serviceKey);

  // Find the studio: metadata first, otherwise by Stripe customer id.
  let studioId = sub.metadata?.studio_id;
  if (!studioId) {
    const { data } = await admin
      .from("studio_subscriptions")
      .select("studio_id")
      .eq("stripe_customer_id", sub.customer)
      .maybeSingle();
    studioId = data?.studio_id;
  }
  if (!studioId) return NextResponse.json({ received: true });

  const item = sub.items?.data?.[0];
  const planInfo = item ? planFromPriceId(item.price.id) : null;
  const ended = event.type === "customer.subscription.deleted";

  await admin.from("studio_subscriptions").upsert({
    studio_id: studioId,
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
    plan: planInfo?.plan ?? null,
    billing_interval: planInfo?.interval ?? null,
    status: ended ? "canceled" : sub.status,
    trial_end: iso(sub.trial_end),
    current_period_end: iso(item?.current_period_end ?? sub.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ received: true });
}
