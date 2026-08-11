export interface Client {
  id: string;
  stylist_id: string;
  bride_name: string;
  partner_name: string | null;
  email: string | null;
  phone: string | null;
  wedding_date: string | null;
  venue: string | null;
  notes: string | null;
  referral_source: string | null;
  created_at: string;
}

export type BookingStatus = "inquiry" | "booked" | "completed" | "cancelled" | "ghosted";

export interface Booking {
  id: string;
  stylist_id: string;
  client_id: string;
  status: BookingStatus;
  contract_total: number;
  deposit_amount: number;
  deposit_paid: boolean;
  ready_by_time: string | null;
  buffer_minutes: number;
  ceremony_time: string | null;
  location: string | null;
  travel_minutes: number;
  contract_sent: boolean;
  contract_signed: boolean;
  contract_signed_at: string | null;
  notes: string | null;
  invoice_line_items: InvoiceLineItem[];
  invoice_settings: InvoiceSettings;
  created_at: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
  /** service_catalog.id this row was filled from, or null/undefined for a one-off custom line. */
  catalog_id?: string | null;
}

/** Either a fixed date, or N days before the wedding date (computed at render time). */
export interface DueRule {
  mode: "date" | "before_wedding";
  date: string | null;
  days_before: number | null;
}

export function defaultDueRule(): DueRule {
  return { mode: "date", date: null, days_before: null };
}

export interface InvoiceSettings {
  tip_type: "none" | "percent" | "custom";
  tip_percent: number;
  tip_amount: number;
  deposit_type: "percent" | "flat";
  deposit_percent: number;
  deposit_due_rule: DueRule;
  deposit_remind: boolean;
  deposit_paid: boolean;
  trial_due_rule: DueRule;
  trial_remind: boolean;
  trial_paid: boolean;
  balance_due_rule: DueRule;
  balance_remind: boolean;
  balance_paid: boolean;
  notes: string;
}

export function defaultInvoiceSettings(): InvoiceSettings {
  return {
    tip_type: "none",
    tip_percent: 0,
    tip_amount: 0,
    deposit_type: "percent",
    deposit_percent: 25,
    deposit_due_rule: defaultDueRule(),
    deposit_remind: true,
    deposit_paid: false,
    trial_due_rule: defaultDueRule(),
    trial_remind: true,
    trial_paid: false,
    balance_due_rule: { mode: "before_wedding", date: null, days_before: 7 },
    balance_remind: true,
    balance_paid: false,
    notes: "",
  };
}

export interface ServiceCatalogItem {
  id: string;
  studio_id: string;
  name: string;
  default_rate: number;
  order_index: number;
  created_at: string;
}

export interface PartyMember {
  id: string;
  booking_id: string;
  stylist_id: string;
  name: string;
  role: string;
  hair: boolean;
  makeup: boolean;
  prep_minutes: number;
  price: number;
  order_index: number;
  /** Which team member (from `stylists`) is doing this person's hair/makeup — null until assigned. */
  assigned_stylist_id: string | null;
}

export interface Payment {
  id: string;
  booking_id: string;
  stylist_id: string;
  amount: number;
  type: "deposit" | "balance" | "trial" | "other";
  method: string | null;
  note: string | null;
  paid_at: string;
}

export interface Stylist {
  id: string;
  studio_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  /** True for 1099 contractors (the default for most teams); false for W-2 employees. */
  is_1099: boolean;
  /** Their cut of a job's contract total, e.g. 40 for 40%. */
  pay_percentage: number;
  created_at: string;
}

export interface StylistTimeOff {
  id: string;
  studio_id: string;
  stylist_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

export interface BookingStylist {
  id: string;
  studio_id: string;
  booking_id: string;
  stylist_id: string;
  created_at: string;
  /** Whether this contractor's cut for this specific job has been paid out. */
  payout_paid: boolean;
  payout_paid_at: string | null;
}

export interface ClientNote {
  id: string;
  studio_id: string;
  client_id: string;
  tag: string;
  body: string;
  created_at: string;
}

export interface Vendor {
  id: string;
  studio_id: string;
  client_id: string;
  role: string;
  name: string;
  contact: string | null;
  created_at: string;
}

export interface ClientPhoto {
  id: string;
  studio_id: string;
  client_id: string;
  booking_id: string | null;
  storage_path: string;
  tag: "inspo" | "trial_result";
  caption: string | null;
  created_at: string;
}

export interface TrialSession {
  id: string;
  studio_id: string;
  booking_id: string;
  session_date: string | null;
  duration_minutes: number;
  location: string | null;
  fee: number;
  fee_paid: boolean;
  completed: boolean;
  hair_notes: string | null;
  makeup_notes: string | null;
  day_of_notes: string | null;
  products_text: string | null;
  changes_text: string | null;
  overall_rating: number | null;
  hair_rating: number | null;
  makeup_rating: number | null;
  quote: string | null;
  created_at: string;
}

export interface ContractClause {
  id: string;
  heading: string;
  body: string;
}

export interface ContractSection {
  id: string;
  heading: string;
  body: string;
}

export interface ContractTemplate {
  id: string;
  studio_id: string;
  body: string;
  custom_clauses: ContractClause[];
  sections: ContractSection[];
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  studio_id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
}

export interface SentEmail {
  id: string;
  studio_id: string;
  booking_id: string;
  template_name: string | null;
  subject: string | null;
  sent_at: string;
}

export interface CustomQuestion {
  id: string;
  label: string;
}

export interface InquiryFormSettings {
  studio_id: string;
  welcome_heading: string;
  welcome_message: string;
  ask_wedding_date: boolean;
  ask_venue: boolean;
  ask_getting_ready_location: boolean;
  ask_party_size: boolean;
  ask_referral_source: boolean;
  ask_message: boolean;
  ask_budget: boolean;
  ask_preferred_contact_method: boolean;
  require_phone: boolean;
  custom_questions: CustomQuestion[];
  updated_at: string;
}

export interface StudioSettings {
  studio_id: string;
  studio_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  notify_on_new_inquiry: boolean;
  notification_email: string | null;
  mileage_rate: number;
  expense_budgets: Record<string, number>;
  /** Applied automatically to every new invoice's Deposit/Retainer line; still editable per-booking. */
  default_deposit_type: "percent" | "flat";
  default_deposit_percent: number;
  default_deposit_flat: number;
  updated_at: string;
}

export interface Expense {
  id: string;
  studio_id: string;
  expense_date: string;
  category: string;
  amount: number;
  vendor: string | null;
  note: string | null;
  created_at: string;
}

// Shape returned by the get_bride_portal(uuid) Postgres function — a single
// scoped read for the public /portal/[bookingId] page. Deliberately narrower
// than the full Booking/Client/Payment tables (see supabase/schema.sql).
export interface BridePortalData {
  booking: {
    id: string;
    status: BookingStatus;
    contract_total: number;
    deposit_amount: number;
    deposit_paid: boolean;
    ready_by_time: string | null;
    buffer_minutes: number;
    ceremony_time: string | null;
    location: string | null;
  };
  client: {
    bride_name: string;
    partner_name: string | null;
    wedding_date: string | null;
    venue: string | null;
  };
  studio: {
    studio_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  };
  party_members: {
    name: string;
    role: string;
    hair: boolean;
    makeup: boolean;
    prep_minutes: number;
    order_index: number;
  }[];
  payments: {
    amount: number;
    type: "deposit" | "balance" | "other";
    note: string | null;
    paid_at: string;
  }[];
  trial: {
    session_date: string | null;
    location: string | null;
    hair_notes: string | null;
    makeup_notes: string | null;
    day_of_notes: string | null;
    products_text: string | null;
    changes_text: string | null;
  } | null;
}

export interface MileageTrip {
  id: string;
  studio_id: string;
  trip_date: string;
  client_name: string | null;
  from_location: string | null;
  to_location: string | null;
  miles: number;
  created_at: string;
}
