"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client } from "@/lib/types";

function BookingsContent() {
  const [bookings, setBookings] = useState<(Booking & { clients: Client | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("bookings").select("*, clients(*)");
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
    load();
  }, []);

  return (
    <div>
      <h1 className="font-serif text-2xl mb-6">Bookings</h1>
      {loading ? (
        <p className="text-charcoal/60">Loading...</p>
      ) : bookings.length === 0 ? (
        <p className="text-charcoal/60">
          No bookings yet. Add a client first, then create a booking from their profile.
        </p>
      ) : (
        <div className="bg-white border border-charcoal/10 rounded-xl divide-y divide-charcoal/10">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/bookings/${b.id}`}
              className="flex items-center justify-between p-4 hover:bg-ivory"
            >
              <div>
                <p className="font-medium">{b.clients?.bride_name ?? "Unknown client"}</p>
                <p className="text-sm text-charcoal/60">{b.clients?.wedding_date ?? "No date set"}</p>
              </div>
              <span className="text-sm capitalize text-charcoal/60">{b.status}</span>
            </Link>
          ))}
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
