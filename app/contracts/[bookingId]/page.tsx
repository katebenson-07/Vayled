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

  // Contract Details quick-fill panel — lets the stylist enter/correct the
  // bride's name, wedding date, venue, and invoice figures right from the
  // contract screen instead of hopping to the client/booking pages first.
  const [brideNameInput, setBrideNameInput] = useState("");
  const [weddingDateInput, setWeddingDateInput] = useState("");
  const [venueInput, setVenueInput] = useState("");
  const [contractTotalInput, setContractTotalInput] = useState("");
  const [depositInput, setDepositInput] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);

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

  // Populate the quick-fill panel once the client/booking records come in,
  // so stylists see (and can correct) the real current values, not blanks.
  useEffect(() => {
    if (client) {
      setBrideNameInput(client.bride_name ?? "");
      setWeddingDateInput(client.wedding_date ?? "");
      setVenueInput(client.venue ?? "");
    }
    if (booking) {
      setContractTotalInput(booking.contract_total != null ? String(booking.contract_total) : "");
      setDepositInput(booking.deposit_amount != null ? String(booking.deposit_amount) : "");
    }
  }, [client, booking]);

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

  async function saveContractDetails() {
    if (!client || !booking) return;
    setSavingDetails(true);
    setDetailsSaved(false);

    const clientUpdates = {
      bride_name: brideNameInput.trim(),
      wedding_date: weddingDateInput || null,
      venue: venueInput.trim() || null,
    };
    const bookingUpdates = {
      contract_total: contractTotalInput ? Number(contractTotalInput) : 0,
      deposit_amount: depositInput ? Number(depositInput) : 0,
    };

    await supabase.from("clients").update(clientUpdates).eq("id", client.id);
    await supabase.from("bookings").update(bookingUpdates).eq("id", booking.id);

    setClient({ ...client, ...clientUpdates });
    setBooking({ ...booking, ...bookingUpdates });
    setSavingDetails(false);
    setDetailsSaved(true);
    setTimeout(() => setDetailsSaved(false), 2500);
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
          <h1 className="font-script text-5xl leading-tight mb-1">Contract</h1>
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

      <section className="bg-white border border-charcoal/10 rounded-xl p-6 print:hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg">Contract Details</h2>
          <span className="text-xs text-charcoal/50">
            Fills in the merge fields below — bride/venue/date also update the client profile, and
            the invoice total also updates this booking&apos;s invoice.
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="text-sm">
            <span className="block text-charcoal/60 mb-1">Bride&apos;s name</span>
            <input
              type="text"
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={brideNameInput}
              onChange={(e) => setBrideNameInput(e.target.value)}
              placeholder="Bride's full name"
            />
          </label>
          <label className="text-sm">
            <span className="block text-charcoal/60 mb-1">Wedding date</span>
            <input
              type="date"
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={weddingDateInput}
              onChange={(e) => setWeddingDateInput(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="block text-charcoal/60 mb-1">Wedding location</span>
            <input
              type="text"
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={venueInput}
              onChange={(e) => setVenueInput(e.target.value)}
              placeholder="Venue name, city"
            />
          </label>
          <label className="text-sm">
            <span className="block text-charcoal/60 mb-1">Contract total ($)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={contractTotalInput}
              onChange={(e) => setContractTotalInput(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className="text-sm">
            <span className="block text-charcoal/60 mb-1">Deposit amount ($)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border border-charcoal/20 rounded-md px-3 py-2"
              value={depositInput}
              onChange={(e) => setDepositInput(e.target.value)}
              placeholder="0.00"
            />
          </label>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={saveContractDetails}
            disabled={savingDetails}
            className="bg-charcoal text-ivory rounded-md px-4 py-2 text-sm disabled:opacity-50"
          >
            {savingDetails ? "Saving..." : "Save details"}
          </button>
          {detailsSaved && <span className="text-sm text-gold">Saved — contract updated below.</span>}
        </div>
      </section>

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
