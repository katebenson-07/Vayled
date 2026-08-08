import { supabase } from "./supabaseClient";

export type InboxItemType = "inquiry" | "payment" | "trial" | "contract";

export interface InboxItem {
  id: string;
  type: InboxItemType;
  name: string;
  title: string;
  snippet: string;
  timestamp: string;
}

interface InquiryRow {
  id: string;
  created_at: string;
  clients: { bride_name: string; notes: string | null } | null;
}

interface PaymentRow {
  id: string;
  amount: number;
  type: string;
  paid_at: string;
  bookings: { clients: { bride_name: string } | null } | null;
}

interface TrialRow {
  id: string;
  session_date: string | null;
  created_at: string;
  completed: boolean;
  bookings: { clients: { bride_name: string } | null } | null;
}

interface SignedBookingRow {
  id: string;
  contract_signed_at: string | null;
  clients: { bride_name: string } | null;
}

export async function fetchInboxItems(): Promise<InboxItem[]> {
  const [{ data: inquiries }, { data: payments }, { data: trials }, { data: signed }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, created_at, clients(bride_name, notes)")
      .eq("status", "inquiry")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("payments")
      .select("id, amount, type, paid_at, bookings(clients(bride_name))")
      .order("paid_at", { ascending: false })
      .limit(20),
    supabase
      .from("trial_sessions")
      .select("id, session_date, created_at, completed, bookings(clients(bride_name))")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("bookings")
      .select("id, contract_signed_at, clients(bride_name)")
      .eq("contract_signed", true)
      .not("contract_signed_at", "is", null)
      .order("contract_signed_at", { ascending: false })
      .limit(20),
  ]);

  const items: InboxItem[] = [];

  ((inquiries as unknown as InquiryRow[]) ?? []).forEach((b) => {
    items.push({
      id: `inquiry-${b.id}`,
      type: "inquiry",
      name: b.clients?.bride_name ?? "New inquiry",
      title: "New inquiry",
      snippet: b.clients?.notes ? b.clients.notes.slice(0, 140) : "Submitted a new inquiry through your form.",
      timestamp: b.created_at,
    });
  });

  ((payments as unknown as PaymentRow[]) ?? []).forEach((p) => {
    items.push({
      id: `payment-${p.id}`,
      type: "payment",
      name: p.bookings?.clients?.bride_name ?? "Client",
      title: p.type === "deposit" ? "Deposit received" : p.type === "balance" ? "Balance paid" : "Payment received",
      snippet: `$${Number(p.amount).toFixed(0)} logged.`,
      timestamp: p.paid_at,
    });
  });

  ((trials as unknown as TrialRow[]) ?? []).forEach((t) => {
    items.push({
      id: `trial-${t.id}`,
      type: "trial",
      name: t.bookings?.clients?.bride_name ?? "Client",
      title: t.completed ? "Trial session completed" : "Trial session scheduled",
      snippet: t.session_date ? `Session on ${t.session_date}.` : "Trial session added.",
      timestamp: t.created_at,
    });
  });

  ((signed as unknown as SignedBookingRow[]) ?? []).forEach((b) => {
    if (!b.contract_signed_at) return;
    items.push({
      id: `contract-${b.id}`,
      type: "contract",
      name: b.clients?.bride_name ?? "Client",
      title: "Contract signed",
      snippet: "Contract marked as signed.",
      timestamp: b.contract_signed_at,
    });
  });

  items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return items;
}

const LAST_SEEN_KEY = "vayled_inbox_last_seen";

export function getInboxLastSeen(): string {
  if (typeof window === "undefined") return new Date(0).toISOString();
  return localStorage.getItem(LAST_SEEN_KEY) ?? new Date(0).toISOString();
}

export function setInboxLastSeen(ts: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_SEEN_KEY, ts);
}
