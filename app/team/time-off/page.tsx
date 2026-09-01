"use client";

import { useEffect, useState } from "react";
import TeamAuthGuard, { useTeamMember } from "@/components/TeamAuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { StylistTimeOff } from "@/lib/types";
import { format, parseISO } from "date-fns";

function TimeOff() {
  const { studioId, stylistId } = useTeamMember();
  const [rows, setRows] = useState<StylistTimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("stylist_time_off")
      .select("*")
      .eq("stylist_id", stylistId)
      .order("start_date");
    setRows((data as StylistTimeOff[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stylistId]);

  async function addBlock() {
    if (!startDate) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("stylist_time_off")
      .insert({
        studio_id: studioId,
        stylist_id: stylistId,
        start_date: startDate,
        end_date: endDate || startDate,
        reason: reason.trim() || null,
      })
      .select()
      .single();
    if (!error && data) {
      setRows([...rows, data as StylistTimeOff].sort((a, b) => a.start_date.localeCompare(b.start_date)));
      setStartDate("");
      setEndDate("");
      setReason("");
    }
    setSaving(false);
  }

  async function removeBlock(blockId: string) {
    const { error } = await supabase.from("stylist_time_off").delete().eq("id", blockId);
    if (!error) setRows(rows.filter((r) => r.id !== blockId));
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-script text-4xl leading-tight mb-1">Time off</h1>
        <p className="text-charcoal/60 text-sm">
          Block out dates you&apos;re not available — your studio owner will see this when assigning weddings.
        </p>
      </div>

      <section className="bg-white border border-charcoal/10 rounded-xl p-5">
        <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-3">Add block-out dates</h2>
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <div>
            <label className="block text-charcoal/60 mb-1">Start date</label>
            <input
              type="date"
              className="border border-charcoal/20 rounded-md px-3 py-2 focus:outline-none focus:border-charcoal/30"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-charcoal/60 mb-1">End date</label>
            <input
              type="date"
              className="border border-charcoal/20 rounded-md px-3 py-2 focus:outline-none focus:border-charcoal/30"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Same as start"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-charcoal/60 mb-1">Reason (optional)</label>
            <input
              className="w-full border border-charcoal/20 rounded-md px-3 py-2 focus:outline-none focus:border-charcoal/30"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Vacation, another job, etc."
            />
          </div>
          <button
            onClick={addBlock}
            disabled={!startDate || saving}
            className="bg-charcoal text-ivory rounded-md px-4 py-2 disabled:opacity-50 hover:bg-charcoal/90"
          >
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </section>

      <section className="bg-white border border-charcoal/10 rounded-xl p-5">
        <h2 className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-3">Your block-out dates</h2>
        {rows.length === 0 ? (
          <p className="text-charcoal/60 text-sm">No block-out dates yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-charcoal/10 pb-2">
                <span>
                  {format(parseISO(r.start_date), "MMM d, yyyy")}
                  {r.end_date !== r.start_date ? ` – ${format(parseISO(r.end_date), "MMM d, yyyy")}` : ""}
                  {r.reason ? <span className="text-charcoal/50"> · {r.reason}</span> : ""}
                </span>
                <button onClick={() => removeBlock(r.id)} className="text-red-600 text-xs">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function TimeOffPage() {
  return (
    <TeamAuthGuard>
      <TimeOff />
    </TeamAuthGuard>
  );
}
