"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Appointment, AppointmentStatus, Booking, Client, RehearsalSession, TrialSession } from "@/lib/types";
import { format, parseISO } from "date-fns";

type BookingWithClient = Booking & { clients: Client | null };

type UnifiedAppointment = {
  id: string;
  source: "appointment" | "trial" | "rehearsal";
  title: string;
  date: string;
  time: string | null;
  clientName: string | null;
  location: string | null;
  status: AppointmentStatus;
  href: string | null;
};

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  confirmed: "bg-green-50 text-green-700",
  pending: "bg-amber-50 text-amber-700",
  completed: "bg-beige/60 text-charcoal/60",
  cancelled: "bg-red-50 text-red-600",
};

const FILTERS: { key: "all" | AppointmentStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Confirmed" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const EMPTY_FORM = {
  title: "",
  appointment_date: format(new Date(), "yyyy-MM-dd"),
  appointment_time: "",
  location: "",
  client_id: "",
  status: "confirmed" as AppointmentStatus,
};

function AppointmentsContent() {
  const [studioId, setStudioId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [trialSessions, setTrialSessions] = useState<TrialSession[]>([]);
  const [rehearsalSessions, setRehearsalSessions] = useState<RehearsalSession[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user) setStudioId(user.id);

    const [{ data: apptData }, { data: bookingData }, { data: trialData }, { data: rehearsalData }, { data: clientData }] =
      await Promise.all([
        supabase.from("appointments").select("*").order("appointment_date"),
        supabase.from("bookings").select("*, clients(*)").neq("status", "cancelled"),
        supabase.from("trial_sessions").select("*").not("session_date", "is", null),
        supabase.from("rehearsal_sessions").select("*").not("session_date", "is", null),
        supabase.from("clients").select("*").order("bride_name"),
      ]);

    setAppointments((apptData as Appointment[]) ?? []);
    setBookings((bookingData as any) ?? []);
    setTrialSessions((trialData as TrialSession[]) ?? []);
    setRehearsalSessions((rehearsalData as RehearsalSession[]) ?? []);
    setClients((clientData as Client[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const bookingsById = useMemo(() => {
    const map = new Map<string, BookingWithClient>();
    bookings.forEach((b) => map.set(b.id, b));
    return map;
  }, [bookings]);

  const unified: UnifiedAppointment[] = useMemo(() => {
    const fromAppointments: UnifiedAppointment[] = appointments.map((a) => ({
      id: `appt-${a.id}`,
      source: "appointment",
      title: a.title,
      date: a.appointment_date,
      time: a.appointment_time,
      clientName: clients.find((c) => c.id === a.client_id)?.bride_name ?? null,
      location: a.location,
      status: a.status,
      href: null,
    }));

    const fromTrials: UnifiedAppointment[] = trialSessions
      .filter((t) => t.session_date)
      .map((t) => {
        const booking = bookingsById.get(t.booking_id);
        return {
          id: `trial-${t.id}`,
          source: "trial",
          title: "Preview",
          date: t.session_date as string,
          time: t.session_time,
          clientName: booking?.clients?.bride_name ?? null,
          location: t.location,
          status: (t.completed ? "completed" : "confirmed") as AppointmentStatus,
          href: `/trials/${t.booking_id}`,
        };
      });

    const fromRehearsals: UnifiedAppointment[] = rehearsalSessions
      .filter((r) => r.session_date)
      .map((r) => {
        const booking = bookingsById.get(r.booking_id);
        return {
          id: `rehearsal-${r.id}`,
          source: "rehearsal",
          title: "Rehearsal Hair & Makeup",
          date: r.session_date as string,
          time: r.session_time,
          clientName: booking?.clients?.bride_name ?? null,
          location: r.location,
          status: (r.completed ? "completed" : "confirmed") as AppointmentStatus,
          href: `/rehearsal/${r.booking_id}`,
        };
      });

    return [...fromAppointments, ...fromTrials, ...fromRehearsals].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const timeA = a.time ?? "23:59";
      const timeB = b.time ?? "23:59";
      return timeA < timeB ? -1 : timeA > timeB ? 1 : 0;
    });
  }, [appointments, trialSessions, rehearsalSessions, clients, bookingsById]);

  const filtered = statusFilter === "all" ? unified : unified.filter((u) => u.status === statusFilter);

  const grouped = useMemo(() => {
    const groups: { date: string; items: UnifiedAppointment[] }[] = [];
    for (const item of filtered) {
      const group = groups[groups.length - 1];
      if (group && group.date === item.date) {
        group.items.push(item);
      } else {
        groups.push({ date: item.date, items: [item] });
      }
    }
    return groups;
  }, [filtered]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!studioId || !form.title.trim() || !form.appointment_date) return;
    setSaving(true);
    const { error } = await supabase.from("appointments").insert({
      studio_id: studioId,
      title: form.title.trim(),
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time || null,
      location: form.location.trim() || null,
      client_id: form.client_id || null,
      status: form.status,
    });
    setSaving(false);
    if (!error) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    }
  }

  async function cancelAppointment(rawId: string) {
    const id = rawId.replace(/^appt-/, "");
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    load();
  }

  function timeParts(time: string | null) {
    if (!time) return null;
    const parsed = parseISO(`2000-01-01T${time}`);
    if (isNaN(parsed.getTime())) return null;
    return { hour: format(parsed, "h"), ampm: format(parsed, "a").toUpperCase() };
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-widest-lg text-gold mb-1">Schedule</p>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h1 className="font-serif text-3xl">Appointments</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-charcoal text-ivory rounded-full px-5 py-2.5 text-sm hover:bg-charcoal/90 transition-colors"
        >
          {showForm ? "Cancel" : "+ Schedule"}
        </button>
      </div>
      <p className="text-sm text-charcoal/50 mb-6">
        Preview fittings, rehearsals, and every other meeting on the books.
      </p>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-charcoal/10 rounded-xl p-5 mb-6 flex flex-wrap items-end gap-3 text-sm"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="block text-charcoal/60 mb-1">Title</label>
            <input
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              placeholder="e.g. Venue Walk-Through"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Date</label>
            <input
              type="date"
              className="border border-charcoal/20 rounded-md px-3 py-2"
              value={form.appointment_date}
              onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Time</label>
            <input
              type="time"
              className="border border-charcoal/20 rounded-md px-3 py-2"
              value={form.appointment_time}
              onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-charcoal/60 mb-1">Location</label>
            <input
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              placeholder="Studio, venue, phone..."
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Client</label>
            <select
              className="border border-charcoal/20 rounded-md px-3 py-2"
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            >
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.bride_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Status</label>
            <select
              className="border border-charcoal/20 rounded-md px-3 py-2"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as AppointmentStatus })}
            >
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-charcoal text-ivory rounded-md px-4 py-2 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      )}

      {!loading && unified.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {FILTERS.map((f) => {
            const count = f.key === "all" ? unified.length : unified.filter((u) => u.status === f.key).length;
            const active = statusFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`text-xs uppercase tracking-wide rounded-full px-3.5 py-2 border transition-colors ${
                  active
                    ? "bg-charcoal text-ivory border-charcoal"
                    : "bg-white text-charcoal/60 border-charcoal/15 hover:border-charcoal/30"
                }`}
              >
                {f.label} <span className={active ? "text-ivory/60" : "text-charcoal/35"}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <p className="text-charcoal/60">Loading...</p>
      ) : unified.length === 0 ? (
        <div className="bg-white border border-charcoal/10 rounded-xl p-8 text-center">
          <p className="font-serif text-lg mb-1">Nothing scheduled yet</p>
          <p className="text-sm text-charcoal/60">
            Preview fittings and rehearsals will show up here automatically. Use the &ldquo;+ Schedule&rdquo; button for everything else.
          </p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white border border-charcoal/10 rounded-xl p-8 text-center">
          <p className="font-serif text-lg mb-1">No matches</p>
          <p className="text-sm text-charcoal/60">Try a different filter.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs uppercase tracking-widest-lg text-gold whitespace-nowrap">
                  {format(parseISO(group.date), "MMMM d, yyyy")}
                </p>
                <div className="h-px bg-charcoal/10 flex-1" />
              </div>
              <div className="space-y-3">
                {group.items.map((item) => {
                  const t = timeParts(item.time);
                  const CardInner = (
                    <div className="flex items-center gap-4">
                      <div className="w-14 text-center shrink-0">
                        {t ? (
                          <>
                            <p className="font-serif text-2xl leading-none">{t.hour}</p>
                            <p className="text-[10px] uppercase tracking-wide text-charcoal/40 mt-1">{t.ampm}</p>
                          </>
                        ) : (
                          <p className="text-[10px] uppercase tracking-wide text-charcoal/35">TBD</p>
                        )}
                      </div>
                      <div className="w-px self-stretch bg-charcoal/10 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-lg leading-tight truncate">{item.title}</p>
                        {item.clientName && <p className="text-sm text-gold truncate">{item.clientName}</p>}
                        {item.location && <p className="text-xs text-charcoal/45 truncate">{item.location}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-[10px] uppercase tracking-wide rounded px-2 py-0.5 ${STATUS_STYLES[item.status]}`}
                        >
                          {item.status}
                        </span>
                        {item.source === "appointment" && item.status !== "cancelled" && item.status !== "completed" && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              cancelAppointment(item.id);
                            }}
                            className="text-xs text-charcoal/40 hover:text-red-600"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );

                  return item.href ? (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="block bg-white border border-charcoal/10 rounded-xl p-4 hover:border-charcoal/20 transition-colors"
                    >
                      {CardInner}
                    </Link>
                  ) : (
                    <div key={item.id} className="bg-white border border-charcoal/10 rounded-xl p-4">
                      {CardInner}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <AuthGuard>
      <AppointmentsContent />
    </AuthGuard>
  );
}
