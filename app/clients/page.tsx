"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Client, Booking } from "@/lib/types";

function ClientsContent() {
  const [clients, setClients] = useState<Client[]>([]);
  const [bookingsByClient, setBookingsByClient] = useState<Record<string, Booking[]>>({});
  const [loading, setLoading] = useState(true);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [menuBookingId, setMenuBookingId] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .order("wedding_date", { ascending: true });
      setClients((data as Client[]) ?? []);

      const { data: bookingData } = await supabase.from("bookings").select("*");
      const grouped: Record<string, Booking[]> = {};
      for (const b of (bookingData as Booking[]) ?? []) {
        (grouped[b.client_id] ??= []).push(b);
      }
      setBookingsByClient(grouped);

      setLoading(false);
    }
    load();
  }, []);

  function openAppointmentMenu(clientId: string) {
    const clientBookings = bookingsByClient[clientId] ?? [];
    setMenuBookingId(clientBookings[0]?.id ?? "");
    setOpenMenuFor((current) => (current === clientId ? null : clientId));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl">Clients</h1>
        <Link href="/clients/new" className="bg-charcoal text-ivory rounded-md px-4 py-2 text-sm">
          Add client
        </Link>
      </div>
      {loading ? (
        <p className="text-charcoal/60">Loading...</p>
      ) : clients.length === 0 ? (
        <p className="text-charcoal/60">No clients yet.</p>
      ) : (
        <div className="bg-white border border-charcoal/10 rounded-xl divide-y divide-charcoal/10">
          {clients.map((c) => {
            const clientBookings = bookingsByClient[c.id] ?? [];
            return (
              <div key={c.id} className="flex items-center justify-between p-4 hover:bg-ivory gap-3">
                <Link href={`/clients/${c.id}`} className="flex-1 min-w-0">
                  <p className="font-medium">{c.bride_name}</p>
                  <p className="text-sm text-charcoal/60">
                    {c.wedding_date ?? "No date set"} · {c.venue ?? "No venue"}
                  </p>
                </Link>
                <span className="text-sm text-charcoal/60 hidden sm:inline">{c.email}</span>
                <div
                  className="relative shrink-0"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenMenuFor(null);
                  }}
                >
                  <button
                    onClick={() => openAppointmentMenu(c.id)}
                    disabled={clientBookings.length === 0}
                    title={clientBookings.length === 0 ? "Create a booking first" : undefined}
                    className="border border-charcoal/20 rounded-md px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    + Appointment
                  </button>
                  {openMenuFor === c.id && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-charcoal/10 rounded-lg shadow-lg p-4 z-10 text-sm">
                      {clientBookings.length > 1 && (
                        <div className="mb-3">
                          <label className="block text-charcoal/60 mb-1 text-xs">Which booking?</label>
                          <select
                            className="w-full border border-charcoal/20 rounded-md px-2 py-1.5 text-sm"
                            value={menuBookingId}
                            onChange={(e) => setMenuBookingId(e.target.value)}
                          >
                            {clientBookings.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.status} · ${b.contract_total}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Link
                          href={`/trials/${menuBookingId}`}
                          className="block border border-charcoal/20 rounded-md px-3 py-2 hover:bg-ivory"
                          onClick={() => setOpenMenuFor(null)}
                        >
                          Trial session
                        </Link>
                        <Link
                          href={`/rehearsal/${menuBookingId}`}
                          className="block border border-charcoal/20 rounded-md px-3 py-2 hover:bg-ivory"
                          onClick={() => setOpenMenuFor(null)}
                        >
                          Rehearsal hair &amp; makeup
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  return (
    <AuthGuard>
      <ClientsContent />
    </AuthGuard>
  );
}
