export interface Client {
  id: string;
  stylist_id: string;
  bride_name: string;
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
}

export interface Payment {
  id: string;
  booking_id: string;
  stylist_id: string;
  amount: number;
  type: "deposit" | "balance" | "other";
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
