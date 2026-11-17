import { createHmac, timingSafeEqual } from "crypto";

/**
 * Tiny Stripe helper that talks to Stripe's REST API directly, so the project
 * needs no extra npm package. Server-side only (uses STRIPE_SECRET_KEY).
 */

type Param = string | number | boolean | null | undefined | Param[] | { [k: string]: Param };

function encode(params: Param, prefix = "", out: string[] = []): string[] {
  if (params === null || params === undefined) return out;
  if (Array.isArray(params)) {
    params.forEach((v, i) => encode(v, `${prefix}[${i}]`, out));
  } else if (typeof params === "object") {
    for (const [k, v] of Object.entries(params)) encode(v, prefix ? `${prefix}[${k}]` : k, out);
  } else {
    out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(params))}`);
  }
  return out;
}

export async function stripeRequest<T = Record<string, unknown>>(
  method: "GET" | "POST",
  path: string,
  params: Record<string, Param> = {},
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  const body = encode(params).join("&");
  const res = await fetch(`https://api.stripe.com/v1${path}${method === "GET" && body ? `?${body}` : ""}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "POST" ? body : undefined,
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message || `Stripe error ${res.status}`);
  return json;
}

/** Verifies the Stripe-Signature header on a webhook (5 minute tolerance). */
export function verifyStripeSignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), p.slice(i + 1)];
    }),
  );
  const t = parts["t"];
  const sig = parts["v1"];
  if (!t || !sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type PlanKey = "solo" | "pro" | "studio";
export type IntervalKey = "month" | "year";

export function priceIdFor(plan: PlanKey, interval: IntervalKey): string | undefined {
  return process.env[`STRIPE_PRICE_${plan.toUpperCase()}_${interval === "year" ? "YEARLY" : "MONTHLY"}`];
}

export function planFromPriceId(priceId: string): { plan: PlanKey; interval: IntervalKey } | null {
  for (const plan of ["solo", "pro", "studio"] as PlanKey[]) {
    for (const interval of ["month", "year"] as IntervalKey[]) {
      if (priceIdFor(plan, interval) === priceId) return { plan, interval };
    }
  }
  return null;
}
