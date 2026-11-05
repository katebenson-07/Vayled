"use client";

/**
 * Time dropdown in 15 minute steps (6:00 AM to 10:00 PM) so nobody has to type a
 * time. Values are "HH:MM", same as the old time input. A time that's already
 * saved but not on the list (say 7:10) is kept as an extra choice.
 */
const OPTIONS: { value: string; label: string }[] = [];
for (let h = 6; h <= 22; h++) {
  for (const m of [0, 15, 30, 45]) {
    if (h === 22 && m > 0) continue;
    const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    OPTIONS.push({ value, label: `${h12}:${String(m).padStart(2, "0")} ${ampm}` });
  }
}

function labelFor(value: string) {
  const [hh, mm] = value.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

export default function TimeSelect({
  value,
  onChange,
  placeholder = "Select a time",
  className = "",
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const current = value ? value.slice(0, 5) : "";
  const known = OPTIONS.some((o) => o.value === current);
  return (
    <select
      className={`w-full border border-charcoal/20 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-charcoal/30 ${className}`}
      value={current}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {current && !known && <option value={current}>{labelFor(current)}</option>}
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
