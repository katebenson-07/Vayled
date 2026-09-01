"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TeamAuthGuard, { useTeamMember } from "@/components/TeamAuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, BookingStylist, Client } from "@/lib/types";
import { format, parseISO, differenceInCalendarDays } from "date-fns";

type ScheduleRow = {
  booking: Booking;
  client: Client | null;
  role: "lead" | "assist";
};

function MySchedule() {
  const { stylistId } = useTeamMember();
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: assignments } = await supabase
        .from("booking_stylists")
        .select("*")
        .eq("stylist_id", stylistId);
      const myAssignments = (assignments as BookingStylist[]) ?? [];

      if (myAssignments.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const bookingIds = myAssignments.map((a) => a.booking_id);
      const { data: bookingData } = await supabase.from("bookings").select("*").in("id", bookingIds);
      const bookings = (bookingData as Booking[]) ?? [];

      const clientIds = Array.from(new Set(bookings.map((b) => b.client_id)));
      const { data: clientData } =
        clientIds.length > 0 ? await supabase.from("clients").select("*").in("id", clientIds) : { data: [] };
      const clientsById = new Map(((clientData as Client[]) ?? []).map((c) => [c.id, c]));

      const combined: ScheduleRow[] = bookings.map((b) => ({
        booking: b,
        client: clientsById.get(b.client_id) ?? null,
        role: myAssignments.find((a) => a.booking_id === b.id)?.role ?? "assist",
      }));

      combined.sort((a, b) => {
        const da = a.client?.wedding_date ?? "";
        const db = b.client?.wedding_date ?? "";
        return da.localeCompare(db);
      });

      setRows(combined);
      setLoading(false);
    }
    load();
  }, [stylistId]);

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  const upcoming = rows.filter((r) => {
    const days = r.client?.wedding_date ? differenceInCalendarDays(parseISO(r.client.wedding_date), new Date()) : null;
    return days === null || days >= 0;
  });
  const past = rows.filter((r) => !upcoming.includes(r));

  function Row({ row }: { row: ScheduleRow }) {
    const days = row.client?.wedding_date
      ? differenceInCalendarDays(parseISO(row.client.wedding_date), new Date())
      : null;
    return (
      <Link
        href={`/team/bookings/${row.booking.id}`}
        className="flex items-center justify-between border border-charcoal/10 rounded-lg p-4 bg-white hover:border-charcoal/30 transition-colors"
      >
        <div>
          <p className="font-serif text-lg">{row.client?.bride_name ?? "Wedding"}</p>
          <p className="text-charcoal/60 text-sm">
            {row.client?.wedding_date ? format(parseISO(row.client.wedding_date), "EEEE, MMM d, yyyy") : "No date set"}
            {row.client?.venue ? ` · ${row.client.venue}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {days !== null && days >= 0 && days <= 14 && (
            <span className="text-xs uppercase tracking-wide bg-gold/10 text-gold rounded-full px-2.5 py-1">
              {days === 0 ? "Today" : `${days}d away`}
            </span>
          )}
          <span
            className={`text-xs uppercase tracking-wide rounded-full px-2.5 py-1 ${
              row.role === "lead" ? "bg-charcoal text-ivory" : "bg-beige/60 text-charcoal/70"
            }`}
          >
            {row.role === "lead" ? "Lead" : "Assist"}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-script text-4xl leading-tight mb-1">My schedule</h1>
        <p className="text-charcoal/60 text-sm">Weddings you&apos;re assigned to.</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-charcoal/60 text-sm">You&apos;re not assigned to any weddings yet.</p>
      ) : (
        <>
          <div className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-charcoal/50 text-sm">No upcoming weddings.</p>
            ) : (
              upcoming.map((row) => <Row key={row.booking.id} row={row} />)
            )}
          </div>

          {past.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest-lg text-charcoal/40 mb-3">Past</p>
              <div className="space-y-3 opacity-70">
                {past.map((row) => (
                  <Row key={row.booking.id} row={row} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TeamPage() {
  return (
    <TeamAuthGuard>
      <MySchedule />
    </TeamAuthGuard>
  );
}
