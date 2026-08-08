"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, TrialSession } from "@/lib/types";

function Stars({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-xl ${value && n <= value ? "text-gold" : "text-charcoal/20"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function TrialContent() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [trial, setTrial] = useState<TrialSession | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: bookingData } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
    setBooking(bookingData as Booking);
    if (bookingData) {
      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("id", (bookingData as Booking).client_id)
        .single();
      setClient(clientData as Client);
    }

    let { data: trialData } = await supabase.from("trial_sessions").select("*").eq("booking_id", bookingId).maybeSingle();
    if (!trialData) {
      const { data: userData } = await supabase.auth.getUser();
      const studio_id = userData.user?.id;
      const { data: created } = await supabase
        .from("trial_sessions")
        .insert({ studio_id, booking_id: bookingId })
        .select()
        .single();
      trialData = created;
    }
    setTrial(trialData as TrialSession);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  async function update(fields: Partial<TrialSession>) {
    if (!trial) return;
    setTrial({ ...trial, ...fields });
    await supabase.from("trial_sessions").update(fields).eq("id", trial.id);
  }

  if (loading || !trial) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-serif text-2xl mb-1">Trial session</h1>
          <p className="text-charcoal/60">
            {client?.bride_name ?? "Client"} ·{" "}
            <Link href={`/bookings/${bookingId}`} className="text-gold hover:underline">
              Back to booking
            </Link>
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm bg-white border border-charcoal/10 rounded-md px-3 py-2">
          <input type="checkbox" checked={trial.completed} onChange={(e) => update({ completed: e.target.checked })} />
          Mark trial complete
        </label>
      </div>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-4">Session details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-charcoal/60 mb-1">Date</label>
            <input
              type="date"
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={trial.session_date ?? ""}
              onChange={(e) => update({ session_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Duration (min)</label>
            <input
              type="number"
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={trial.duration_minutes}
              onChange={(e) => update({ duration_minutes: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Location</label>
            <input
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              defaultValue={trial.location ?? ""}
              onBlur={(e) => update({ location: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Trial fee ($)</label>
            <input
              type="number"
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={trial.fee}
              onChange={(e) => update({ fee: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-charcoal/60">
              <input type="checkbox" checked={trial.fee_paid} onChange={(e) => update({ fee_paid: e.target.checked })} />
              Fee paid
            </label>
          </div>
        </div>
      </section>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-4">Technique notes</h2>
        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-charcoal/60 mb-1">Hair</label>
            <textarea
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              rows={3}
              defaultValue={trial.hair_notes ?? ""}
              onBlur={(e) => update({ hair_notes: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Makeup</label>
            <textarea
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              rows={3}
              defaultValue={trial.makeup_notes ?? ""}
              onBlur={(e) => update({ makeup_notes: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Day-of reminders</label>
            <textarea
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              rows={3}
              defaultValue={trial.day_of_notes ?? ""}
              onBlur={(e) => update({ day_of_notes: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-4">Products used</h2>
        <p className="text-xs text-charcoal/50 mb-2">One product per line — brand, shade, category.</p>
        <textarea
          className="w-full border border-charcoal/20 rounded-md px-3 py-2 text-sm"
          rows={4}
          defaultValue={trial.products_text ?? ""}
          onBlur={(e) => update({ products_text: e.target.value })}
        />
      </section>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-4">Changes for wedding day</h2>
        <p className="text-xs text-charcoal/50 mb-2">List tweaks the bride requested vs. what to repeat exactly.</p>
        <textarea
          className="w-full border border-charcoal/20 rounded-md px-3 py-2 text-sm"
          rows={4}
          defaultValue={trial.changes_text ?? ""}
          onBlur={(e) => update({ changes_text: e.target.value })}
        />
      </section>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-4">Client feedback</h2>
        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          <div>
            <p className="text-charcoal/60 mb-1">Overall look</p>
            <Stars value={trial.overall_rating} onChange={(v) => update({ overall_rating: v })} />
          </div>
          <div>
            <p className="text-charcoal/60 mb-1">Hair</p>
            <Stars value={trial.hair_rating} onChange={(v) => update({ hair_rating: v })} />
          </div>
          <div>
            <p className="text-charcoal/60 mb-1">Makeup</p>
            <Stars value={trial.makeup_rating} onChange={(v) => update({ makeup_rating: v })} />
          </div>
        </div>
        <label className="block text-charcoal/60 mb-1 text-sm">Her words</label>
        <textarea
          className="w-full border border-charcoal/20 rounded-md px-3 py-2 text-sm"
          rows={2}
          placeholder="A short quote from the bride..."
          defaultValue={trial.quote ?? ""}
          onBlur={(e) => update({ quote: e.target.value })}
        />
      </section>

      <div className="flex gap-2 text-sm">
        <button onClick={() => window.print()} className="border border-charcoal/20 rounded-md px-4 py-2 hover:bg-white">
          Print notes
        </button>
      </div>
    </div>
  );
}

export default function TrialPage() {
  return (
    <AuthGuard>
      <TrialContent />
    </AuthGuard>
  );
}
