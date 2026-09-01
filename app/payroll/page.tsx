"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, Stylist, BookingStylist } from "@/lib/types";
import { format, parseISO } from "date-fns";

type BookingRow = Booking & { clients: Client | null; booking_stylists: BookingStylist[] };

type PayoutRow = {
  bookingStylistId: string;
  bookingId: string;
  stylistId: string;
  brideName: string;
  weddingDate: string | null;
  contractTotal: number;
  payPercentage: number;
  cut: number;
  paid: boolean;
  paidAt: string | null;
  role: "lead" | "assist";
};

type FilterId = "all" | "unpaid" | "paid";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function PayrollContent() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>("all");
  const [stylistFilter, setStylistFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      const [{ data: bookingData }, { data: stylistData }] = await Promise.all([
        supabase
          .from("bookings")
          .select("*, clients(*), booking_stylists(*)")
          .in("status", ["booked", "completed"]),
        supabase.from("stylists").select("*").order("name"),
      ]);
      setBookings((bookingData as BookingRow[]) ?? []);
      setStylists((stylistData as Stylist[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // One row per stylist-on-a-job, with their cut computed from the job's
  // contract total and that stylist's pay % (set on the Stylists page).
  const rows: PayoutRow[] = useMemo(() => {
    const list: PayoutRow[] = [];
    for (const b of bookings) {
      for (const bs of b.booking_stylists ?? []) {
        const stylist = stylists.find((s) => s.id === bs.stylist_id);
        if (!stylist || !stylist.is_1099 || !(Number(stylist.pay_percentage) > 0)) continue;
        const contractTotal = Number(b.contract_total) || 0;
        const payPercentage = Number(stylist.pay_percentage) || 0;
        list.push({
          bookingStylistId: bs.id,
          bookingId: b.id,
          stylistId: stylist.id,
          brideName: b.clients?.bride_name || "Unnamed",
          weddingDate: b.clients?.wedding_date ?? null,
          contractTotal,
          payPercentage,
          cut: (contractTotal * payPercentage) / 100,
          paid: bs.payout_paid ?? false,
          paidAt: bs.payout_paid_at ?? null,
          role: bs.role ?? "lead",
        });
      }
    }
    list.sort((a, b) => (a.weddingDate ?? "9999-99-99").localeCompare(b.weddingDate ?? "9999-99-99"));
    return list;
  }, [bookings, stylists]);

  const totalUnpaid = rows.filter((r) => !r.paid).reduce((sum, r) => sum + r.cut, 0);
  const totalPaid = rows.filter((r) => r.paid).reduce((sum, r) => sum + r.cut, 0);
  const activeContractors = new Set(rows.map((r) => r.stylistId)).size;

  const grouped = useMemo(() => {
    const map = new Map<string, PayoutRow[]>();
    for (const r of rows) {
      if (stylistFilter !== "all" && r.stylistId !== stylistFilter) continue;
      if (filter === "unpaid" && r.paid) continue;
      if (filter === "paid" && !r.paid) continue;
      const list = map.get(r.stylistId) ?? [];
      list.push(r);
      map.set(r.stylistId, list);
    }
    return Array.from(map.entries())
      .map(([stylistId, jobs]) => ({
        stylist: stylists.find((s) => s.id === stylistId) ?? null,
        jobs,
      }))
      .sort((a, b) => (a.stylist?.name ?? "").localeCompare(b.stylist?.name ?? ""));
  }, [rows, stylists, filter, stylistFilter]);

  async function togglePaid(row: PayoutRow) {
    const next = !row.paid;
    const payload = { payout_paid: next, payout_paid_at: next ? new Date().toISOString() : null };
    const { error } = await supabase.from("booking_stylists").update(payload).eq("id", row.bookingStylistId);
    if (!error) {
      setBookings((prev) =>
        prev.map((b) =>
          b.id !== row.bookingId
            ? b
            : {
                ...b,
                booking_stylists: b.booking_stylists.map((bs) =>
                  bs.id === row.bookingStylistId ? { ...bs, ...payload } : bs
                ),
              }
        )
      );
    }
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  const payableStylists = stylists.filter((s) => s.is_1099 && Number(s.pay_percentage) > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-script text-4xl leading-tight mb-1">Payroll</h1>
        <p className="text-charcoal/60 text-sm">
          What each 1099 contractor is owed, pulled straight from their pay % (set on the Stylists page) and the
          contract total on every job they&apos;re assigned to. Mark a job as paid once you&apos;ve sent it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs text-charcoal/50 uppercase tracking-wide mb-1">Owed (unpaid)</p>
          <p className="font-serif text-2xl">{money(totalUnpaid)}</p>
        </div>
        <div className="bg-white border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs text-charcoal/50 uppercase tracking-wide mb-1">Paid all-time</p>
          <p className="font-serif text-2xl">{money(totalPaid)}</p>
        </div>
        <div className="bg-white border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs text-charcoal/50 uppercase tracking-wide mb-1">Contractors with jobs</p>
          <p className="font-serif text-2xl">{activeContractors}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-beige/40 rounded-lg p-1">
          {(["all", "unpaid", "paid"] as FilterId[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm capitalize ${
                filter === f ? "bg-charcoal text-ivory hover:bg-charcoal/90" : "text-charcoal/60 hover:text-charcoal"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <select
          className="border border-charcoal/20 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-charcoal/30"
          value={stylistFilter}
          onChange={(e) => setStylistFilter(e.target.value)}
        >
          <option value="all">All stylists</option>
          {payableStylists.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {payableStylists.length === 0 ? (
        <p className="text-charcoal/60 text-sm">
          Nothing to show yet — set a pay % for a contractor on the{" "}
          <Link href="/stylists" className="underline">
            Stylists page
          </Link>
          , then assign them to a booked job.
        </p>
      ) : grouped.length === 0 ? (
        <p className="text-charcoal/60 text-sm">No jobs match this filter.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ stylist, jobs }) => {
            const owed = jobs.filter((j) => !j.paid).reduce((sum, j) => sum + j.cut, 0);
            const paidTotal = jobs.filter((j) => j.paid).reduce((sum, j) => sum + j.cut, 0);
            return (
              <div key={stylist?.id ?? "unknown"} className="bg-white border border-charcoal/10 rounded-xl overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-charcoal text-ivory px-4 py-3">
                  <div>
                    <span className="font-medium">{stylist?.name ?? "Unknown"}</span>
                    <span className="text-ivory/60 text-sm ml-2">{jobs[0]?.payPercentage}% per job</span>
                  </div>
                  <div className="text-sm text-ivory/80">
                    {owed > 0 && <span className="mr-3">Owed: {money(owed)}</span>}
                    <span>Paid: {money(paidTotal)}</span>
                  </div>
                </div>
                <div className="divide-y divide-charcoal/10">
                  {jobs.map((j) => (
                    <div
                      key={j.bookingStylistId}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                    >
                      <div>
                        <Link href={`/bookings/${j.bookingId}`} className="hover:underline">
                          {j.brideName}
                        </Link>
                        <span className="text-charcoal/60 ml-2">
                          {j.weddingDate ? format(parseISO(j.weddingDate), "MMM d, yyyy") : "No date set"}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide bg-beige text-charcoal/70 px-1.5 py-0.5 rounded ml-2">
                          {j.role === "lead" ? "Lead" : "Assist"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-charcoal/60">
                          {money(j.contractTotal)} contract · {j.payPercentage}%
                        </span>
                        <span className="font-medium w-20 text-right">{money(j.cut)}</span>
                        <button
                          onClick={() => togglePaid(j)}
                          className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${
                            j.paid
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-ivory text-charcoal/70 border-charcoal/20"
                          }`}
                        >
                          {j.paid ? "Paid ✓" : "Mark paid"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PayrollPage() {
  return (
    <AuthGuard>
      <PayrollContent />
    </AuthGuard>
  );
}
