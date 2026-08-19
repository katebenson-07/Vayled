"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Client, Booking } from "@/lib/types";
import { format } from "date-fns";

function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState(false);

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

  async function updateClient(fields: Partial<Client>) {
    if (!client) return;
    setClient({ ...client, ...fields });
    const { error } = await supabase.from("clients").update(fields).eq("id", client.id);
    if (error) {
      // revert on failure
      setClient(client);
      setSaveError(true);
    } else {
      setSavedAt(new Date());
      setSaveError(false);
    }
  }

  async function deleteClient() {
    if (!client) return;
    const confirmed = window.confirm(
      `Delete ${client.bride_name}? This permanently deletes every booking for this client — including contracts, invoices, payments, wedding party, and timelines — along with their notes and vendors. There's no undo.`
    );
    if (!confirmed) return;
    const { error } = await supabase.from("clients").delete().eq("id", client.id);
    if (error) {
      alert("Couldn't delete this client — try again.");
      return;
    }
    router.push("/clients");
  }

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

      <div className="bg-white border border-charcoal/10 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="font-serif text-lg">Details</h2>
          {saveError ? (
            <span className="text-xs text-red-600">Couldn&apos;t save last change — try again</span>
          ) : (
            savedAt && <span className="text-xs text-green-700">Saved {format(savedAt, "h:mm a")} ✓</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-charcoal/60 mb-1">Bride&apos;s name</label>
            <input
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={client.bride_name}
              onChange={(e) => updateClient({ bride_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Partner&apos;s name</label>
            <input
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={client.partner_name ?? ""}
              onChange={(e) => updateClient({ partner_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Wedding date</label>
            <input
              type="date"
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={client.wedding_date ?? ""}
              onChange={(e) => updateClient({ wedding_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Venue</label>
            <input
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={client.venue ?? ""}
              onChange={(e) => updateClient({ venue: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Email</label>
            <input
              type="email"
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={client.email ?? ""}
              onChange={(e) => updateClient({ email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Phone</label>
            <input
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={client.phone ?? ""}
              onChange={(e) => updateClient({ phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Referred by</label>
            <input
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={client.referral_source ?? ""}
              onChange={(e) => updateClient({ referral_source: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-charcoal/60 mb-1">Notes</label>
          <textarea
            className="w-full border border-charcoal/20 rounded-md px-3 py-2"
            rows={3}
            defaultValue={client.notes ?? ""}
            onBlur={(e) => updateClient({ notes: e.target.value })}
          />
        </div>
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

      <div className="border border-red-200 rounded-xl p-5 flex items-center justify-between flex-wrap gap-3 mt-6">
        <div>
          <h2 className="text-xs uppercase tracking-widest-lg text-red-600 mb-1">Danger zone</h2>
          <p className="text-sm text-charcoal/60">
            Permanently deletes this client and every one of their bookings — contracts, invoices, payments,
            wedding parties, and timelines included. There&apos;s no undo.
          </p>
        </div>
        <button
          onClick={deleteClient}
          className="border border-red-200 text-red-600 rounded-md px-4 py-2 hover:bg-red-50 uppercase text-xs tracking-wide whitespace-nowrap"
        >
          Delete client
        </button>
      </div>
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
