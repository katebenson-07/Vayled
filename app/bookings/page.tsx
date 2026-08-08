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
  const [tab, setTab] = useState<"inquiries" | "projects">("inquiries");

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

  useEffect(() => {
    load();
  }, []);

  async function convertToProject(bookingId: string) {
    setBookings(bookings.map((b) => (b.id === bookingId ? { ...b, status: "booked" } : b)));
    const { error } = await supabase.from("bookings").update({ status: "booked" }).eq("id", bookingId);
    if (error) load();
  }

  const inquiries = bookings.filter((b) => b.status === "inquiry");
  const projects = bookings.filter((b) => b.status !== "inquiry");
  const visible = tab === "inquiries" ? inquiries : projects;

  return (
    <div>
      <h1 className="font-serif text-2xl mb-6">Bookings</h1>

      <div className="flex gap-2 mb-6 border-b border-charcoal/10 text-sm">
        <button
          onClick={() => setTab("inquiries")}
          className={`px-4 py-2 border-b-2 -mb-px ${
            tab === "inquiries" ? "border-charcoal text-charcoal font-medium" : "border-transparent text-charcoal/50"
          }`}
        >
          Inquiries ({inquiries.length})
        </button>
        <button
          onClick={() => setTab("projects")}
          className={`px-4 py-2 border-b-2 -mb-px ${
            tab === "projects" ? "border-charcoal text-charcoal font-medium" : "border-transparent text-charcoal/50"
          }`}
        >
          Projects ({projects.length})
        </button>
      </div>

      {loading ? (
        <p className="text-charcoal/60">Loading...</p>
      ) : visible.length === 0 ? (
        <p className="text-charcoal/60">
          {tab === "inquiries"
            ? "No inquiries yet."
            : "No projects yet. Convert an inquiry to get started."}
        </p>
      ) : (
        <div className="bg-white border border-charcoal/10 rounded-xl divide-y divide-charcoal/10">
          {visible.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4 hover:bg-ivory">
              <Link href={`/bookings/${b.id}`} className="flex-1">
                <p className="font-medium">{b.clients?.bride_name ?? "Unknown client"}</p>
                <p className="text-sm text-charcoal/60">{b.clients?.wedding_date ?? "No date set"}</p>
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-sm capitalize text-charcoal/60">{b.status}</span>
                {b.status === "inquiry" && (
                  <button
                    onClick={() => convertToProject(b.id)}
                    className="bg-charcoal text-ivory rounded-md px-3 py-1.5 text-xs whitespace-nowrap"
                  >
                    Convert to project
                  </button>
                )}
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
