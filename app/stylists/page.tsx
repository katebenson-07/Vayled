"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { Stylist, StylistTimeOff } from "@/lib/types";
import { format } from "date-fns";

function StylistsContent() {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [timeOff, setTimeOff] = useState<StylistTimeOff[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newIs1099, setNewIs1099] = useState(true);
  const [newPayPercentage, setNewPayPercentage] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const [toStylistId, setToStylistId] = useState("");
  const [toStart, setToStart] = useState("");
  const [toEnd, setToEnd] = useState("");
  const [toReason, setToReason] = useState("");

  async function loadAll() {
    const { data: stylistData } = await supabase.from("stylists").select("*").order("name");
    setStylists((stylistData as Stylist[]) ?? []);
    const { data: toData } = await supabase.from("stylist_time_off").select("*").order("start_date");
    setTimeOff((toData as StylistTimeOff[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function addStylist(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    const studio_id = userData.user?.id;
    const { data, error } = await supabase
      .from("stylists")
      .insert({
        studio_id,
        name: newName,
        email: newEmail || null,
        phone: newPhone || null,
        is_1099: newIs1099,
        pay_percentage: newPayPercentage ? Number(newPayPercentage) : 0,
      })
      .select()
      .single();
    if (!error && data) {
      setStylists([...stylists, data as Stylist]);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewIs1099(true);
      setNewPayPercentage("");
    }
  }

  async function updateStylist(id: string, fields: Partial<Stylist>) {
    const { error } = await supabase.from("stylists").update(fields).eq("id", id);
    if (!error) {
      setStylists(stylists.map((x) => (x.id === id ? { ...x, ...fields } : x)));
      setSavedAt(new Date());
    }
  }

  async function toggleActive(s: Stylist) {
    const { error } = await supabase.from("stylists").update({ active: !s.active }).eq("id", s.id);
    if (!error) setStylists(stylists.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
  }

  async function removeStylist(id: string) {
    const { error } = await supabase.from("stylists").delete().eq("id", id);
    if (!error) {
      setStylists(stylists.filter((x) => x.id !== id));
      setTimeOff(timeOff.filter((t) => t.stylist_id !== id));
    }
  }

  async function addTimeOff(e: React.FormEvent) {
    e.preventDefault();
    if (!toStylistId || !toStart || !toEnd) return;
    const { data: userData } = await supabase.auth.getUser();
    const studio_id = userData.user?.id;
    const { data, error } = await supabase
      .from("stylist_time_off")
      .insert({ studio_id, stylist_id: toStylistId, start_date: toStart, end_date: toEnd, reason: toReason || null })
      .select()
      .single();
    if (!error && data) {
      setTimeOff([...timeOff, data as StylistTimeOff]);
      setToStylistId("");
      setToStart("");
      setToEnd("");
      setToReason("");
    }
  }

  async function removeTimeOff(id: string) {
    const { error } = await supabase.from("stylist_time_off").delete().eq("id", id);
    if (!error) setTimeOff(timeOff.filter((t) => t.id !== id));
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl mb-1">Stylists</h1>
          <p className="text-charcoal/60 text-sm">
            Your team of 1099 contractors (or employees) and their time off — set each person&apos;s cut of a job
            here, then assign them from each booking&apos;s page, where they&apos;ll show up on the calendar
            automatically.
          </p>
        </div>
        {savedAt && <span className="text-xs text-green-700 whitespace-nowrap">Saved {format(savedAt, "h:mm a")} ✓</span>}
      </div>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-4">Team</h2>
        <form onSubmit={addStylist} className="flex flex-wrap items-center gap-2 mb-4 text-sm">
          <input
            className="border border-charcoal/20 rounded-md px-2 py-1 flex-1 min-w-[140px]"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="border border-charcoal/20 rounded-md px-2 py-1 flex-1 min-w-[140px]"
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <input
            className="border border-charcoal/20 rounded-md px-2 py-1 flex-1 min-w-[120px]"
            placeholder="Phone"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              className="border border-charcoal/20 rounded-md px-2 py-1 w-16"
              placeholder="Pay %"
              value={newPayPercentage}
              onChange={(e) => setNewPayPercentage(e.target.value)}
            />
            <span className="text-charcoal/60">%</span>
          </div>
          <label className="flex items-center gap-1 text-charcoal/60">
            <input type="checkbox" checked={newIs1099} onChange={(e) => setNewIs1099(e.target.checked)} />
            1099
          </label>
          <button type="submit" className="bg-charcoal text-ivory rounded-md px-4 py-1">
            Add
          </button>
        </form>

        {stylists.length === 0 ? (
          <p className="text-charcoal/60 text-sm">No team members yet. Add your first stylist above.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {stylists.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal/10 pb-2">
                <div>
                  <span className={s.active ? "text-charcoal" : "text-charcoal/40 line-through"}>{s.name}</span>
                  {s.is_1099 && (
                    <span className="text-[10px] uppercase tracking-wide bg-beige text-charcoal/70 px-1.5 py-0.5 rounded ml-2">
                      1099
                    </span>
                  )}
                  {(s.email || s.phone) && (
                    <span className="text-charcoal/60 ml-2">{[s.email, s.phone].filter(Boolean).join(" · ")}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="border border-charcoal/20 rounded-md px-2 py-1 w-16 text-right"
                      value={s.pay_percentage}
                      onChange={(e) => updateStylist(s.id, { pay_percentage: Number(e.target.value) })}
                    />
                    <span className="text-charcoal/60">%</span>
                  </div>
                  <button onClick={() => toggleActive(s)} className="text-charcoal/60 hover:text-charcoal">
                    {s.active ? "Mark inactive" : "Mark active"}
                  </button>
                  <button onClick={() => removeStylist(s.id)} className="text-red-600">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border border-charcoal/10 rounded-xl p-6">
        <h2 className="font-serif text-lg mb-4">Time off</h2>
        <form onSubmit={addTimeOff} className="flex flex-wrap items-end gap-2 mb-4 text-sm">
          <div>
            <label className="block text-charcoal/60 mb-1">Stylist</label>
            <select
              className="border border-charcoal/20 rounded-md px-2 py-1"
              value={toStylistId}
              onChange={(e) => setToStylistId(e.target.value)}
            >
              <option value="">Select...</option>
              {stylists.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">Start date</label>
            <input
              type="date"
              className="border border-charcoal/20 rounded-md px-2 py-1"
              value={toStart}
              onChange={(e) => setToStart(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">End date</label>
            <input
              type="date"
              className="border border-charcoal/20 rounded-md px-2 py-1"
              value={toEnd}
              onChange={(e) => setToEnd(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-charcoal/60 mb-1">Reason (optional)</label>
            <input
              className="border border-charcoal/20 rounded-md px-2 py-1 w-full"
              value={toReason}
              onChange={(e) => setToReason(e.target.value)}
            />
          </div>
          <button type="submit" className="bg-charcoal text-ivory rounded-md px-4 py-1">
            Add
          </button>
        </form>

        {timeOff.length === 0 ? (
          <p className="text-charcoal/60 text-sm">No time off recorded.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {timeOff.map((t) => {
              const stylistName = stylists.find((s) => s.id === t.stylist_id)?.name ?? "Unknown";
              return (
                <div key={t.id} className="flex items-center justify-between border-b border-charcoal/10 pb-2">
                  <span>
                    {stylistName}
                    <span className="text-charcoal/60">
                      {" "}
                      · {t.start_date} – {t.end_date}
                      {t.reason ? ` · ${t.reason}` : ""}
                    </span>
                  </span>
                  <button onClick={() => removeTimeOff(t.id)} className="text-red-600">
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function StylistsPage() {
  return (
    <AuthGuard>
      <StylistsContent />
    </AuthGuard>
  );
}
