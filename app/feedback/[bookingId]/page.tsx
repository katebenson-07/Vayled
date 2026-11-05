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

function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1">
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8L12 2.5z" strokeLinejoin="round" />
    </svg>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5 text-wine">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110 focus:outline-none"
        >
          <Star filled={n <= value} />
        </button>
      ))}
    </div>
  );
}

const FIELD =
  "w-full bg-transparent border-0 border-b border-charcoal/20 px-0 py-2 text-[15px] leading-relaxed placeholder:text-charcoal/30 focus:outline-none focus:border-wine resize-none";
const LABEL = "block text-[11px] uppercase tracking-[0.25em] text-charcoal/55 mb-2";

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
    <div className="min-h-screen bg-ivory flex items-start justify-center px-6 py-14 sm:py-20">
      <div className="w-full max-w-md">
        <div className="text-center text-wine mb-10">
          <Logo size="md" tagline className="justify-center" />
        </div>
        {children}
        <p className="text-center text-[10px] uppercase tracking-[0.3em] text-charcoal/35 mt-12">Powered by Vayled</p>
      </div>
    </div>
  );

  if (loading) return shell(<p className="text-center text-charcoal/60">Loading...</p>);
  if (missing || !info) return shell(<p className="text-center text-charcoal/60">This link isn&apos;t working. Please reach out to your stylist.</p>);
  if (done || info.submitted)
    return shell(
      <div className="text-center py-6">
        <div className="w-12 h-px bg-wine/40 mx-auto mb-8" />
        <h1 className="font-script text-4xl leading-tight mb-4">Thank you{done ? "" : " again"}</h1>
        <p className="text-charcoal/65 leading-relaxed">
          {info.studio_name} has your feedback and will use it to make your wedding day look exactly as you imagine.
        </p>
        <div className="w-12 h-px bg-wine/40 mx-auto mt-8" />
      </div>
    );

  return shell(
    <form onSubmit={submit} className="space-y-10">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-charcoal/55 mb-3">{info.studio_name}</p>
        <h1 className="font-script text-4xl leading-tight mb-4">How was your preview?</h1>
        <div className="w-12 h-px bg-wine/40 mx-auto mb-4" />
        <p className="text-charcoal/65 leading-relaxed">
          {info.bride_name.split(" ")[0]}, thank you for trusting us with your day. A few thoughts from you will help
          us perfect every detail.
        </p>
      </div>

      <div className="space-y-5">
        {[
          { label: "Overall look", value: overall, set: setOverall },
          { label: "Hair", value: hair, set: setHair },
          { label: "Makeup", value: makeup, set: setMakeup },
        ].map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-charcoal/10 pb-4">
            <span className="text-[11px] uppercase tracking-[0.25em] text-charcoal/55">{r.label}</span>
            <Stars value={r.value} onChange={r.set} />
          </div>
        ))}
      </div>

      <div>
        <label className={LABEL}>What did you love</label>
        <textarea rows={2} maxLength={2000} className={FIELD} value={loved} onChange={(e) => setLoved(e.target.value)} />
      </div>
      <div>
        <label className={LABEL}>Anything to refine</label>
        <textarea rows={2} maxLength={2000} className={FIELD} value={change} onChange={(e) => setChange(e.target.value)} />
      </div>
      <div>
        <label className={LABEL}>Your wedding day look</label>
        <p className="text-xs text-charcoal/45 mb-1 italic">
          The style you choose for hair and makeup, and any finishing touches: veil, accessories, lashes.
        </p>
        <textarea
          rows={2}
          maxLength={2000}
          className={FIELD}
          value={finalLook}
          onChange={(e) => setFinalLook(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-700 text-center">{error}</p>}
      <button
        type="submit"
        disabled={submitting || (!overall && !hair && !makeup && !loved && !change && !finalLook)}
        className="w-full bg-wine text-ivory rounded-full py-3.5 text-[12px] uppercase tracking-[0.25em] disabled:opacity-30 hover:bg-wine/90 transition-colors"
      >
        {submitting ? "Sending" : "Send my feedback"}
      </button>
    </form>
  );
}
