"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, BookingStatus, Client } from "@/lib/types";
import { differenceInCalendarDays, parseISO } from "date-fns";

type BookingWithClient = Booking & { clients: Client | null };

const STATUS_STYLES: Record<string, string> = {
  booked: "bg-beige/50 text-charcoal/70",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
  ghosted: "bg-red-50 text-red-600",
};

const STATUS_ACCENT: Record<string, string> = {
  booked: "bg-gold",
  completed: "bg-green-500",
  cancelled: "bg-red-300",
  ghosted: "bg-red-300",
};

const FILTERS: { key: "all" | BookingStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "booked", label: "Booked" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "ghosted", label: "Ghosted" },
];

function initials(name: string | undefined | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function BookingsContent() {
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");

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

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = `${b.clients?.bride_name ?? ""} ${b.clients?.venue ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h1 className="font-script text-5xl leading-tight">Bookings</h1>
        <Link href="/inquiries" className="text-sm text-gold hover:underline">
          View inquiries →
        </Link>
      </div>
      <p className="text-sm text-charcoal/50 mb-6">Every booked, completed, or closed-out project.</p>

      {!loading && bookings.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search couples or venues..."
            className="w-full sm:max-w-xs border border-charcoal/15 rounded-full px-4 py-2 text-sm bg-white focus:outline-none focus:border-charcoal/30"
          />
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map((f) => {
              const count = f.key === "all" ? bookings.length : bookings.filter((b) => b.status === f.key).length;
              const active = statusFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`text-xs uppercase tracking-wide rounded-full px-3 py-1.5 border transition-colors ${
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
        </div>
      )}

      {loading ? (
        <p className="text-charcoal/60">Loading...</p>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-charcoal/10 rounded-xl p-8 text-center">
          <p className="font-serif text-lg mb-1">No projects yet</p>
          <p className="text-sm text-charcoal/60">
            Convert an inquiry to get started, or add a client and create a new booking directly.
          </p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white border border-charcoal/10 rounded-xl p-8 text-center">
          <p className="font-serif text-lg mb-1">No matches</p>
          <p className="text-sm text-charcoal/60">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((b) => {
            const weddingDate = b.clients?.wedding_date ? parseISO(b.clients.wedding_date) : null;
            const daysUntilWedding = weddingDate ? differenceInCalendarDays(weddingDate, new Date()) : null;
            const weddingSoon =
              b.status === "booked" && daysUntilWedding !== null && daysUntilWedding >= 0 && daysUntilWedding <= 14;
            const weddingPast = daysUntilWedding !== null && daysUntilWedding < 0;
            const statusClass = STATUS_STYLES[b.status] ?? "bg-beige/50 text-charcoal/70";
            const accentClass = STATUS_ACCENT[b.status] ?? "bg-charcoal/20";
            const depositOwed = b.status === "booked" && !b.deposit_paid && Number(b.deposit_amount) > 0;
            const contractTotal = Number(b.contract_total) || 0;
            const depositAmount = Number(b.deposit_amount) || 0;
            const depositFraction = contractTotal > 0 && depositAmount > 0 ? Math.min(depositAmount / contractTotal, 1) : 0;

            return (
              <div
                key={b.id}
                className="bg-white border border-charcoal/10 rounded-xl overflow-hidden hover:border-charcoal/20 transition-colors flex flex-col"
              >
                <div className={`h-1.5 ${accentClass}`} />
                <Link href={`/bookings/${b.id}`} className="block p-5 flex-1">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-beige/60 text-charcoal/70 text-xs font-medium flex items-center justify-center shrink-0">
                      {initials(b.clients?.bride_name)}
                    </div>
                    <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                      <p className="font-serif text-lg leading-tight truncate">
                        {b.clients?.bride_name ?? "Unknown client"}
                      </p>
                      <span className={`text-[10px] uppercase tracking-wide rounded px-2 py-0.5 shrink-0 ${statusClass}`}>
                        {b.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-charcoal/40 w-16 shrink-0">Date</span>
                      {weddingDate ? (
                        <span className="text-charcoal/70 text-right">
                          {b.clients?.wedding_date}{" "}
                          {weddingPast ? (
                            <span className="text-charcoal/35">· passed</span>
                          ) : (
                            <span className={weddingSoon ? "text-red-600" : "text-charcoal/45"}>
                              · {daysUntilWedding}d away
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-charcoal/35 text-right">Not set</span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-charcoal/40 w-16 shrink-0">Venue</span>
                      <span className={`text-right truncate ${b.clients?.venue ? "text-charcoal/70" : "text-charcoal/35"}`}>
                        {b.clients?.venue || "Not set"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-charcoal/40 w-16 shrink-0">Contract</span>
                      <span className={`text-right ${contractTotal > 0 ? "text-charcoal/70" : "text-charcoal/35"}`}>
                        {contractTotal > 0 ? `$${contractTotal.toFixed(0)}` : "Not set"}
                      </span>
                    </div>
                  </div>

                  {contractTotal > 0 && depositAmount > 0 && (
                    <div className="mt-3 pt-3 border-t border-charcoal/5">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide mb-1">
                        <span className="text-charcoal/40">Deposit</span>
                        <span className={depositOwed ? "text-amber-700" : "text-green-700"}>
                          {depositOwed ? `$${depositAmount.toFixed(0)} due` : "Paid"}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-beige/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${b.deposit_paid ? "bg-green-500" : "bg-amber-400"}`}
                          style={{ width: `${Math.max(depositFraction * 100, 6)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Link>

                <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-1">
                  <div className="flex items-center gap-3">
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
                  </div>
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
