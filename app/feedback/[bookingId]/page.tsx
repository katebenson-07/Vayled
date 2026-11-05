"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";

interface FeedbackInfo {
  bride_name: string;
  studio_name: string;
  submitted: boolean;
}

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          className={`text-3xl ${n <= value ? "text-gold" : "text-charcoal/20"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [info, setInfo] = useState<FeedbackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [overall, setOverall] = useState(0);
  const [hair, setHair] = useState(0);
  const [makeup, setMakeup] = useState(0);
  const [loved, setLoved] = useState("");
  const [change, setChange] = useState("");
  const [finalLook, setFinalLook] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error: rpcError } = await supabase.rpc("get_preview_feedback", { p_booking_id: bookingId });
      if (rpcError || !data) setMissing(true);
      else setInfo(data as FeedbackInfo);
      setLoading(false);
    })();
  }, [bookingId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("submit_preview_feedback", {
      p_booking_id: bookingId,
      p_overall: overall,
      p_hair: hair,
      p_makeup: makeup,
      p_loved: loved,
      p_change: change,
      p_final_look: finalLook,
    });
    setSubmitting(false);
    const result = data as { ok: boolean; error?: string } | null;
    if (rpcError || !result?.ok) {
      setError(result?.error ?? "Something went wrong. Please try again.");
      return;
    }
    setDone(true);
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-ivory flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <Logo size="md" className="justify-center mb-6" />
        {children}
      </div>
    </div>
  );

  if (loading) return shell(<p className="text-center text-charcoal/60">Loading...</p>);
  if (missing || !info) return shell(<p className="text-center text-charcoal/60">This link isn&apos;t working. Please reach out to your stylist.</p>);
  if (done || info.submitted)
    return shell(
      <div className="bg-white border border-charcoal/10 rounded-xl p-8 text-center">
        <h1 className="font-serif text-2xl mb-2">Thank you{done ? "" : " again"}!</h1>
        <p className="text-charcoal/70">
          {info.studio_name} received your feedback and will use it to make your wedding day look perfect.
        </p>
      </div>
    );

  return shell(
    <form onSubmit={submit} className="bg-white border border-charcoal/10 rounded-xl p-6 space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl mb-1">How was your preview?</h1>
        <p className="text-sm text-charcoal/60">
          Hi {info.bride_name.split(" ")[0]}! Tell {info.studio_name} how it went so your wedding day look is exactly right.
        </p>
      </div>

      {[
        { label: "Overall look", value: overall, set: setOverall },
        { label: "Hair", value: hair, set: setHair },
        { label: "Makeup", value: makeup, set: setMakeup },
      ].map((r) => (
        <div key={r.label}>
          <p className="text-sm text-charcoal/70 mb-1">{r.label}</p>
          <Stars value={r.value} onChange={r.set} />
        </div>
      ))}

      <div>
        <label className="block text-sm text-charcoal/70 mb-1">What did you love?</label>
        <textarea
          rows={3}
          maxLength={2000}
          className="w-full border border-charcoal/20 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-charcoal/30"
          value={loved}
          onChange={(e) => setLoved(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm text-charcoal/70 mb-1">Anything you&apos;d like changed for the wedding day?</label>
        <textarea
          rows={3}
          maxLength={2000}
          className="w-full border border-charcoal/20 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-charcoal/30"
          value={change}
          onChange={(e) => setChange(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm text-charcoal/70 mb-1">Your final look choices</label>
        <p className="text-xs text-charcoal/50 mb-1">
          The hair style and makeup look you want on your wedding day, plus anything you&apos;d like to add (veil,
          accessories, lashes...).
        </p>
        <textarea
          rows={3}
          maxLength={2000}
          className="w-full border border-charcoal/20 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-charcoal/30"
          value={finalLook}
          onChange={(e) => setFinalLook(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting || (!overall && !hair && !makeup && !loved && !change && !finalLook)}
        className="w-full bg-charcoal text-ivory rounded-md py-3 disabled:opacity-40 hover:bg-charcoal/90"
      >
        {submitting ? "Sending..." : "Send feedback"}
      </button>
    </form>
  );
}
