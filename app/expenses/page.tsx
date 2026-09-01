"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Expense, MileageTrip, Payment } from "@/lib/types";
import { format, parseISO, isSameMonth, addMonths, startOfMonth } from "date-fns";

const CATEGORIES = ["Products", "Travel", "Education", "Booth fees", "Kit & tools", "Marketing", "Other"];
const DEFAULT_MILE_RATE = 0.7; // IRS standard business mileage rate, 2025

function ExpensesContent() {
  const [studioId, setStudioId] = useState<string | null>(null);
  const [studioName, setStudioName] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [trips, setTrips] = useState<MileageTrip[]>([]);
  const [mileRate, setMileRate] = useState(DEFAULT_MILE_RATE);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [editingBudgetCat, setEditingBudgetCat] = useState<string | null>(null);

  const [form, setForm] = useState({
    expense_date: format(new Date(), "yyyy-MM-dd"),
    category: CATEGORIES[0],
    amount: "",
    vendor: "",
    note: "",
  });

  const [tripForm, setTripForm] = useState({
    trip_date: format(new Date(), "yyyy-MM-dd"),
    client_name: "",
    from_location: "",
    to_location: "",
    miles: "",
  });

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      setStudioId(userData.user.id);
      const { data: profile } = await supabase
        .from("studio_settings")
        .select("studio_name, mileage_rate, expense_budgets")
        .eq("studio_id", userData.user.id)
        .maybeSingle();
      setStudioName(profile?.studio_name || "Your studio");
      setMileRate(profile?.mileage_rate ?? DEFAULT_MILE_RATE);
      setBudgets((profile?.expense_budgets as Record<string, number>) ?? {});
    }
    const [{ data: expenseData }, { data: paymentData }, { data: tripData }] = await Promise.all([
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("payments").select("*"),
      supabase.from("mileage_trips").select("*").order("trip_date", { ascending: false }),
    ]);
    setExpenses((expenseData as Expense[]) ?? []);
    setPayments((paymentData as Payment[]) ?? []);
    setTrips((tripData as MileageTrip[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveStudioSettings(patch: Record<string, unknown>) {
    if (!studioId) return;
    await supabase
      .from("studio_settings")
      .upsert({ studio_id: studioId, ...patch, updated_at: new Date().toISOString() });
  }

  async function updateMileRate(value: number) {
    setMileRate(value);
    await saveStudioSettings({ mileage_rate: value });
  }

  async function updateBudget(category: string, value: number) {
    const next = { ...budgets, [category]: value };
    setBudgets(next);
    await saveStudioSettings({ expense_budgets: next });
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount) return;
    const { data: userData } = await supabase.auth.getUser();
    const studio_id = userData.user?.id;
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        studio_id,
        expense_date: form.expense_date,
        category: form.category,
        amount: parseFloat(form.amount) || 0,
        vendor: form.vendor || null,
        note: form.note || null,
      })
      .select()
      .single();
    if (!error && data) {
      setExpenses([data as Expense, ...expenses]);
      setForm({ ...form, amount: "", vendor: "", note: "" });
      setShowAddForm(false);
    }
  }

  async function removeExpense(id: string) {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses(expenses.filter((e) => e.id !== id));
  }

  async function addTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!tripForm.client_name.trim() || !tripForm.miles) return;
    const { data: userData } = await supabase.auth.getUser();
    const studio_id = userData.user?.id;
    const { data, error } = await supabase
      .from("mileage_trips")
      .insert({
        studio_id,
        trip_date: tripForm.trip_date,
        client_name: tripForm.client_name.trim(),
        from_location: tripForm.from_location || null,
        to_location: tripForm.to_location || null,
        miles: parseFloat(tripForm.miles) || 0,
      })
      .select()
      .single();
    if (!error && data) {
      setTrips([data as MileageTrip, ...trips]);
      setTripForm({ ...tripForm, client_name: "", from_location: "", to_location: "", miles: "" });
      setShowAddTrip(false);
    }
  }

  async function removeTrip(id: string) {
    await supabase.from("mileage_trips").delete().eq("id", id);
    setTrips(trips.filter((t) => t.id !== id));
  }

  const monthExpenses = useMemo(
    () => expenses.filter((e) => isSameMonth(parseISO(e.expense_date), month)),
    [expenses, month]
  );
  const monthPayments = useMemo(
    () => payments.filter((p) => isSameMonth(parseISO(p.paid_at), month)),
    [payments, month]
  );
  const monthTrips = useMemo(
    () => trips.filter((t) => isSameMonth(parseISO(t.trip_date), month)),
    [trips, month]
  );

  const totalExpenses = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const revenue = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const netProfit = revenue - totalExpenses;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : null;

  const totalMiles = monthTrips.reduce((sum, t) => sum + Number(t.miles), 0);
  const mileDeduction = totalMiles * mileRate;
  const totalDeductions = totalExpenses + mileDeduction;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    monthExpenses.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount)));
    return CATEGORIES.map((category) => ({ category, amount: map.get(category) ?? 0 })).sort(
      (a, b) => b.amount - a.amount
    );
  }, [monthExpenses]);

  function exportExpensesCsv() {
    const header = "Date,Category,Amount,Vendor,Note\n";
    const rows = monthExpenses
      .map((e) => [e.expense_date, e.category, Number(e.amount).toFixed(2), e.vendor ?? "", (e.note ?? "").replace(/,/g, ";")].join(","))
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vayled-expenses-${format(month, "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportMileageCsv() {
    const header = "Date,Client,From,To,Miles,Deduction\n";
    const rows = monthTrips
      .map((t) =>
        [
          t.trip_date,
          (t.client_name ?? "").replace(/,/g, ";"),
          (t.from_location ?? "").replace(/,/g, ";"),
          (t.to_location ?? "").replace(/,/g, ";"),
          Number(t.miles).toFixed(1),
          (Number(t.miles) * mileRate).toFixed(2),
        ].join(",")
      )
      .join("\n");
    const summary = `\nTotal miles,${totalMiles.toFixed(1)}\nRate,$${mileRate.toFixed(2)}/mile\nTotal deduction,$${mileDeduction.toFixed(2)}\n`;
    const blob = new Blob([header + rows + summary], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vayled-mileage-${format(month, "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-script text-4xl leading-tight mb-1">Expenses</h1>
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50">{studioName} · Expense tracker</p>
        </div>
        <div className="flex items-center gap-3 border border-charcoal/20 rounded-md px-3 py-2 text-sm">
          <button onClick={() => setMonth((m) => addMonths(m, -1))} className="text-charcoal/60 hover:text-charcoal">
            ‹
          </button>
          <span className="font-medium w-20 text-center">{format(month, "MMM yyyy")}</span>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="text-charcoal/60 hover:text-charcoal">
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Total expenses</p>
          <p className="font-sans font-semibold text-3xl tabular-nums">${totalExpenses.toFixed(2)}</p>
          <p className="text-xs text-charcoal/50 mt-1">
            {monthExpenses.length} item{monthExpenses.length === 1 ? "" : "s"} logged
          </p>
        </div>
        <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Revenue</p>
          <p className="font-sans font-semibold text-3xl tabular-nums">${revenue.toFixed(0)}</p>
          <p className="text-xs text-charcoal/50 mt-1">{format(month, "MMM yyyy")}</p>
        </div>
        <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Net profit</p>
          <p className="font-sans font-semibold text-3xl tabular-nums">${netProfit.toFixed(2)}</p>
          <p className={`text-xs mt-1 ${netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
            {netProfit >= 0 ? "In the green" : "In the red"}
          </p>
        </div>
        <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Margin</p>
          <p className="font-sans font-semibold text-3xl tabular-nums">{margin === null ? "—" : `${margin.toFixed(0)}%`}</p>
          <p className="text-xs text-charcoal/50 mt-1">After all expenses</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <section className="bg-beige border border-charcoal/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50">Expense log</h2>
            <div className="flex items-center gap-3">
              <button onClick={exportExpensesCsv} className="text-gold text-xs hover:underline">
                Export CSV
              </button>
              <button onClick={() => setShowAddForm((v) => !v)} className="text-gold text-sm hover:underline">
                {showAddForm ? "Cancel" : "+ Add expense"}
              </button>
            </div>
          </div>

          {showAddForm && (
            <form onSubmit={addExpense} className="flex flex-wrap items-end gap-2 text-sm mb-5 bg-white/50 border border-charcoal/10 rounded-md p-3">
              <div>
                <label className="block text-charcoal/60 mb-1">Date</label>
                <input
                  type="date"
                  className="border border-charcoal/20 rounded-md px-2 py-1 focus:outline-none focus:border-charcoal/30"
                  value={form.expense_date}
                  onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-charcoal/60 mb-1">Category</label>
                <select
                  className="border border-charcoal/20 rounded-md px-2 py-1 focus:outline-none focus:border-charcoal/30"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-charcoal/60 mb-1">Amount ($)</label>
                <input
                  type="number"
                  className="border border-charcoal/20 rounded-md px-2 py-1 w-28 focus:outline-none focus:border-charcoal/30"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-charcoal/60 mb-1">Description</label>
                <input
                  className="border border-charcoal/20 rounded-md px-2 py-1 w-full focus:outline-none focus:border-charcoal/30"
                  placeholder="e.g. MAC cosmetics restock"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-charcoal/60 mb-1">Vendor</label>
                <input
                  className="border border-charcoal/20 rounded-md px-2 py-1 focus:outline-none focus:border-charcoal/30"
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                />
              </div>
              <button type="submit" className="bg-charcoal text-ivory rounded-md px-4 py-1.5 hover:bg-charcoal/90">
                Add
              </button>
            </form>
          )}

          {monthExpenses.length === 0 ? (
            <p className="text-charcoal/60 text-sm">No expenses logged for {format(month, "MMMM yyyy")}.</p>
          ) : (
            <div className="text-sm">
              <div className="grid grid-cols-[80px_1fr_120px_80px] gap-3 text-[10px] uppercase tracking-wide text-charcoal/50 pb-2 border-b border-charcoal/20">
                <span>Date</span>
                <span>Description</span>
                <span>Category</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="divide-y divide-charcoal/10">
                {monthExpenses.map((e) => (
                  <div key={e.id} className="grid grid-cols-[80px_1fr_120px_80px] gap-3 items-center py-2.5 group">
                    <span className="text-charcoal/60 text-xs">{format(parseISO(e.expense_date), "MMM d")}</span>
                    <span className="truncate">
                      {e.note || e.vendor || e.category}
                      {e.note && e.vendor ? <span className="text-charcoal/40"> · {e.vendor}</span> : ""}
                    </span>
                    <span className="text-charcoal/60 text-xs">{e.category}</span>
                    <span className="flex items-center justify-end gap-2">
                      ${Number(e.amount).toFixed(2)}
                      <button
                        onClick={() => removeExpense(e.id)}
                        className="text-red-600 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="bg-beige border border-charcoal/10 rounded-xl p-6">
          <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-4">Budget by category</h2>
          <div className="space-y-4">
            {byCategory.map((c) => {
              const budget = budgets[c.category] ?? 0;
              const pct = budget > 0 ? Math.min(100, (c.amount / budget) * 100) : 0;
              const over = budget > 0 && c.amount > budget;
              return (
                <div key={c.category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{c.category}</span>
                    <span className={`text-xs tabular-nums ${over ? "text-red-600 font-medium" : "text-charcoal/60"}`}>
                      ${c.amount.toFixed(0)}
                      <span className="text-charcoal/40"> / </span>
                      {editingBudgetCat === c.category ? (
                        <input
                          autoFocus
                          type="number"
                          defaultValue={budget || ""}
                          className="w-14 border-b border-charcoal/30 bg-transparent text-right focus:outline-none"
                          onBlur={(e) => {
                            updateBudget(c.category, Number(e.target.value) || 0);
                            setEditingBudgetCat(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => setEditingBudgetCat(c.category)}
                          className="hover:underline"
                          title="Click to set budget"
                        >
                          {budget > 0 ? `$${budget.toFixed(0)}` : "set budget"}
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${over ? "bg-red-500" : "bg-charcoal"}`}
                      style={{ width: `${budget > 0 ? pct : c.amount > 0 ? 100 : 0}%` }}
                    />
                  </div>
                  {over && (
                    <p className="text-[10px] text-red-600 mt-1">${(c.amount - budget).toFixed(0)} over budget</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Mileage tracker */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <section className="bg-beige border border-charcoal/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
            <div>
              <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50">Mileage log</h2>
              <p className="text-xs text-charcoal/50 mt-1">Tracks business driving for tax deductions</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={exportMileageCsv} className="text-gold text-xs hover:underline">
                Export CSV
              </button>
              <button onClick={() => setShowAddTrip((v) => !v)} className="text-gold text-sm hover:underline">
                {showAddTrip ? "Cancel" : "+ Add trip"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 border border-charcoal/20 rounded-md px-3 py-1.5 text-xs w-fit mt-4 mb-4">
            <span className="uppercase tracking-wide text-charcoal/50">IRS rate</span>
            <span className="text-charcoal/50">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={mileRate}
              onChange={(e) => updateMileRate(Number(e.target.value) || 0)}
              className="w-14 bg-transparent focus:outline-none font-medium"
            />
            <span className="text-charcoal/50">/mile</span>
          </div>

          {showAddTrip && (
            <form onSubmit={addTrip} className="flex flex-wrap items-end gap-2 text-sm mb-5 bg-white/50 border border-charcoal/10 rounded-md p-3">
              <div>
                <label className="block text-charcoal/60 mb-1">Date</label>
                <input
                  type="date"
                  className="border border-charcoal/20 rounded-md px-2 py-1 focus:outline-none focus:border-charcoal/30"
                  value={tripForm.trip_date}
                  onChange={(e) => setTripForm({ ...tripForm, trip_date: e.target.value })}
                />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-charcoal/60 mb-1">Client</label>
                <input
                  className="border border-charcoal/20 rounded-md px-2 py-1 w-full focus:outline-none focus:border-charcoal/30"
                  placeholder="e.g. Sarah M."
                  value={tripForm.client_name}
                  onChange={(e) => setTripForm({ ...tripForm, client_name: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <div>
                  <label className="block text-charcoal/60 mb-1">From</label>
                  <input
                    className="border border-charcoal/20 rounded-md px-2 py-1 w-24 focus:outline-none focus:border-charcoal/30"
                    value={tripForm.from_location}
                    onChange={(e) => setTripForm({ ...tripForm, from_location: e.target.value })}
                  />
                </div>
                <span className="text-charcoal/40 mb-1.5">→</span>
                <div>
                  <label className="block text-charcoal/60 mb-1">To</label>
                  <input
                    className="border border-charcoal/20 rounded-md px-2 py-1 w-24 focus:outline-none focus:border-charcoal/30"
                    value={tripForm.to_location}
                    onChange={(e) => setTripForm({ ...tripForm, to_location: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-charcoal/60 mb-1">Miles</label>
                <input
                  type="number"
                  step="0.1"
                  className="border border-charcoal/20 rounded-md px-2 py-1 w-20 focus:outline-none focus:border-charcoal/30"
                  value={tripForm.miles}
                  onChange={(e) => setTripForm({ ...tripForm, miles: e.target.value })}
                />
              </div>
              <span className="text-xs text-charcoal/50 tabular-nums pb-2">
                {tripForm.miles ? `$${(Number(tripForm.miles) * mileRate).toFixed(2)}` : "—"}
              </span>
              <button type="submit" className="bg-charcoal text-ivory rounded-md px-4 py-1.5 hover:bg-charcoal/90">
                Add
              </button>
            </form>
          )}

          {monthTrips.length === 0 ? (
            <p className="text-charcoal/60 text-sm">No trips logged for {format(month, "MMMM yyyy")}.</p>
          ) : (
            <div className="text-sm">
              <div className="grid grid-cols-[70px_1fr_1fr_60px_70px] gap-3 text-[10px] uppercase tracking-wide text-charcoal/50 pb-2 border-b border-charcoal/20">
                <span>Date</span>
                <span>Client</span>
                <span>Route</span>
                <span className="text-right">Miles</span>
                <span className="text-right">Deduct</span>
              </div>
              <div className="divide-y divide-charcoal/10">
                {monthTrips.map((t) => (
                  <div key={t.id} className="grid grid-cols-[70px_1fr_1fr_60px_70px] gap-3 items-center py-2.5 group">
                    <span className="text-charcoal/60 text-xs">{format(parseISO(t.trip_date), "MMM d")}</span>
                    <span className="truncate">{t.client_name}</span>
                    <span className="text-charcoal/60 text-xs truncate">
                      {t.from_location} {t.from_location || t.to_location ? "→" : ""} {t.to_location}
                    </span>
                    <span className="text-right tabular-nums">{Number(t.miles).toFixed(1)}</span>
                    <span className="flex items-center justify-end gap-2">
                      ${(Number(t.miles) * mileRate).toFixed(2)}
                      <button
                        onClick={() => removeTrip(t.id)}
                        className="text-red-600 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-4 pt-4 mt-1 border-t border-charcoal/20">
            <div className="flex gap-6 flex-wrap">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-charcoal/50">Total miles</p>
                <p className="text-sm font-medium text-charcoal tabular-nums">{totalMiles.toFixed(1)} mi</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-charcoal/50">Total deduction</p>
                <p className="text-sm font-medium text-charcoal tabular-nums">${mileDeduction.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-charcoal/50">Rate</p>
                <p className="text-sm font-medium text-charcoal tabular-nums">${mileRate.toFixed(2)}/mile</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-charcoal/50">Total deductions (expenses + mileage)</p>
              <p className="text-lg font-medium text-charcoal tabular-nums">${totalDeductions.toFixed(2)}</p>
            </div>
          </div>

          <p className="text-center text-xs text-charcoal/50 mt-4 italic">
            &ldquo;Export CSV&rdquo; downloads a complete mileage log for your CPA — date, client, route, miles, and deduction per trip.
          </p>
        </section>

        <section className="bg-beige border border-charcoal/10 rounded-xl p-6 self-start">
          <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-4">Mileage summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-charcoal/60">Trips logged</span>
              <span className="font-medium tabular-nums">{monthTrips.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-charcoal/60">Total miles</span>
              <span className="font-medium tabular-nums">{totalMiles.toFixed(1)} mi</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-charcoal/60">Deduction rate</span>
              <span className="font-medium tabular-nums">${mileRate.toFixed(2)}/mi</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-charcoal/20">
              <span className="text-charcoal/60">Mileage deduction</span>
              <span className="font-sans font-semibold text-xl tabular-nums">${mileDeduction.toFixed(2)}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <AuthGuard>
      <ExpensesContent />
    </AuthGuard>
  );
}
