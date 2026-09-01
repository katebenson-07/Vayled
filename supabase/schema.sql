-- Vayled database schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run: every statement is if-not-exists / idempotent where possible.

create extension if not exists "uuid-ossp";

-- ============================================================================
-- Core: clients, bookings, wedding party, payments
-- ============================================================================

create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references auth.users(id) on delete cascade,
  bride_name text not null,
  email text,
  phone text,
  wedding_date date,
  venue text,
  notes text,
  referral_source text,
  created_at timestamptz not null default now()
);

alter table clients add column if not exists referral_source text;
alter table clients add column if not exists partner_name text;

create table if not exists bookings (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  status text not null default 'inquiry',
  contract_total numeric not null default 0,
  deposit_amount numeric not null default 0,
  deposit_paid boolean not null default false,
  ready_by_time time,
  buffer_minutes integer not null default 10,
  ceremony_time time,
  location text,
  travel_minutes integer not null default 0,
  contract_sent boolean not null default false,
  contract_signed boolean not null default false,
  contract_signed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table bookings add column if not exists buffer_minutes integer not null default 10;
alter table bookings add column if not exists ceremony_time time;
-- When set, the timeline builder computes forward from this shared moment
-- (so every stylist's queue starts at the same time) instead of backward
-- from ready_by_time (which only guarantees everyone finishes by the same
-- time, regardless of when each stylist actually starts).
alter table bookings add column if not exists start_time time;
alter table bookings add column if not exists location text;
alter table bookings add column if not exists travel_minutes integer not null default 0;
alter table bookings add column if not exists contract_sent boolean not null default false;
alter table bookings add column if not exists contract_signed boolean not null default false;
alter table bookings add column if not exists contract_signed_at timestamptz;

-- Allow 'ghosted' as a status alongside the original four.
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('inquiry','booked','completed','cancelled','ghosted'));

create table if not exists party_members (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid not null references bookings(id) on delete cascade,
  name text not null,
  role text not null default 'bridesmaid',
  hair boolean not null default true,
  makeup boolean not null default true,
  prep_minutes integer not null default 45,
  price numeric not null default 0,
  order_index integer not null default 0
);

alter table party_members add column if not exists price numeric not null default 0;

create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  stylist_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid not null references bookings(id) on delete cascade,
  amount numeric not null,
  type text not null default 'other' check (type in ('deposit','balance','trial','other')),
  method text,
  note text,
  paid_at timestamptz not null default now()
);

-- 'trial' added alongside the original deposit/balance/other so the invoice's
-- Trial/Preview "Mark Paid" button can log its own payment type. 'rehearsal'
-- added the same way for the Rehearsal hair & makeup schedule row.
alter table payments drop constraint if exists payments_type_check;
alter table payments add constraint payments_type_check
  check (type in ('deposit','balance','trial','rehearsal','other'));

-- invoice_line_items: [{ id, description, qty, rate }]
-- invoice_settings: { tip_type, tip_percent, tip_amount,
--   deposit_type, deposit_percent,
--   deposit_due_rule / trial_due_rule / balance_due_rule: { mode: 'date'|'before_wedding', date, days_before },
--   deposit_remind, trial_remind, balance_remind,
--   deposit_paid, trial_paid, balance_paid, notes }
-- Kept as jsonb (same pattern as contract_templates.sections) so the invoice
-- builder can evolve without another migration for every new field.
alter table bookings add column if not exists invoice_line_items jsonb not null default '[]'::jsonb;
alter table bookings add column if not exists invoice_settings jsonb not null default '{}'::jsonb;

-- ============================================================================
-- Team scheduling
-- ============================================================================

create table if not exists stylists (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Most team members added here are 1099 contractors rather than employees;
-- pay_percentage is their cut of a job's contract total, referenced when
-- figuring out what to pay them after a wedding.
alter table stylists add column if not exists is_1099 boolean not null default true;
alter table stylists add column if not exists pay_percentage numeric not null default 0;

-- Which team member is actually doing this person's hair/makeup. Nullable —
-- unassigned members still show up on the timeline under "Unassigned" until
-- someone claims them. Set null (not cascaded) if the stylist is removed, so
-- the party member itself is never deleted as a side effect. Lives here
-- (after stylists exists) rather than next to the rest of party_members'
-- columns above, since it references this table.
alter table party_members add column if not exists assigned_stylist_id uuid references stylists(id) on delete set null;

create table if not exists stylist_time_off (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  stylist_id uuid not null references stylists(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text
);

create table if not exists booking_stylists (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid not null references bookings(id) on delete cascade,
  stylist_id uuid not null references stylists(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (booking_id, stylist_id)
);

-- Payroll: whether this contractor's cut for this specific job has been paid
-- out yet. Lives on the assignment row (not a separate payouts table) since
-- there's exactly one payout per stylist per job.
alter table booking_stylists add column if not exists payout_paid boolean not null default false;
alter table booking_stylists add column if not exists payout_paid_at timestamptz;

-- Lead vs. assisting stylist on a job. Defaults every existing/new assignment
-- to 'lead' so nothing looks unset; the booking page lets you flip any
-- assignment to 'assist' once a second person is added.
alter table booking_stylists add column if not exists role text not null default 'lead';
alter table booking_stylists drop constraint if exists booking_stylists_role_check;
alter table booking_stylists add constraint booking_stylists_role_check check (role in ('lead', 'assist'));

-- ============================================================================
-- Client profile upgrade: notes, vendor team
-- ============================================================================

create table if not exists client_notes (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  tag text not null default 'General',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists vendors (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  role text not null default 'Other',
  name text not null,
  contact text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Trial / bridal preview sessions
-- ============================================================================

create table if not exists trial_sessions (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid not null references bookings(id) on delete cascade,
  session_date date,
  duration_minutes integer not null default 60,
  location text,
  fee numeric not null default 0,
  fee_paid boolean not null default false,
  completed boolean not null default false,
  hair_notes text,
  makeup_notes text,
  day_of_notes text,
  products_text text,
  changes_text text,
  overall_rating integer,
  hair_rating integer,
  makeup_rating integer,
  quote text,
  created_at timestamptz not null default now(),
  unique (booking_id)
);

-- Time-of-day to go with session_date. Added separately since session_date
-- originally only tracked the day, not a time — kept as its own column
-- rather than widening session_date to a timestamp, so existing date-only
-- rows don't need backfilling.
alter table trial_sessions add column if not exists session_time time;

-- ============================================================================
-- Trial slot offers
-- Candidate date/time options a stylist proposes for a client's trial, sent
-- as a link the client opens (no login) to pick one from. Kept as its own
-- table rather than a jsonb column on trial_sessions, since trial_sessions
-- has a unique(booking_id) constraint built around exactly one confirmed
-- session, not a list of options. Selecting a slot writes the confirmed
-- date/time onto trial_sessions via the select_trial_slot() function below.
-- ============================================================================

create table if not exists trial_slot_offers (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid not null references bookings(id) on delete cascade,
  slot_date date not null,
  slot_time time,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table trial_slot_offers drop constraint if exists trial_slot_offers_status_check;
alter table trial_slot_offers add constraint trial_slot_offers_status_check
  check (status in ('open', 'selected', 'withdrawn'));

-- ============================================================================
-- Rehearsal hair & makeup
-- A separate scheduled add-on from the trial — it's actual paid styling for
-- the rehearsal dinner, the evening before the wedding, not a preview
-- appointment. Kept as its own table (rather than another jsonb blob on
-- bookings) so it can carry its own RLS and feed its own invoice schedule
-- row, same pattern as trial_sessions right above.
-- ============================================================================

create table if not exists rehearsal_sessions (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid not null references bookings(id) on delete cascade,
  session_date date,
  session_time time,
  duration_minutes integer not null default 60,
  location text,
  fee numeric not null default 0,
  fee_paid boolean not null default false,
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (booking_id)
);

alter table rehearsal_sessions enable row level security;

drop policy if exists "Studios manage their own rehearsal sessions" on rehearsal_sessions;
create policy "Studios manage their own rehearsal sessions" on rehearsal_sessions
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

-- The matching "assigned stylists" policy lives down in the stylist-logins
-- section below, alongside the other is_assigned_to_booking()-based policies
-- — that function isn't defined until that section, and CREATE POLICY
-- validates its USING/WITH CHECK expressions immediately, not lazily.

-- ============================================================================
-- Appointments
-- General scheduled meetings that aren't a trial fitting or rehearsal
-- session — venue walk-throughs, consultations, calls, etc. Optionally tied
-- to a client, but doesn't require one (a studio might schedule a call with
-- a prospective vendor, for instance). The Appointments page unions this
-- table with trial_sessions and rehearsal_sessions into one list; those two
-- keep their own tables/pages since they carry a lot of domain-specific
-- fields (fees, notes, ratings) that a generic appointment doesn't need.
-- ============================================================================

create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  title text not null,
  appointment_date date not null,
  appointment_time time,
  location text,
  status text not null default 'confirmed',
  notes text,
  created_at timestamptz not null default now()
);

alter table appointments drop constraint if exists appointments_status_check;
alter table appointments add constraint appointments_status_check
  check (status in ('confirmed', 'pending', 'completed', 'cancelled'));

alter table appointments enable row level security;

drop policy if exists "Studios manage their own appointments" on appointments;
create policy "Studios manage their own appointments" on appointments
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

-- ============================================================================
-- Service catalog
-- The dropdown of services (and their default rates) each studio maintains
-- for itself, so invoice line items don't have to be typed freehand every
-- time. Seeded with common bridal services on a studio's first visit to the
-- Services page (app-side, not here, so it only happens once per studio).
-- ============================================================================

create table if not exists service_catalog (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  default_rate numeric not null default 0,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Contracts
-- ============================================================================

create table if not exists contract_templates (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  custom_clauses jsonb not null default '[]'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (studio_id)
);

alter table contract_templates add column if not exists custom_clauses jsonb not null default '[]'::jsonb;
alter table contract_templates add column if not exists sections jsonb not null default '[]'::jsonb;

-- ============================================================================
-- Email templates + send log
-- ============================================================================

create table if not exists email_templates (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subject text not null default '',
  body text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists sent_emails (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid not null references bookings(id) on delete cascade,
  template_name text,
  subject text,
  sent_at timestamptz not null default now()
);

-- ============================================================================
-- Expenses
-- ============================================================================

create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  expense_date date not null default current_date,
  category text not null default 'Other',
  amount numeric not null default 0,
  vendor text,
  note text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Mileage tracker
-- Logs business driving (client visits, product runs, etc.) so stylists can
-- claim the IRS standard mileage deduction at tax time.
-- ============================================================================

create table if not exists mileage_trips (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  trip_date date not null default current_date,
  client_name text,
  from_location text,
  to_location text,
  miles numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Inspiration / mood board photos
-- Photos follow the bride (client_id), not a single booking, so they show up
-- consistently across the client's history. booking_id is optional context
-- (e.g. "this was the trial result for this booking").
-- ============================================================================

create table if not exists client_photos (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  storage_path text not null,
  tag text not null default 'inspo' check (tag in ('inspo', 'trial_result')),
  caption text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security: every studio only ever sees its own data.
-- ============================================================================

alter table clients enable row level security;
alter table bookings enable row level security;
alter table party_members enable row level security;
alter table payments enable row level security;
alter table stylists enable row level security;
alter table stylist_time_off enable row level security;
alter table booking_stylists enable row level security;
alter table client_notes enable row level security;
alter table vendors enable row level security;
alter table trial_sessions enable row level security;
alter table trial_slot_offers enable row level security;
alter table client_photos enable row level security;
alter table contract_templates enable row level security;
alter table email_templates enable row level security;
alter table sent_emails enable row level security;
alter table expenses enable row level security;
alter table mileage_trips enable row level security;
alter table service_catalog enable row level security;

drop policy if exists "Stylists manage their own clients" on clients;
create policy "Stylists manage their own clients" on clients
  for all using (auth.uid() = stylist_id) with check (auth.uid() = stylist_id);

drop policy if exists "Stylists manage their own bookings" on bookings;
create policy "Stylists manage their own bookings" on bookings
  for all using (auth.uid() = stylist_id) with check (auth.uid() = stylist_id);

drop policy if exists "Stylists manage their own party members" on party_members;
create policy "Stylists manage their own party members" on party_members
  for all using (auth.uid() = stylist_id) with check (auth.uid() = stylist_id);

drop policy if exists "Stylists manage their own payments" on payments;
create policy "Stylists manage their own payments" on payments
  for all using (auth.uid() = stylist_id) with check (auth.uid() = stylist_id);

drop policy if exists "Studios manage their own team" on stylists;
create policy "Studios manage their own team" on stylists
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

drop policy if exists "Studios manage their own time off" on stylist_time_off;
create policy "Studios manage their own time off" on stylist_time_off
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

drop policy if exists "Studios manage their own job assignments" on booking_stylists;
create policy "Studios manage their own job assignments" on booking_stylists
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

drop policy if exists "Studios manage their own client notes" on client_notes;
create policy "Studios manage their own client notes" on client_notes
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

drop policy if exists "Studios manage their own vendors" on vendors;
create policy "Studios manage their own vendors" on vendors
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

drop policy if exists "Studios manage their own trial sessions" on trial_sessions;
create policy "Studios manage their own trial sessions" on trial_sessions
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

drop policy if exists "Studios manage their own trial slot offers" on trial_slot_offers;
create policy "Studios manage their own trial slot offers" on trial_slot_offers
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

drop policy if exists "Studios manage their own client photos" on client_photos;
create policy "Studios manage their own client photos" on client_photos
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

drop policy if exists "Studios manage their own contract template" on contract_templates;
create policy "Studios manage their own contract template" on contract_templates
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

drop policy if exists "Studios manage their own email templates" on email_templates;
create policy "Studios manage their own email templates" on email_templates
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

drop policy if exists "Studios manage their own sent email log" on sent_emails;
create policy "Studios manage their own sent email log" on sent_emails
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

drop policy if exists "Studios manage their own expenses" on expenses;
create policy "Studios manage their own expenses" on expenses
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

drop policy if exists "Studios manage their own mileage trips" on mileage_trips;
create policy "Studios manage their own mileage trips" on mileage_trips
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

drop policy if exists "Studios manage their own service catalog" on service_catalog;
create policy "Studios manage their own service catalog" on service_catalog
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

-- ============================================================================
-- Public inquiry form
-- Lets a stylist share a link (e.g. from their own website) where anyone can
-- submit a new inquiry without logging in. Insert-only — the public can never
-- read, update, or delete existing data.
-- ============================================================================

drop policy if exists "Public can submit inquiries (clients)" on clients;
create policy "Public can submit inquiries (clients)" on clients
  for insert to anon with check (true);

drop policy if exists "Public can submit inquiries (bookings)" on bookings;
create policy "Public can submit inquiries (bookings)" on bookings
  for insert to anon with check (status = 'inquiry');

-- ============================================================================
-- Customizable inquiry form settings
-- Each studio can toggle which optional questions show on their public
-- inquiry form, and edit the welcome heading/message.
-- ============================================================================

create table if not exists inquiry_form_settings (
  studio_id uuid primary key references auth.users(id) on delete cascade,
  welcome_heading text not null default 'Welcome, beautiful bride-to-be',
  welcome_message text not null default 'We''re so honored you''re considering us for your special day. Tell us a bit about your wedding and we''ll be in touch to check availability.',
  ask_wedding_date boolean not null default true,
  ask_venue boolean not null default true,
  ask_getting_ready_location boolean not null default true,
  ask_party_size boolean not null default true,
  ask_referral_source boolean not null default true,
  ask_message boolean not null default true,
  custom_questions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table inquiry_form_settings add column if not exists custom_questions jsonb not null default '[]'::jsonb;
alter table inquiry_form_settings add column if not exists ask_budget boolean not null default false;
alter table inquiry_form_settings add column if not exists ask_preferred_contact_method boolean not null default false;
alter table inquiry_form_settings add column if not exists require_phone boolean not null default false;

alter table inquiry_form_settings enable row level security;

drop policy if exists "Studios manage their own inquiry form settings" on inquiry_form_settings;
create policy "Studios manage their own inquiry form settings" on inquiry_form_settings
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

drop policy if exists "Public can view inquiry form settings" on inquiry_form_settings;
create policy "Public can view inquiry form settings" on inquiry_form_settings
  for select to anon using (true);

-- ============================================================================
-- Studio settings: business profile + notification preferences
-- Private to the studio (no public policy) — separate from
-- inquiry_form_settings, which the public inquiry page needs to read.
-- ============================================================================

create table if not exists studio_settings (
  studio_id uuid primary key references auth.users(id) on delete cascade,
  studio_name text,
  contact_email text,
  contact_phone text,
  address text,
  notify_on_new_inquiry boolean not null default true,
  notification_email text,
  updated_at timestamptz not null default now()
);

alter table studio_settings add column if not exists mileage_rate numeric not null default 0.70;
alter table studio_settings add column if not exists expense_budgets jsonb not null default '{}'::jsonb;

-- Default deposit applied to every new invoice's Deposit/Retainer line
-- (Settings > Invoice tab). Still editable per-booking from the invoice
-- itself; this only sets what a brand-new invoice starts with.
alter table studio_settings add column if not exists default_deposit_type text not null default 'percent';
alter table studio_settings add column if not exists default_deposit_percent numeric not null default 25;
alter table studio_settings add column if not exists default_deposit_flat numeric not null default 0;
alter table studio_settings drop constraint if exists studio_settings_default_deposit_type_check;
alter table studio_settings add constraint studio_settings_default_deposit_type_check
  check (default_deposit_type in ('percent','flat'));

alter table studio_settings enable row level security;

drop policy if exists "Studios manage their own settings" on studio_settings;
create policy "Studios manage their own settings" on studio_settings
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

-- ============================================================================
-- Bride portal (public, read-only)
-- A single security-definer function returns just the fields a bride needs
-- to see for her own booking. It intentionally does NOT grant broad SELECT
-- on clients/bookings/payments to anon — only this narrow, booking-scoped
-- function is exposed, so a portal link only ever reveals the one booking
-- it points to, and only once that booking is past the inquiry stage.
-- ============================================================================

create or replace function public.get_bride_portal(p_booking_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'booking', jsonb_build_object(
      'id', b.id,
      'status', b.status,
      'contract_total', b.contract_total,
      'deposit_amount', b.deposit_amount,
      'deposit_paid', b.deposit_paid,
      'ready_by_time', b.ready_by_time,
      'buffer_minutes', b.buffer_minutes,
      'ceremony_time', b.ceremony_time,
      'location', b.location
    ),
    'client', jsonb_build_object(
      'bride_name', c.bride_name,
      'partner_name', c.partner_name,
      'wedding_date', c.wedding_date,
      'venue', c.venue
    ),
    'studio', jsonb_build_object(
      'studio_name', s.studio_name,
      'contact_email', coalesce(s.contact_email, u.email),
      'contact_phone', s.contact_phone
    ),
    'party_members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', pm.name,
        'role', pm.role,
        'hair', pm.hair,
        'makeup', pm.makeup,
        'prep_minutes', pm.prep_minutes,
        'order_index', pm.order_index
      ) order by pm.order_index)
      from party_members pm
      where pm.booking_id = b.id
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'amount', p.amount,
        'type', p.type,
        'note', p.note,
        'paid_at', p.paid_at
      ) order by p.paid_at)
      from payments p
      where p.booking_id = b.id
    ), '[]'::jsonb),
    'trial', (
      select jsonb_build_object(
        'session_date', t.session_date,
        'location', t.location,
        'hair_notes', t.hair_notes,
        'makeup_notes', t.makeup_notes,
        'day_of_notes', t.day_of_notes,
        'products_text', t.products_text,
        'changes_text', t.changes_text
      )
      from trial_sessions t
      where t.booking_id = b.id
      limit 1
    )
  )
  from bookings b
  join clients c on c.id = b.client_id
  left join studio_settings s on s.studio_id = b.stylist_id
  left join auth.users u on u.id = b.stylist_id
  where b.id = p_booking_id
    and b.status in ('booked', 'completed');
$$;

grant execute on function public.get_bride_portal(uuid) to anon, authenticated;

-- ============================================================================
-- Trial slot picker (public, read + one narrow write)
-- Same shape as the bride portal above: no broad RLS grant to anon on
-- trial_slot_offers or trial_sessions, just two narrow security-definer
-- functions scoped to one booking_id at a time. get_trial_slot_offers is
-- read-only; select_trial_slot is the only write path anon ever gets, and it
-- re-validates the slot belongs to the booking and is still open before
-- touching anything.
-- ============================================================================

create or replace function public.get_trial_slot_offers(p_booking_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'bride_name', c.bride_name,
    'studio_name', coalesce(s.studio_name, 'Your studio'),
    'confirmed_date', t.session_date,
    'confirmed_time', t.session_time,
    'slots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'date', o.slot_date,
        'time', o.slot_time
      ) order by o.slot_date, o.slot_time)
      from trial_slot_offers o
      where o.booking_id = b.id and o.status = 'open'
    ), '[]'::jsonb)
  )
  from bookings b
  join clients c on c.id = b.client_id
  left join trial_sessions t on t.booking_id = b.id
  left join studio_settings s on s.studio_id = b.stylist_id
  where b.id = p_booking_id
    and b.status in ('booked', 'completed');
$$;

grant execute on function public.get_trial_slot_offers(uuid) to anon, authenticated;

create or replace function public.select_trial_slot(p_booking_id uuid, p_slot_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot trial_slot_offers%rowtype;
  v_updated integer;
begin
  select * into v_slot
  from trial_slot_offers
  where id = p_slot_id and booking_id = p_booking_id and status = 'open'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'That time is no longer available — pick another one below.');
  end if;

  update trial_slot_offers set status = 'withdrawn'
  where booking_id = p_booking_id and status = 'open';

  update trial_slot_offers set status = 'selected'
  where id = p_slot_id;

  update trial_sessions
  set session_date = v_slot.slot_date, session_time = v_slot.slot_time
  where booking_id = p_booking_id;
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    insert into trial_sessions (studio_id, booking_id, session_date, session_time)
    values (v_slot.studio_id, p_booking_id, v_slot.slot_date, v_slot.slot_time);
  end if;

  return jsonb_build_object('ok', true, 'date', v_slot.slot_date, 'time', v_slot.slot_time);
end;
$$;

grant execute on function public.select_trial_slot(uuid, uuid) to anon, authenticated;

-- ============================================================================
-- Stylist team logins
-- Up to now every screen in the app ran as a single "owner" login per studio.
-- studio_members lets a stylist get their own login, invited by email from
-- the Stylists page, scoped to a stripped-down "their own work only" view —
-- see current_stylist_id/is_assigned_to_booking/is_lead_on_booking below and
-- the added stylist-scoped policies further down.
--
-- The owner never gets a row here (auth.uid() = studio_id keeps working
-- everywhere it always has) — this table only ever holds invited stylists.
-- user_id stays null until the invite is accepted; invite_token is the only
-- thing the (not-yet-authenticated) invite email link carries.
-- ============================================================================

create table if not exists studio_members (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references auth.users(id) on delete cascade,
  stylist_id uuid not null references stylists(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'stylist' check (role in ('owner', 'stylist')),
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  invite_token uuid not null default uuid_generate_v4(),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (stylist_id)
);

alter table studio_members enable row level security;

drop policy if exists "Owners manage their studio members" on studio_members;
create policy "Owners manage their studio members" on studio_members
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

drop policy if exists "Members view their own membership" on studio_members;
create policy "Members view their own membership" on studio_members
  for select using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Helper functions used inside the stylist-scoped policies below.
-- All security invoker (not definer) on purpose: they only ever see what the
-- calling user's own RLS already lets them see — current_stylist_id relies on
-- the "Members view their own membership" policy above to find *their own*
-- row and nothing else, so there's no privilege escalation risk here.
-- ----------------------------------------------------------------------------

create or replace function public.current_stylist_id(p_studio_id uuid)
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select stylist_id from studio_members
  where studio_id = p_studio_id and user_id = auth.uid() and status = 'active'
  limit 1;
$$;

create or replace function public.is_assigned_to_booking(p_booking_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from booking_stylists bs
    where bs.booking_id = p_booking_id
      and bs.stylist_id = current_stylist_id(bs.studio_id)
  );
$$;

create or replace function public.is_lead_on_booking(p_booking_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from booking_stylists bs
    where bs.booking_id = p_booking_id
      and bs.role = 'lead'
      and bs.stylist_id = current_stylist_id(bs.studio_id)
  );
$$;

-- ----------------------------------------------------------------------------
-- Invite lookup + accept. Same narrow security-definer pattern as the bride
-- portal / trial picker above: get_studio_invite is public read-only (the
-- invite-acceptance page needs to show "join Kate Benson Beauty" before the
-- stylist has an account at all); accept_studio_invite is the only write, and
-- only usable by an authenticated user against their own freshly-created
-- account, and only once per token.
-- ----------------------------------------------------------------------------

create or replace function public.get_studio_invite(p_token uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'stylist_name', st.name,
    'stylist_email', st.email,
    'studio_name', coalesce(ss.studio_name, 'This studio'),
    'status', sm.status
  )
  from studio_members sm
  join stylists st on st.id = sm.stylist_id
  left join studio_settings ss on ss.studio_id = sm.studio_id
  where sm.invite_token = p_token;
$$;

grant execute on function public.get_studio_invite(uuid) to anon, authenticated;

create or replace function public.accept_studio_invite(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member studio_members%rowtype;
begin
  select * into v_member from studio_members
  where invite_token = p_token and status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'This invite link is invalid or has already been used.');
  end if;

  update studio_members
  set user_id = auth.uid(), status = 'active', accepted_at = now()
  where id = v_member.id;

  return jsonb_build_object('ok', true, 'studio_id', v_member.studio_id, 'stylist_id', v_member.stylist_id);
end;
$$;

grant execute on function public.accept_studio_invite(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Stylist-scoped policies. Each is added *alongside* the existing owner-only
-- policy on that table (Postgres OR's multiple permissive policies together),
-- so nothing above this line changes for the owner. Tables not touched here
-- (payments, contracts, invoicing, email templates, expenses, mileage,
-- service catalog, studio/inquiry-form settings) stay owner-only on purpose —
-- see the scope doc for why.
-- ----------------------------------------------------------------------------

drop policy if exists "Assigned stylists view their bookings" on bookings;
create policy "Assigned stylists view their bookings" on bookings
  for select using (is_assigned_to_booking(id));

drop policy if exists "Assigned stylists view their clients" on clients;
create policy "Assigned stylists view their clients" on clients
  for select using (
    exists (select 1 from bookings b where b.client_id = clients.id and is_assigned_to_booking(b.id))
  );

drop policy if exists "Assigned stylists view party members" on party_members;
create policy "Assigned stylists view party members" on party_members
  for select using (is_assigned_to_booking(booking_id));

drop policy if exists "Stylists view their own roster record" on stylists;
create policy "Stylists view their own roster record" on stylists
  for select using (id = current_stylist_id(studio_id));

drop policy if exists "Stylists view their own assignments" on booking_stylists;
create policy "Stylists view their own assignments" on booking_stylists
  for select using (stylist_id = current_stylist_id(studio_id));

drop policy if exists "Assigned stylists manage trial notes" on trial_sessions;
create policy "Assigned stylists manage trial notes" on trial_sessions
  for all using (is_assigned_to_booking(booking_id)) with check (is_assigned_to_booking(booking_id));

drop policy if exists "Assigned stylists manage rehearsal sessions" on rehearsal_sessions;
create policy "Assigned stylists manage rehearsal sessions" on rehearsal_sessions
  for all using (is_assigned_to_booking(booking_id)) with check (is_assigned_to_booking(booking_id));

drop policy if exists "Assigned stylists view trial slot offers" on trial_slot_offers;
create policy "Assigned stylists view trial slot offers" on trial_slot_offers
  for select using (is_assigned_to_booking(booking_id));

drop policy if exists "Lead stylists create trial slot offers" on trial_slot_offers;
create policy "Lead stylists create trial slot offers" on trial_slot_offers
  for insert with check (is_lead_on_booking(booking_id));

drop policy if exists "Lead stylists update trial slot offers" on trial_slot_offers;
create policy "Lead stylists update trial slot offers" on trial_slot_offers
  for update using (is_lead_on_booking(booking_id)) with check (is_lead_on_booking(booking_id));

drop policy if exists "Lead stylists delete trial slot offers" on trial_slot_offers;
create policy "Lead stylists delete trial slot offers" on trial_slot_offers
  for delete using (is_lead_on_booking(booking_id));

drop policy if exists "Assigned stylists manage trial-result photos" on client_photos;
create policy "Assigned stylists manage trial-result photos" on client_photos
  for all
  using (booking_id is not null and is_assigned_to_booking(booking_id))
  with check (booking_id is not null and is_assigned_to_booking(booking_id));

drop policy if exists "Stylists manage their own block-out dates" on stylist_time_off;
create policy "Stylists manage their own block-out dates" on stylist_time_off
  for all
  using (stylist_id = current_stylist_id(studio_id))
  with check (stylist_id = current_stylist_id(studio_id));

-- ============================================================================
-- Storage: client photos (mood board / trial results)
-- Files are stored at {studio_id}/{client_id}/{filename} — the folder-prefix
-- policies below only let a stylist touch objects under their own studio_id.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('client-photos', 'client-photos', false)
on conflict (id) do nothing;

drop policy if exists "Studios manage their own photo files" on storage.objects;
create policy "Studios manage their own photo files" on storage.objects
  for all
  using (bucket_id = 'client-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'client-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- Marketing waitlist
-- A single, platform-wide list (not scoped to any studio) for people who find
-- the marketing site but aren't ready to create a full account yet. Insert
-- only from the public site — nobody can read this back through the app, by
-- design; view signups directly in the Supabase table editor.
-- ============================================================================

create table if not exists waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  created_at timestamptz not null default now()
);

alter table waitlist_signups enable row level security;

drop policy if exists "Public can join the waitlist" on waitlist_signups;
create policy "Public can join the waitlist" on waitlist_signups
  for insert to anon with check (true);
