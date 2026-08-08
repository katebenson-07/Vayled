"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { ContractTemplate, ContractClause } from "@/lib/types";
import { MERGE_FIELD_HELP } from "@/lib/merge";

const DEFAULT_TEMPLATE = `BRIDAL CONTRACT

I. HAIR SERVICES

The Hair stylist, {{studio_name}}, will provide hair services for the Client and bridal party members as outlined below:

- Bridal Hair: {{studio_name}} will provide professional hair styling for the bride on the wedding day. This includes consultation, hair preparation, and touch ups.
- Bridal Party: Hair styles may be extended to the bridal party, as specified by the Client. {{studio_name}} will provide hair styling for bridesmaids, mothers, or other individuals as agreed upon.

II. HAIR STYLIST RESPONSIBILITIES

Consultation and Bridal Preview: {{studio_name}} will conduct an initial consultation with the Client to discuss hair preferences, style, and the overall vision for the wedding day look. If requested, a bridal preview session will be scheduled to ensure the Client's satisfaction and to finalize the hair design.

Timeliness: {{studio_name}} and team will arrive punctually at the agreed-upon location on the wedding day. Hair services will be completed efficiently to adhere to the scheduled timeline, allowing the bridal party to proceed with other preparations.

Sanitation and Hygiene: {{studio_name}} and team will adhere to stringent hygiene and sanitation standards, including the use of clean and sanitized tools, brushes, and products.

Touch-up Kit: {{studio_name}} and team may provide a touch-up kit, including essential hair products for minor touch-ups during the event.

III. CLIENT'S RESPONSIBILITIES

Consultation and Communication: The Client will actively participate in the initial consultation with {{studio_name}}. This includes openly discussing hair preferences, style, and any specific requirements for the wedding day look. Timely communication with {{studio_name}} is crucial for a successful collaboration.

Timeliness: The Client and the bridal party members will be prepared and available for hair styling at the agreed-upon time. Punctuality ensures that hair services are completed within the designated timeframe, allowing for a smooth and stress-free preparation process.

Payment Adherence: The Client agrees to adhere to the payment schedule outlined in Section IV. All payments must be made as specified to secure the Hair stylist services.

Allergies and Sensitivities: The Client will disclose any known allergies or skin sensitivities to the hair stylist during the initial consultation. This information is vital to ensure the selection of suitable hair products and to conduct a patch test, if necessary.

Final Decisions: The Client acknowledges that the final hair style is subject to their approval on the wedding day. Any adjustments or changes should be communicated clearly to the hair stylist to achieve the desired outcome.

Communication of Changes: In the event of any changes to the agreed-upon schedule or hair requirements, the Client will promptly inform the Hair stylist to accommodate adjustments as needed.

IV. PAYMENT

In consideration of the hair services provided by the Hair Stylist for {{bride_name}}'s wedding on {{wedding_date}} at {{venue}}, the Client agrees to the following payment terms:

- Contract total: {{contract_total}}
- Booking Deposit: {{deposit_amount}}, due upon signing this contract.
- Remaining Balance: {{balance_due}}, due at least 7 days before the event.
- Payments can be made via Venmo @katebensonbeauty or via invoice.
- All payments are non-refundable.

V. CANCELLATION

In the event of cancellation by the Client:
- The booking deposit is non-refundable.
- Cancellations made less than 30 days before the event will result in the full payment of the agreed-upon balance.

In the event of cancellation by the hair stylist:
- {{studio_name}} reserves the right to cancel the Contract in case of unforeseen circumstances. In such cases, a full refund of any payments made will be issued to the client.

VI. REFUND POLICY

{{studio_name}}'s refund policy is as follows:
- If {{studio_name}} is unable to fulfill the hair styles due to unforeseen circumstances, {{studio_name}} will refund all payments made by the Client.
- If the Client cancels the contract, as outlined in Section V, refunds will not be provided, and any payments made are non-refundable.

VII. LIABILITY

{{studio_name}} is not responsible for any allergic reactions or adverse skin reactions that may occur as a result of hair styling. The Hair stylist will use professional, high-quality products and conduct a patch test upon request. The Client acknowledges any known allergies or sensitivities and agrees to communicate them to the Hair stylist.

VIII. PHOTOGRAPHY RELEASE

The Client agrees that the hair stylist may use photographs of the completed hair style for promotional purposes, including but not limited to the artist's portfolio and social media, unless declined below.

- [ ] I do not consent to the use of my wedding photos for the Hair Stylist's promotional purposes.

IX. AMENDMENTS

Any changes or amendments to this Contract must be made in writing and agreed upon by both Parties.

X. GOVERNING LAW

This Contract shall be governed by and construed in accordance with the laws of Newport, RI.

XI. ENTIRE AGREEMENT

This contract, including all its attachments, represents the entire understanding and agreement between {{studio_name}}, hereinafter referred to as the "Hair stylist," and {{bride_name}}, hereinafter referred to as the "Client," regarding the hair services for the wedding event scheduled on {{wedding_date}}.

Both Parties acknowledge and agree that any prior understandings, representations, discussions, or agreements, whether oral or written, related to the subject matter herein are fully replaced and superseded by this Contract. Any alterations or amendments to this Contract must be made in writing and be mutually executed by both Parties.

In the event of any conflicts, contradictions, or discrepancies between the terms of this Contract and any other documents, emails, or verbal exchanges between the parties, this written Contract shall take precedence, except where explicitly and expressly stated otherwise in writing.

Both parties, the Client and the Hair stylist, acknowledge that they have had the opportunity to seek independent legal counsel before entering into this Contract. They understand the legal implications of this Contract and willingly commit to it without duress, coercion, misrepresentation, or undue influence.

If any provision or portion of this Contract is deemed invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall remain in full force and effect to the extent permitted by law.

Both the Client and the Hair stylist consent to the use of electronic communication, including email, for the purpose of exchanging information, updates, and documents related to this Contract. Such electronic communication shall be deemed valid and binding.`;

function ContractsContent() {
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [body, setBody] = useState("");
  const [clauses, setClauses] = useState<ContractClause[]>([]);
  const [newHeading, setNewHeading] = useState("");
  const [newClauseBody, setNewClauseBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      let { data } = await supabase.from("contract_templates").select("*").maybeSingle();
      if (!data) {
        const { data: userData } = await supabase.auth.getUser();
        const studio_id = userData.user?.id;
        const { data: created } = await supabase
          .from("contract_templates")
          .insert({ studio_id, body: DEFAULT_TEMPLATE })
          .select()
          .single();
        data = created;
      }
      setTemplate(data as ContractTemplate);
      setBody((data as ContractTemplate)?.body ?? "");
      setClauses(((data as ContractTemplate)?.custom_clauses as ContractClause[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function addClause() {
    if (!newHeading.trim() || !newClauseBody.trim()) return;
    setClauses((c) => [...c, { id: crypto.randomUUID(), heading: newHeading.trim(), body: newClauseBody.trim() }]);
    setNewHeading("");
    setNewClauseBody("");
  }

  function removeClause(id: string) {
    setClauses((c) => c.filter((cl) => cl.id !== id));
  }

  async function save() {
    if (!template) return;
    await supabase
      .from("contract_templates")
      .update({ body, custom_clauses: clauses, updated_at: new Date().toISOString() })
      .eq("id", template.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-serif text-2xl mb-1">Contract template</h1>
          <p className="text-charcoal/60 text-sm">
            Edit this once — it auto-fills with each booking&apos;s details when you view a contract from that booking&apos;s page.
          </p>
        </div>
        <button onClick={save} className="bg-charcoal text-ivory rounded-md px-4 py-2 text-sm">
          Save
        </button>
      </div>
      {saved && <p className="text-sm text-green-700">Saved.</p>}

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-1">Base contract</h2>
        <p className="text-xs text-charcoal/50 mb-3">{MERGE_FIELD_HELP}</p>
        <textarea
          className="w-full border border-charcoal/20 rounded-md px-3 py-3 text-sm font-mono"
          rows={20}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </section>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-1">Your own clauses</h2>
        <p className="text-xs text-charcoal/50 mb-4">
          Add any extra terms specific to your business — they&apos;ll appear after the base contract on every booking&apos;s
          contract. Merge fields like {"{{bride_name}}"} work here too.
        </p>
        <div className="space-y-2 mb-4">
          <input
            className="w-full border border-charcoal/20 rounded-md px-3 py-2 text-sm"
            placeholder="Clause heading, e.g. Travel Fee"
            value={newHeading}
            onChange={(e) => setNewHeading(e.target.value)}
          />
          <textarea
            className="w-full border border-charcoal/20 rounded-md px-3 py-2 text-sm"
            rows={3}
            placeholder="Clause text..."
            value={newClauseBody}
            onChange={(e) => setNewClauseBody(e.target.value)}
          />
          <button onClick={addClause} className="bg-charcoal text-ivory rounded-md px-4 py-2 text-sm">
            Add clause
          </button>
        </div>
        {clauses.length === 0 ? (
          <p className="text-sm text-charcoal/50">No extra clauses yet.</p>
        ) : (
          <div className="space-y-3 text-sm">
            {clauses.map((c) => (
              <div key={c.id} className="border border-charcoal/10 rounded-md p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{c.heading}</p>
                  <button onClick={() => removeClause(c.id)} className="text-red-600 text-xs">
                    Remove
                  </button>
                </div>
                <p className="text-charcoal/60 whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ContractsPage() {
  return (
    <AuthGuard>
      <ContractsContent />
    </AuthGuard>
  );
}
