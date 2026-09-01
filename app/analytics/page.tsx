"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, Payment } from "@/lib/types";
import { format, parseISO, subMonths, startOfMonth, isSameMonth, getYear } from "date-fns";

type BookingWithClient = Booking & { clients: Client | null };

type MonthStat = {
  key: string;
  label: string;
  inquiries: number;
  booked: number;
  ghosted: number;
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function niceAxisMax(max: number): number {
  if (max <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const residual = max / magnitude;
  const step = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1;
  return step * magnitude;
}

function AnalyticsContent() {
  const [studioName, setStudioName] = useState("");
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

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

      const [{ data: bookingData }, { data: paymentData }] = await Promise.all([
        supabase.from("bookings").select("*, clients(*)"),
        supabase.from("payments").select("*"),
      ]);
      setBookings((bookingData as BookingWithClient[]) ?? []);
      setPayments((paymentData as Payment[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  // ---- Revenue-based stats for the selected year ----
  const paymentsInYear = payments.filter((p) => getYear(parseISO(p.paid_at)) === year);
  const ytdRevenue = paymentsInYear.reduce((sum, p) => sum + Number(p.amount), 0);

  const bookingsInYear = bookings.filter(
    (b) =>
      b.clients?.wedding_date &&
      getYear(parseISO(b.clients.wedding_date)) === year &&
      (b.status === "booked" || b.status === "completed")
  );
  const totalBookingValue = bookingsInYear.reduce((sum, b) => sum + Number(b.contract_total), 0);
  const avgBookingValue = bookingsInYear.length > 0 ? totalBookingValue / bookingsInYear.length : 0;

  const monthlyRevenue = MONTH_LABELS.map((label, i) => {
    const amount = paymentsInYear
      .filter((p) => parseISO(p.paid_at).getMonth() === i)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return { label, amount };
  });
  const bestMonth = [...monthlyRevenue].sort((a, b) => b.amount - a.amount)[0];
  const axisMax = niceAxisMax(Math.max(...monthlyRevenue.map((m) => m.amount)));
  const axisSteps = [1, 0.75, 0.5, 0.25, 0].map((f) => Math.round(axisMax * f));

  // ---- Pipeline stats (last 12 months, independent of year selector) ----
  const months: MonthStat[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = startOfMonth(subMonths(new Date(), i));
    const inMonth = bookings.filter((b) => isSameMonth(parseISO(b.created_at), monthDate));
    months.push({
      key: format(monthDate, "yyyy-MM"),
      label: format(monthDate, "MMM yyyy"),
      inquiries: inMonth.length,
      booked: inMonth.filter((b) => b.status === "booked" || b.status === "completed").length,
      ghosted: inMonth.filter((b) => b.status === "ghosted").length,
    });
  }
  const totalInquiries = months.reduce((sum, m) => sum + m.inquiries, 0);
  const totalBooked = months.reduce((sum, m) => sum + m.booked, 0);
  const totalGhosted = months.reduce((sum, m) => sum + m.ghosted, 0);
  const bookedRate = totalInquiries > 0 ? (totalBooked / totalInquiries) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-script text-5xl leading-tight mb-1">Analytics</h1>
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50">
            {studioName} · Performance overview
          </p>
        </div>
        <div className="flex items-center gap-3 border border-charcoal/20 rounded-md px-3 py-2 text-sm">
          <button onClick={() => setYear((y) => y - 1)} className="text-charcoal/60 hover:text-charcoal">
            ‹
          </button>
          <span className="font-medium w-12 text-center">{year}</span>
          <button onClick={() => setYear((y) => y + 1)} className="text-charcoal/60 hover:text-charcoal">
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">YTD revenue</p>
          <p className="font-sans font-semibold text-3xl tabular-nums">${ytdRevenue.toFixed(0)}</p>
        </div>
        <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Avg booking value</p>
          <p className="font-sans font-semibold text-3xl tabular-nums">${avgBookingValue.toFixed(0)}</p>
        </div>
        <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Total bookings</p>
          <p className="font-sans font-semibold text-3xl tabular-nums">{bookingsInYear.length}</p>
        </div>
        <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Best month</p>
          <p className="font-sans font-semibold text-3xl tabular-nums">{bestMonth && bestMonth.amount > 0 ? bestMonth.label : "—"}</p>
        </div>
      </div>

      <section className="bg-beige border border-charcoal/10 rounded-xl p-6">
        <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-4">Monthly revenue — {year}</h2>
        <div className="flex gap-3">
          <div className="flex flex-col justify-between text-xs text-charcoal/40 h-40 pb-5 shrink-0">
            {axisSteps.map((s) => (
              <span key={s}>${s >= 1000 ? `${(s / 1000).toFixed(0)}k` : s}</span>
            ))}
          </div>
          <div className="flex-1 flex items-end gap-2 h-40 border-l border-charcoal/10 pl-3">
            {monthlyRevenue.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                <div className="w-full flex-1 flex flex-col justify-end">
                  <div
                    className="w-full bg-charcoal rounded-t transition-all"
                    style={{ height: axisMax > 0 ? `${Math.max((m.amount / axisMax) * 100, m.amount > 0 ? 2 : 0)}%` : "0%" }}
                    title={`${m.label}: $${m.amount.toFixed(0)}`}
                  />
                </div>
                <span className="text-[10px] text-charcoal/50">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div>
        <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-4">Inquiry pipeline — last 12 months</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
            <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Inquiries</p>
            <p className="font-sans font-semibold text-3xl tabular-nums">{totalInquiries}</p>
          </div>
          <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
            <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Booked</p>
            <p className="font-sans font-semibold text-3xl tabular-nums">{totalBooked}</p>
          </div>
          <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
            <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Ghosted</p>
            <p className="font-sans font-semibold text-3xl tabular-nums">{totalGhosted}</p>
          </div>
          <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
            <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Booked rate</p>
            <p className="font-sans font-semibold text-3xl tabular-nums">{bookedRate.toFixed(0)}%</p>
          </div>
        </div>

        <section className="bg-white border border-charcoal/10 rounded-xl p-6">
          <h3 className="font-serif text-lg mb-4">Month by month</h3>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-4 gap-2 text-charcoal/60 font-medium pb-2 border-b border-charcoal/20">
              <span>Month</span>
              <span className="text-right">Inquiries</span>
              <span className="text-right">Booked</span>
              <span className="text-right">Ghosted</span>
            </div>
            {months.map((m) => (
              <div key={m.key} className="grid grid-cols-4 gap-2 border-b border-charcoal/10 pb-2">
                <span>{m.label}</span>
                <span className="text-right">{m.inquiries}</span>
                <span className="text-right">{m.booked}</span>
                <span className="text-right text-red-600">{m.ghosted}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <AuthGuard>
      <AnalyticsContent />
    </AuthGuard>
  );
}
