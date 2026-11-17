"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Sub = {
  plan: string | null;
  billing_interval: string | null;
  status: string | null;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

const PLANS = [
  { key: "solo", name: "Solo", monthly: 29, blurb: "1 stylist" },
  { key: "pro", name: "Pro", monthly: 49, blurb: "Up to 10 stylists" },
  { key: "studio", name: "Studio", monthly: 99, blurb: "Unlimited stylists + elite features" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Payment past due",
  canceled: "Canceled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
};

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "";
}

/** Settings > Billing (website only): subscribe, see status, manage in Stripe. */
export default function BillingPanel() {
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearly, setYearly] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("vayled_code");
      if (saved) setCode(saved);
    } catch {}
    supabase
      .from("studio_subscriptions")
      .select("plan, billing_interval, status, trial_end, current_period_end, cancel_at_period_end")
      .maybeSingle()
      .then(({ data }) => {
        setSub((data as Sub) ?? null);
        setLoading(false);
      });
  }, []);

  async function call(path: string, body: object, label: string) {
    setBusy(label);
    setError(null);
    const { data } = await supabase.auth.getSession();
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify(body),
    });
    const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (res.ok && j.url) {
      window.location.href = j.url;
      return;
    }
    setError(j.error ?? "Something went wrong.");
    setBusy(null);
  }

  if (loading) return <p className="text-charcoal/50 text-sm">Loading...</p>;

  const hasPlan = sub?.status && sub.status !== "canceled" && sub.plan;

  return (
    <div className="text-sm space-y-6">
      <h2 className="font-serif text-lg">Plan &amp; billing</h2>

      {hasPlan ? (
        <div className="border border-charcoal/10 p-5 space-y-2">
          <p className="text-charcoal">
            <span className="capitalize font-medium">{sub!.plan}</span> plan ·{" "}
            {sub!.billing_interval === "year" ? "billed yearly" : "billed monthly"}
          </p>
          <p className="text-charcoal/70">
            {STATUS_LABEL[sub!.status ?? ""] ?? sub!.status}
            {sub!.status === "trialing" && sub!.trial_end ? ` until ${fmt(sub!.trial_end)}` : ""}
            {sub!.status !== "trialing" && sub!.current_period_end
              ? sub!.cancel_at_period_end
                ? ` · ends ${fmt(sub!.current_period_end)}`
                : ` · renews ${fmt(sub!.current_period_end)}`
              : ""}
          </p>
          <button
            onClick={() => call("/api/stripe/portal", {}, "portal")}
            disabled={busy !== null}
            className="mt-2 bg-charcoal text-ivory text-xs uppercase tracking-widest-lg px-6 py-3 disabled:opacity-50"
          >
            {busy === "portal" ? "Opening..." : "Manage billing"}
          </button>
          <p className="text-charcoal/50 text-xs">Change plan, update your card, see invoices, or cancel.</p>
        </div>
      ) : (
        <>
          <p className="text-charcoal/60">
            Choose a plan. Your free trial starts now and your card isn&apos;t charged until it ends. We never take a
            cut of your payments.
          </p>
          <div className="inline-flex border border-charcoal/20 text-[11px] uppercase tracking-[0.2em]">
            <button
              onClick={() => setYearly(false)}
              className={`px-5 py-2.5 ${!yearly ? "bg-charcoal text-ivory" : "text-charcoal"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-5 py-2.5 ${yearly ? "bg-charcoal text-ivory" : "text-charcoal"}`}
            >
              Yearly · 2 months free
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {PLANS.map((p) => (
              <div key={p.key} className="border border-charcoal/10 p-5 flex flex-col">
                <p className="font-serif text-base">{p.name}</p>
                <p className="text-charcoal/50 text-xs mb-3">{p.blurb}</p>
                <p className="mb-4">
                  <span className="font-serif text-2xl">${yearly ? p.monthly * 10 : p.monthly}</span>
                  <span className="text-charcoal/50"> /{yearly ? "yr" : "mo"}</span>
                </p>
                <button
                  onClick={() =>
                    call(
                      "/api/stripe/checkout",
                      { plan: p.key, interval: yearly ? "year" : "month", code: code.trim() || undefined },
                      p.key,
                    )
                  }
                  disabled={busy !== null}
                  className="mt-auto bg-charcoal text-ivory text-xs uppercase tracking-widest-lg px-4 py-3 disabled:opacity-50"
                >
                  {busy === p.key ? "Opening..." : "Start free trial"}
                </button>
              </div>
            ))}
          </div>
          <label className="block max-w-xs text-xs uppercase tracking-widest-lg text-charcoal/50">
            Discount code (optional)
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="mt-2 w-full border border-charcoal/20 px-4 py-3 text-sm tracking-widest text-charcoal normal-case"
            />
          </label>
        </>
      )}
      {error && <p className="text-red-700">{error}</p>}
    </div>
  );
}
