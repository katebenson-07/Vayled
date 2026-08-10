"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import {
  Booking,
  Client,
  DueRule,
  InvoiceLineItem,
  InvoiceSettings,
  Payment,
  ServiceCatalogItem,
  TrialSession,
  defaultInvoiceSettings,
} from "@/lib/types";
import {
  computeTipAmount,
  formatDueDate,
  lineItemsSubtotal,
  round2,
  seedLineItemsFromBooking,
} from "@/lib/invoice";
import { format } from "date-fns";

type ScheduleKey = "deposit" | "trial" | "balance";

function DueRuleEditor({
  rule,
  weddingDate,
  onChange,
}: {
  rule: DueRule;
  weddingDate: string | null;
  onChange: (r: DueRule) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm print:hidden">
      <select
        className="border border-charcoal/20 rounded-md px-2 py-1"
        value={rule.mode}
        onChange={(e) => {
          const mode = e.target.value as DueRule["mode"];
          onChange(
            mode === "date"
              ? { mode, date: rule.date, days_before: null }
              : { mode, date: null, days_before: rule.days_before ?? 7 }
          );
        }}
      >
        <option value="date">On a set date</option>
        <option value="before_wedding">Days before wedding</option>
      </select>
      {rule.mode === "date" ? (
        <input
          type="date"
          className="border border-charcoal/20 rounded-md px-2 py-1"
          value={rule.date ?? ""}
          onChange={(e) => onChange({ ...rule, date: e.target.value || null })}
        />
      ) : (
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            className="border border-charcoal/20 rounded-md px-2 py-1 w-16"
            value={rule.days_before ?? 0}
            onChange={(e) => onChange({ ...rule, days_before: Number(e.target.value) })}
          />
          <span className="text-charcoal/60">days before wedding</span>
        </div>
      )}
      <span className="text-charcoal/50">— due {formatDueDate(rule, weddingDate)}</span>
    </div>
  );
}

function InvoiceContent() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [trial, setTrial] = useState<TrialSession | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([]);
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [settings, setSettings] = useState<InvoiceSettings>(defaultInvoiceSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    async function load() {
      const { data: bookingData } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
      const b = bookingData as Booking | null;
      setBooking(b);

      if (b) {
        const { data: clientData } = await supabase.from("clients").select("*").eq("id", b.client_id).single();
        setClient(clientData as Client);
      }

      const { data: memberData } = await supabase
        .from("party_members")
        .select("*")
        .eq("booking_id", bookingId)
        .order("order_index");

      const { data: trialData } = await supabase
        .from("trial_sessions")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();
      const trialSession = (trialData as TrialSession) ?? null;
      setTrial(trialSession);

      const { data: paymentData } = await supabase.from("payments").select("*").eq("booking_id", bookingId);
      setPayments((paymentData as Payment[]) ?? []);

      const { data: userData } = await supabase.auth.getUser();
      const { data: catalogData } = await supabase
        .from("service_catalog")
        .select("*")
        .eq("studio_id", userData.user?.id)
        .order("order_index");
      setCatalog((catalogData as ServiceCatalogItem[]) ?? []);

      if (b) {
        const existingItems = b.invoice_line_items ?? [];
        setItems(
          existingItems.length > 0 ? existingItems : seedLineItemsFromBooking(memberData ?? [], trialSession)
        );
        setSettings({ ...defaultInvoiceSettings(), ...(b.invoice_settings ?? {}) });
      }

      setLoading(false);
    }
    load();
  }, [bookingId]);

  if (loading || !booking) return <p className="text-charcoal/60">Loading...</p>;

  const weddingDate = client?.wedding_date ?? null;
  const subtotal = lineItemsSubtotal(items);
  const tipAmount = computeTipAmount(settings, subtotal);
  const total = round2(subtotal + tipAmount);

  const trialAmount = trial && Number(trial.fee) > 0 ? round2(Number(trial.fee)) : 0;
  const depositAmount =
    settings.deposit_type === "percent"
      ? round2((total * Number(settings.deposit_percent || 0)) / 100)
      : round2(Number(booking.deposit_amount || 0));
  const balanceAmount = round2(Math.max(total - depositAmount - trialAmount, 0));

  const collected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = round2(Math.max(total - collected, 0));

  function updateItem(id: string, patch: Partial<InvoiceLineItem>) {
    setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function addItem() {
    const first = catalog[0];
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        description: first ? first.name : "",
        qty: 1,
        rate: first ? Number(first.default_rate) : 0,
        catalog_id: first ? first.id : null,
      },
    ]);
  }

  function removeItem(id: string) {
    setItems(items.filter((i) => i.id !== id));
  }

  function applyCatalogChoice(id: string, catalogId: string) {
    if (catalogId === "custom") {
      updateItem(id, { catalog_id: null });
      return;
    }
    const svc = catalog.find((c) => c.id === catalogId);
    if (svc) updateItem(id, { catalog_id: svc.id, description: svc.name, rate: Number(svc.default_rate) });
  }

  async function saveInvoice() {
    if (!booking) return;
    setSaving(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        invoice_line_items: items,
        invoice_settings: settings,
        contract_total: subtotal,
      })
      .eq("id", bookingId);
    if (!error) {
      setBooking({ ...booking, invoice_line_items: items, invoice_settings: settings, contract_total: subtotal });
      setSavedAt(new Date());
    }
    setSaving(false);
  }

  async function markPaid(key: ScheduleKey, amount: number) {
    if (amount <= 0) return;
    const { data: userData } = await supabase.auth.getUser();
    const stylist_id = userData.user?.id;
    const label = key === "deposit" ? "Deposit" : key === "trial" ? "Trial / preview" : "Remaining balance";
    const { data, error } = await supabase
      .from("payments")
      .insert({
        booking_id: bookingId,
        stylist_id,
        amount,
        type: key,
        method: null,
        note: label,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (!error && data) {
      setPayments([...payments, data as Payment]);
      const nextSettings = { ...settings, [`${key}_paid`]: true } as InvoiceSettings;
      setSettings(nextSettings);
      await supabase.from("bookings").update({ invoice_settings: nextSettings }).eq("id", bookingId);
    }
  }

  const schedule: {
    key: ScheduleKey;
    label: string;
    amount: number;
    rule: DueRule;
    remind: boolean;
    paid: boolean;
  }[] = [
    {
      key: "deposit",
      label: "Deposit / Retainer",
      amount: depositAmount,
      rule: settings.deposit_due_rule,
      remind: settings.deposit_remind,
      paid: settings.deposit_paid,
    },
    {
      key: "trial",
      label: "Trial / Preview",
      amount: trialAmount,
      rule: settings.trial_due_rule,
      remind: settings.trial_remind,
      paid: settings.trial_paid,
    },
    {
      key: "balance",
      label: "Remaining Balance",
      amount: balanceAmount,
      rule: settings.balance_due_rule,
      remind: settings.balance_remind,
      paid: settings.balance_paid,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div>
          <h1 className="font-serif text-2xl mb-1">Invoice</h1>
          <p className="text-charcoal/60">
            {client?.bride_name ?? "Client"} ·{" "}
            <Link href={`/bookings/${bookingId}`} className="text-gold hover:underline">
              Back to booking
            </Link>{" "}
            ·{" "}
            <Link href="/services" className="text-gold hover:underline">
              Manage services
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-charcoal/50">Saved {format(savedAt, "h:mm a")}</span>}
          <button
            onClick={saveInvoice}
            disabled={saving}
            className="bg-charcoal text-ivory rounded-md px-4 py-2 text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save invoice"}
          </button>
          <button onClick={() => window.print()} className="border border-charcoal/20 rounded-md px-4 py-2 text-sm">
            Print / save PDF
          </button>
        </div>
      </div>

      <section className="bg-white border border-charcoal/10 rounded-xl p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="font-serif text-2xl">Invoice</p>
            <p className="text-charcoal/60 text-sm">{format(new Date(), "MMMM d, yyyy")}</p>
          </div>
          {outstanding <= 0 && (
            <span className="text-xs uppercase tracking-wide bg-green-50 text-green-700 rounded-full px-3 py-1">
              Paid in full
            </span>
          )}
        </div>

        <div className="mb-6 text-sm">
          <p className="text-charcoal/60">Billed to</p>
          <p className="font-medium">{client?.bride_name}</p>
          <p className="text-charcoal/60">{client?.email}</p>
          <p className="text-charcoal/60">
            {client?.wedding_date ?? "Wedding date not set"} · {client?.venue}
          </p>
        </div>

        {/* Services table */}
        <table className="w-full text-sm mb-2">
          <thead>
            <tr className="border-b border-charcoal/20 text-left text-charcoal/60">
              <th className="py-2">Service</th>
              <th className="py-2 w-20 text-right"># of guests</th>
              <th className="py-2 w-24 text-right">Rate</th>
              <th className="py-2 w-28 text-right">Amount</th>
              <th className="py-2 w-8 print:hidden"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-charcoal/10">
                <td className="py-2 pr-2">
                  <select
                    className="border border-charcoal/20 rounded-md px-2 py-1 w-full print:hidden"
                    value={item.catalog_id ?? "custom"}
                    onChange={(e) => applyCatalogChoice(item.id, e.target.value)}
                  >
                    <option value="custom">Custom line item...</option>
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — ${Number(c.default_rate).toFixed(2)}
                      </option>
                    ))}
                  </select>
                  {!item.catalog_id ? (
                    <input
                      className="border border-charcoal/20 rounded-md px-2 py-1 w-full mt-1"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      placeholder="Description"
                    />
                  ) : (
                    <p className="hidden print:block text-sm">{item.description}</p>
                  )}
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    min="0"
                    className="border border-charcoal/20 rounded-md px-2 py-1 w-20 text-right"
                    value={item.qty}
                    onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) })}
                  />
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="border border-charcoal/20 rounded-md px-2 py-1 w-24 text-right"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, { rate: Number(e.target.value) })}
                  />
                </td>
                <td className="py-2 text-right font-medium">
                  ${round2(Number(item.qty) * Number(item.rate)).toFixed(2)}
                </td>
                <td className="py-2 text-right print:hidden">
                  <button onClick={() => removeItem(item.id)} className="text-red-600 text-xs">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addItem} className="text-gold text-sm mb-6 print:hidden">
          + Add service
        </button>
        {catalog.length === 0 && (
          <p className="text-xs text-charcoal/50 -mt-4 mb-6 print:hidden">
            No preset services yet —{" "}
            <Link href="/services" className="text-gold hover:underline">
              add your service list
            </Link>{" "}
            to get the quick qty-based dropdown here.
          </p>
        )}

        {/* Tip */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm print:hidden">
          <span className="text-charcoal/60">Tip / gratuity</span>
          <select
            className="border border-charcoal/20 rounded-md px-2 py-1"
            value={settings.tip_type}
            onChange={(e) => setSettings({ ...settings, tip_type: e.target.value as InvoiceSettings["tip_type"] })}
          >
            <option value="none">None</option>
            <option value="percent">Percent of subtotal</option>
            <option value="custom">Custom amount</option>
          </select>
          {settings.tip_type === "percent" && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                className="border border-charcoal/20 rounded-md px-2 py-1 w-16 text-right"
                value={settings.tip_percent}
                onChange={(e) => setSettings({ ...settings, tip_percent: Number(e.target.value) })}
              />
              <span>%</span>
            </div>
          )}
          {settings.tip_type === "custom" && (
            <div className="flex items-center gap-1">
              <span>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="border border-charcoal/20 rounded-md px-2 py-1 w-24 text-right"
                value={settings.tip_amount}
                onChange={(e) => setSettings({ ...settings, tip_amount: Number(e.target.value) })}
              />
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="ml-auto max-w-xs space-y-1 text-sm mb-8">
          <div className="flex justify-between">
            <span className="text-charcoal/60">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {settings.tip_type !== "none" && (
            <div className="flex justify-between">
              <span className="text-charcoal/60">Tip</span>
              <span>${tipAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-medium pt-1 border-t border-charcoal/20">
            <span>Invoice total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment schedule */}
        <div className="mb-8">
          <p className="font-serif text-lg mb-3">Payment schedule</p>
          <div className="space-y-3">
            {schedule.map((row) => (
              <div key={row.key} className="border border-charcoal/10 rounded-lg p-4">
                <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                  <div>
                    <p className="font-medium text-sm">{row.label}</p>
                    <p className="text-charcoal/60 text-sm">${row.amount.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {row.paid ? (
                      <span className="text-xs uppercase tracking-wide bg-green-50 text-green-700 rounded-full px-3 py-1">
                        Paid
                      </span>
                    ) : (
                      <button
                        onClick={() => markPaid(row.key, row.amount)}
                        disabled={row.amount <= 0}
                        className="bg-charcoal text-ivory rounded-md px-3 py-1.5 text-xs disabled:opacity-40 print:hidden"
                      >
                        Mark paid
                      </button>
                    )}
                  </div>
                </div>
                <DueRuleEditor
                  rule={row.rule}
                  weddingDate={weddingDate}
                  onChange={(r) =>
                    setSettings({
                      ...settings,
                      [`${row.key}_due_rule`]: r,
                    } as InvoiceSettings)
                  }
                />
                <label className="flex items-center gap-2 text-sm text-charcoal/60 mt-2 print:hidden">
                  <input
                    type="checkbox"
                    checked={row.remind}
                    onChange={(e) =>
                      setSettings({ ...settings, [`${row.key}_remind`]: e.target.checked } as InvoiceSettings)
                    }
                  />
                  Auto-remind before due date
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Collected / Outstanding / Total footer */}
        <div className="grid grid-cols-3 gap-4 border-t border-charcoal/20 pt-4 mb-8 text-sm">
          <div>
            <p className="text-charcoal/60">Collected</p>
            <p className="font-medium text-green-700">${collected.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-charcoal/60">Outstanding</p>
            <p className={`font-medium ${outstanding > 0 ? "text-red-600" : "text-green-700"}`}>
              ${outstanding.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-charcoal/60">Invoice total</p>
            <p className="font-medium">${total.toFixed(2)}</p>
          </div>
        </div>

        {/* Notes & Terms */}
        <div>
          <p className="font-serif text-lg mb-2">Notes &amp; terms</p>
          <textarea
            className="w-full border border-charcoal/20 rounded-md px-3 py-2 text-sm min-h-[100px] print:border-none"
            placeholder="Payment terms, cancellation policy, or any notes for the client..."
            value={settings.notes}
            onChange={(e) => setSettings({ ...settings, notes: e.target.value })}
          />
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
