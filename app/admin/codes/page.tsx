"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAIL = "katebenson@vayled.com";

interface DiscountCode {
  id: string;
  code: string;
  kind: "percent" | "free_months";
  value: number;
  note: string | null;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  active: boolean;
}

function describe(c: DiscountCode) {
  return c.kind === "percent" ? `${c.value}% off` : `${c.value} ${Number(c.value) === 1 ? "month" : "months"} free`;
}

function CodesContent() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "free_months">("percent");
  const [value, setValue] = useState("20");
  const [maxUses, setMaxUses] = useState("");
  const [expires, setExpires] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("discount_codes").select("*").order("created_at", { ascending: false });
    setCodes((data as DiscountCode[]) ?? []);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const ok = data.user?.email?.toLowerCase() === ADMIN_EMAIL;
      setAllowed(ok);
      if (ok) load();
    });
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(value);
    if (!code.trim() || !(n > 0) || (kind === "percent" && n > 100)) {
      setError("Enter a code and a valid amount (percent off must be 1-100).");
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from("discount_codes").insert({
      code: code.trim().toUpperCase(),
      kind,
      value: n,
      max_uses: maxUses ? Number(maxUses) : null,
      expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
      note: note.trim() || null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message.includes("duplicate") ? "That code already exists." : insertError.message);
      return;
    }
    setCode("");
    setMaxUses("");
    setExpires("");
    setNote("");
    load();
  }

  async function toggle(c: DiscountCode) {
    await supabase.from("discount_codes").update({ active: !c.active }).eq("id", c.id);
    load();
  }

  async function remove(c: DiscountCode) {
    if (!confirm(`Delete ${c.code}?`)) return;
    await supabase.from("discount_codes").delete().eq("id", c.id);
    load();
  }

  if (allowed === null) return <div className="p-8 text-charcoal/60">Loading...</div>;
  if (!allowed) return <div className="p-8 text-charcoal/60">This page is for the Vayled team only.</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl mb-2">Discount codes</h1>
      <p className="text-charcoal/60 mb-8">
        Create codes for founding members and promos. People enter them on the pricing page or the waitlist form.
      </p>

      <form onSubmit={create} className="border border-charcoal/10 bg-white p-6 mb-10 grid gap-4 sm:grid-cols-2">
        <label className="text-xs uppercase tracking-widest-lg text-charcoal/50">
          Code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="FOUNDING20"
            className="mt-2 w-full border border-charcoal/20 px-4 py-3 text-sm tracking-widest text-charcoal"
          />
        </label>
        <label className="text-xs uppercase tracking-widest-lg text-charcoal/50">
          Type
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className="mt-2 w-full border border-charcoal/20 px-4 py-3 text-sm text-charcoal"
          >
            <option value="percent">Percent off</option>
            <option value="free_months">Free months</option>
          </select>
        </label>
        <label className="text-xs uppercase tracking-widest-lg text-charcoal/50">
          {kind === "percent" ? "Percent off" : "Months free"}
          <input
            type="number"
            min="1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-2 w-full border border-charcoal/20 px-4 py-3 text-sm text-charcoal"
          />
        </label>
        <label className="text-xs uppercase tracking-widest-lg text-charcoal/50">
          Max uses (optional)
          <input
            type="number"
            min="1"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="e.g. 50"
            className="mt-2 w-full border border-charcoal/20 px-4 py-3 text-sm text-charcoal"
          />
        </label>
        <label className="text-xs uppercase tracking-widest-lg text-charcoal/50">
          Expires (optional)
          <input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            className="mt-2 w-full border border-charcoal/20 px-4 py-3 text-sm text-charcoal"
          />
        </label>
        <label className="text-xs uppercase tracking-widest-lg text-charcoal/50">
          Note to self (optional)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Who this is for"
            className="mt-2 w-full border border-charcoal/20 px-4 py-3 text-sm text-charcoal"
          />
        </label>
        <div className="sm:col-span-2 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-charcoal text-ivory text-xs uppercase tracking-widest-lg px-7 py-3 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create code"}
          </button>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      </form>

      <div className="border-t border-charcoal/10">
        {codes.length === 0 && <p className="py-6 text-charcoal/50">No codes yet.</p>}
        {codes.map((c) => {
          const expired = c.expires_at && new Date(c.expires_at) < new Date();
          const full = c.max_uses != null && c.uses >= c.max_uses;
          const status = !c.active ? "Paused" : expired ? "Expired" : full ? "Fully used" : "Live";
          return (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-charcoal/10">
              <div>
                <p className="tracking-widest text-charcoal">{c.code}</p>
                <p className="text-sm text-charcoal/60">
                  {describe(c)} · used {c.uses}
                  {c.max_uses != null ? ` of ${c.max_uses}` : ""}
                  {c.expires_at ? ` · ends ${new Date(c.expires_at).toLocaleDateString()}` : ""}
                  {c.note ? ` · ${c.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-5 text-xs uppercase tracking-widest-lg">
                <span className={status === "Live" ? "text-green-700" : "text-charcoal/50"}>{status}</span>
                <button onClick={() => toggle(c)} className="text-charcoal hover:underline">
                  {c.active ? "Pause" : "Resume"}
                </button>
                <button onClick={() => remove(c)} className="text-red-700 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CodesPage() {
  return (
    <AuthGuard>
      <CodesContent />
    </AuthGuard>
  );
}
