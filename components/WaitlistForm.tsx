"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function WaitlistForm({
  source,
  dark = true,
}: {
  source: string;
  dark?: boolean;
}) {
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
    const { error: insertError } = await supabase
      .from("waitlist_signups")
      .insert({ email: email.trim(), source });
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
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md">
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
