import { Booking, Client } from "./types";
import { format, parseISO } from "date-fns";

/**
 * Shared merge-field engine used by contracts, email templates, and invoices.
 * Templates use {{field_name}} placeholders.
 */
export function buildMergeContext(
  client: Client | null,
  booking: Booking | null,
  balanceDue: number,
  studioName?: string | null
): Record<string, string> {
  return {
    bride_name: client?.bride_name ?? "",
    wedding_date: client?.wedding_date ? format(parseISO(client.wedding_date), "MMMM d, yyyy") : "TBD",
    venue: client?.venue ?? "TBD",
    contact_email: client?.email ?? "",
    contact_phone: client?.phone ?? "",
    contract_total: booking ? `$${Number(booking.contract_total).toFixed(2)}` : "$0.00",
    deposit_amount: booking ? `$${Number(booking.deposit_amount).toFixed(2)}` : "$0.00",
    balance_due: `$${balanceDue.toFixed(2)}`,
    studio_name: studioName || "Your Studio",
    today: format(new Date(), "MMMM d, yyyy"),
  };
}

export function applyTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/{{\s*([a-zA-Z_]+)\s*}}/g, (match, key) => {
    return key in context ? context[key] : match;
  });
}

// Invisible control characters (STX/ETX) used to mark which spans of text
// came from a merge field, so the pretty contract renderer can style them as
// fill-in blanks. Only used for the on-screen/printed contract — the plain
// applyTemplate() above stays marker-free for emails and invoices.
const FIELD_START = "";
const FIELD_END = "";
const FIELD_MARKER_RE = new RegExp(`[${FIELD_START}${FIELD_END}]`, "g");

export function applyTemplateWithMarkers(template: string, context: Record<string, string>): string {
  return template.replace(/{{\s*([a-zA-Z_]+)\s*}}/g, (match, key) => {
    return key in context ? `${FIELD_START}${context[key]}${FIELD_END}` : match;
  });
}

export function stripFieldMarkers(text: string): string {
  return text.replace(FIELD_MARKER_RE, "");
}

export const FIELD_MARKERS = { start: FIELD_START, end: FIELD_END };

export const MERGE_FIELD_HELP =
  "Available fields: {{bride_name}}, {{wedding_date}}, {{venue}}, {{contact_email}}, {{contact_phone}}, {{contract_total}}, {{deposit_amount}}, {{balance_due}}, {{studio_name}}, {{today}}";
