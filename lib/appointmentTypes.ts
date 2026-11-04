import { supabase } from "@/lib/supabaseClient";
import { AppointmentLocation, AppointmentType } from "@/lib/types";

/** Saved places for the Location dropdown. Returns [] if none/not set up yet. */
export async function loadAppointmentLocations(studioId: string): Promise<AppointmentLocation[]> {
  const { data, error } = await supabase
    .from("appointment_locations")
    .select("*")
    .eq("studio_id", studioId)
    .order("order_index");
  if (error) return [];
  return (data as AppointmentLocation[]) ?? [];
}

/** How a saved location is written onto an appointment: "Name, address". */
export function formatLocation(l: Pick<AppointmentLocation, "name" | "address">): string {
  return l.address?.trim() ? `${l.name}, ${l.address.trim()}` : l.name;
}

/** The standard choices every studio starts with. */
export const DEFAULT_APPOINTMENT_TYPES = ["Preview", "Rehearsal", "Bridal Shower"];

/**
 * Loads this studio's appointment titles for the dropdown, creating the three
 * standard ones the first time. Returns [] if the table isn't set up yet, so
 * callers should fall back to DEFAULT_APPOINTMENT_TYPES.
 */
export async function loadAppointmentTypes(studioId: string): Promise<AppointmentType[]> {
  const { data, error } = await supabase
    .from("appointment_types")
    .select("*")
    .eq("studio_id", studioId)
    .order("order_index");
  if (error) return [];

  let list = (data as AppointmentType[]) ?? [];
  if (list.length === 0) {
    const seeded = DEFAULT_APPOINTMENT_TYPES.map((name, i) => ({ studio_id: studioId, name, order_index: i }));
    const { data: inserted } = await supabase.from("appointment_types").insert(seeded).select();
    list = ((inserted as AppointmentType[]) ?? []).sort((a, b) => a.order_index - b.order_index);
  }
  return list;
}
