"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, ContractTemplate, Payment } from "@/lib/types";
import { buildMergeContext, applyTemplate } from "@/lib/merge";

function ContractContent() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

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
    const { data: paymentData } = await supabase.from("payments").select("*").eq("booking_id", bookingId);
    setPayments((paymentData as Payment[]) ?? []);
    const { data: templateData } = await supabase.from("contract_templates").select("*").maybeSingle();
    setTemplate(templateData as ContractTemplate);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  async function markSent() {
    if (!booking) return;
    await supabase.from("bookings").update({ contract_sent: true }).eq("id", booking.id);
    setBooking({ ...booking, contract_sent: true });
  }

  async function markSigned() {
    if (!booking) return;
    const signed_at = new Date().toISOString();
    await supabase.from("bookings").update({ contract_signed: true, contract_signed_at: signed_at }).eq("id", booking.id);
    setBooking({ ...booking, contract_signed: true, contract_signed_at: signed_at });
  }

  if (loading || !booking) return <p className="text-charcoal/60">Loading...</p>;

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Number(booking.contract_total) - totalPaid;
  const context = buildMergeContext(client, booking, balanceDue);
  const filled = template ? applyTemplate(template.body, context) : "No contract template set up yet.";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div>
          <h1 className="font-serif text-2xl mb-1">Contract</h1>
          <p className="text-charcoal/60">
            {client?.bride_name ?? "Client"} ·{" "}
            <Link href={`/bookings/${bookingId}`} className="text-gold hover:underline">
              Back to booking
            </Link>{" "}
            ·{" "}
            <Link href="/contracts" className="text-gold hover:underline">
              Edit template
            </Link>
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <button onClick={markSent} disabled={booking.contract_sent} className="border border-charcoal/20 rounded-md px-3 py-2 disabled:opacity-40">
            {booking.contract_sent ? "Marked sent" : "Mark sent"}
          </button>
          <button onClick={markSigned} disabled={booking.contract_signed} className="border border-charcoal/20 rounded-md px-3 py-2 disabled:opacity-40">
            {booking.contract_signed ? "Marked signed" : "Mark signed"}
          </button>
          <button onClick={() => window.print()} className="bg-charcoal text-ivory rounded-md px-3 py-2">
            Print / save PDF
          </button>
        </div>
      </div>

      <section className="bg-white border border-charcoal/10 rounded-xl p-8">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{filled}</pre>
      </section>
    </div>
  );
}

export default function ContractPage() {
  return (
    <AuthGuard>
      <ContractContent />
    </AuthGuard>
  );
}
