"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { format, parseISO } from "date-fns";
import Logo from "@/components/Logo";

interface Slot {
  id: string;
  date: string;
  time: string | null;
}

interface PickerData {
  bride_name: string;
  studio_name: string;
  confirmed_date: string | null;
  confirmed_time: string | null;
  slots: Slot[];
}

function formatSlot(s: Slot) {
  const d = format(parseISO(s.date), "EEEE, MMMM d");
  if (!s.time) return d;
  const [h, m] = s.time.split(":");
  const t = new Date();
  t.setHours(parseInt(h), parseInt(m));
  return `${d} at ${format(t, "h:mm a")}`;
}

export default function TrialPickerPage() {
  const params = useParams<{ bookingId: string }>();
  const [data, setData] = useState<PickerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ date: string; time: string | null } | null>(null);

  async function load() {
    const { data: result, error: rpcError } = await supabase.rpc("get_trial_slot_offers", {
      p_booking_id: params.bookingId,
    });
    if (rpcError || !result) {
      setError(true);
    } else {
      setData(result as PickerData);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.bookingId]);

  async function pickSlot(slotId: string) {
    setSubmitting(slotId);
    setSubmitError(null);
    const { data: result, error: rpcError } = await supabase.rpc("select_trial_slot", {
      p_booking_id: params.bookingId,
      p_slot_id: slotId,
    });
    setSubmitting(null);
    if (rpcError || !result?.ok) {
      setSubmitError(result?.error ?? "Something went wrong — try again.");
      await load();
      return;
    }
    setConfirmed({ date: result.date, time: result.time });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-gold text-sm">Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Logo size="md" className="justify-center mb-4" />
          <p className="text-charcoal/60 text-sm">
            This link isn&apos;t available. Please reach out to your stylist for an updated link.
          </p>
        </div>
      </div>
    );
  }

  const confirmedDate = confirmed?.date ?? data.confirmed_date;
  const confirmedTime = confirmed?.time ?? data.confirmed_time;

  return (
    <div className="min-h-screen bg-ivory p-5 font-tagline flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Logo size="md" className="justify-center mb-2" />
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50">{data.studio_name}</p>
        </div>

        <div className="bg-white border border-charcoal/10 rounded-xl p-6">
          {confirmedDate ? (
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest-lg text-gold mb-2">You&apos;re all set</p>
              <h1 className="font-serif text-2xl text-charcoal mb-2">
                {format(parseISO(confirmedDate), "EEEE, MMMM d")}
                {confirmedTime && (
                  <>
                    {" "}
                    at{" "}
                    {(() => {
                      const [h, m] = confirmedTime.split(":");
                      const t = new Date();
                      t.setHours(parseInt(h), parseInt(m));
                      return format(t, "h:mm a");
                    })()}
                  </>
                )}
              </h1>
              <p className="text-charcoal/60 text-sm">
                Your trial with {data.studio_name} is booked for this time. Reach out to your stylist if anything
                changes.
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-2xl text-charcoal mb-1">Pick your trial time</h1>
              <p className="text-charcoal/60 text-sm mb-6">
                Hi {data.bride_name || "there"} — choose whichever of these works best for you.
              </p>

              {submitError && <p className="text-sm text-red-600 mb-4">{submitError}</p>}

              {data.slots.length === 0 ? (
                <p className="text-sm text-charcoal/50">
                  No times are open right now — check back soon or reach out to your stylist directly.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.slots.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => pickSlot(s.id)}
                      disabled={submitting === s.id}
                      className="w-full text-left border border-charcoal/20 rounded-md px-4 py-3 text-sm hover:border-gold hover:bg-ivory transition-colors disabled:opacity-50"
                    >
                      {submitting === s.id ? "Booking..." : formatSlot(s)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
