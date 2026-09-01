import { addDays, format, parseISO } from "date-fns";
import { DueRule, InvoiceLineItem, InvoiceSettings, PartyMember, TrialSession } from "./types";

/** Groups party members by (role, hair+makeup combo, price) into qty/rate line items,
 *  matching how the Figma mockup rolls up "2x Bridesmaid Hair + Makeup" into one row. */
export function seedLineItemsFromBooking(members: PartyMember[], trial: TrialSession | null): InvoiceLineItem[] {
  const groups = new Map<string, InvoiceLineItem>();

  for (const m of members) {
    const service = [m.hair && "Hair", m.makeup && "Makeup"].filter(Boolean).join(" + ") || "Service";
    const label = `${m.role} — ${service}`;
    const key = `${label}::${m.price}`;
    const existing = groups.get(key);
    if (existing) {
      existing.qty += 1;
    } else {
      groups.set(key, { id: key, description: label, qty: 1, rate: Number(m.price) || 0 });
    }
  }

  const items = Array.from(groups.values());

  if (trial && Number(trial.fee) > 0) {
    items.push({
      id: "trial-fee",
      description: "Preview — Hair + Makeup",
      qty: 1,
      rate: Number(trial.fee),
    });
  }

  return items;
}

export function lineItemsSubtotal(items: InvoiceLineItem[]): number {
  return items.reduce((sum, i) => sum + Number(i.qty || 0) * Number(i.rate || 0), 0);
}

export function computeTipAmount(settings: InvoiceSettings, subtotal: number): number {
  if (settings.tip_type === "percent") return round2((subtotal * Number(settings.tip_percent || 0)) / 100);
  if (settings.tip_type === "custom") return round2(Number(settings.tip_amount || 0));
  return 0;
}

export function invoiceTotal(items: InvoiceLineItem[], settings: InvoiceSettings): number {
  const subtotal = lineItemsSubtotal(items);
  return round2(subtotal + computeTipAmount(settings, subtotal));
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Resolves a DueRule to an actual date, given the client's wedding date. */
export function resolveDueDate(rule: DueRule | undefined, weddingDate: string | null): Date | null {
  if (!rule) return null;
  if (rule.mode === "date") {
    return rule.date ? parseISO(rule.date) : null;
  }
  // before_wedding
  if (!weddingDate || rule.days_before == null) return null;
  return addDays(parseISO(weddingDate), -Number(rule.days_before));
}

export function formatDueDate(rule: DueRule | undefined, weddingDate: string | null): string {
  const d = resolveDueDate(rule, weddingDate);
  if (!d) {
    if (rule?.mode === "before_wedding" && rule.days_before != null && !weddingDate) {
      return `${rule.days_before} days before wedding (set wedding date)`;
    }
    return "No due date set";
  }
  return format(d, "MMM d, yyyy");
}
