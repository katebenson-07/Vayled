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
  type text not null default 'other' check (type in ('deposit','balance','other')),
  method text,
  note text,
  paid_at timestamptz not null default now()
);

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
alter table client_photos enable row level security;
alter table contract_templates enable row level security;
alter table email_templates enable row level security;
alter table sent_emails enable row level security;
alter table expenses enable row level security;

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

alter table studio_settings enable row level security;

drop policy if exists "Studios manage their own settings" on studio_settings;
create policy "Studios manage their own settings" on studio_settings
  for all using (auth.uid() = studio_id) with check (auth.uid() = studio_id);

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
