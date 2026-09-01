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
  RehearsalSession,
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

type ScheduleKey = "deposit" | "trial" | "rehearsal" | "balance";

function tipCardClass(active: boolean) {
  return `border rounded-lg px-4 py-3 text-left transition-colors ${
    active ? "border-charcoal ring-1 ring-charcoal" : "border-charcoal/20 hover:border-charcoal/40"
  }`;
}

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
  const [rehearsal, setRehearsal] = useState<RehearsalSession | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([]);
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [settings, setSettings] = useState<InvoiceSettings>(defaultInvoiceSettings());
  const [depositFlatAmount, setDepositFlatAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [itemQuery, setItemQuery] = useState("");
  const [itemPickerOpen, setItemPickerOpen] = useState(false);

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

      const { data: rehearsalData } = await supabase
        .from("rehearsal_sessions")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();
      setRehearsal((rehearsalData as RehearsalSession) ?? null);

      const { data: paymentData } = await supabase.from("payments").select("*").eq("booking_id", bookingId);
      setPayments((paymentData as Payment[]) ?? []);

      const { data: userData } = await supabase.auth.getUser();
      const [{ data: catalogData }, { data: studioData }] = await Promise.all([
        supabase.from("service_catalog").select("*").eq("studio_id", userData.user?.id).order("order_index"),
        supabase.from("studio_settings").select("*").eq("studio_id", userData.user?.id).maybeSingle(),
      ]);
      setCatalog((catalogData as ServiceCatalogItem[]) ?? []);

      if (b) {
        const existingItems = b.invoice_line_items ?? [];
        setItems(
          existingItems.length > 0 ? existingItems : seedLineItemsFromBooking(memberData ?? [], trialSession)
        );

        const isNewInvoice = !b.invoice_settings || Object.keys(b.invoice_settings).length === 0;
        const nextSettings = { ...defaultInvoiceSettings(), ...(b.invoice_settings ?? {}) };
        if (isNewInvoice && studioData) {
          nextSettings.deposit_type = studioData.default_deposit_type ?? "percent";
          nextSettings.deposit_percent = studioData.default_deposit_percent ?? 25;
        }
        setSettings(nextSettings);
        setDepositFlatAmount(
          isNewInvoice && studioData?.default_deposit_type === "flat"
            ? Number(studioData.default_deposit_flat ?? 0)
            : Number(b.deposit_amount ?? 0)
        );
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

  const trialAmount =
    settings.trial_fee_override != null
      ? round2(Number(settings.trial_fee_override || 0))
      : trial && Number(trial.fee) > 0
        ? round2(Number(trial.fee))
        : 0;
  const rehearsalAmount =
    settings.rehearsal_fee_override != null
      ? round2(Number(settings.rehearsal_fee_override || 0))
      : rehearsal && Number(rehearsal.fee) > 0
        ? round2(Number(rehearsal.fee))
        : 0;
  const depositAmount =
    settings.deposit_type === "percent"
      ? round2((total * Number(settings.deposit_percent || 0)) / 100)
      : round2(Number(depositFlatAmount || 0));
  const balanceAmount = round2(Math.max(total - depositAmount - trialAmount - rehearsalAmount, 0));

  const collected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = round2(Math.max(total - collected, 0));

  function updateItem(id: string, patch: Partial<InvoiceLineItem>) {
    setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function removeItem(id: string) {
    setItems(items.filter((i) => i.id !== id));
  }

  const filteredCatalog = catalog.filter((c) => c.name.toLowerCase().includes(itemQuery.trim().toLowerCase()));

  function addItemFromCatalog(svc: ServiceCatalogItem) {
    setItems([
      ...items,
      { id: crypto.randomUUID(), description: svc.name, qty: 1, rate: Number(svc.default_rate), catalog_id: svc.id },
    ]);
    setItemQuery("");
  }

  function addBlankItem() {
    setItems([
      ...items,
      { id: crypto.randomUUID(), description: itemQuery.trim() || "New item", qty: 1, rate: 0, catalog_id: null },
    ]);
    setItemQuery("");
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
        deposit_amount: depositAmount,
      })
      .eq("id", bookingId);
    if (!error) {
      setBooking({
        ...booking,
        invoice_line_items: items,
        invoice_settings: settings,
        contract_total: subtotal,
        deposit_amount: depositAmount,
      });
      setSavedAt(new Date());
    }
    setSaving(false);
  }

  async function markPaid(key: ScheduleKey, amount: number) {
    if (amount <= 0) return;
    const { data: userData } = await supabase.auth.getUser();
    const stylist_id = userData.user?.id;
    const label =
      key === "deposit"
        ? "Deposit"
        : key === "trial"
          ? "Preview"
          : key === "rehearsal"
            ? "Rehearsal hair & makeup"
            : "Remaining balance";
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
      label: "Preview",
      amount: trialAmount,
      rule: settings.trial_due_rule,
      remind: settings.trial_remind,
      paid: settings.trial_paid,
    },
    {
      key: "rehearsal",
      label: "Rehearsal Hair & Makeup",
      amount: rehearsalAmount,
      rule: settings.rehearsal_due_rule,
      remind: settings.rehearsal_remind,
      paid: settings.rehearsal_paid,
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
          <h1 className="font-script text-4xl leading-tight mb-1">Invoice</h1>
          <p className="text-charcoal/60">
            {client?.bride_name ?? "Client"} ·{" "}
            <Link href={`/bookings/${bookingId}`} className="text-gold hover:underline">
              Back to booking
            </Link>{" "}
            ·{" "}
            <Link href="/inquiry-settings?tab=invoice" className="text-gold hover:underline">
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
            <p className="font-script text-3xl leading-tight">Invoice</p>
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
              <th className="py-2">Item</th>
              <th className="py-2 w-20 text-right">Qty</th>
              <th className="py-2 w-24 text-right">Rate</th>
              <th className="py-2 w-28 text-right">Amount</th>
              <th className="py-2 w-8 print:hidden"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-charcoal/50 text-sm">
                  No items yet — search or add one below.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-charcoal/10">
                <td className="py-2 pr-2">
                  <input
                    className="border border-charcoal/20 rounded-md px-2 py-1 w-full print:border-none"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    placeholder="Description"
                  />
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

        {/* Search-or-add item picker, styled after the reference: type to filter your
            preset services, or add a one-off item that isn't in the catalog. */}
        <div
          className="relative mb-6 print:hidden"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setItemPickerOpen(false);
          }}
        >
          <input
            className="w-full border border-charcoal/20 rounded-md px-3 py-2 text-sm"
            placeholder="Search or add a new item"
            value={itemQuery}
            onFocus={() => setItemPickerOpen(true)}
            onChange={(e) => {
              setItemQuery(e.target.value);
              setItemPickerOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (filteredCatalog.length > 0) addItemFromCatalog(filteredCatalog[0]);
              else addBlankItem();
            }}
          />
          {itemPickerOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-charcoal/10 rounded-md shadow-lg max-h-64 overflow-y-auto text-sm">
              <button
                type="button"
                onClick={addBlankItem}
                className="w-full text-left px-3 py-2 flex items-center gap-2 text-gold hover:bg-ivory"
              >
                <span>+</span>
                <span>New item{itemQuery.trim() && `: "${itemQuery.trim()}"`}</span>
              </button>
              {filteredCatalog.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => addItemFromCatalog(c)}
                  className="w-full text-left px-3 py-2 hover:bg-ivory flex items-center justify-between"
                >
                  <span>{c.name}</span>
                  <span className="text-charcoal/50">${Number(c.default_rate).toFixed(2)}</span>
                </button>
              ))}
              {filteredCatalog.length === 0 && catalog.length > 0 && (
                <p className="px-3 py-2 text-charcoal/40 text-xs">No matching preset services</p>
              )}
            </div>
          )}
        </div>
        {catalog.length === 0 && (
          <p className="text-xs text-charcoal/50 -mt-4 mb-6 print:hidden">
            No preset services yet —{" "}
            <Link href="/inquiry-settings?tab=invoice" className="text-gold hover:underline">
              add your service list
            </Link>{" "}
            so they show up here.
          </p>
        )}

        {/* Tip */}
        <div className="mb-8 print:hidden">
          <p className="text-sm text-charcoal/60 mb-2">Leave a tip</p>
          <div className="grid grid-cols-2 gap-2 max-w-sm">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, tip_type: "none" })}
              className={`${tipCardClass(settings.tip_type === "none")} flex flex-col gap-0.5`}
            >
              <span className="font-medium">No tip</span>
              <span className="text-charcoal/50 text-xs">$0.00</span>
            </button>
            {[10, 15, 20].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setSettings({ ...settings, tip_type: "percent", tip_percent: pct })}
                className={`${tipCardClass(settings.tip_type === "percent" && settings.tip_percent === pct)} flex flex-col gap-0.5`}
              >
                <span className="font-medium">{pct}%</span>
                <span className="text-charcoal/50 text-xs">${round2((subtotal * pct) / 100).toFixed(2)}</span>
              </button>
            ))}
          </div>
          <div
            onClick={() => setSettings({ ...settings, tip_type: "custom" })}
            className={`${tipCardClass(settings.tip_type === "custom")} max-w-sm w-full mt-2 flex flex-row items-center justify-between cursor-pointer`}
          >
            <span className="font-medium">Custom tip</span>
            {settings.tip_type === "custom" ? (
              <input
                type="number"
                min="0"
                step="0.01"
                autoFocus
                className="border border-charcoal/20 rounded-md px-2 py-1 w-28 text-right"
                value={settings.tip_amount}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setSettings({ ...settings, tip_amount: Number(e.target.value) })}
              />
            ) : (
              <span className="text-charcoal/40 text-xs">Enter amount</span>
            )}
          </div>
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
                {row.key === "trial" && (
                  <div className="flex items-center gap-1 text-sm mb-2 print:hidden">
                    <span>$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="border border-charcoal/20 rounded-md px-2 py-1 w-24 text-right"
                      value={settings.trial_fee_override ?? trial?.fee ?? 0}
                      onChange={(e) =>
                        setSettings({ ...settings, trial_fee_override: Number(e.target.value) })
                      }
                    />
                  </div>
                )}
                {row.key === "rehearsal" && (
                  <div className="flex items-center gap-1 text-sm mb-2 print:hidden">
                    <span>$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="border border-charcoal/20 rounded-md px-2 py-1 w-24 text-right"
                      value={settings.rehearsal_fee_override ?? rehearsal?.fee ?? 0}
                      onChange={(e) =>
                        setSettings({ ...settings, rehearsal_fee_override: Number(e.target.value) })
                      }
                    />
                  </div>
                )}
                {row.key === "deposit" && (
                  <div className="flex flex-wrap items-center gap-2 text-sm mb-2 print:hidden">
                    <select
                      className="border border-charcoal/20 rounded-md px-2 py-1"
                      value={settings.deposit_type}
                      onChange={(e) =>
                        setSettings({ ...settings, deposit_type: e.target.value as InvoiceSettings["deposit_type"] })
                      }
                    >
                      <option value="percent">% of total</option>
                      <option value="flat">Flat $</option>
                    </select>
                    {settings.deposit_type === "percent" ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="border border-charcoal/20 rounded-md px-2 py-1 w-16 text-right"
                          value={settings.deposit_percent}
                          onChange={(e) => setSettings({ ...settings, deposit_percent: Number(e.target.value) })}
                        />
                        <span>%</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="border border-charcoal/20 rounded-md px-2 py-1 w-24 text-right"
                          value={depositFlatAmount}
                          onChange={(e) => setDepositFlatAmount(Number(e.target.value))}
                        />
                      </div>
                    )}
                  </div>
                )}
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
          <div className="flex items-center gap-3 mt-3 print:hidden">
            <button
              onClick={saveInvoice}
              disabled={saving}
              className="border border-charcoal/20 rounded-md px-4 py-2 text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save payment schedule"}
            </button>
            {savedAt && <span className="text-xs text-charcoal/50">Saved {format(savedAt, "h:mm a")}</span>}
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
