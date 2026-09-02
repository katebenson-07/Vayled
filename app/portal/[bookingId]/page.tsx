"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { BridePortalData, PartyMember } from "@/lib/types";
import { computeTimeline, computeTimelineFromStart } from "@/lib/timeline";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import Logo from "@/components/Logo";

const ROLE_LABELS: Record<string, string> = {
  bride: "Bridal",
  bridesmaid: "Bridesmaid",
  mother: "Mother of the Bride",
  other: "Party member",
};

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-heading text-[10px] uppercase tracking-[0.22em] text-charcoal font-medium mb-4">
      {children}
    </h3>
  );
}

function personLabel(role: string, name: string) {
  if (role === "bride") return `${name} (Bride)`;
  if (role === "mother") return `Mom — ${name}`;
  if (role === "bridesmaid") return `Bridesmaid — ${name}`;
  return name;
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

  // Split the party into one timeline per assigned stylist (mirroring the
  // studio-side Timeline tab), so a job with 3 stylists shows 3 separate
  // schedules here instead of collapsing everyone into one flat list.
  // Anything not yet assigned to a stylist falls into an "Unassigned" group.
  type StylistTimeline = {
    stylistId: string | null;
    stylistName: string;
    role: "lead" | "assist" | null;
    entries: ReturnType<typeof computeTimeline>;
  };

  const stylistTimelines = useMemo<StylistTimeline[]>(() => {
    if (!data) return [];
    const { booking, client, party_members, stylists } = data;
    const anchorTimeStr = booking.start_time || booking.ready_by_time;
    if (!anchorTimeStr || !client.wedding_date || party_members.length === 0) return [];
    const anchor = new Date(`${client.wedding_date}T${anchorTimeStr}`);
    if (isNaN(anchor.getTime())) return [];

    const asPartyMembers: PartyMember[] = party_members.map((m, i) => ({
      id: `${i}`,
      booking_id: booking.id,
      stylist_id: "",
      price: 0,
      styling_notes: null,
      ...m,
    }));

    const buffer = booking.buffer_minutes ?? 10;
    const groups = new Map<string, PartyMember[]>();
    for (const m of asPartyMembers) {
      const key = m.assigned_stylist_id ?? "unassigned";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }

    return Array.from(groups.entries())
      .map(([key, groupMembers]) => {
        const stylist = key === "unassigned" ? null : stylists.find((s) => s.id === key) ?? null;
        return {
          stylistId: stylist?.id ?? null,
          stylistName: stylist ? stylist.name : "Unassigned",
          role: stylist?.role ?? null,
          entries: booking.start_time
            ? computeTimelineFromStart(anchor, groupMembers, buffer)
            : computeTimeline(anchor, groupMembers, buffer),
        };
      })
      .sort((a, b) => {
        if (a.stylistId === null) return 1;
        if (b.stylistId === null) return -1;
        if (a.role !== b.role) return a.role === "lead" ? -1 : 1;
        return a.stylistName.localeCompare(b.stylistName);
      });
  }, [data]);

  const gettingReadyDate = stylistTimelines.reduce<Date | null>((earliest, st) => {
    if (st.entries.length === 0) return earliest;
    const start = st.entries[0].start;
    return !earliest || start < earliest ? start : earliest;
  }, null);

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
  const weddingDateLabel = client.wedding_date ? format(parseISO(client.wedding_date), "MMMM d, yyyy") : "Date TBD";

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, Number(booking.contract_total) - totalPaid);
  const paidPct = booking.contract_total > 0 ? Math.round((totalPaid / Number(booking.contract_total)) * 100) : 0;

  const gettingReadyTime = gettingReadyDate
    ? format(gettingReadyDate, "h:mm a")
    : booking.start_time
    ? format(new Date(`2000-01-01T${booking.start_time}`), "h:mm a")
    : booking.ready_by_time
    ? format(new Date(`2000-01-01T${booking.ready_by_time}`), "h:mm a")
    : "TBD";

  const services = servicesBooked(party_members);

  const trialParagraph = trial
    ? [
        trial.hair_notes ? `Hair: ${trial.hair_notes}` : null,
        trial.makeup_notes ? `Makeup: ${trial.makeup_notes}` : null,
        trial.products_text ? `Products: ${trial.products_text}` : null,
        trial.changes_text ? `Changes for the day: ${trial.changes_text}` : null,
        trial.day_of_notes ? `Day-of notes: ${trial.day_of_notes}` : null,
      ]
        .filter(Boolean)
        .join("  ·  ")
    : "";

  const reminders: string[] = [];
  if (remaining > 0) {
    reminders.push(`Remaining balance of $${remaining.toFixed(0)} is due before your wedding day.`);
  }
  reminders.push("Come with clean, dry hair the morning of — no heavy products.");
  reminders.push("Have your veil, hairpiece, and any accessories ready the night before.");
  if (booking.location) {
    reminders.push(`We'll be getting ready at ${booking.location}.`);
  }

  type Appointment = { id: string; type: string; date: Date; time: string; location: string; note?: string };
  const appointments: Appointment[] = [];
  if (trial?.session_date) {
    appointments.push({
      id: "trial",
      type: "Preview",
      date: parseISO(trial.session_date),
      time: "Time TBD",
      location: trial.location ?? "TBD",
    });
  }
  if (client.wedding_date) {
    appointments.push({
      id: "wedding",
      type: "Wedding Day",
      date: parseISO(client.wedding_date),
      time: booking.ceremony_time
        ? `${format(new Date(`2000-01-01T${booking.ceremony_time}`), "h:mm a")} ceremony`
        : `${gettingReadyTime} start`,
      location: client.venue ?? booking.location ?? "TBD",
    });
  }

  return (
    <div className="min-h-screen bg-ivory p-5 font-tagline">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="font-heading text-4xl text-charcoal font-light leading-tight mb-1">{client.bride_name}</h1>
            <p className="text-[10px] uppercase tracking-widest text-gold">
              {weddingDateLabel}
              {client.venue ? ` · ${client.venue}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {studio.contact_phone && (
              <a
                href={`tel:${studio.contact_phone}`}
                className="flex items-center gap-2 text-xs px-4 py-2.5 border border-charcoal/20 text-charcoal hover:bg-beige transition-colors"
              >
                <span className="text-gold">☎</span>
                {studio.studio_name ?? "Call"}
              </a>
            )}
            {studio.contact_email && (
              <a
                href={`mailto:${studio.contact_email}`}
                className="flex items-center gap-2 text-xs px-4 py-2.5 bg-charcoal text-ivory hover:bg-charcoal/85 transition-colors"
              >
                ✉ Email {studio.studio_name?.split(" ")[0] ?? "us"}
              </a>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Days to go", value: weddingDays !== null ? (weddingDays > 0 ? `${weddingDays}` : "Today!") : "—", sub: weddingDateLabel },
            { label: "Total paid", value: `$${totalPaid.toLocaleString()}`, sub: `${paidPct}% of $${Number(booking.contract_total).toLocaleString()}` },
            { label: "Getting ready", value: gettingReadyTime, sub: booking.location ?? "Location TBD" },
            { label: "Party size", value: `${party_members.length}`, sub: `${services.length} services booked` },
          ].map((s) => (
            <div key={s.label} className="bg-beige border border-charcoal/20 p-5">
              <p className="text-[10px] uppercase tracking-widest text-gold mb-3">{s.label}</p>
              <p className="text-[2rem] font-medium text-charcoal leading-none mb-2">{s.value}</p>
              <p className="text-xs text-gold truncate">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Body grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
          {/* Left — timeline */}
          <div className="bg-beige border border-charcoal/20 p-5">
            <div className="flex items-center justify-between mb-5">
              <Heading>Day-of Timeline</Heading>
              <span className="text-[10px] text-gold uppercase tracking-wider">{gettingReadyTime} start</span>
            </div>
            {stylistTimelines.length === 0 ? (
              <p className="text-xs text-gold">Your timeline will appear here once your stylist builds it.</p>
            ) : (
              <div className="space-y-5">
                {stylistTimelines.map((st) => (
                  <div key={st.stylistId ?? "unassigned"}>
                    {stylistTimelines.length > 1 && (
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-charcoal/20">
                        <p className="text-xs font-medium text-charcoal">
                          {st.stylistName}
                          {st.role && (
                            <span className="text-[10px] text-gold uppercase tracking-wider ml-2">
                              {st.role === "lead" ? "Lead" : "Assist"}
                            </span>
                          )}
                        </p>
                        {st.entries.length > 0 && (
                          <span className="text-[10px] text-gold uppercase tracking-wider">
                            Starts {format(st.entries[0].start, "h:mm a")}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="divide-y divide-charcoal/20">
                      {st.entries.map((row, i) => (
                        <div key={i} className="py-3.5 flex gap-4 items-start first:pt-0 last:pb-0">
                          <div className="flex-shrink-0 w-14">
                            <p className="text-xs font-medium text-charcoal tabular-nums leading-none">{format(row.start, "h:mm a")}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-charcoal leading-snug">{personLabel(row.member.role, row.member.name)}</p>
                            <p className="text-xs text-gold mt-0.5">
                              {row.member.hair && row.member.makeup ? "Hair + Makeup" : row.member.hair ? "Hair" : "Makeup"}
                            </p>
                          </div>
                          <span className="text-[10px] text-gold flex-shrink-0">{row.member.prep_minutes} min</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-gold mt-4 pt-4 border-t border-charcoal/20">
              Times are approximate and may shift slightly on the day.
            </p>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {appointments.length > 0 && (
              <div className="bg-beige border border-charcoal/20 p-5">
                <Heading>Appointments</Heading>
                <div className="divide-y divide-charcoal/20">
                  {appointments.map((apt) => {
                    const isWedding = apt.id === "wedding";
                    return (
                      <div key={apt.id} className="py-4 flex gap-4 items-start first:pt-0 last:pb-0">
                        <div className="flex-shrink-0 text-center w-10">
                          <p className="text-[10px] uppercase tracking-wider text-gold leading-none mb-1">{format(apt.date, "EEE")}</p>
                          <p className="text-xl font-medium text-charcoal leading-none">{format(apt.date, "d")}</p>
                          <p className="text-[10px] text-gold leading-none mt-1">{format(apt.date, "MMM")}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium text-charcoal">{apt.time}</span>
                            <span
                              className={`text-[9px] px-1.5 py-px uppercase tracking-wider flex-shrink-0 ${
                                isWedding ? "bg-charcoal text-ivory" : "border border-charcoal/20 text-gold"
                              }`}
                            >
                              {apt.type}
                            </span>
                          </div>
                          <p className="text-xs text-gold leading-snug">{apt.location}</p>
                          {apt.note && <p className="text-[10px] text-gold/70 mt-1 italic leading-snug">{apt.note}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-beige border border-charcoal/20 p-5">
              <Heading>Payments</Heading>
              <div className="mb-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs text-gold">${totalPaid.toLocaleString()} paid</span>
                  <span className="text-xs font-medium text-charcoal">{paidPct}%</span>
                </div>
                <div className="h-1 bg-charcoal/20">
                  <div className="h-full bg-charcoal transition-all" style={{ width: `${Math.min(100, paidPct)}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                {payments.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-charcoal/10 last:border-0">
                    <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center bg-charcoal">
                      <span className="text-ivory text-[10px]">✓</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-charcoal capitalize">{p.note || p.type}</p>
                      <p className="text-[10px] text-gold">Paid {format(parseISO(p.paid_at), "MMM d")}</p>
                    </div>
                    <span className="text-sm font-medium text-charcoal flex-shrink-0">${Number(p.amount).toLocaleString()}</span>
                  </div>
                ))}
                {remaining > 0 && (
                  <div className="flex items-center gap-3 py-2 border-b border-charcoal/10 last:border-0">
                    <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center border border-charcoal/20" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-charcoal">Remaining balance</p>
                      <p className="text-[10px] text-gold">Due before your wedding day</p>
                    </div>
                    <span className="text-sm font-medium text-charcoal flex-shrink-0">${remaining.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {services.length > 0 && (
              <div className="bg-beige border border-charcoal/20 p-5">
                <Heading>Services Booked</Heading>
                <div className="space-y-2">
                  {services.map((s, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-charcoal/10 last:border-0">
                      <span className="text-gold text-[8px]">◆</span>
                      <span className="text-xs text-charcoal">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {trialParagraph && (
              <div className="bg-beige border border-charcoal/20">
                <button onClick={() => setShowTrialNotes((v) => !v)} className="w-full flex items-center justify-between p-5 text-left">
                  <Heading>Preview Notes</Heading>
                  <span className="text-gold text-xs flex-shrink-0">{showTrialNotes ? "▴" : "▾"}</span>
                </button>
                {showTrialNotes && (
                  <div className="px-5 pb-5 border-t border-charcoal/20 pt-4">
                    <p className="text-xs text-charcoal leading-relaxed">{trialParagraph}</p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-beige border border-charcoal/20 p-5">
              <Heading>Reminders</Heading>
              <div className="space-y-2">
                {reminders.map((r, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-charcoal leading-relaxed">
                    <span className="text-gold text-[8px] mt-1 flex-shrink-0">◆</span>
                    {r}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="font-heading text-center text-xs text-gold mt-6 italic">
          Prepared by {studio.studio_name ?? "your stylist"} · Powered by Vayled
        </p>
      </div>
    </div>
  );
}
