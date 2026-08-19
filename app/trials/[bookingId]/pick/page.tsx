"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfDay,
} from "date-fns";
import Logo from "@/components/Logo";

interface Slot {
  id: string;
  date: string;
  time: string | null;
}

interface PickerData {
  bride_name: string;
  studio_name: string;
  confirmed_date: string | null;
  confirmed_time: string | null;
  slots: Slot[];
}

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const t = new Date();
  t.setHours(parseInt(h), parseInt(m));
  return format(t, "h:mm a");
}

export default function TrialPickerPage() {
  const params = useParams<{ bookingId: string }>();
  const [data, setData] = useState<PickerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ date: string; time: string | null } | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  async function load() {
    const { data: result, error: rpcError } = await supabase.rpc("get_trial_slot_offers", {
      p_booking_id: params.bookingId,
    });
    if (rpcError || !result) {
      setError(true);
    } else {
      const pickerData = result as PickerData;
      setData(pickerData);
      if (pickerData.slots.length > 0) {
        setCurrentMonth(parseISO(pickerData.slots[0].date));
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.bookingId]);

  const slotsByDate = useMemo(() => {
    const groups: Record<string, Slot[]> = {};
    for (const s of data?.slots ?? []) {
      (groups[s.date] ??= []).push(s);
    }
    return groups;
  }, [data]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });
  }, [currentMonth]);

  const monthHasSlots = useMemo(
    () => Object.keys(slotsByDate).some((d) => isSameMonth(parseISO(d), currentMonth)),
    [slotsByDate, currentMonth]
  );

  async function pickSlot(slotId: string) {
    setSubmitting(slotId);
    setSubmitError(null);
    const { data: result, error: rpcError } = await supabase.rpc("select_trial_slot", {
      p_booking_id: params.bookingId,
      p_slot_id: slotId,
    });
    setSubmitting(null);
    if (rpcError || !result?.ok) {
      setSubmitError(result?.error ?? "Something went wrong — try again.");
      await load();
      return;
    }
    setConfirmed({ date: result.date, time: result.time });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-gold text-sm">Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Logo size="md" className="justify-center mb-4" />
          <p className="text-charcoal/60 text-sm">
            This link isn&apos;t available. Please reach out to your stylist for an updated link.
          </p>
        </div>
      </div>
    );
  }

  const confirmedDate = confirmed?.date ?? data.confirmed_date;
  const confirmedTime = confirmed?.time ?? data.confirmed_time;
  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedSlots = selectedKey ? slotsByDate[selectedKey] ?? [] : [];
  const todayStart = startOfDay(new Date());

  return (
    <div className="min-h-screen bg-ivory p-5 font-tagline">
      <div className="max-w-lg mx-auto py-8">
        <div className="text-center mb-8">
          <Logo size="md" className="justify-center mb-2" />
          <p className="text-xs uppercase tracking-widest-lg text-charcoal/50">{data.studio_name}</p>
        </div>

        <div className="bg-white border border-charcoal/10 rounded-xl p-6">
          {confirmedDate ? (
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest-lg text-gold mb-2">You&apos;re all set</p>
              <h1 className="font-serif text-2xl text-charcoal mb-2">
                {format(parseISO(confirmedDate), "EEEE, MMMM d")}
                {confirmedTime && <> at {formatTime(confirmedTime)}</>}
              </h1>
              <p className="text-charcoal/60 text-sm">
                Your trial with {data.studio_name} is booked for this time. Reach out to your stylist if anything
                changes.
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-2xl text-charcoal mb-1">Pick your trial time</h1>
              <p className="text-charcoal/60 text-sm mb-5">
                Hi {data.bride_name || "there"} — tap a highlighted day to see open times.
              </p>

              {submitError && <p className="text-sm text-red-600 mb-4">{submitError}</p>}

              {data.slots.length === 0 ? (
                <p className="text-sm text-charcoal/50">
                  No times are open right now — check back soon or reach out to your stylist directly.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="border border-charcoal/20 rounded-md px-3 py-1 text-sm hover:bg-ivory"
                    >
                      ‹
                    </button>
                    <span className="font-serif text-lg">{format(currentMonth, "MMMM yyyy")}</span>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="border border-charcoal/20 rounded-md px-3 py-1 text-sm hover:bg-ivory"
                    >
                      ›
                    </button>
                  </div>

                  {!monthHasSlots && (
                    <p className="text-xs text-charcoal/50 text-center mb-3">
                      No open times this month — try another month.
                    </p>
                  )}

                  <div className="bg-beige/40 border border-charcoal/10 rounded-lg overflow-hidden mb-5">
                    <div className="grid grid-cols-7 border-b border-charcoal/10 text-[10px] uppercase tracking-wide text-charcoal/50">
                      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                        <div key={i} className="p-2 text-center">
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {days.map((day) => {
                        const key = format(day, "yyyy-MM-dd");
                        const hasSlots = !!slotsByDate[key]?.length;
                        const inMonth = isSameMonth(day, currentMonth);
                        const isPast = day < todayStart;
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const clickable = hasSlots && inMonth && !isPast;
                        return (
                          <button
                            key={day.toISOString()}
                            type="button"
                            disabled={!clickable}
                            onClick={() => setSelectedDate(day)}
                            className={`aspect-square text-sm border-b border-r border-charcoal/10 last:border-r-0 transition-colors ${
                              !inMonth || isPast ? "text-charcoal/20" : "text-charcoal"
                            } ${
                              isSelected
                                ? "bg-charcoal text-ivory"
                                : clickable
                                ? "bg-white hover:bg-gold/10 font-medium"
                                : ""
                            }`}
                          >
                            {format(day, "d")}
                            {hasSlots && inMonth && !isPast && !isSelected && (
                              <span className="block w-1 h-1 rounded-full bg-gold mx-auto mt-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedDate && (
                    <div>
                      <p className="text-xs uppercase tracking-widest-lg text-charcoal/50 mb-2">
                        {format(selectedDate, "EEEE, MMMM d")}
                      </p>
                      {selectedSlots.length === 0 ? (
                        <p className="text-sm text-charcoal/50">No times open this day.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {selectedSlots.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => pickSlot(s.id)}
                              disabled={submitting === s.id}
                              className="border border-charcoal/20 rounded-md px-3 py-2.5 text-sm hover:border-gold hover:bg-ivory transition-colors disabled:opacity-50"
                            >
                              {submitting === s.id ? "Booking..." : s.time ? formatTime(s.time) : "Any time"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
