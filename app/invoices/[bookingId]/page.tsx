"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, PartyMember, Payment } from "@/lib/types";
import { format } from "date-fns";

function InvoiceContent() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: bookingData } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
      setBooking(bookingData as Booking);
      if (bookingData) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("*")
          .eq("id", (bookingData as Booking).client_id)
          .single();
        setClient(clientData as Client);
      }
      const { data: memberData } = await supabase
        .from("party_members")
        .select("*")
        .eq("booking_id", bookingId)
        .order("order_index");
      setMembers((memberData as PartyMember[]) ?? []);
      const { data: paymentData } = await supabase.from("payments").select("*").eq("booking_id", bookingId);
      setPayments((paymentData as Payment[]) ?? []);
      setLoading(false);
    }
    load();
  }, [bookingId]);

  if (loading || !booking) return <p className="text-charcoal/60">Loading...</p>;

  const partyTotal = members.reduce((sum, m) => sum + Number(m.price || 0), 0);
  const lineItems = partyTotal > 0 ? members.filter((m) => Number(m.price) > 0) : [];
  const subtotal = partyTotal > 0 ? partyTotal : Number(booking.contract_total);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Number(booking.contract_total) - totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div>
          <h1 className="font-serif text-2xl mb-1">Invoice</h1>
          <p className="text-charcoal/60">
            {client?.bride_name ?? "Client"} ·{" "}
            <Link href={`/bookings/${bookingId}`} className="text-gold hover:underline">
              Back to booking
            </Link>
          </p>
        </div>
        <button onClick={() => window.print()} className="bg-charcoal text-ivory rounded-md px-4 py-2 text-sm">
          Print / save PDF
        </button>
      </div>

      <section className="bg-white border border-charcoal/10 rounded-xl p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="font-serif text-2xl">Invoice</p>
            <p className="text-charcoal/60 text-sm">{format(new Date(), "MMMM d, yyyy")}</p>
          </div>
          {balanceDue <= 0 && (
            <span className="text-xs uppercase tracking-wide bg-green-50 text-green-700 rounded-full px-3 py-1">
              Paid in full
            </span>
          )}
        </div>

        <div className="mb-6 text-sm">
          <p className="text-charcoal/60">Billed to</p>
          <p className="font-medium">{client?.bride_name}</p>
          <p className="text-charcoal/60">{client?.email}</p>
          <p className="text-charcoal/60">{client?.wedding_date} · {client?.venue}</p>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-charcoal/20 text-left text-charcoal/60">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length > 0 ? (
              lineItems.map((m) => (
                <tr key={m.id} className="border-b border-charcoal/10">
                  <td className="py-2">
                    {m.name} — {[m.hair && "hair", m.makeup && "makeup"].filter(Boolean).join(" + ")}
                  </td>
                  <td className="py-2 text-right">${Number(m.price).toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-charcoal/10">
                <td className="py-2">Bridal hair &amp; makeup services</td>
                <td className="py-2 text-right">${subtotal.toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-charcoal/60">Contract total</span>
            <span>${Number(booking.contract_total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-charcoal/60">Paid to date</span>
            <span>${totalPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium pt-1 border-t border-charcoal/20">
            <span>Balance due</span>
            <span className={balanceDue > 0 ? "text-red-600" : "text-green-700"}>${balanceDue.toFixed(2)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function InvoicePage() {
  return (
    <AuthGuard>
      <InvoiceContent />
    </AuthGuard>
  );
}
