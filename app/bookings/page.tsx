"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client } from "@/lib/types";

type BookingWithClient = Booking & { clients: Client | null };

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

  async function deleteBooking(booking: BookingWithClient) {
    const confirmed = window.confirm(
      `Delete ${booking.clients?.bride_name ?? "this"}'s booking? This permanently deletes the contract, invoice, payments, wedding party, and timeline for this booking — there's no undo.`
    );
    if (!confirmed) return;
    setBookings(bookings.filter((b) => b.id !== booking.id));
    const { error } = await supabase.from("bookings").delete().eq("id", booking.id);
    if (error) load();
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <h1 className="font-serif text-2xl">Bookings</h1>
        <Link href="/inquiries" className="text-sm text-gold hover:underline">
          View inquiries →
        </Link>
      </div>

      {loading ? (
        <p className="text-charcoal/60">Loading...</p>
      ) : bookings.length === 0 ? (
        <p className="text-charcoal/60">No projects yet. Convert an inquiry to get started.</p>
      ) : (
        <div className="bg-white border border-charcoal/10 rounded-xl divide-y divide-charcoal/10">
          {bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4 hover:bg-ivory">
              <Link href={`/bookings/${b.id}`} className="flex-1">
                <p className="font-medium">{b.clients?.bride_name ?? "Unknown client"}</p>
                <p className="text-sm text-charcoal/60">{b.clients?.wedding_date ?? "No date set"}</p>
              </Link>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-sm capitalize text-charcoal/60">{b.status}</span>
                <span className="w-px h-5 bg-charcoal/10" />
                <button
                  onClick={() => deleteBooking(b)}
                  className="text-red-600/70 hover:text-red-600 text-xs uppercase tracking-wide"
                >
                  Delete
                </button>
              </div>
            </div>
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
