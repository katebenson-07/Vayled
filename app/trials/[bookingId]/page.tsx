"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, TrialSession, TrialSlotOffer } from "@/lib/types";
import { format, parseISO } from "date-fns";

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
  const [slots, setSlots] = useState<TrialSlotOffer[]>([]);
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotTime, setNewSlotTime] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadSlots() {
    const { data } = await supabase
      .from("trial_slot_offers")
      .select("*")
      .eq("booking_id", bookingId)
      .order("slot_date")
      .order("slot_time");
    setSlots((data as TrialSlotOffer[]) ?? []);
  }

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
    await loadSlots();
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

  async function addSlot() {
    if (!newSlotDate) return;
    const { data: userData } = await supabase.auth.getUser();
    const studio_id = userData.user?.id;
    const { data } = await supabase
      .from("trial_slot_offers")
      .insert({
        studio_id,
        booking_id: bookingId,
        slot_date: newSlotDate,
        slot_time: newSlotTime || null,
      })
      .select()
      .single();
    if (data) {
      setSlots(
        [...slots, data as TrialSlotOffer].sort((a, b) =>
          a.slot_date === b.slot_date
            ? (a.slot_time ?? "").localeCompare(b.slot_time ?? "")
            : a.slot_date.localeCompare(b.slot_date)
        )
      );
    }
    // Date stays put on purpose — adding several times for the same day
    // (e.g. 10am, 1pm, 3pm) is the common case, so only the time resets.
    setNewSlotTime("");
  }

  async function removeSlot(id: string) {
    await supabase.from("trial_slot_offers").delete().eq("id", id);
    setSlots(slots.filter((s) => s.id !== id));
  }

  const slotsByDate = slots.reduce<Record<string, TrialSlotOffer[]>>((groups, s) => {
    (groups[s.slot_date] ??= []).push(s);
    return groups;
  }, {});

  const pickerUrl = typeof window !== "undefined" ? `${window.location.origin}/trials/${bookingId}/pick` : "";

  function copyPickerLink() {
    if (!pickerUrl) return;
    navigator.clipboard.writeText(pickerUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  if (loading || !trial) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-serif text-2xl mb-1">Preview session</h1>
          <p className="text-charcoal/60">
            {client?.bride_name ?? "Client"} ·{" "}
            <Link href={`/bookings/${bookingId}`} className="text-gold hover:underline">
              Back to booking
            </Link>
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm bg-white border border-charcoal/10 rounded-md px-3 py-2">
          <input type="checkbox" checked={trial.completed} onChange={(e) => update({ completed: e.target.checked })} />
          Mark preview complete
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
            <label className="block text-charcoal/60 mb-1">Time</label>
            <input
              type="time"
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={trial.session_time ?? ""}
              onChange={(e) => update({ session_time: e.target.value })}
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
            <label className="block text-charcoal/60 mb-1">Preview fee ($)</label>
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
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h2 className="font-serif text-lg">Offer times to pick from</h2>
          <button
            onClick={copyPickerLink}
            className="border border-charcoal/20 rounded-md px-3 py-1.5 hover:bg-ivory uppercase text-xs tracking-wide"
          >
            {linkCopied ? "Link copied ✓" : "Copy link to send"}
          </button>
        </div>
        <p className="text-xs text-charcoal/50 mb-4">
          Add a few open times below, then send the link to your client — she picks one and it fills in the date
          &amp; time above automatically.
        </p>

        <div className="flex flex-wrap items-end gap-2 mb-4">
          <div>
            <label className="block text-charcoal/60 mb-1 text-sm">Date</label>
            <input
              type="date"
              className="border border-charcoal/20 rounded-md px-3 py-2 text-sm"
              value={newSlotDate}
              onChange={(e) => setNewSlotDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1 text-sm">Time (optional)</label>
            <input
              type="time"
              className="border border-charcoal/20 rounded-md px-3 py-2 text-sm"
              value={newSlotTime}
              onChange={(e) => setNewSlotTime(e.target.value)}
            />
          </div>
          <button
            onClick={addSlot}
            disabled={!newSlotDate}
            className="bg-charcoal text-ivory rounded-md px-4 py-2 text-sm disabled:opacity-40"
          >
            Add time
          </button>
        </div>

        {slots.length === 0 ? (
          <p className="text-sm text-charcoal/50">No times offered yet.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(slotsByDate).map(([date, dateSlots]) => (
              <div key={date}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs uppercase tracking-wide text-charcoal/50">
                    {format(parseISO(date), "EEEE, MMM d")}
                  </p>
                  <button
                    onClick={() => setNewSlotDate(date)}
                    className="text-xs text-gold hover:underline"
                  >
                    + another time this day
                  </button>
                </div>
                <div className="space-y-1.5 text-sm">
                  {dateSlots.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between border rounded-md px-3 py-2 ${
                        s.status === "selected"
                          ? "border-gold bg-gold/10"
                          : s.status === "withdrawn"
                          ? "border-charcoal/10 text-charcoal/40"
                          : "border-charcoal/10"
                      }`}
                    >
                      <span>
                        {s.slot_time
                          ? (() => {
                              const [h, m] = s.slot_time.split(":");
                              const t = new Date();
                              t.setHours(parseInt(h), parseInt(m));
                              return format(t, "h:mm a");
                            })()
                          : "Time TBD"}
                        {s.status === "selected" && (
                          <span className="ml-2 text-xs uppercase tracking-wide text-gold">Picked</span>
                        )}
                        {s.status === "withdrawn" && (
                          <span className="ml-2 text-xs uppercase tracking-wide">Not picked</span>
                        )}
                      </span>
                      {s.status === "open" && (
                        <button onClick={() => removeSlot(s.id)} className="text-red-600 text-xs uppercase tracking-wide">
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
