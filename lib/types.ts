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
  /** When set, the timeline builder works forward from this shared moment so every stylist starts together, instead of backward from ready_by_time. */
  start_time: string | null;
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
  /** Manual override for the trial/preview line — null means "use the trial session's fee". */
  trial_fee_override: number | null;
  rehearsal_due_rule: DueRule;
  rehearsal_remind: boolean;
  rehearsal_paid: boolean;
  /** Manual override for the rehearsal line — null means "use the rehearsal session's fee". */
  rehearsal_fee_override: number | null;
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
    trial_fee_override: null,
    rehearsal_due_rule: defaultDueRule(),
    rehearsal_remind: true,
    rehearsal_paid: false,
    rehearsal_fee_override: null,
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
  /** Studio-side styling notes shown on the Timeline tab (e.g. desired style, prep requirements). */
  styling_notes: string | null;
}

export interface Payment {
  id: string;
  booking_id: string;
  stylist_id: string;
  amount: number;
  type: "deposit" | "balance" | "trial" | "rehearsal" | "other";
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

/** Links a real login (user_id, once accepted) to a roster stylist so they can sign in as their own team member. */
export interface StudioMember {
  id: string;
  studio_id: string;
  stylist_id: string;
  user_id: string | null;
  role: "owner" | "stylist";
  status: "pending" | "active" | "revoked";
  invite_token: string;
  invited_at: string;
  accepted_at: string | null;
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
  /** Lead vs. assisting stylist on this specific job. */
  role: "lead" | "assist";
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
  session_time: string | null;
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

/** A separate scheduled add-on from the trial — actual paid styling for the
 *  rehearsal dinner (the evening before the wedding), not a preview session. */
export interface RehearsalSession {
  id: string;
  studio_id: string;
  booking_id: string;
  session_date: string | null;
  session_time: string | null;
  duration_minutes: number;
  location: string | null;
  fee: number;
  fee_paid: boolean;
  completed: boolean;
  notes: string | null;
  created_at: string;
}

export interface TrialSlotOffer {
  id: string;
  studio_id: string;
  booking_id: string;
  slot_date: string;
  slot_time: string | null;
  status: "open" | "selected" | "withdrawn";
  created_at: string;
}

export type AppointmentStatus = "confirmed" | "pending" | "completed" | "cancelled";

/** A general scheduled meeting that isn't a trial fitting or rehearsal
 *  session — venue walk-throughs, consultations, calls, etc. Optionally
 *  tied to a client. The Appointments page shows these alongside trial
 *  and rehearsal sessions in one unified, date-grouped list. */
export interface Appointment {
  id: string;
  studio_id: string;
  client_id: string | null;
  title: string;
  appointment_date: string;
  appointment_time: string | null;
  location: string | null;
  status: AppointmentStatus;
  notes: string | null;
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
    start_time: string | null;
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
    assigned_stylist_id: string | null;
  }[];
  // The stylist roster assigned to this job — used to split the timeline into
  // one section per stylist (mirroring the studio-side Timeline tab) and to
  // label each section Lead/Assist. Only includes stylists actually assigned
  // via booking_stylists, not every studio team member.
  stylists: {
    id: string;
    name: string;
    role: "lead" | "assist";
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
