"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, Stylist, StylistTimeOff, PartyMember, TrialSession, RehearsalSession } from "@/lib/types";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  format,
  addMonths,
  subMonths,
  getDaysInMonth,
} from "date-fns";

type BookingWithClient = Booking & { clients: Client | null };
type Assignment = { stylist_id: string; booking_id: string };

// Warm, tonal palette (charcoal → gold → clay) instead of bright rainbow colors,
// so assigned-stylist tags stay in the studio's own brand family.
const STYLIST_COLORS = ["#231815", "#4A2E27", "#9B7B5A", "#C4A882", "#5C4A3A", "#8B6F5E", "#4A3728", "#7D6553"];
function colorForStylist(index: number) {
  return STYLIST_COLORS[index % STYLIST_COLORS.length];
}
function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function CalendarContent() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [studioName, setStudioName] = useState("");
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [timeOff, setTimeOff] = useState<StylistTimeOff[]>([]);
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([]);
  const [trialSessions, setTrialSessions] = useState<TrialSession[]>([]);
  const [rehearsalSessions, setRehearsalSessions] = useState<RehearsalSession[]>([]);
  const [selectedStylistId, setSelectedStylistId] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedDay(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase
          .from("studio_settings")
          .select("studio_name")
          .eq("studio_id", userData.user.id)
          .maybeSingle();
        setStudioName(profile?.studio_name || "Your studio");
      }

      const { data: bookingData } = await supabase
        .from("bookings")
        .select("*, clients(*)")
        .neq("status", "cancelled");
      setBookings((bookingData as any) ?? []);

      const { data: stylistData } = await supabase.from("stylists").select("*").eq("active", true).order("name");
      setStylists((stylistData as Stylist[]) ?? []);

      const { data: assignmentData } = await supabase.from("booking_stylists").select("stylist_id, booking_id");
      setAssignments((assignmentData as Assignment[]) ?? []);

      const { data: timeOffData } = await supabase.from("stylist_time_off").select("*");
      setTimeOff((timeOffData as StylistTimeOff[]) ?? []);

      const { data: memberData } = await supabase.from("party_members").select("*");
      setPartyMembers((memberData as PartyMember[]) ?? []);

      const { data: trialData } = await supabase
        .from("trial_sessions")
        .select("*")
        .not("session_date", "is", null);
      setTrialSessions((trialData as TrialSession[]) ?? []);

      const { data: rehearsalData } = await supabase
        .from("rehearsal_sessions")
        .select("*")
        .not("session_date", "is", null);
      setRehearsalSessions((rehearsalData as RehearsalSession[]) ?? []);

      setLoading(false);
    }
    load();
  }, []);

  function stylistsForBooking(bookingId: string) {
    return assignments.filter((a) => a.booking_id === bookingId).map((a) => a.stylist_id);
  }

  function partySize(bookingId: string) {
    return partyMembers.filter((m) => m.booking_id === bookingId).length;
  }

  const upcomingJobs = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return bookings
      .filter((b) => {
        const d = b.clients?.wedding_date;
        if (!d) return false;
        const parsed = parseISO(d);
        return parsed >= monthStart && parsed <= monthEnd;
      })
      .sort((a, b) => (a.clients!.wedding_date! < b.clients!.wedding_date! ? -1 : 1));
  }, [bookings, currentMonth]);

  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const totalDays = getDaysInMonth(currentMonth);
    const bookingIdsThisMonth = new Set(
      bookings
        .filter((b) => {
          const d = b.clients?.wedding_date;
          if (!d) return false;
          const parsed = parseISO(d);
          return parsed >= monthStart && parsed <= monthEnd;
        })
        .map((b) => b.id)
    );

    return stylists.map((s) => {
      const jobCount = assignments.filter((a) => a.stylist_id === s.id && bookingIdsThisMonth.has(a.booking_id)).length;

      const offDaysInMonth = timeOff
        .filter((t) => t.stylist_id === s.id)
        .reduce((sum, t) => {
          const start = parseISO(t.start_date) < monthStart ? monthStart : parseISO(t.start_date);
          const end = parseISO(t.end_date) > monthEnd ? monthEnd : parseISO(t.end_date);
          if (end < start) return sum;
          return sum + eachDayOfInterval({ start, end }).length;
        }, 0);

      const availableDays = Math.max(0, totalDays - jobCount - offDaysInMonth);
      const status = jobCount >= 3 ? "Heavy schedule" : jobCount >= 1 ? "Partially booked" : "Available";
      const statusClass = jobCount >= 3 ? "text-red-600" : jobCount >= 1 ? "text-amber-700" : "text-green-700";

      return { stylist: s, jobCount, availableDays, totalDays, status, statusClass };
    });
  }, [stylists, bookings, assignments, timeOff, currentMonth]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  function bookingsForDay(day: Date) {
    const dayBookings = bookings.filter((b) => {
      const dateStr = b.clients?.wedding_date;
      if (!dateStr) return false;
      return isSameDay(parseISO(dateStr), day);
    });
    if (!selectedStylistId) return dayBookings;
    return dayBookings.filter((b) => assignments.some((a) => a.booking_id === b.id && a.stylist_id === selectedStylistId));
  }

  // Trial and rehearsal appointments are separate dates from the wedding day
  // itself, so they show up on the calendar as their own small entries on
  // whatever day they're scheduled for, linking to their own pages instead of
  // the booking page.
  type PreviewEvent = { type: "trial" | "rehearsal"; bookingId: string; brideName: string };

  function previewEventsForDay(day: Date): PreviewEvent[] {
    const events: PreviewEvent[] = [];
    for (const t of trialSessions) {
      if (!t.session_date || !isSameDay(parseISO(t.session_date), day)) continue;
      const booking = bookings.find((b) => b.id === t.booking_id);
      if (!booking) continue;
      if (selectedStylistId && !assignments.some((a) => a.booking_id === booking.id && a.stylist_id === selectedStylistId))
        continue;
      events.push({ type: "trial", bookingId: booking.id, brideName: booking.clients?.bride_name ?? "Client" });
    }
    for (const r of rehearsalSessions) {
      if (!r.session_date || !isSameDay(parseISO(r.session_date), day)) continue;
      const booking = bookings.find((b) => b.id === r.booking_id);
      if (!booking) continue;
      if (selectedStylistId && !assignments.some((a) => a.booking_id === booking.id && a.stylist_id === selectedStylistId))
        continue;
      events.push({ type: "rehearsal", bookingId: booking.id, brideName: booking.clients?.bride_name ?? "Client" });
    }
    return events;
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-script text-4xl leading-tight mb-1">Calendar</h1>
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50">{studioName} · Team schedule</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setShowFilter((f) => !f)}
            className="border border-charcoal/20 rounded-md px-4 py-2 hover:bg-beige"
          >
            Filter
          </button>
          <Link href="/stylists" className="border border-charcoal/20 rounded-md px-4 py-2 hover:bg-beige">
            Add stylist
          </Link>
          <Link href="/clients" className="bg-charcoal text-ivory rounded-md px-4 py-2 font-medium hover:bg-charcoal/90">
            New job
          </Link>
        </div>
      </div>

      {showFilter && (
        <div className="mb-4 text-sm">
          <select
            className="border border-charcoal/20 rounded-md px-3 py-2 focus:outline-none focus:border-charcoal/30"
            value={selectedStylistId}
            onChange={(e) => setSelectedStylistId(e.target.value)}
          >
            <option value="">All stylists</option>
            {stylists.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[190px_1fr_270px] gap-6">
        {/* Stylists column */}
        <div>
          <p className="text-xs uppercase tracking-wide text-charcoal/50 mb-3">Stylists</p>
          <div className="space-y-4">
            {monthStats.map(({ stylist, status, statusClass }, i) => (
              <div key={stylist.id} className="flex items-center gap-3">
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                  style={{ backgroundColor: `${colorForStylist(i)}26`, color: colorForStylist(i) }}
                >
                  {initials(stylist.name)}
                </span>
                <div>
                  <p className="text-sm font-medium">{stylist.name}</p>
                  <p className={`text-xs ${statusClass}`}>● {status}</p>
                </div>
              </div>
            ))}
            {stylists.length === 0 && <p className="text-sm text-charcoal/50">No stylists yet.</p>}
          </div>
          <Link href="/stylists" className="block mt-6 text-sm text-gold hover:underline">
            + Add stylist
          </Link>
        </div>

        {/* Calendar column */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="border border-charcoal/20 rounded-md px-3 py-1 hover:bg-beige"
            >
              ‹ Prev
            </button>
            <span className="font-serif text-lg min-w-[140px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="border border-charcoal/20 rounded-md px-3 py-1 hover:bg-beige"
            >
              Next ›
            </button>
          </div>

          <div className="bg-beige border border-charcoal/10 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 border-b border-charcoal/10 text-[10px] uppercase tracking-wide text-charcoal/50">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="p-2 text-center">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dayBookings = bookingsForDay(day);
                const dayPreviews = previewEventsForDay(day);
                const inMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[90px] border-b border-r border-charcoal/10 p-2 text-xs text-left hover:bg-white/60 transition-colors ${
                      inMonth ? "" : "bg-ivory/50 text-charcoal/30"
                    }`}
                  >
                    <div
                      className={`mb-1 inline-flex items-center justify-center ${
                        isToday ? "w-5 h-5 rounded-full bg-charcoal text-ivory text-[10px]" : ""
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                    {dayBookings.map((b) => {
                      const ids = stylistsForBooking(b.id);
                      const idx = ids.length > 0 ? stylists.findIndex((s) => s.id === ids[0]) : -1;
                      const color = idx >= 0 ? colorForStylist(idx) : "#8A8A85";
                      return (
                        <span
                          key={b.id}
                          className="block rounded px-1.5 py-0.5 mb-1 truncate"
                          style={{ backgroundColor: `${color}26`, color }}
                          title={b.clients?.bride_name ?? "Booking"}
                        >
                          {b.clients?.bride_name?.split(" ")[0] ?? "Booking"}
                        </span>
                      );
                    })}
                    {dayPreviews.map((ev) => (
                      <span
                        key={`${ev.type}-${ev.bookingId}`}
                        className="block rounded px-1.5 py-0.5 mb-1 truncate border border-gold/40 text-gold"
                        title={`${ev.type === "trial" ? "Preview" : "Rehearsal"} — ${ev.brideName}`}
                      >
                        {ev.type === "trial" ? "Preview" : "Rehearsal"}: {ev.brideName.split(" ")[0]}
                      </span>
                    ))}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-8">
          <div>
            <p className="text-xs uppercase tracking-wide text-charcoal/50 mb-3">Upcoming jobs</p>
            {upcomingJobs.length === 0 ? (
              <p className="text-sm text-charcoal/50">Nothing this month.</p>
            ) : (
              <div className="space-y-4">
                {upcomingJobs.map((b) => {
                  const ids = stylistsForBooking(b.id);
                  return (
                    <Link key={b.id} href={`/bookings/${b.id}`} className="block">
                      <p className="text-sm font-medium">{b.clients?.bride_name ?? "Unknown"}</p>
                      <p className="text-xs text-charcoal/50 mb-1">
                        {b.clients?.wedding_date ? format(parseISO(b.clients.wedding_date), "MMM d") : ""} · Party of{" "}
                        {partySize(b.id)}
                      </p>
                      <div className="flex gap-1">
                        {ids.map((id) => {
                          const idx = stylists.findIndex((s) => s.id === id);
                          const s = stylists[idx];
                          if (!s) return null;
                          return (
                            <span
                              key={id}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium"
                              style={{ backgroundColor: `${colorForStylist(idx)}26`, color: colorForStylist(idx) }}
                            >
                              {initials(s.name)}
                            </span>
                          );
                        })}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-charcoal/50 mb-3">Team color key</p>
            <div className="space-y-2 text-sm">
              {stylists.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorForStylist(i) }} />
                  {s.name}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-charcoal/50 mb-3">
              {format(currentMonth, "MMMM")} availability
            </p>
            <div className="space-y-2">
              {monthStats.map(({ stylist, availableDays, totalDays }, i) => (
                <div key={stylist.id} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-charcoal/50">{initials(stylist.name)}</span>
                  <div className="flex-1 h-1.5 bg-ivory rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(availableDays / totalDays) * 100}%`, backgroundColor: colorForStylist(i) }}
                    />
                  </div>
                  <span className="text-charcoal/50 w-8 text-right">{availableDays}d</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedDay(null)} />
          <div className="relative bg-white rounded-xl border border-charcoal/10 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal/10">
              <p className="font-serif text-lg">{format(selectedDay, "EEEE, MMMM d, yyyy")}</p>
              <button
                onClick={() => setSelectedDay(null)}
                aria-label="Close"
                className="text-charcoal/50 hover:text-charcoal text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-5">
              {bookingsForDay(selectedDay).length === 0 && previewEventsForDay(selectedDay).length === 0 ? (
                <div className="text-sm text-charcoal/60">
                  <p className="mb-3">Nothing on this date.</p>
                  <Link href="/clients" className="text-gold hover:underline">
                    + New job
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookingsForDay(selectedDay).map((b) => {
                    const ids = stylistsForBooking(b.id);
                    return (
                      <Link
                        key={b.id}
                        href={`/bookings/${b.id}`}
                        className="block border border-charcoal/10 rounded-lg p-3 hover:bg-ivory/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{b.clients?.bride_name ?? "Unknown"}</p>
                          <span className="text-[10px] uppercase tracking-wide bg-beige text-charcoal/70 px-1.5 py-0.5 rounded">
                            {b.status}
                          </span>
                        </div>
                        <p className="text-xs text-charcoal/50 mt-0.5 mb-2">
                          {b.clients?.venue ? `${b.clients.venue} · ` : ""}Party of {partySize(b.id)}
                        </p>
                        <div className="flex gap-1">
                          {ids.length === 0 ? (
                            <span className="text-xs text-charcoal/40">No stylists assigned</span>
                          ) : (
                            ids.map((id) => {
                              const idx = stylists.findIndex((s) => s.id === id);
                              const s = stylists[idx];
                              if (!s) return null;
                              return (
                                <span
                                  key={id}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium"
                                  style={{ backgroundColor: `${colorForStylist(idx)}26`, color: colorForStylist(idx) }}
                                >
                                  {initials(s.name)}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </Link>
                    );
                  })}
                  {previewEventsForDay(selectedDay).map((ev) => (
                    <Link
                      key={`${ev.type}-${ev.bookingId}`}
                      href={ev.type === "trial" ? `/trials/${ev.bookingId}` : `/rehearsal/${ev.bookingId}`}
                      className="block border border-gold/30 rounded-lg p-3 hover:bg-ivory/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{ev.brideName}</p>
                        <span className="text-[10px] uppercase tracking-wide bg-gold/10 text-gold px-1.5 py-0.5 rounded">
                          {ev.type === "trial" ? "Preview" : "Rehearsal"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <AuthGuard>
      <CalendarContent />
    </AuthGuard>
  );
}
