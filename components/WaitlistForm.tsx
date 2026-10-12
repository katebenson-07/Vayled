"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const TIERS = ["Solo", "Pro", "Studio"] as const;
type Tier = (typeof TIERS)[number];

export default function WaitlistForm({
  source,
  dark = true,
  showTier = false,
}: {
  source: string;
  dark?: boolean;
  /** Show the optional "which plan are you interested in?" bubbles. */
  showTier?: boolean;
}) {
  const [tier, setTier] = useState<Tier | null>(null);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot — real visitors never see or fill this
  const [loadedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic bot filters: a filled honeypot field, or a submit faster than any
    // real person can type an email, both silently "succeed" without writing
    // anything to the database.
    if (company.trim() !== "" || Date.now() - loadedAt < 1500) {
      setDone(true);
      return;
    }

    setSubmitting(true);
    let { error: insertError } = await supabase
      .from("waitlist_signups")
      .insert({ email: email.trim(), source, ...(tier ? { interested_tier: tier } : {}) });
    // If the interested_tier column hasn't been added to the database yet,
    // don't lose the signup — retry with just the email.
    if (insertError && tier) {
      ({ error: insertError } = await supabase
        .from("waitlist_signups")
        .insert({ email: email.trim(), source }));
    }
    setSubmitting(false);

    if (insertError) {
      setError("Something went wrong — mind trying again?");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p className={`text-sm ${dark ? "text-beige/80" : "text-charcoal/70"}`}>
        You&apos;re on the list — we&apos;ll email you as soon as it’s your turn.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-3 max-w-md ${showTier ? "" : "sm:flex-row"}`}
    >
      {showTier && (
        <div className="mb-1">
          <p className={`text-xs mb-2 ${dark ? "text-beige/70" : "text-charcoal/60"}`}>
            Which plan are you most interested in?
          </p>
          <div className="flex gap-2" role="radiogroup" aria-label="Plan interest">
            {TIERS.map((t) => {
              const selected = tier === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTier(selected ? null : t)}
                  className={`flex-1 rounded-full px-4 py-2 text-xs uppercase tracking-widest-lg border transition-colors ${
                    selected
                      ? dark
                        ? "bg-ivory text-charcoal border-ivory"
                        : "bg-charcoal text-ivory border-charcoal"
                      : dark
                      ? "border-ivory/30 text-ivory hover:bg-ivory/10"
                      : "border-charcoal/25 text-charcoal hover:bg-charcoal/5"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="hidden" aria-hidden="true">
        <label>
          Company
          <input
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </label>
      </div>
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={`flex-1 rounded-full px-5 py-3 text-sm ${
          dark
            ? "bg-ivory/10 border border-ivory/20 text-ivory placeholder:text-beige/40 focus:bg-ivory/15"
            : "bg-white border border-charcoal/20 text-charcoal placeholder:text-charcoal/40 focus:border-charcoal/30"
        } outline-none`}
      />
      <button
        type="submit"
        disabled={submitting}
        className={`text-xs uppercase tracking-widest-lg rounded-full px-6 py-3 transition-colors disabled:opacity-50 ${
          dark ? "bg-ivory text-charcoal hover:bg-beige" : "bg-charcoal text-ivory hover:bg-charcoal/90"
        }`}
      >
        {submitting ? "Joining..." : "Join waitlist"}
      </button>
      {error && <p className="text-sm text-red-400 sm:ml-2 self-center">{error}</p>}
    </form>
  );
}
