"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { BridePortalData, PartyMember } from "@/lib/types";
import { computeTimeline } from "@/lib/timeline";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import Logo from "@/components/Logo";

const ROLE_LABELS: Record<string, string> = {
  bride: "Bridal",
  bridesmaid: "Bridesmaid",
  mother: "Mother of the Bride",
  other: "Party member",
};

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] uppercase tracking-widest-lg text-charcoal/50 font-medium mb-4">{children}</h3>;
}

function servicesBooked(members: BridePortalData["party_members"]) {
  const groups = new Map<string, number>();
  for (const m of members) {
    const svc = m.hair && m.makeup ? "Hair + Makeup" : m.hair ? "Hair" : m.makeup ? "Makeup" : null;
    if (!svc) continue;
    const label = `${ROLE_LABELS[m.role] ?? m.role} ${svc}`;
    groups.set(label, (groups.get(label) ?? 0) + 1);
  }
  return Array.from(groups.entries()).map(([label, count]) => (count > 1 ? `${label} (×${count})` : label));
}

export default function BridePortalPage() {
  const params = useParams<{ bookingId: string }>();
  const [data, setData] = useState<BridePortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showTrialNotes, setShowTrialNotes] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: result, error: rpcError } = await supabase.rpc("get_bride_portal", {
        p_booking_id: params.bookingId,
      });
      if (rpcError || !result) {
        setError(true);
      } else {
        setData(result as BridePortalData);
      }
      setLoading(false);
    }
    load();
  }, [params.bookingId]);

  const timeline = useMemo(() => {
    if (!data) return [];
    const { booking, client, party_members } = data;
    if (!booking.ready_by_time || !client.wedding_date || party_members.length === 0) return [];
    const readyBy = new Date(`${client.wedding_date}T${booking.ready_by_time}`);
    if (isNaN(readyBy.getTime())) return [];
    const asPartyMembers: PartyMember[] = party_members.map((m, i) => ({
      id: `${i}`,
      booking_id: booking.id,
      stylist_id: "",
      price: 0,
      ...m,
    }));
    return computeTimeline(readyBy, asPartyMembers, booking.buffer_minutes ?? 0);
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-charcoal/50 text-sm">Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Logo size="md" className="justify-center mb-4" />
          <p className="text-charcoal/60 text-sm">
            This portal link isn&apos;t available. Please reach out to your stylist for an updated link.
          </p>
        </div>
      </div>
    );
  }

  const { booking, client, studio, party_members, payments, trial } = data;

  const weddingDays = client.wedding_date
    ? Math.max(0, differenceInCalendarDays(parseISO(client.wedding_date), new Date()))
    : null;

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, Number(booking.contract_total) - totalPaid);
  const paidPct = booking.contract_total > 0 ? Math.round((totalPaid / Number(booking.contract_total)) * 100) : 0;

  const gettingReadyTime = timeline[0] ? format(timeline[0].start, "h:mm a") : booking.ready_by_time ? format(new Date(`2000-01-01T${booking.ready_by_time}`), "h:mm a") : "TBD";

  const services = servicesBooked(party_members);

  const trialHasNotes =
    trial && (trial.hair_notes || trial.makeup_notes || trial.products_text || trial.changes_text || trial.day_of_notes);

  const reminders: string[] = [];
  if (remaining > 0) {
    reminders.push(`Remaining balance of $${remaining.toFixed(0)} is due before your wedding day.`);
  }
  reminders.push("Come with clean, dry hair the morning of — no heavy products.");
  reminders.push("Have your veil, hairpiece, and any accessories ready the night before.");
  if (booking.location) {
    reminders.push(`We'll be getting ready at ${booking.location}.`);
  }

  const appointments: { id: string; type: string; date: string; time: string; location: string; note?: string }[] = [];
  if (trial?.session_date) {
    appointments.push({
      id: "trial",
      type: "Trial / Preview",
      date: format(parseISO(trial.session_date), "MMM d"),
      time: "See your stylist for exact time",
      location: trial.location ?? "TBD",
    });
  }
  if (client.wedding_date) {
    appointments.push({
      id: "wedding",
      type: "Wedding Day",
      date: format(parseISO(client.wedding_date), "MMM d, yyyy"),
      time: booking.ceremony_time ? format(new Date(`2000-01-01T${booking.ceremony_time}`), "h:mm a") + " ceremony" : gettingReadyTime,
      location: client.venue ?? booking.location ?? "TBD",
    });
  }

  return (
    <div className="min-h-screen bg-ivory p-5">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="font-script text-5xl leading-tight mb-1">
              {client.bride_name}
              {client.partner_name ? ` & ${client.partner_name}` : ""}
            </h1>
            <p className="text-xs uppercase tracking-widest-lg text-charcoal/50">
              {client.wedding_date ? format(parseISO(client.wedding_date), "MMMM d, yyyy") : "Date TBD"}
              {client.venue ? ` · ${client.venue}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {studio.contact_phone && (
              <a
                href={`tel:${studio.contact_phone}`}
                className="flex items-center gap-2 text-xs px-4 py-2.5 border border-charcoal/20 rounded-md hover:bg-beige"
              >
                ☎ {studio.studio_name ?? "Call"}
              </a>
            )}
            {studio.contact_email && (
              <a
                href={`mailto:${studio.contact_email}`}
                className="flex items-center gap-2 text-xs px-4 py-2.5 bg-charcoal text-ivory rounded-md hover:bg-charcoal/85"
              >
                ✉ Email {studio.studio_name?.split(" ")[0] ?? "us"}
              </a>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
            <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Days to go</p>
            <p className="font-serif text-3xl">{weddingDays !== null ? (weddingDays > 0 ? weddingDays : "Today!") : "—"}</p>
          </div>
          <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
            <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Total paid</p>
            <p className="font-serif text-3xl">${totalPaid.toFixed(0)}</p>
            <p className="text-xs text-charcoal/50 mt-1">{paidPct}% of ${Number(booking.contract_total).toFixed(0)}</p>
          </div>
          <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
            <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Getting ready</p>
            <p className="font-serif text-2xl">{gettingReadyTime}</p>
            <p className="text-xs text-charcoal/50 mt-1 truncate">{booking.location ?? "Location TBD"}</p>
          </div>
          <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
            <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Party size</p>
            <p className="font-serif text-3xl">{party_members.length}</p>
            <p className="text-xs text-charcoal/50 mt-1">{services.length} services booked</p>
          </div>
        </div>

        {/* Body grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
          {/* Left */}
          <div className="space-y-5">
            <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <Heading>Day-of timeline</Heading>
                {booking.location && <span className="text-[10px] text-charcoal/50 uppercase tracking-wider">{booking.location}</span>}
              </div>
              {timeline.length === 0 ? (
                <p className="text-sm text-charcoal/50">Your timeline will appear here once your stylist builds it.</p>
              ) : (
                <div className="divide-y divide-charcoal/10">
                  {timeline.map((row, i) => (
                    <div key={i} className="py-3.5 flex gap-4 items-start first:pt-0 last:pb-0">
                      <div className="flex-shrink-0 w-14">
                        <p className="text-sm text-charcoal tabular-nums leading-none">{format(row.start, "h:mm a")}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-charcoal">
                          {row.member.name}
                          {row.member.role !== "other" && (
                            <span className="text-charcoal/40"> · {ROLE_LABELS[row.member.role] ?? row.member.role}</span>
                          )}
                        </p>
                        <p className="text-xs text-charcoal/50 mt-0.5">
                          {row.member.hair && row.member.makeup ? "Hair + Makeup" : row.member.hair ? "Hair" : "Makeup"} ·{" "}
                          {row.member.prep_minutes} min
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {appointments.length > 0 && (
              <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
                <Heading>Appointments</Heading>
                <div className="divide-y divide-charcoal/10">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="py-4 flex gap-4 items-start first:pt-0 last:pb-0">
                      <div className="flex-shrink-0 text-center w-14">
                        <p className="text-[10px] uppercase tracking-wider text-charcoal/50">{apt.date.split(",")[0]}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium text-charcoal">{apt.time}</span>
                          <span
                            className={`text-[9px] px-1.5 py-px uppercase tracking-wider rounded-sm ${
                              apt.id === "wedding" ? "bg-charcoal text-ivory" : "border border-charcoal/20 text-charcoal/60"
                            }`}
                          >
                            {apt.type}
                          </span>
                        </div>
                        <p className="text-xs text-charcoal/60">{apt.location}</p>
                        {apt.note && <p className="text-[10px] text-charcoal/40 italic mt-1">{apt.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="space-y-5">
            <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
              <Heading>Payment tracker</Heading>
              <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-charcoal rounded-full" style={{ width: `${Math.min(100, paidPct)}%` }} />
              </div>
              <div className="divide-y divide-charcoal/10">
                {payments.map((p, i) => (
                  <div key={i} className="py-3 flex items-center gap-3 first:pt-0">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-charcoal text-ivory text-[10px]">
                      ✓
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-charcoal capitalize">{p.note || p.type}</p>
                      <p className="text-[10px] text-charcoal/50">{format(parseISO(p.paid_at), "MMM d, yyyy")} · Paid</p>
                    </div>
                    <span className="text-sm font-medium text-charcoal">${Number(p.amount).toFixed(0)}</span>
                  </div>
                ))}
                {remaining > 0 && (
                  <div className="py-3 flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full border border-charcoal/30 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-charcoal">Remaining balance</p>
                      <p className="text-[10px] text-charcoal/50">Due before your wedding day</p>
                    </div>
                    <span className="text-sm font-medium text-charcoal">${remaining.toFixed(0)}</span>
                  </div>
                )}
              </div>
            </div>

            {services.length > 0 && (
              <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
                <Heading>Services booked</Heading>
                <div className="space-y-2">
                  {services.map((s, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-charcoal/10 last:border-0 text-sm text-charcoal">
                      <span className="text-gold text-[8px]">●</span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {trialHasNotes && (
              <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
                <button
                  onClick={() => setShowTrialNotes((v) => !v)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <Heading>Your trial notes</Heading>
                  <span className="text-charcoal/50 text-xs">{showTrialNotes ? "Hide" : "Show"}</span>
                </button>
                {showTrialNotes && (
                  <div className="space-y-3 text-sm text-charcoal/80 mt-1">
                    {trial?.hair_notes && (
                      <p>
                        <span className="text-charcoal/50 text-xs uppercase tracking-wide block mb-0.5">Hair</span>
                        {trial.hair_notes}
                      </p>
                    )}
                    {trial?.makeup_notes && (
                      <p>
                        <span className="text-charcoal/50 text-xs uppercase tracking-wide block mb-0.5">Makeup</span>
                        {trial.makeup_notes}
                      </p>
                    )}
                    {trial?.products_text && (
                      <p>
                        <span className="text-charcoal/50 text-xs uppercase tracking-wide block mb-0.5">Products used</span>
                        {trial.products_text}
                      </p>
                    )}
                    {trial?.changes_text && (
                      <p>
                        <span className="text-charcoal/50 text-xs uppercase tracking-wide block mb-0.5">Changes for the day</span>
                        {trial.changes_text}
                      </p>
                    )}
                    {trial?.day_of_notes && (
                      <p>
                        <span className="text-charcoal/50 text-xs uppercase tracking-wide block mb-0.5">Day-of notes</span>
                        {trial.day_of_notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
              <Heading>Reminders</Heading>
              <div className="space-y-2.5">
                {reminders.map((r, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-charcoal leading-relaxed">
                    <span className="text-gold text-[8px] mt-1">●</span>
                    {r}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-charcoal/40 mt-6 italic">
          Prepared by {studio.studio_name ?? "your stylist"} · Powered by Vayled
        </p>
      </div>
    </div>
  );
}
