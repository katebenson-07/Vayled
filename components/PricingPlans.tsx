"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface Plan {
  name: string;
  price: number;
  blurb: string;
  stylists: string;
  tag?: string;
  elevated?: boolean;
  elite?: boolean;
}

interface AppliedCode {
  code: string;
  kind: "percent" | "free_months";
  value: number;
}

const STORAGE_KEY = "vayled_code";
/** Yearly = pay for 10 months, get 12. */
const YEARLY_MONTHS_CHARGED = 10;

function money(n: number) {
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

export default function PricingPlans({
  plans,
  coreFeatures,
  eliteFeatures,
}: {
  plans: Plan[];
  coreFeatures: string[];
  eliteFeatures: string[];
}) {
  const [yearly, setYearly] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<AppliedCode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function apply(code: string) {
    setChecking(true);
    setMessage(null);
    const { data, error } = await supabase.rpc("check_discount_code", { p_code: code });
    setChecking(false);
    if (error || !data) {
      setApplied(null);
      setMessage("We couldn't check that code. Please try again.");
      return;
    }
    const result = data as { valid: boolean; message?: string; code?: string; kind?: AppliedCode["kind"]; value?: number };
    if (!result.valid || !result.code || !result.kind || result.value == null) {
      setApplied(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setMessage(result.message || "That code isn't valid.");
      return;
    }
    const next = { code: result.code, kind: result.kind, value: Number(result.value) };
    setApplied(next);
    setCodeInput(next.code);
    try {
      localStorage.setItem(STORAGE_KEY, next.code);
    } catch {}
  }

  // Pick up a code the visitor already applied on an earlier visit.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) apply(saved);
    } catch {}
  }, []);

  function priceFor(monthly: number) {
    const base = yearly ? monthly * YEARLY_MONTHS_CHARGED : monthly;
    if (applied?.kind === "percent") return Math.round(base * (1 - applied.value / 100) * 100) / 100;
    return base;
  }

  const codeSummary = applied
    ? applied.kind === "percent"
      ? `${applied.value}% off is applied to the prices below.`
      : `${applied.value} ${applied.value === 1 ? "month" : "months"} free when you join. It's saved with your waitlist signup.`
    : null;

  return (
    <>
      <div className="flex justify-center mb-10">
        <div className="inline-flex border border-charcoal/20 text-[11px] uppercase tracking-[0.2em]" role="group" aria-label="Billing period">
          <button
            type="button"
            onClick={() => setYearly(false)}
            aria-pressed={!yearly}
            className={`px-6 py-3 transition-colors ${!yearly ? "bg-charcoal text-ivory" : "text-charcoal hover:bg-charcoal/5"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            aria-pressed={yearly}
            className={`px-6 py-3 transition-colors ${yearly ? "bg-charcoal text-ivory" : "text-charcoal hover:bg-charcoal/5"}`}
          >
            Yearly · 2 months free
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
        {plans.map((plan) => {
          const full = yearly ? plan.price * YEARLY_MONTHS_CHARGED : plan.price;
          const now = priceFor(plan.price);
          const discounted = now !== full;
          return (
            <div
              key={plan.name}
              className={`rounded-xl p-6 border flex flex-col ${
                plan.elevated
                  ? "border-charcoal bg-charcoal text-ivory shadow-md md:-my-3 md:py-9"
                  : plan.tag
                    ? "border-charcoal bg-ivory shadow-sm"
                    : "border-charcoal/10 bg-ivory/50"
              }`}
            >
              {plan.tag && <p className="text-xs uppercase tracking-widest-lg mb-2 text-gold">{plan.tag}</p>}
              <p className={`font-serif text-lg mb-1 ${plan.elevated ? "text-ivory" : "text-charcoal"}`}>{plan.name}</p>
              <p className={`text-sm mb-4 ${plan.elevated ? "text-beige/70" : "text-charcoal/50"}`}>{plan.blurb}</p>
              <p className="mb-1">
                {discounted && (
                  <span className={`text-lg line-through mr-2 ${plan.elevated ? "text-beige/50" : "text-charcoal/40"}`}>
                    {money(full)}
                  </span>
                )}
                <span className={`font-serif text-3xl ${plan.elevated ? "text-ivory" : "text-charcoal"}`}>{money(now)}</span>
                <span className={`text-sm ${plan.elevated ? "text-beige/60" : "text-charcoal/50"}`}>
                  {yearly ? " /yr" : " /mo"}
                </span>
              </p>
              <p className={`text-xs mb-5 h-4 ${plan.elevated ? "text-beige/60" : "text-charcoal/50"}`}>
                {yearly ? `Save ${money(plan.price * (12 - YEARLY_MONTHS_CHARGED))} vs monthly` : ""}
              </p>
              <p
                className={`text-sm font-medium mb-4 pb-4 border-b ${
                  plan.elevated ? "text-ivory border-ivory/20" : "text-charcoal border-charcoal/10"
                }`}
              >
                {plan.stylists}
              </p>
              <p className={`text-xs uppercase tracking-widest-lg mb-3 ${plan.elevated ? "text-beige/60" : "text-charcoal/40"}`}>
                Core features
              </p>
              <ul
                className={`text-left space-y-2.5 text-sm ${plan.elite ? "" : "flex-1"} ${
                  plan.elevated ? "text-beige/80" : "text-charcoal/70"
                }`}
              >
                {coreFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-gold mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              {plan.elite && (
                <>
                  <p className="text-xs uppercase tracking-widest-lg mb-3 mt-5 pt-5 border-t border-ivory/20 text-gold">
                    Elite additions
                  </p>
                  <ul className="text-left space-y-2.5 text-sm text-beige/80 flex-1">
                    {eliteFeatures.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-gold mt-0.5">✧</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>

      <form
        className="max-w-md mx-auto mt-12 text-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (codeInput.trim()) apply(codeInput.trim());
        }}
      >
        <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-3">Have a discount code?</p>
        <div className="flex gap-2">
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            className="flex-1 border border-charcoal/20 bg-white px-4 py-3 text-sm tracking-widest outline-none focus:border-charcoal/40"
          />
          <button
            type="submit"
            disabled={checking || !codeInput.trim()}
            className="bg-charcoal text-ivory text-xs uppercase tracking-widest-lg px-6 py-3 disabled:opacity-50"
          >
            {checking ? "Checking..." : "Apply"}
          </button>
        </div>
        {codeSummary && <p className="text-sm text-charcoal/70 mt-3">{codeSummary}</p>}
        {message && <p className="text-sm text-red-700 mt-3">{message}</p>}
      </form>
    </>
  );
}
