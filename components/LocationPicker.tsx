"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatLocation, loadAppointmentLocations } from "@/lib/appointmentTypes";
import { AppointmentLocation } from "@/lib/types";

const CLIENT = "__client__";
const OTHER = "__other__";

/**
 * Location dropdown for a single session (preview, rehearsal). Saved places
 * come from Settings > Appointments. "At the client's address" starts from the
 * address already on her booking. The chosen text is saved through onChange.
 */
export default function LocationPicker({
  value,
  clientAddress,
  onChange,
}: {
  value: string | null;
  clientAddress?: string | null;
  onChange: (v: string) => void;
}) {
  const [places, setPlaces] = useState<AppointmentLocation[]>([]);
  const [mode, setMode] = useState<string>("");
  const [typed, setTyped] = useState(value ?? "");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const list = await loadAppointmentLocations(data.user.id);
      setPlaces(list);
      const current = value ?? "";
      const match = list.find((p) => formatLocation(p) === current);
      if (match) setMode(match.id);
      else if (current) setMode(OTHER);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(next: string) {
    setMode(next);
    const place = places.find((p) => p.id === next);
    if (place) {
      onChange(formatLocation(place));
    } else if (next === CLIENT) {
      setTyped(clientAddress ?? "");
      onChange(clientAddress ?? "");
    } else if (next === OTHER) {
      setTyped(value ?? "");
    } else {
      setTyped("");
      onChange("");
    }
  }

  return (
    <div>
      <select
        className="w-full border border-charcoal/20 rounded-md px-3 py-2 focus:outline-none focus:border-charcoal/30 bg-white"
        value={mode}
        onChange={(e) => choose(e.target.value)}
      >
        <option value="">Choose a location...</option>
        {places.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        <option value={CLIENT}>At the client&apos;s address</option>
        <option value={OTHER}>Other (type it in)</option>
      </select>
      {(mode === CLIENT || mode === OTHER) && (
        <input
          className="w-full mt-2 border border-charcoal/20 rounded-md px-3 py-2 focus:outline-none focus:border-charcoal/30"
          placeholder={mode === CLIENT ? "Client's street address" : "Venue, address, phone..."}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onBlur={() => onChange(typed)}
        />
      )}
      {mode && mode !== CLIENT && mode !== OTHER && value && (
        <p className="text-xs text-charcoal/50 mt-1">{value}</p>
      )}
    </div>
  );
}
