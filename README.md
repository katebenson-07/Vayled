# Vayled

A CRM built specifically for bridal hair and makeup stylists: client profiles, bookings with a full wedding party, an auto-generated wedding-day prep timeline, payment tracking, a booking calendar, team scheduling, trial session notes, contracts, email templates, invoicing, business analytics, and expense tracking.

Stack: Next.js 14 (App Router, TypeScript), Tailwind CSS, Supabase (Postgres + Auth).

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project (or use your existing one).
2. In the project dashboard, open **SQL Editor > New query**, paste the contents of `supabase/schema.sql`, and run it. This script is safe to re-run — it creates any missing tables/columns without touching existing data, and sets up row-level security so each studio only ever sees its own data.
3. Go to **Project Settings > API** and copy the **Project URL** and **anon public key**.

## 2. Configure the app

1. Copy `.env.local.example` to `.env.local`.
2. Fill in the two values you copied:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Optionally, add a [Resend](https://resend.com) API key to actually send emails (invites, contracts, invoices) instead of falling back to a copy-link/mailto flow:

```
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=notifications@yourdomain.com
```

This is left for student contributors to wire up — see `Vayled-Site-Audit-For-Students.docx`.

## 3. Install and run

```
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up with an email and password — Supabase Auth handles the account, no extra setup needed.

## What's included

**Core**
- Auth — email/password sign up and sign in per studio.
- Clients — bride profile with wedding date, venue, contact info, referral source, notes.
- Bookings — status (inquiry / booked / completed / ghosted / cancelled), contract total, deposit, ready-by time, configurable buffer between party members, ceremony time, venue travel time.
- Wedding party — each person with hair/makeup flags, prep time, and per-person pricing that rolls up into a party total and total chair time.
- Timeline — automatically schedules everyone backward from the ready-by time, using your configured buffer.
- Payments — record payments against a booking; balance due is calculated automatically.
- Calendar — a month view with every booking plotted on its wedding date, stylist filter, time-off tinting.
- Stylist scheduling — team roster, time off, and on each booking who's assigned / available / off / booked elsewhere.

**Client profile upgrade**
- Tagged notes (hair texture, allergy, day-of note, etc.) per client.
- Vendor team — photographer, florist, planner and other vendor contacts per client.
- Status pipeline badges (inquiry → contract signed → deposit paid → trial done → week of wedding → wedding day → balance & review).
- Countdown-to-wedding widget on the booking page.

**Trial sessions** — a dedicated page per booking with session details, hair/makeup/day-of notes, products used, requested changes for wedding day, star-rated client feedback, and a pulled quote. Print notes straight from the browser.

**Contracts** — one editable template (with merge fields like `{{bride_name}}`, `{{wedding_date}}`, `{{balance_due}}`) that auto-fills per booking. Mark sent/signed and print or save as PDF.

**Email templates** — a reusable library (inquiry response, booking confirmation, trial reminder, balance due, thank-you) with merge fields. Sending opens a pre-filled email in your own email client and logs the send against the booking.

**Invoicing** — a printable per-booking invoice generated from party pricing (or the contract total if you don't itemize), payments to date, and balance due.

**Business analytics** — 12-month view of inquiries, bookings, and "ghosted" inquiries by month, booked-rate, and your busiest month for inquiries.

**Expenses** — a log (date, category, amount, vendor, note) with monthly filtering, editable per-category budgets with over-budget warnings, a mileage tracker (trips, editable IRS rate, automatic deduction totals), and CSV export for both expenses and mileage formatted to hand to your CPA.

**Public inquiry form** — a no-login page at `/inquire/[your-user-id]` you can link from a website, Instagram bio, or anywhere else. Submitting it creates a client and an inquiry in your account automatically. Your personal link is shown on the Dashboard with a copy button.

**Bride portal** — a no-login page at `/portal/[bookingId]` for a bride once her booking is confirmed. Share it from her booking's sub-nav ("Bride portal" / "Copy link"). Shows her countdown, getting-ready time/location, day-of timeline, upcoming appointments, payment tracker, booked services, trial notes, and reminders. Read-only — no payment collection.

**Stylist team logins** — invite stylists by email from the Stylists page; they set their own password and land on a stripped-down `/team` area (their own schedule, block-out dates, trial-time offers if they're the lead, and a Print/Save PDF of their day-of timeline). Enforced with Postgres Row Level Security, not just hidden in the UI.

**Rehearsal hair & makeup** — a separate scheduled add-on from the trial, with its own invoice line and calendar entry.

## What's not built yet

These need external services this app doesn't have credentials for, so they're intentionally out of scope for now:

- Paying the remaining balance from the bride portal — needs a payment processor.
- Real payment processing — payments are currently logged manually; wiring up Stripe needs your own Stripe account and API keys.
- Automated (scheduled) email/SMS sending — transactional emails (invites, contracts, invoices) send via Resend once `RESEND_API_KEY` is set (falls back to a copy-link/mailto flow otherwise); but nothing sends *automatically on a schedule* yet — the dashboard's Reminders panel only flags what's due, a human still has to click send.
- True e-signature on contracts — contracts can be marked sent/signed manually; a real e-signature flow needs a provider like DocuSign or HelloSign.
- Password reset — there's currently no "forgot password" flow for either owner or stylist logins.

See `Vayled-Site-Audit-For-Students.docx` for a full, categorized list of known gaps and rough edges to work through.

## Deploying

The easiest path is [Vercel](https://vercel.com): connect this folder as a GitHub repo, import it into Vercel, and add the same two `NEXT_PUBLIC_SUPABASE_*` environment variables in the Vercel project settings.
