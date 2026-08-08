"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, Payment, PartyMember } from "@/lib/types";
import { computeTimeline } from "@/lib/timeline";
import { format, parseISO, isSameMonth, isToday, isBefore, startOfDay } from "date-fns";

type BookingWithClient = Booking & { clients: Client | null };

function DashboardContent() {
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [nextMembers, setNextMembers] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: bookingData } = await supabase
        .from("bookings")
        .select("*, clients(*)")
        .neq("status", "cancelled");
      const list = (bookingData as BookingWithClient[]) ?? [];
      setBookings(list);

      const { data: paymentData } = await supabase.from("payments").select("*");
      setPayments((paymentData as Payment[]) ?? []);

      const today = startOfDay(new Date());
      const upcoming = list
        .filter((b) => b.clients?.wedding_date)
        .sort((a, b) => (a.clients!.wedding_date! < b.clients!.wedding_date! ? -1 : 1));
      const next = upcoming.find((b) => !isBefore(parseISO(b.clients!.wedding_date!), today));
      if (next) {
        const { data: memberData } = await supabase
          .from("party_members")
          .select("*")
          .eq("booking_id", next.id)
          .order("order_index");
        setNextMembers((memberData as PartyMember[]) ?? []);
      }

      setLoading(false);
    }
    load();
  }, []);

  function balanceFor(b: BookingWithClient) {
    const paid = payments.filter((p) => p.booking_id === b.id).reduce((sum, p) => sum + Number(p.amount), 0);
    return Number(b.contract_total) - paid;
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  const today = startOfDay(new Date());

  const thisMonthCount = bookings.filter(
    (b) => b.clients?.wedding_date && isSameMonth(parseISO(b.clients.wedding_date), today)
  ).length;

  const newInquiries = bookings.filter((b) => b.status === "inquiry").length;

  const bookedRevenue = bookings
    .filter((b) => b.status === "booked" || b.status === "completed")
    .reduce((sum, b) => sum + Number(b.contract_total), 0);

  const outstanding = bookings.reduce((sum, b) => sum + Math.max(balanceFor(b), 0), 0);

  const upcomingBookings = bookings
    .filter((b) => b.clients?.wedding_date && !isBefore(parseISO(b.clients.wedding_date), today))
    .sort((a, b) => (a.clients!.wedding_date! < b.clients!.wedding_date! ? -1 : 1))
    .slice(0, 4);

  const nextBooking = upcomingBookings[0];

  const timeline =
    nextBooking && nextBooking.ready_by_time && nextBooking.clients?.wedding_date && nextMembers.length > 0
      ? computeTimeline(new Date(`${nextBooking.clients.wedding_date}T${nextBooking.ready_by_time}`), nextMembers, 10)
      : [];

  const duePayments = bookings
    .filter((b) => balanceFor(b) > 0 && b.clients?.wedding_date)
    .sort((a, b) => (a.clients!.wedding_date! < b.clients!.wedding_date! ? -1 : 1))
    .slice(0, 4);

  function badgeFor(b: BookingWithClient) {
    if (b.status === "inquiry") return { label: "Inquiry", cls: "bg-charcoal/10 text-charcoal" };
    if (b.deposit_paid) return { label: "Deposit paid", cls: "bg-blue-50 text-blue-700" };
    return { label: "Confirmed", cls: "bg-green-50 text-green-700" };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl mb-1">Dashboard</h1>
        <p className="text-charcoal/60 text-sm">
          You have {thisMonthCount} wedding{thisMonthCount === 1 ? "" : "s"} this month.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-charcoal/10 rounded-xl p-4">
          <p className="text-xs text-charcoal/60 mb-1">This month</p>
          <p className="text-2xl font-medium">{thisMonthCount}</p>
          <p className="text-xs text-charcoal/60">bookings</p>
        </div>
        <div className="bg-white border border-charcoal/10 rounded-xl p-4">
          <p className="text-xs text-charcoal/60 mb-1">Outstanding</p>
          <p className="text-2xl font-medium">${outstanding.toFixed(0)}</p>
          <p className="text-xs text-charcoal/60">balances due</p>
        </div>
        <div className="bg-white border border-charcoal/10 rounded-xl p-4">
          <p className="text-xs text-charcoal/60 mb-1">New inquiries</p>
          <p className="text-2xl font-medium">{newInquiries}</p>
          <p className="text-xs text-charcoal/60">awaiting reply</p>
        </div>
        <div className="bg-white border border-charcoal/10 rounded-xl p-4">
          <p className="text-xs text-charcoal/60 mb-1">Booked revenue</p>
          <p className="text-2xl font-medium">${bookedRevenue.toFixed(0)}</p>
          <p className="text-xs text-charcoal/60">confirmed bookings</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-white border border-charcoal/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg">Upcoming bookings</h2>
            <Link href="/bookings" className="text-gold text-sm hover:underline">
              View all
            </Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <p className="text-charcoal/60 text-sm">Nothing upcoming yet.</p>
          ) : (
            <div className="divide-y divide-charcoal/10">
              {upcomingBookings.map((b) => {
                const badge = badgeFor(b);
                return (
                  <Link
                    key={b.id}
                    href={`/bookings/${b.id}`}
                    className="flex items-center justify-between py-3 text-sm hover:bg-ivory -mx-1 px-1 rounded"
                  >
                    <div>
                      <p className="font-medium">{b.clients?.bride_name ?? "Unknown"}</p>
                      <p className="text-charcoal/60 text-xs">
                        {b.clients?.wedding_date ? format(parseISO(b.clients.wedding_date), "MMM d") : "No date"} ·{" "}
                        {b.clients?.venue ?? "No venue"}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${badge.cls}`}>{badge.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white border border-charcoal/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg">
              {nextBooking && isToday(parseISO(nextBooking.clients!.wedding_date!)) ? "Today's schedule" : "Next wedding"}
            </h2>
            {nextBooking?.clients?.wedding_date && (
              <span className="text-charcoal/60 text-xs">
                {format(parseISO(nextBooking.clients.wedding_date), "EEE, MMM d")}
              </span>
            )}
          </div>
          {!nextBooking ? (
            <p className="text-charcoal/60 text-sm">No upcoming weddings.</p>
          ) : timeline.length === 0 ? (
            <p className="text-charcoal/60 text-sm">
              Add a ready-by time and wedding party on{" "}
              <Link href={`/bookings/${nextBooking.id}`} className="text-gold hover:underline">
                {nextBooking.clients?.bride_name ?? "this booking"}
              </Link>{" "}
              to see the schedule.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              {timeline.map((entry) => (
                <div key={entry.member.id} className="flex items-center justify-between border-b border-charcoal/10 pb-2">
                  <span>
                    {entry.member.name} <span className="text-charcoal/60">({entry.member.role})</span>
                  </span>
                  <span className="text-charcoal/60">{format(entry.start, "h:mm a")}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="bg-white border border-charcoal/10 rounded-xl p-5">
        <h2 className="font-serif text-lg mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <Link href="/clients/new" className="border border-charcoal/20 rounded-md px-3 py-2 text-center hover:bg-ivory">
            New client
          </Link>
          <Link href="/clients" className="border border-charcoal/20 rounded-md px-3 py-2 text-center hover:bg-ivory">
            New booking
          </Link>
          <Link
            href={nextBooking ? `/bookings/${nextBooking.id}` : "/bookings"}
            className="border border-charcoal/20 rounded-md px-3 py-2 text-center hover:bg-ivory"
          >
            Build timeline
          </Link>
          <button
            onClick={() => alert("Reminders aren't wired up yet — coming in a later version.")}
            className="border border-charcoal/20 rounded-md px-3 py-2 text-center hover:bg-ivory"
          >
            Send reminder
          </button>
        </div>
      </section>

      <section className="bg-white border border-charcoal/10 rounded-xl p-5">
        <h2 className="font-serif text-lg mb-3">Balances due soon</h2>
        {duePayments.length === 0 ? (
          <p className="text-charcoal/60 text-sm">Nothing outstanding.</p>
        ) : (
          <div className="divide-y divide-charcoal/10 text-sm">
            {duePayments.map((b) => {
              const overdue = b.clients?.wedding_date ? isBefore(parseISO(b.clients.wedding_date), today) : false;
              return (
                <Link
                  key={b.id}
                  href={`/bookings/${b.id}`}
                  className="flex items-center justify-between py-3 hover:bg-ivory -mx-1 px-1 rounded"
                >
                  <div>
                    <p className="font-medium">{b.clients?.bride_name ?? "Unknown"}</p>
                    <p className={`text-xs ${overdue ? "text-red-600" : "text-charcoal/60"}`}>
                      {b.clients?.wedding_date ? `Due ${format(parseISO(b.clients.wedding_date), "MMM d")}` : "No date"}
                      {overdue ? " · overdue" : ""}
                    </p>
                  </div>
                  <span className={overdue ? "text-red-600 font-medium" : "text-charcoal"}>
                    ${balanceFor(b).toFixed(0)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
