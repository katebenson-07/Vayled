"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Expense, Payment } from "@/lib/types";
import { format, parseISO, isSameMonth, addMonths, startOfMonth } from "date-fns";

const CATEGORIES = ["Products", "Travel", "Education", "Booth fees", "Kit & tools", "Marketing", "Other"];

function ExpensesContent() {
  const [studioName, setStudioName] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [showAddForm, setShowAddForm] = useState(false);

  const [form, setForm] = useState({
    expense_date: format(new Date(), "yyyy-MM-dd"),
    category: CATEGORIES[0],
    amount: "",
    vendor: "",
    note: "",
  });

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: profile } = await supabase
        .from("studio_settings")
        .select("studio_name")
        .eq("studio_id", userData.user.id)
        .maybeSingle();
      setStudioName(profile?.studio_name || "Your studio");
    }
    const [{ data: expenseData }, { data: paymentData }] = await Promise.all([
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("payments").select("*"),
    ]);
    setExpenses((expenseData as Expense[]) ?? []);
    setPayments((paymentData as Payment[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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

  const monthExpenses = useMemo(
    () => expenses.filter((e) => isSameMonth(parseISO(e.expense_date), month)),
    [expenses, month]
  );
  const monthPayments = useMemo(
    () => payments.filter((p) => isSameMonth(parseISO(p.paid_at), month)),
    [payments, month]
  );

  const totalExpenses = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const revenue = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const netProfit = revenue - totalExpenses;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : null;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    monthExpenses.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount)));
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);
  const maxCategory = Math.max(1, ...byCategory.map((c) => c.amount));

  function exportCsv() {
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

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-script text-5xl leading-tight mb-1">Expenses</h1>
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
          <p className="font-serif text-3xl">${totalExpenses.toFixed(2)}</p>
          <p className="text-xs text-charcoal/50 mt-1">
            {monthExpenses.length} item{monthExpenses.length === 1 ? "" : "s"} logged
          </p>
        </div>
        <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Revenue</p>
          <p className="font-serif text-3xl">${revenue.toFixed(0)}</p>
          <p className="text-xs text-charcoal/50 mt-1">{format(month, "MMM yyyy")}</p>
        </div>
        <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Net profit</p>
          <p className="font-serif text-3xl">${netProfit.toFixed(2)}</p>
          <p className={`text-xs mt-1 ${netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
            {netProfit >= 0 ? "In the green" : "In the red"}
          </p>
        </div>
        <div className="bg-beige border border-charcoal/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">Margin</p>
          <p className="font-serif text-3xl">{margin === null ? "—" : `${margin.toFixed(0)}%`}</p>
          <p className="text-xs text-charcoal/50 mt-1">After all expenses</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <section className="bg-beige border border-charcoal/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50">Expense log</h2>
            <div className="flex items-center gap-3">
              <button onClick={exportCsv} className="text-gold text-xs hover:underline">
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
                  className="border border-charcoal/20 rounded-md px-2 py-1"
                  value={form.expense_date}
                  onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-charcoal/60 mb-1">Category</label>
                <select
                  className="border border-charcoal/20 rounded-md px-2 py-1"
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
                  className="border border-charcoal/20 rounded-md px-2 py-1 w-28"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-charcoal/60 mb-1">Description</label>
                <input
                  className="border border-charcoal/20 rounded-md px-2 py-1 w-full"
                  placeholder="e.g. MAC cosmetics restock"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-charcoal/60 mb-1">Vendor</label>
                <input
                  className="border border-charcoal/20 rounded-md px-2 py-1"
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                />
              </div>
              <button type="submit" className="bg-charcoal text-ivory rounded-md px-4 py-1.5">
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
          <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-4">By category</h2>
          {byCategory.length === 0 ? (
            <p className="text-charcoal/60 text-sm">Nothing logged yet.</p>
          ) : (
            <div className="space-y-3">
              {byCategory.map((c) => (
                <div key={c.category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{c.category}</span>
                    <span className="text-charcoal/60">${c.amount.toFixed(0)}</span>
                  </div>
                  <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-charcoal rounded-full"
                      style={{ width: `${(c.amount / maxCategory) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
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
