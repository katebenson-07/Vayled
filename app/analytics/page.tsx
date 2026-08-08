"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking } from "@/lib/types";
import { format, parseISO, subMonths, startOfMonth, isSameMonth } from "date-fns";

type MonthStat = {
  key: string;
  label: string;
  inquiries: number;
  booked: number;
  ghosted: number;
};

function AnalyticsContent() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("bookings").select("*");
      setBookings((data as Booking[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

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
  const busiestMonth = [...months].sort((a, b) => b.inquiries - a.inquiries)[0];
  const maxInquiries = Math.max(1, ...months.map((m) => m.inquiries));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl mb-1">Business analytics</h1>
        <p className="text-charcoal/60 text-sm">Inquiry volume, booking conversion, and seasonality over the last 12 months.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-charcoal/10 rounded-xl p-4">
          <p className="text-xs text-charcoal/60 mb-1">Inquiries (12mo)</p>
          <p className="text-2xl font-medium">{totalInquiries}</p>
        </div>
        <div className="bg-white border border-charcoal/10 rounded-xl p-4">
          <p className="text-xs text-charcoal/60 mb-1">Booked</p>
          <p className="text-2xl font-medium">{totalBooked}</p>
        </div>
        <div className="bg-white border border-charcoal/10 rounded-xl p-4">
          <p className="text-xs text-charcoal/60 mb-1">Ghosted</p>
          <p className="text-2xl font-medium">{totalGhosted}</p>
        </div>
        <div className="bg-white border border-charcoal/10 rounded-xl p-4">
          <p className="text-xs text-charcoal/60 mb-1">Booked rate</p>
          <p className="text-2xl font-medium">{bookedRate.toFixed(0)}%</p>
        </div>
      </div>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg">Monthly inquiry volume</h2>
          {busiestMonth && busiestMonth.inquiries > 0 && (
            <span className="text-xs bg-ivory rounded-full px-3 py-1 text-charcoal/70">
              Busiest month: {busiestMonth.label} ({busiestMonth.inquiries})
            </span>
          )}
        </div>
        <div className="flex items-end gap-2 h-40">
          {months.map((m) => (
            <div key={m.key} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div className="w-full flex flex-col justify-end" style={{ height: "120px" }}>
                <div
                  className="w-full bg-charcoal rounded-t"
                  style={{ height: `${(m.inquiries / maxInquiries) * 120}px` }}
                  title={`${m.inquiries} inquiries`}
                />
              </div>
              <span className="text-[10px] text-charcoal/60 rotate-0">{m.label.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-4">Month by month</h2>
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
  );
}

export default function AnalyticsPage() {
  return (
    <AuthGuard>
      <AnalyticsContent />
    </AuthGuard>
  );
}
