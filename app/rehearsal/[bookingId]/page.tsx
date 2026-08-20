"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, RehearsalSession } from "@/lib/types";

function RehearsalContent() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [rehearsal, setRehearsal] = useState<RehearsalSession | null>(null);
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

    let { data: rehearsalData } = await supabase
      .from("rehearsal_sessions")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();
    if (!rehearsalData) {
      const { data: userData } = await supabase.auth.getUser();
      const studio_id = userData.user?.id;
      const { data: created } = await supabase
        .from("rehearsal_sessions")
        .insert({ studio_id, booking_id: bookingId })
        .select()
        .single();
      rehearsalData = created;
    }
    setRehearsal(rehearsalData as RehearsalSession);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  async function update(fields: Partial<RehearsalSession>) {
    if (!rehearsal) return;
    setRehearsal({ ...rehearsal, ...fields });
    await supabase.from("rehearsal_sessions").update(fields).eq("id", rehearsal.id);
  }

  if (loading || !rehearsal) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-serif text-2xl mb-1">Rehearsal hair &amp; makeup</h1>
          <p className="text-charcoal/60">
            {client?.bride_name ?? "Client"} ·{" "}
            <Link href={`/bookings/${bookingId}`} className="text-gold hover:underline">
              Back to booking
            </Link>
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm bg-white border border-charcoal/10 rounded-md px-3 py-2">
          <input type="checkbox" checked={rehearsal.completed} onChange={(e) => update({ completed: e.target.checked })} />
          Mark rehearsal complete
        </label>
      </div>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-4">Session details</h2>
        <p className="text-xs text-charcoal/50 -mt-2 mb-4">
          Separate from the trial — this is the actual paid styling for the rehearsal dinner, usually the evening
          before the wedding.
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-charcoal/60 mb-1">Date</label>
            <input
              type="date"
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={rehearsal.session_date ?? ""}
              onChange={(e) => update({ session_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Time</label>
            <input
              type="time"
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={rehearsal.session_time ?? ""}
              onChange={(e) => update({ session_time: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Duration (min)</label>
            <input
              type="number"
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={rehearsal.duration_minutes}
              onChange={(e) => update({ duration_minutes: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Location</label>
            <input
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              defaultValue={rehearsal.location ?? ""}
              onBlur={(e) => update({ location: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Fee ($)</label>
            <input
              type="number"
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={rehearsal.fee}
              onChange={(e) => update({ fee: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-charcoal/60">
              <input
                type="checkbox"
                checked={rehearsal.fee_paid}
                onChange={(e) => update({ fee_paid: e.target.checked })}
              />
              Fee paid
            </label>
          </div>
        </div>
      </section>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-4">Notes</h2>
        <p className="text-xs text-charcoal/50 mb-2">Who&apos;s included, the look, timing — anything worth remembering.</p>
        <textarea
          className="w-full border border-charcoal/20 rounded-md px-3 py-2 text-sm"
          rows={5}
          defaultValue={rehearsal.notes ?? ""}
          onBlur={(e) => update({ notes: e.target.value })}
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

export default function RehearsalPage() {
  return (
    <AuthGuard>
      <RehearsalContent />
    </AuthGuard>
  );
}
