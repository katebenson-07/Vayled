"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client } from "@/lib/types";
import { differenceInCalendarDays, parseISO } from "date-fns";

type BookingWithClient = Booking & { clients: Client | null };

const STATUS_STYLES: Record<string, string> = {
  booked: "bg-beige/50 text-charcoal/70",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
  ghosted: "bg-red-50 text-red-600",
};

function BookingsContent() {
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("bookings").select("*, clients(*)").neq("status", "inquiry");
    const sorted = ((data as any) ?? []).sort((a: any, b: any) => {
      const dateA = a.clients?.wedding_date;
      const dateB = b.clients?.wedding_date;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
    });
    setBookings(sorted);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h1 className="font-serif text-2xl">Bookings</h1>
        <Link href="/inquiries" className="text-sm text-gold hover:underline">
          View inquiries →
        </Link>
      </div>
      <p className="text-sm text-charcoal/50 mb-6">Every booked, completed, or closed-out project.</p>

      {loading ? (
        <p className="text-charcoal/60">Loading...</p>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-charcoal/10 rounded-xl p-8 text-center">
          <p className="font-serif text-lg mb-1">No projects yet</p>
          <p className="text-sm text-charcoal/60">
            Convert an inquiry to get started, or add a client and create a new booking directly.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const weddingDate = b.clients?.wedding_date ? parseISO(b.clients.wedding_date) : null;
            const daysUntilWedding = weddingDate ? differenceInCalendarDays(weddingDate, new Date()) : null;
            const weddingSoon =
              b.status === "booked" && daysUntilWedding !== null && daysUntilWedding >= 0 && daysUntilWedding <= 14;
            const weddingPast = daysUntilWedding !== null && daysUntilWedding < 0;
            const statusClass = STATUS_STYLES[b.status] ?? "bg-beige/50 text-charcoal/70";
            const depositOwed = b.status === "booked" && !b.deposit_paid && Number(b.deposit_amount) > 0;

            return (
              <div
                key={b.id}
                className="bg-white border border-charcoal/10 rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4 hover:border-charcoal/20 transition-colors"
              >
                <Link href={`/bookings/${b.id}`} className="flex-1 min-w-0 block">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <p className="font-serif text-lg">{b.clients?.bride_name ?? "Unknown client"}</p>
                    <span className={`text-[10px] uppercase tracking-wide rounded px-2 py-0.5 shrink-0 ${statusClass}`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-sm text-charcoal/60 mt-1">
                    {weddingDate ? (
                      <>
                        Wedding {b.clients?.wedding_date}
                        {weddingPast ? (
                          <span className="text-charcoal/40"> · date has passed</span>
                        ) : (
                          <span className={weddingSoon ? "text-red-600" : "text-charcoal/50"}>
                            {" "}
                            · {daysUntilWedding} day{daysUntilWedding === 1 ? "" : "s"} away
                          </span>
                        )}
                      </>
                    ) : (
                      "No wedding date set"
                    )}
                  </p>
                  <p className="text-xs text-charcoal/50 mt-1.5 flex items-center gap-2 flex-wrap">
                    {b.clients?.venue && <span>{b.clients.venue}</span>}
                    {Number(b.contract_total) > 0 && <span>${Number(b.contract_total).toFixed(0)}</span>}
                    {depositOwed && (
                      <span className="bg-amber-50 text-amber-700 rounded px-2 py-0.5 uppercase tracking-wide text-[10px]">
                        Deposit due
                      </span>
                    )}
                  </p>
                </Link>

                <div className="flex items-center gap-4 shrink-0 md:pl-2">
                  {b.clients?.email && (
                    <a href={`mailto:${b.clients.email}`} className="text-xs text-gold hover:underline whitespace-nowrap">
                      Email
                    </a>
                  )}
                  {b.clients?.phone && (
                    <a href={`tel:${b.clients.phone}`} className="text-xs text-gold hover:underline whitespace-nowrap">
                      Call
                    </a>
                  )}
                  <Link
                    href={`/bookings/${b.id}`}
                    className="bg-charcoal text-ivory rounded-md px-3 py-1.5 text-xs whitespace-nowrap shrink-0"
                  >
                    Open
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <AuthGuard>
      <BookingsContent />
    </AuthGuard>
  );
}
