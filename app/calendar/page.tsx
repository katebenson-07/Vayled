"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, Stylist, StylistTimeOff, PartyMember } from "@/lib/types";
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

const STYLIST_COLORS = ["#E8637D", "#4C8BF5", "#4CAF6D", "#E0A030", "#9B6FE0", "#5CC8C0", "#E0625A", "#7A8FA6"];
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
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [timeOff, setTimeOff] = useState<StylistTimeOff[]>([]);
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([]);
  const [selectedStylistId, setSelectedStylistId] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
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
      const statusColor = jobCount >= 3 ? "#E0625A" : jobCount >= 1 ? "#E0A030" : "#4CAF6D";

      return { stylist: s, jobCount, availableDays, totalDays, status, statusColor };
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

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-serif text-2xl">
          Vayled <span className="text-charcoal/50 text-lg">/ team calendar</span>
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setShowFilter((f) => !f)}
            className="border border-charcoal/20 rounded-md px-4 py-2 hover:bg-white"
          >
            Filter
          </button>
          <Link href="/stylists" className="border border-charcoal/20 rounded-md px-4 py-2 hover:bg-white">
            Add stylist
          </Link>
          <Link href="/clients" className="bg-charcoal text-ivory rounded-md px-4 py-2 font-medium">
            New job
          </Link>
        </div>
      </div>

      {showFilter && (
        <div className="mb-4 text-sm">
          <select
            className="border border-charcoal/20 rounded-md px-3 py-2"
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
            {monthStats.map(({ stylist, status, statusColor }, i) => (
              <div key={stylist.id} className="flex items-center gap-3">
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                  style={{ backgroundColor: `${colorForStylist(i)}26`, color: colorForStylist(i) }}
                >
                  {initials(stylist.name)}
                </span>
                <div>
                  <p className="text-sm font-medium">{stylist.name}</p>
                  <p className="text-xs" style={{ color: statusColor }}>
                    ● {status}
                  </p>
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
              className="border border-charcoal/20 rounded-md px-3 py-1 hover:bg-white"
            >
              ‹ Prev
            </button>
            <span className="font-serif text-lg min-w-[140px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="border border-charcoal/20 rounded-md px-3 py-1 hover:bg-white"
            >
              Next ›
            </button>
          </div>

          <div className="bg-white border border-charcoal/10 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 border-b border-charcoal/10 text-xs text-charcoal/60">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="p-2 text-center">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dayBookings = bookingsForDay(day);
                const inMonth = isSameMonth(day, currentMonth);
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[90px] border-b border-r border-charcoal/10 p-2 text-xs ${
                      inMonth ? "" : "bg-ivory/50 text-charcoal/30"
                    }`}
                  >
                    <div className="mb-1">{format(day, "d")}</div>
                    {dayBookings.map((b) => {
                      const ids = stylistsForBooking(b.id);
                      const idx = ids.length > 0 ? stylists.findIndex((s) => s.id === ids[0]) : -1;
                      const color = idx >= 0 ? colorForStylist(idx) : "#8A8A85";
                      return (
                        <Link
                          key={b.id}
                          href={`/bookings/${b.id}`}
                          className="block rounded px-1.5 py-0.5 mb-1 truncate"
                          style={{ backgroundColor: `${color}26`, color }}
                          title={b.clients?.bride_name ?? "Booking"}
                        >
                          {b.clients?.bride_name?.split(" ")[0] ?? "Booking"}
                        </Link>
                      );
                    })}
                  </div>
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
