"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client } from "@/lib/types";
import { differenceInCalendarDays, formatDistanceToNowStrict, parseISO } from "date-fns";

type BookingWithClient = Booking & { clients: Client | null };

function InquiriesContent() {
  const [inquiries, setInquiries] = useState<BookingWithClient[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("bookings").select("*, clients(*)").eq("status", "inquiry");
    const sorted = ((data as any) ?? []).sort((a: any, b: any) => {
      const dateA = a.clients?.wedding_date;
      const dateB = b.clients?.wedding_date;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
    });
    setInquiries(sorted);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function convertToProject(bookingId: string) {
    setInquiries(inquiries.filter((b) => b.id !== bookingId));
    const { error } = await supabase.from("bookings").update({ status: "booked" }).eq("id", bookingId);
    if (error) load();
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h1 className="font-serif text-2xl">Inquiries</h1>
        <Link href="/bookings" className="text-sm text-gold hover:underline">
          View projects →
        </Link>
      </div>
      <p className="text-sm text-charcoal/50 mb-6">
        New leads from your inquiry form, waiting to be followed up and booked.
      </p>

      {loading ? (
        <p className="text-charcoal/60">Loading...</p>
      ) : inquiries.length === 0 ? (
        <div className="bg-white border border-charcoal/10 rounded-xl p-8 text-center">
          <p className="font-serif text-lg mb-1">No inquiries right now</p>
          <p className="text-sm text-charcoal/60">
            New leads submitted through your inquiry form will show up here first, before you convert them to a
            project.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((b) => {
            const weddingDate = b.clients?.wedding_date ? parseISO(b.clients.wedding_date) : null;
            const daysUntilWedding = weddingDate ? differenceInCalendarDays(weddingDate, new Date()) : null;
            const weddingUrgent = daysUntilWedding !== null && daysUntilWedding >= 0 && daysUntilWedding < 60;
            const weddingPast = daysUntilWedding !== null && daysUntilWedding < 0;

            const inquiredAgo = formatDistanceToNowStrict(new Date(b.created_at), { addSuffix: true });
            const daysSinceInquiry = differenceInCalendarDays(new Date(), new Date(b.created_at));
            const staleClass =
              daysSinceInquiry >= 7 ? "text-red-600" : daysSinceInquiry >= 3 ? "text-amber-600" : "text-charcoal/50";

            return (
              <div
                key={b.id}
                className="bg-white border border-charcoal/10 rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4 hover:border-charcoal/20 transition-colors"
              >
                <Link href={`/bookings/${b.id}`} className="flex-1 min-w-0 block">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <p className="font-serif text-lg">{b.clients?.bride_name ?? "Unknown client"}</p>
                    <span className={`text-xs shrink-0 ${staleClass}`}>
                      Inquired {inquiredAgo}
                      {daysSinceInquiry >= 7 ? " — follow up" : ""}
                    </span>
                  </div>
                  <p className="text-sm text-charcoal/60 mt-1">
                    {weddingDate ? (
                      <>
                        Wedding {b.clients?.wedding_date}
                        {weddingPast ? (
                          <span className="text-charcoal/40"> · date has passed</span>
                        ) : (
                          <span className={weddingUrgent ? "text-red-600" : "text-charcoal/50"}>
                            {" "}
                            · {daysUntilWedding} day{daysUntilWedding === 1 ? "" : "s"} away
                          </span>
                        )}
                      </>
                    ) : (
                      "No wedding date set"
                    )}
                  </p>
                  {(b.clients?.venue || b.clients?.referral_source) && (
                    <p className="text-xs text-charcoal/50 mt-1.5 flex items-center gap-2 flex-wrap">
                      {b.clients?.venue && <span>{b.clients.venue}</span>}
                      {b.clients?.referral_source && (
                        <span className="bg-beige/50 text-charcoal/60 rounded px-2 py-0.5 uppercase tracking-wide text-[10px]">
                          {b.clients.referral_source}
                        </span>
                      )}
                    </p>
                  )}
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
                  <button
                    onClick={() => convertToProject(b.id)}
                    className="bg-charcoal text-ivory rounded-md px-3 py-1.5 text-xs whitespace-nowrap shrink-0"
                  >
                    Convert to project
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function InquiriesPage() {
  return (
    <AuthGuard>
      <InquiriesContent />
    </AuthGuard>
  );
}
