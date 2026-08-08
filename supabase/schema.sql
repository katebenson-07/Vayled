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
  updated_at timestamptz not null default now(),
  unique (studio_id)
);

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
