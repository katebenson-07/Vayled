# Scope: Stylist Team Logins

## Why

Right now Vayled has exactly one login per studio — you. Stylists are just names in a roster table (`stylists`): pay %, contact info, active/inactive. They never sign in anywhere; every screen in the app runs as you.

You want what GlossGenius does: invite each stylist by email, they set up their own login, and from there they can see their own schedule, their own payout, and manage their own clients' trial notes — without seeing your full client list, contracts, invoicing, or what everyone else gets paid.

This is a bigger change than most recent features because it touches **auth** and **security (RLS)** across nearly every table in the app, not just one page.

## What a stylist can do once logged in (per your answers)

- See their own schedule/timeline — which weddings they're assigned to, ready-by times, their slice of each wedding-day timeline. Not other stylists' jobs, not your full calendar.
- See their own payout — what they're owed / have been paid on jobs they're assigned to. Not studio-wide payroll, not what anyone else makes.
- Edit trial notes & client photos for clients they're assigned to — technique notes, inspo photos, trial results.
- **If they're the lead stylist on a wedding:** send trial-date options to the bride — access to the existing "Offer times to pick from" picker on that booking's trial page, and the "Copy link to send" action. Gated specifically on the `lead` role for that booking (from the existing `booking_stylists` role field), not just on being assigned — an assist stylist on a job doesn't get this, only the lead does.
- Add their own block-out/time-off dates — the `stylist_time_off` table and the Calendar's availability display already exist and are read by you today; this just adds a way for a stylist to add/remove their *own* time off directly instead of you entering it for them. You still see it immediately on your Calendar and Stylists pages, same as now.

**Locked to you only:** full client list, contracts, invoicing, deposits/balances, studio-wide payroll, expenses, analytics, settings, deleting anything.

## What has to be built

**1. Data model**
- New `studio_members` table: links a real `auth.users` account to a studio (your `studio_id`) and a `stylist_id`, with a role (`owner` / `stylist`) and invite status (`pending` / `active`).
- `stylists` table stays as-is (still your roster + pay %); it just optionally gets linked to a real login once invited.

**2. Invite flow**
- "Invite" button next to each stylist on the Stylists page (only shows if they have an email on file and aren't already invited).
- Sends an email invite (Supabase Auth invite) with a link to set a password.
- Once they accept, their new account is linked to that stylist record and your studio — they're now a real user, scoped to your studio only.

**3. Security rework (the highest-risk part)**
- Every table currently has a policy like `using (auth.uid() = studio_id)`. That has to change to something like `using (is_studio_member(studio_id))`, a helper function that checks the new membership table — so both you and any invited stylist can pass the check for your studio's data.
- On top of that, stylist-scoped tables (bookings, party members, trial notes, photos, payments) need a **second layer**: even as a recognized studio member, a stylist should only see/edit rows tied to bookings they're actually assigned to — not your whole client list. Tables that stay owner-only (contracts, invoices, expenses, payroll, analytics data) get a stricter policy that checks for the `owner` role specifically.
- `trial_sessions` and `trial_slot_offers` get a **third, tighter check**: a stylist can only create/send trial-date offers on a booking where they're specifically marked `lead` in `booking_stylists` — an assist stylist on the same job can't send offers to that bride.
- `stylist_time_off` gets a policy allowing a stylist to insert/delete rows where `stylist_id` matches their own linked stylist record, in addition to your existing full access as owner.
- This means rewriting roughly 15–18 RLS policies. I'd do this carefully, one table at a time, and verify each one before moving to the next — a mistake here could let a stylist see something they shouldn't.

**4. Stylist-facing UI**
- A separate, stripped-down sidebar/dashboard for anyone logging in with the `stylist` role: "My schedule," "My clients" (assigned only), "My payout." No Bookings/Clients/Contracts/Payroll/Analytics/Settings nav items.
- Existing pages (bookings, timeline, trial notes) get read/edit scoped down when viewed as a stylist, rather than building entirely separate pages where possible — less to maintain.

**5. Rollout**
- Existing studios (i.e., you) keep working exactly as now — you're auto-set as `owner` on your own studio, nothing changes in your day-to-day.
- This is additive: nothing breaks for solo studios that never invite anyone.

## What I'd leave out of v1 (can add later if you want)

- Per-stylist granular permission toggles (e.g. "this stylist can see contracts too") — v1 is just two fixed roles, owner and stylist.
- A stylist belonging to more than one studio.
- Removing/revoking a stylist's login access after invite (would need a "deactivate access" action, separate from just marking them inactive in the roster).

## Why this needs a scope doc instead of just building

Every other feature this session has been additive — a new page, a new column, a new button. This one rewrites the security boundary the entire app is built on. I want to make sure the permission model above is actually what you want before I touch ~18 RLS policies, since getting it wrong risks exposing data between stylists or between studios.
