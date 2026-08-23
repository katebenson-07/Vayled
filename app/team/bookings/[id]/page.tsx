"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TeamAuthGuard, { useTeamMember } from "@/components/TeamAuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, PartyMember, TrialSession, TrialSlotOffer, ClientPhoto } from "@/lib/types";
import { computeTimeline } from "@/lib/timeline";
import { format, parseISO } from "date-fns";

function WeddingDetail() {
  const { id } = useParams<{ id: string }>();
  const { stylistId } = useTeamMember();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [isLead, setIsLead] = useState(false);
  const [trial, setTrial] = useState<TrialSession | null>(null);
  const [slots, setSlots] = useState<TrialSlotOffer[]>([]);
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotTime, setNewSlotTime] = useState("");
  const [photos, setPhotos] = useState<(ClientPhoto & { url: string | null })[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  // Trial coordination, notes, and photos aren't day-of information — they're
  // tucked behind one toggle so the page opens straight to what a stylist
  // actually needs backstage: today's schedule.
  const [detailsOpen, setDetailsOpen] = useState(false);

  async function load() {
    const { data: bookingData } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
    const b = bookingData as Booking | null;
    setBooking(b);

    if (b) {
      const { data: clientData } = await supabase.from("clients").select("*").eq("id", b.client_id).maybeSingle();
      setClient(clientData as Client | null);

      const { data: memberData } = await supabase.from("party_members").select("*").eq("booking_id", id);
      setMembers((memberData as PartyMember[]) ?? []);

      const { data: myAssignment } = await supabase
        .from("booking_stylists")
        .select("role")
        .eq("booking_id", id)
        .eq("stylist_id", stylistId)
        .maybeSingle();
      setIsLead(myAssignment?.role === "lead");

      const { data: trialData } = await supabase.from("trial_sessions").select("*").eq("booking_id", id).maybeSingle();
      setTrial((trialData as TrialSession) ?? null);

      const { data: slotData } = await supabase
        .from("trial_slot_offers")
        .select("*")
        .eq("booking_id", id)
        .order("slot_date")
        .order("slot_time");
      setSlots((slotData as TrialSlotOffer[]) ?? []);

      if (clientData) {
        const { data: photoData } = await supabase
          .from("client_photos")
          .select("*")
          .eq("booking_id", id)
          .order("created_at", { ascending: false });
        const photoRows = (photoData as ClientPhoto[]) ?? [];
        const signedUrls = await Promise.all(
          photoRows.map((p) => supabase.storage.from("client-photos").createSignedUrl(p.storage_path, 3600))
        );
        setPhotos(photoRows.map((p, i) => ({ ...p, url: signedUrls[i].data?.signedUrl ?? null })));
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function ensureTrial(): Promise<TrialSession | null> {
    if (trial) return trial;
    const { data, error } = await supabase
      .from("trial_sessions")
      .insert({ studio_id: booking?.stylist_id, booking_id: id })
      .select()
      .single();
    if (!error && data) {
      setTrial(data as TrialSession);
      return data as TrialSession;
    }
    return null;
  }

  async function updateTrial(fields: Partial<TrialSession>) {
    const current = await ensureTrial();
    if (!current) return;
    setTrial({ ...current, ...fields });
    await supabase.from("trial_sessions").update(fields).eq("id", current.id);
  }

  async function addSlot() {
    if (!newSlotDate) return;
    const { data } = await supabase
      .from("trial_slot_offers")
      .insert({ studio_id: booking?.stylist_id, booking_id: id, slot_date: newSlotDate, slot_time: newSlotTime || null })
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
    setNewSlotTime("");
  }

  async function removeSlot(slotId: string) {
    await supabase.from("trial_slot_offers").delete().eq("id", slotId);
    setSlots(slots.filter((s) => s.id !== slotId));
  }

  async function uploadPhoto(file: File) {
    if (!client) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${booking?.stylist_id}/${client.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("client-photos").upload(path, file);
    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }
    const { data, error } = await supabase
      .from("client_photos")
      .insert({ studio_id: booking?.stylist_id, client_id: client.id, booking_id: id, storage_path: path, tag: "trial_result" })
      .select()
      .single();
    if (!error && data) {
      const { data: signed } = await supabase.storage.from("client-photos").createSignedUrl(path, 3600);
      setPhotos([{ ...(data as ClientPhoto), url: signed?.signedUrl ?? null }, ...photos]);
    }
    setUploading(false);
  }

  async function removePhoto(photo: ClientPhoto) {
    await supabase.storage.from("client-photos").remove([photo.storage_path]);
    const { error } = await supabase.from("client_photos").delete().eq("id", photo.id);
    if (!error) setPhotos(photos.filter((p) => p.id !== photo.id));
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;
  if (!booking || !client) return <p className="text-charcoal/60">Wedding not found.</p>;

  const myMembers = members.filter((m) => m.assigned_stylist_id === stylistId);
  let myTimeline: ReturnType<typeof computeTimeline> = [];
  if (booking.ready_by_time && client.wedding_date && myMembers.length > 0) {
    const readyBy = new Date(`${client.wedding_date}T${booking.ready_by_time}`);
    if (!isNaN(readyBy.getTime())) {
      myTimeline = computeTimeline(readyBy, myMembers, booking.buffer_minutes ?? 10);
    }
  }

  const slotsByDate = slots.reduce<Record<string, TrialSlotOffer[]>>((groups, s) => {
    (groups[s.slot_date] ??= []).push(s);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <Link href="/team" className="text-xs text-gold hover:underline">
          ← My schedule
        </Link>
        <h1 className="font-serif text-2xl mt-1 mb-1">{client.bride_name}</h1>
        <p className="text-charcoal/60 text-sm">
          {client.wedding_date ? format(parseISO(client.wedding_date), "EEEE, MMM d, yyyy") : "No date set"}
          {client.venue ? ` · ${client.venue}` : ""}
          {" · "}
          <span className={isLead ? "text-charcoal font-medium" : ""}>{isLead ? "You're the lead" : "You're assisting"}</span>
        </p>
      </div>

      <section className="bg-white border border-charcoal/10 rounded-xl p-5">
        <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-3">Your schedule that day</h2>
        {!booking.ready_by_time ? (
          <p className="text-charcoal/60 text-sm">The studio hasn&apos;t set a ready-by time yet.</p>
        ) : myMembers.length === 0 ? (
          <p className="text-charcoal/60 text-sm">No one&apos;s assigned to you on this job yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {myTimeline.map((entry) => (
              <div key={entry.member.id} className="flex items-center gap-3 border-b border-charcoal/10 pb-2 last:border-b-0">
                <span className="flex-1">
                  {entry.member.name} <span className="text-charcoal/60">({entry.member.role})</span>
                  {entry.member.hair && <span className="text-charcoal/40 text-xs ml-2">Hair</span>}
                  {entry.member.makeup && <span className="text-charcoal/40 text-xs ml-1">Makeup</span>}
                </span>
                <span className="text-charcoal/60 whitespace-nowrap">
                  {format(entry.start, "h:mm a")} – {format(entry.end, "h:mm a")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        onClick={() => setDetailsOpen((o) => !o)}
        className="w-full flex items-center justify-between bg-white border border-charcoal/10 rounded-xl p-5 text-left"
      >
        <span className="text-sm font-medium text-charcoal">Trial &amp; prep details</span>
        <span className="text-xs text-gold">{detailsOpen ? "Hide ▲" : "Show ▾"}</span>
      </button>

      {detailsOpen && (
        <>
      {isLead && (
        <section className="bg-white border border-charcoal/10 rounded-xl p-5">
          <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-1">Offer trial times to the bride</h2>
          <p className="text-xs text-charcoal/50 mb-4">
            You&apos;re the lead on this wedding, so you can propose trial times. She&apos;ll get a link to pick one.
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
            <div className="space-y-3">
              {Object.entries(slotsByDate).map(([date, dateSlots]) => (
                <div key={date}>
                  <p className="text-xs uppercase tracking-wide text-charcoal/50 mb-1.5">
                    {format(parseISO(date), "EEEE, MMM d")}
                  </p>
                  <div className="space-y-1.5 text-sm">
                    {dateSlots.map((s) => (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between border rounded-md px-3 py-2 ${
                          s.status === "selected" ? "border-gold bg-gold/10" : "border-charcoal/10"
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
                          {s.status === "selected" && <span className="ml-2 text-xs uppercase tracking-wide text-gold">Picked</span>}
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
      )}

      <section className="bg-white border border-charcoal/10 rounded-xl p-5">
        <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-4">Trial notes</h2>
        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-charcoal/60 mb-1">Hair</label>
            <textarea
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              rows={3}
              defaultValue={trial?.hair_notes ?? ""}
              onBlur={(e) => updateTrial({ hair_notes: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Makeup</label>
            <textarea
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              rows={3}
              defaultValue={trial?.makeup_notes ?? ""}
              onBlur={(e) => updateTrial({ makeup_notes: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Day-of reminders</label>
            <textarea
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              rows={3}
              defaultValue={trial?.day_of_notes ?? ""}
              onBlur={(e) => updateTrial({ day_of_notes: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Products used</label>
            <textarea
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              rows={3}
              defaultValue={trial?.products_text ?? ""}
              onBlur={(e) => updateTrial({ products_text: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Changes for wedding day</label>
            <textarea
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              rows={3}
              defaultValue={trial?.changes_text ?? ""}
              onBlur={(e) => updateTrial({ changes_text: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="bg-white border border-charcoal/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50">Client photos</h2>
          <label className="text-gold text-sm hover:underline cursor-pointer">
            {uploading ? "Uploading..." : "+ Add photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadPhoto(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {photos.length === 0 ? (
          <p className="text-charcoal/60 text-sm">No photos yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {photos.map((p) => (
              <div key={p.id} className="relative aspect-square rounded-md overflow-hidden border border-charcoal/10 group">
                {p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={p.caption ?? p.tag} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-ivory" />
                )}
                <button
                  onClick={() => removePhoto(p)}
                  className="absolute top-2 right-2 text-[10px] uppercase tracking-wide bg-charcoal/70 text-ivory rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
        </>
      )}
    </div>
  );
}

export default function TeamBookingPage() {
  return (
    <TeamAuthGuard>
      <WeddingDetail />
    </TeamAuthGuard>
  );
}
