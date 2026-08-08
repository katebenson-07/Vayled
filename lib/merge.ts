import { Booking, Client } from "./types";
import { format, parseISO } from "date-fns";

/**
 * Shared merge-field engine used by contracts, email templates, and invoices.
 * Templates use {{field_name}} placeholders.
 */
export function buildMergeContext(
  client: Client | null,
  booking: Booking | null,
  balanceDue: number
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
    today: format(new Date(), "MMMM d, yyyy"),
  };
}

export function applyTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/{{\s*([a-zA-Z_]+)\s*}}/g, (match, key) => {
    return key in context ? context[key] : match;
  });
}

export const MERGE_FIELD_HELP =
  "Available fields: {{bride_name}}, {{wedding_date}}, {{venue}}, {{contact_email}}, {{contact_phone}}, {{contract_total}}, {{deposit_amount}}, {{balance_due}}, {{today}}";
