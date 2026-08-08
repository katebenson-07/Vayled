"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Expense } from "@/lib/types";
import { format } from "date-fns";

const CATEGORIES = ["Products", "Travel", "Education", "Booth fees", "Kit & tools", "Marketing", "Other"];

function ExpensesContent() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [form, setForm] = useState({
    expense_date: format(new Date(), "yyyy-MM-dd"),
    category: CATEGORIES[0],
    amount: "",
    vendor: "",
    note: "",
  });

  async function load() {
    const { data } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
    setExpenses((data as Expense[]) ?? []);
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
    }
  }

  async function removeExpense(id: string) {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses(expenses.filter((e) => e.id !== id));
  }

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (startDate && e.expense_date < startDate) return false;
      if (endDate && e.expense_date > endDate) return false;
      return true;
    });
  }, [expenses, startDate, endDate]);

  const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);

  function exportCsv() {
    const header = "Date,Category,Amount,Vendor,Note\n";
    const rows = filtered
      .map((e) => [e.expense_date, e.category, Number(e.amount).toFixed(2), e.vendor ?? "", (e.note ?? "").replace(/,/g, ";")].join(","))
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vayled-expenses-${startDate || "all"}-${endDate || "present"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl mb-1">Expenses</h1>
        <p className="text-charcoal/60 text-sm">Track business expenses and export a clean CSV for your CPA at tax time.</p>
      </div>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-4">Add expense</h2>
        <form onSubmit={addExpense} className="flex flex-wrap items-end gap-2 text-sm">
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
          <div>
            <label className="block text-charcoal/60 mb-1">Vendor</label>
            <input
              className="border border-charcoal/20 rounded-md px-2 py-1"
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-charcoal/60 mb-1">Note</label>
            <input
              className="border border-charcoal/20 rounded-md px-2 py-1 w-full"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
          <button type="submit" className="bg-charcoal text-ivory rounded-md px-4 py-1">
            Add
          </button>
        </form>
      </section>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-serif text-lg">Log</h2>
          <div className="flex items-end gap-2 text-sm">
            <div>
              <label className="block text-charcoal/60 mb-1">From</label>
              <input
                type="date"
                className="border border-charcoal/20 rounded-md px-2 py-1"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-charcoal/60 mb-1">To</label>
              <input
                type="date"
                className="border border-charcoal/20 rounded-md px-2 py-1"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <button onClick={exportCsv} className="border border-charcoal/20 rounded-md px-3 py-1.5 hover:bg-ivory">
              Export CSV
            </button>
          </div>
        </div>

        <p className="text-sm mb-3">
          Total: <span className="font-medium">${total.toFixed(2)}</span> across {filtered.length} expense
          {filtered.length === 1 ? "" : "s"}
        </p>

        {filtered.length === 0 ? (
          <p className="text-charcoal/60 text-sm">No expenses in this range.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {filtered.map((e) => (
              <div key={e.id} className="flex items-center justify-between border-b border-charcoal/10 pb-2">
                <div>
                  <span className="font-medium">{e.category}</span>
                  <span className="text-charcoal/60">
                    {" "}
                    · {e.expense_date}
                    {e.vendor ? ` · ${e.vendor}` : ""}
                    {e.note ? ` · ${e.note}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span>${Number(e.amount).toFixed(2)}</span>
                  <button onClick={() => removeExpense(e.id)} className="text-red-600 text-xs">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
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
