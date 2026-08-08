"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Client, Booking } from "@/lib/types";

function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: clientData } = await supabase.from("clients").select("*").eq("id", id).single();
      setClient(clientData as Client);
      const { data: bookingData } = await supabase.from("bookings").select("*").eq("client_id", id);
      setBookings((bookingData as Booking[]) ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function createBooking() {
    const { data: userData } = await supabase.auth.getUser();
    const stylist_id = userData.user?.id;
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        client_id: id,
        stylist_id,
        status: "inquiry",
        contract_total: 0,
        deposit_amount: 0,
        deposit_paid: false,
      })
      .select()
      .single();
    if (!error) router.push(`/bookings/${data.id}`);
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;
  if (!client) return <p className="text-charcoal/60">Client not found.</p>;

  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">{client.bride_name}</h1>
      <p className="text-charcoal/60 mb-6">
        {client.wedding_date ?? "No date set"} · {client.venue ?? "No venue"}
      </p>

      <div className="bg-white border border-charcoal/10 rounded-xl p-6 mb-6 space-y-1 text-sm">
        <p>
          <span className="text-charcoal/60">Email:</span> {client.email || "—"}
        </p>
        <p>
          <span className="text-charcoal/60">Phone:</span> {client.phone || "—"}
        </p>
        {client.referral_source && (
          <p>
            <span className="text-charcoal/60">Referred by:</span> {client.referral_source}
          </p>
        )}
        {client.notes && (
          <p>
            <span className="text-charcoal/60">Notes:</span> {client.notes}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-lg">Bookings</h2>
        <button onClick={createBooking} className="bg-charcoal text-ivory rounded-md px-4 py-2 text-sm">
          New booking
        </button>
      </div>
      {bookings.length === 0 ? (
        <p className="text-charcoal/60">No bookings yet.</p>
      ) : (
        <div className="bg-white border border-charcoal/10 rounded-xl divide-y divide-charcoal/10">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/bookings/${b.id}`}
              className="flex items-center justify-between p-4 hover:bg-ivory"
            >
              <span className="capitalize">{b.status}</span>
              <span className="text-sm text-charcoal/60">${b.contract_total}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientDetailPage() {
  return (
    <AuthGuard>
      <ClientDetail />
    </AuthGuard>
  );
}
