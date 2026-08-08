"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, Stylist, StylistTimeOff } from "@/lib/types";
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
} from "date-fns";

type BookingWithClient = Booking & { clients: Client | null };
type Assignment = { stylist_id: string; booking_id: string };

function CalendarContent() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [timeOff, setTimeOff] = useState<StylistTimeOff[]>([]);
  const [selectedStylistId, setSelectedStylistId] = useState("");
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

      setLoading(false);
    }
    load();
  }, []);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  function stylistNamesForBooking(bookingId: string) {
    return assignments
      .filter((a) => a.booking_id === bookingId)
      .map((a) => stylists.find((s) => s.id === a.stylist_id)?.name)
      .filter(Boolean) as string[];
  }

  function bookingsForDay(day: Date) {
    const dayBookings = bookings.filter((b) => {
      const dateStr = b.clients?.wedding_date;
      if (!dateStr) return false;
      return isSameDay(parseISO(dateStr), day);
    });
    if (!selectedStylistId) return dayBookings;
    return dayBookings.filter((b) => assignments.some((a) => a.booking_id === b.id && a.stylist_id === selectedStylistId));
  }

  function stylistIsOff(day: Date) {
    if (!selectedStylistId) return false;
    const dayStr = format(day, "yyyy-MM-dd");
    return timeOff.some((t) => t.stylist_id === selectedStylistId && dayStr >= t.start_date && dayStr <= t.end_date);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-serif text-2xl">Calendar</h1>
        <div className="flex items-center gap-3 text-sm">
          <select
            className="border border-charcoal/20 rounded-md px-2 py-1"
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
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="border border-charcoal/20 rounded-md px-3 py-1 hover:bg-white"
          >
            ‹ Prev
          </button>
          <span className="font-medium min-w-[140px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="border border-charcoal/20 rounded-md px-3 py-1 hover:bg-white"
          >
            Next ›
          </button>
        </div>
      </div>

      {selectedStylistId && (
        <div className="flex items-center gap-4 mb-3 text-xs text-charcoal/60">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-gold/30"></span> Booked
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-100"></span> Off
          </span>
        </div>
      )}

      {loading ? (
        <p className="text-charcoal/60">Loading...</p>
      ) : (
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
              const off = stylistIsOff(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[90px] border-b border-r border-charcoal/10 p-2 text-xs ${
                    off ? "bg-red-50" : inMonth ? "" : "bg-ivory/50 text-charcoal/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span>{format(day, "d")}</span>
                    {off && <span className="text-red-600 text-[10px]">off</span>}
                  </div>
                  {dayBookings.map((b) => {
                    const names = stylistNamesForBooking(b.id);
                    return (
                      <Link
                        key={b.id}
                        href={`/bookings/${b.id}`}
                        className="block bg-gold/20 text-charcoal rounded px-1 py-0.5 mb-1 hover:bg-gold/40"
                        title={b.clients?.bride_name ?? "Booking"}
                      >
                        <div className="truncate">{b.clients?.bride_name ?? "Booking"}</div>
                        {!selectedStylistId && (
                          <div className="truncate text-[10px] text-charcoal/60">
                            {names.length > 0 ? names.join(", ") : "Unassigned"}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
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
