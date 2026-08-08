"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { ContractTemplate } from "@/lib/types";
import { MERGE_FIELD_HELP } from "@/lib/merge";

const DEFAULT_TEMPLATE = `SERVICE AGREEMENT

This agreement is between the studio and {{bride_name}} for bridal hair and makeup services on {{wedding_date}} at {{venue}}.

Contract total: {{contract_total}}
Deposit due at booking: {{deposit_amount}}
Balance due: {{balance_due}}

CANCELLATION POLICY
Deposits are non-refundable. Cancellations within 30 days of the wedding date forfeit the full contract total.

LIABILITY
The studio is not liable for allergic reactions to products used with client consent, or delays caused by circumstances outside its control.

By signing below, both parties agree to the terms above.

Client signature: _______________________   Date: {{today}}`;

function ContractsContent() {
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [body, setBody] = useState("");
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
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    if (!template) return;
    await supabase.from("contract_templates").update({ body, updated_at: new Date().toISOString() }).eq("id", template.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl mb-1">Contract template</h1>
        <p className="text-charcoal/60 text-sm">
          Edit this once — it auto-fills with each booking&apos;s details when you view a contract from that booking&apos;s page.
        </p>
      </div>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <p className="text-xs text-charcoal/50 mb-3">{MERGE_FIELD_HELP}</p>
        <textarea
          className="w-full border border-charcoal/20 rounded-md px-3 py-3 text-sm font-mono"
          rows={20}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex items-center gap-3 mt-4">
          <button onClick={save} className="bg-charcoal text-ivory rounded-md px-4 py-2 text-sm">
            Save template
          </button>
          {saved && <span className="text-sm text-green-700">Saved.</span>}
        </div>
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
