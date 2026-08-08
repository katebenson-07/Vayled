"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import ContractDocument, { ContractSectionHeading } from "@/components/ContractDocument";
import ContractLetterhead from "@/components/ContractLetterhead";
import ContractSignatureBlock from "@/components/ContractSignatureBlock";
import ContractFooter from "@/components/ContractFooter";
import { supabase } from "@/lib/supabaseClient";
import { Booking, Client, ContractClause, ContractSection, ContractTemplate, Payment } from "@/lib/types";
import { buildMergeContext, applyTemplateWithMarkers } from "@/lib/merge";
import { toRoman, parseLegacyBody } from "@/lib/contractSections";
import { format, parseISO } from "date-fns";

function ContractContent() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [studioName, setStudioName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateInput, setDateInput] = useState("");
  const [savingDate, setSavingDate] = useState(false);

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
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: profileData } = await supabase
        .from("studio_settings")
        .select("studio_name")
        .eq("studio_id", userData.user.id)
        .maybeSingle();
      setStudioName(profileData?.studio_name ?? null);
    }
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

  async function saveWeddingDate() {
    if (!client || !dateInput) return;
    setSavingDate(true);
    await supabase.from("clients").update({ wedding_date: dateInput }).eq("id", client.id);
    setClient({ ...client, wedding_date: dateInput });
    setSavingDate(false);
  }

  if (loading || !booking) return <p className="text-charcoal/60">Loading...</p>;

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Number(booking.contract_total) - totalPaid;
  const context = buildMergeContext(client, booking, balanceDue, studioName);

  const templateSections = (template?.sections as ContractSection[]) ?? [];
  const legacyClauses = (template?.custom_clauses as ContractClause[]) ?? [];
  const sections: ContractSection[] =
    templateSections.length > 0
      ? templateSections
      : template?.body
      ? [...parseLegacyBody(template.body), ...legacyClauses.map((c) => ({ id: c.id, heading: c.heading, body: c.body }))]
      : [];

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

      {!client?.wedding_date && (
        <div className="flex items-center gap-2 text-sm bg-beige/30 border border-gold/30 rounded-md px-4 py-3 print:hidden">
          <span className="text-charcoal/70">No wedding date set for {client?.bride_name ?? "this client"} yet —</span>
          <input
            type="date"
            className="border border-charcoal/20 rounded-md px-2 py-1"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
          />
          <button
            onClick={saveWeddingDate}
            disabled={!dateInput || savingDate}
            className="bg-charcoal text-ivory rounded-md px-3 py-1 disabled:opacity-50"
          >
            {savingDate ? "Saving..." : "Add date"}
          </button>
        </div>
      )}

      <section className="bg-white border border-charcoal/10 rounded-xl p-8 md:p-12">
        <ContractLetterhead
          studioName={studioName || "Your Studio"}
          brideName={client?.bride_name}
          weddingDate={client?.wedding_date ? format(parseISO(client.wedding_date), "MMMM d, yyyy") : undefined}
          venue={client?.venue || undefined}
        />

        {sections.length === 0 ? (
          <p className="text-charcoal/60 text-sm">No contract template set up yet.</p>
        ) : (
          sections.map((section, i) => (
            <div key={section.id}>
              <ContractSectionHeading numeral={toRoman(i + 1)} title={section.heading} />
              <ContractDocument text={applyTemplateWithMarkers(section.body, context)} />
            </div>
          ))
        )}

        <ContractSignatureBlock studioName={studioName || "Your Studio"} brideName={client?.bride_name} />
        <ContractFooter />
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
