# Changelog

Running log of changes requested while testing the app. Newest first.

## 2026-08-18 (26)

- **Separated Delete from the primary action on both list pages** — on Inquiries, "Delete" sat right next to "Convert to project"; on Bookings, right next to the status label. Both now have a visual divider and more spacing before Delete, and it's dimmed to a lighter red until hovered, so it reads as a secondary, easy-to-avoid action instead of sitting shoulder-to-shoulder with the main thing you'd actually click.

## 2026-08-18 (25)

- **Moved booking delete to the bottom of the booking profile** — it was next to the bride's name up top; now it's its own "Danger zone" section at the very bottom of the page, below Payments, visible regardless of which tab is open. Same confirmation as before, just relocated.
- **Added client delete** — same "Danger zone" section at the bottom of a client's profile (`/clients/[id]`). Confirms first and is explicit that deleting a client takes every one of their bookings with it (contracts, invoices, payments, wedding parties, timelines, notes, vendors) — this is the biggest single delete in the app, since one client can have more than one booking. No schema changes.

## 2026-08-18 (24)

- **Edit button on the booking header** — bride name, wedding date, and party size were only ever set at inquiry time with no way to fix a typo or adjust headcount later without leaving the page. Added an "Edit" link next to the bride's name that opens a small inline panel:
  - Bride name and wedding date save immediately as you type/change them (same autosave pattern as everywhere else on this page).
  - Party size adds or removes wedding party members to match the number you enter. Growing it adds unassigned placeholder rows (same "Bridesmaid N" naming Quick assign already uses). Shrinking it only ever removes people who aren't yet assigned to a stylist — if you ask it to shrink past that, it stops and tells you to unassign people first instead of silently deleting someone off a stylist's timeline.
  - No schema changes.

## 2026-08-18 (23)

- **Added a way to delete a booking** — there was genuinely no path to this before. Added "Delete" to:
  - The booking detail page, next to "Build timeline" (red, visually set apart from the other actions).
  - Each row on the Bookings and Inquiries list pages, so you don't have to open a booking just to remove a bad inquiry or a test entry.
  - Every one of these asks for a plain confirm first and names the client, since it's the only irreversible delete in the app — everything else (removing a vendor, a party member, a note) deletes immediately with no confirmation, but this one deletes the whole booking plus its contract, invoice, payments, wedding party, and timeline in one shot, so it gets a guard the others don't.
  - One thing worth knowing: any trial photos attached to the booking (`client_photos`) are **not** deleted along with it — they're kept and just unlinked from the booking (this was already how the schema was set up, not something I changed). Everything else — payments, contract/invoice data, wedding party, timeline assignments, sent-email log, trial times — is fully deleted via cascade. No schema changes needed for this one.

## 2026-08-18 (22)

- **Rewrote the homepage messaging** — was leading with pain points ("sound familiar?"), now leads with the actual product: one organized path every booking follows from inquiry to wedding day, instead of juggling multiple apps.
  - New headline/subhead around "one organized path" + not needing five different apps.
  - Replaced the pain-point list with a section showing the real booking pipeline steps (Inquiry received → Contract signed → Deposit paid → Trial done → Week of wedding → Wedding day → Balance & review) — same wording as the actual pipeline strip in the app, so it's an accurate preview, not marketing fluff.
  - Swapped the three feature callouts to: the timeline builder (now framed around "send it to your whole team and your bride," with easy editing), the booking checklist/pipeline (nothing forgotten), and the Dashboard's reminders panel (stay ahead of clients instead of chasing them).
  - Added a new real screenshot, `public/marketing/pipeline.jpg` (cropped from a booking page showing the pipeline strip) for the checklist section.

## 2026-08-18 (21)

- **Reordered the sidebar** to: Dashboard, Inbox, Bookings, Calendar, Clients, Inquiries, Contracts, Stylists, Payroll, Emails, Analytics, Expenses. No functional changes.

## 2026-08-18 (20)

- **Inquiries and Bookings are now separate sidebar tabs** — previously both lived on one `/bookings` page behind an in-page "Inquiries / Projects" toggle. Split into two real pages so it's one click instead of click-then-switch-tab:
  - New `/inquiries` page — just the incoming leads, with "Convert to project" on each one (converting removes it from this list immediately).
  - `/bookings` is now projects only (no more inquiries mixed in, no more in-page tabs).
  - Sidebar has a new Inquiries item (right after Clients) with a count badge showing how many inquiries are open, same style as the Inbox unread badge.
  - No schema changes, nothing to re-run in Supabase — this is routing/UI only.

## 2026-08-18 (19)

- **Trial picker upgraded to a real calendar** — the client-facing page (`/trials/[bookingId]/pick`) no longer shows offered times as a flat list. It's now a month calendar like the one on the internal Calendar page: days with open times are highlighted with a gold dot, she taps a day to see that day's times, then taps a time to confirm. Handles multiple open days and multiple times per day cleanly, with month navigation if you've offered times further out. No schema changes — same `trial_slot_offers` data, just a different way of presenting it.
  - On the studio side, adding several times for the same day is faster now: the date field stays put after each "Add time" so you can add 10am, 1pm, 3pm back to back instead of re-picking the date each time. The list of offered times is also grouped by date instead of one long flat list, with a "+ another time this day" shortcut under each date.

## 2026-08-18 (18)

- **Client self-scheduling for trials** — a stylist can now offer a handful of open trial times and let the client pick one herself instead of going back and forth over text.
  - On the trial page (`/trials/[bookingId]`), a new "Offer times to pick from" section lets you add a few candidate date/time options and copy a link to send the client.
  - The client opens that link (no account needed) at `/trials/[bookingId]/pick`, sees the open times, and picks one — it's confirmed immediately and written straight onto the trial's date/time, same as if you'd typed it in yourself. If someone else grabs a slot first, or the studio has already confirmed a time another way, the page tells her instead of letting her double-book.
  - Added a "Trial time options" email template with a `{{trial_pick_link}}` merge field, so sending the link takes one click from the Emails page (or you can just use "Copy link to send" and paste it anywhere — text, email, whatever your client prefers).
  - **New table + two Postgres functions — you'll need to re-run `schema.sql` in Supabase for this one.** Followed the same pattern as the existing bride portal: the candidate times live in a new `trial_slot_offers` table that only the studio can read/write directly; the client-facing page only ever talks to two narrow functions (`get_trial_slot_offers`, `select_trial_slot`) that are scoped to exactly one booking at a time. There's no broad public access to trial data — same reasoning as the bride portal, just extended to cover a write instead of only a read.
  - Also added a time-of-day field (`session_time`) next to the existing trial date, since trials previously only tracked a date with no time.

## 2026-08-18 (16)

- **Public marketing site, separate from the app** — `vayled.com` used to load straight into the (login-gated) dashboard, which meant search engines and anyone signed out just saw a blank "Loading..." shell with nothing to index. Fixed by giving the site an actual public front door:
  - Moved the dashboard from `/` to `/dashboard`. Updated the login redirect, Sidebar's Dashboard link, and nothing else needed to change — every other app route (`/bookings`, `/payroll`, etc.) was already at its own path.
  - New public marketing site at `/`, `/features`, `/pricing`, `/about` — server-rendered, real copy about what Vayled does, aimed at hair & makeup artists as the audience (not brides). Shares the sidebar's charcoal/gold/ivory brand styling but has its own top nav + footer (`MarketingNav`, `MarketingFooter`).
  - `/login` now accepts `?mode=signup` so "Sign up" buttons land directly in account-creation mode instead of sign-in.
  - Each public page has its own title/description (`generateMetadata` per route) instead of one generic title for the whole site.
  - Added `app/sitemap.ts` and `app/robots.ts` — the sitemap only lists the public pages; robots explicitly disallows every authenticated app route plus `/portal` and `/inquire` (those are meant to be shared via a direct link with one client, not surfaced in search).
  - Feature sections use a `FeatureVisual` component that renders a real screenshot if you drop one in `public/marketing/`, and a branded placeholder panel if not — so the site ships looking finished today, and screenshots can be swapped in without touching any page code.
  - **Screenshots are the one thing I didn't do**: the moment I checked the live app to grab one, real client data showed up (a client's name and a $2,000 contract amount, on the Payroll page). I didn't save or use that screenshot — publishing an actual client's name/financials on a public marketing page isn't a call I should make for you. Easiest fix: add a couple of bookings with clearly fake info (e.g. "Demo Bride") before I (or you) screenshot the timeline builder, payroll, calendar, invoicing, and bride portal pages. Once those exist, save them into `public/marketing/` using the filenames already referenced in `app/(marketing)/features/page.tsx` (`timeline-builder.png`, `calendar.png`, `contracts.png`, `invoicing.png`, `bride-portal.png`, `payroll.png`) plus `dashboard.png` for the homepage — they'll show up automatically.
  - **Also worth doing once this is live**: verify `vayled.com` in Google Search Console (DNS TXT record, similar to the Resend setup) and submit the sitemap — that's what actually gets it crawled; nothing about the code triggers indexing on its own.

## 2026-08-18 (17)

- **Real screenshots on the marketing site** — you confirmed the data on the live app is mock/test data, not real clients, so I went ahead and captured the ones flagged as pending: dashboard, calendar, payroll, the timeline builder, an invoice, the bride portal, and the contract editor. Saved into `public/marketing/` and wired into the homepage and `/features` page (was showing branded placeholders before). Only picked shots where the visible client name was the "katie Love" test booking and the wedding party rows are generic "Bridesmaid N" placeholders — nothing identifying.

## 2026-08-11 (15)

- **Real email sending, via Resend** — templates and Dashboard reminders now send for real (no more opening your own email app) once Resend is connected. Emails go out from Vayled with your studio name as the sender and your own contact email as Reply-To, so a bride's reply lands in your inbox, not ours. Until Resend is connected, everything still works exactly as before — it automatically falls back to the mailto flow, so nothing breaks in the meantime.
  - New `app/api/send-email` route calls Resend server-side. No service-role key involved — it authenticates as the studio making the request, so Postgres's existing row-level security is what actually decides which bookings/logs it can touch.
  - **You'll need to do a few things outside the code to turn this on** (I can't do these for you — they need your own accounts/credentials):
    1. Sign up at resend.com (free tier: 3,000 emails/month).
    2. Add and verify `vayled.com` as a sending domain in Resend (it'll give you DNS records to add wherever vayled.com's DNS is managed).
    3. In Vercel → Settings → Environment Variables, add `RESEND_API_KEY` (from Resend) and optionally `RESEND_FROM_EMAIL` (defaults to `notifications@vayled.com`).
    4. Redeploy — Vercel only picks up new environment variables on a fresh deploy.

## 2026-08-11 (14)

- **New "Reminders" panel on the Dashboard** — surfaces what needs to go out today, with a one-click Send (or Schedule) button right there:
  - **Balance/invoice reminders** — flagged once a booking's balance due date (the same rule set on its invoice, defaulting to 7 days before the wedding) is within a week out or overdue. Clicking Send opens your email app pre-filled with the "Balance due reminder" template and logs it, same as sending from the Emails page — it just won't nag again for 5 days.
  - **Book-a-preview reminders** — any booked wedding with no trial session scheduled yet shows up with a "Schedule" button straight to that booking's Trial page.
  - **Trial questionnaire reminders** — the day before a scheduled trial, a reminder appears to send the new "Trial prep questionnaire" template (hair type, skin sensitivities, inspo photos, vibe, plus-ones) — one click, logged, won't repeat once sent.
  - No new email service was added — this still uses the same mailto-based send-and-log flow as the Emails page (per your call on the "smart reminders, I still click send" approach). Email templates now live in one shared file so the Dashboard and Emails page always agree on template names. No schema change.

## 2026-08-11 (13)

- **Calendar dates are now clickable** — click any day on the Calendar to open a panel listing every booking on that date (bride name, status, venue, party size, assigned stylists), each linking straight to that booking. Empty days show a "+ New job" link instead. Handy for days with more than a couple bookings, since the little pills in the grid truncate. Close with the × button, click outside, or Escape. No schema change.

## 2026-08-11 (12)

- **Timeline tab has View / Edit modes** — View is back to the original clean look (colored dot, name, role, start–end time, read-only), and is now the default when you open the tab. Switch to Edit to get the editable/draggable version — rename, hair/makeup, prep time, remove, drag to reassign or reorder. Same data either way, just a toggle for which view you want.

## 2026-08-11 (11)

- **Fixed the failed deploy** — the last push broke Vercel's build over an unescaped apostrophe in a Timeline tab hint ("stylist's" → `stylist&apos;s`), an ESLint rule that only runs during the actual production build, not the local typecheck. Also ran the full lint pass locally this time to make sure nothing else was hiding the same way.

## 2026-08-11 (10)

- **Wedding party is now just Quick assign** — the per-person list (name, role, hair/makeup, prep time, stylist dropdown) is gone from the Overview tab. All of that editing moved to the Timeline tab instead, right next to the schedule it actually affects.
- **Timeline tab is fully editable** — each person's card now has an editable name, Hair/Makeup checkboxes, and a prep-time field, plus a Remove button, right there on their timeline entry. There's also a "+ Add person" button for anyone Quick assign doesn't cover.
- **Drag to reassign** — grab the ⠿ handle on anyone's timeline card and drop them onto a different stylist's schedule (or back to Unassigned) to move them, or drop them next to someone else in the same schedule to reorder. The schedule recalculates instantly. No schema change — this uses the existing `assigned_stylist_id` and `order_index` columns.

## 2026-08-11 (9)

- **Removed the Wedding details box** — replaced with a small bar right above the tabs with just Status and Ready-by time, since those are the two things you actually touch day to day. Contract total and deposit amount are dropped from this page (they're already editable from Contract details and auto-sync from the Invoice, so this was duplicate entry). Buffer between people and Ceremony time moved to the Timeline tab, right where they're used. The "Deposit paid" checkbox is gone too — the pipeline and milestone tracker now mark the deposit paid automatically once a real deposit payment is recorded (via the invoice's "Mark paid" or a manual payment), instead of needing a separate manual toggle.
- **Vendor team is now its own tab** — pulled it out of Overview into a new "Vendors" tab alongside Trial notes, Timeline, and Payments, so Overview isn't as crowded.

## 2026-08-11 (8)

- **Quick assign by headcount** — Wedding party now has a "Quick assign" box (once stylists are on the job): enter how many people each stylist is doing (e.g. Sullivan: 3, Trevor: 2) and hit Generate. It fills anyone not yet assigned first, adds placeholder bridesmaids for any shortfall, and jumps straight to the Timeline tab — no more setting each person's dropdown one at a time. No schema change.

## 2026-08-11 (7)

- **Tightened up the booking page** — reduced padding and spacing across every section, standardized section headers to one consistent style (was a mix of serif headings and small caps labels), and reworked the Wedding party rows into two tiers (name/role up top, hair/makeup/prep/stylist as a lighter secondary row below) instead of one long wrapping line of controls. Same information, same tabs — just less visual noise. No functional or schema change.

## 2026-08-11 (6)

- **Lead vs. assisting stylist** — each stylist assigned to a job ("Stylists on this job") now has a Lead/Assist toggle instead of just being "Assigned." The first person you assign defaults to Lead, anyone added after defaults to Assist — flip either one anytime. That role now shows up everywhere the stylist does: the per-person dropdown in Wedding party ("Sullivan (Lead)"), each stylist's card on the Timeline tab, and next to each job on the Payroll page, with Lead cards/timelines listed first. **Requires re-running `supabase/schema.sql`** — adds `role` to `booking_stylists` (defaults to `'lead'`).

## 2026-08-11 (5)

- **New Payroll page** — a "Payroll" tab in the sidebar shows what every 1099 contractor is owed, grouped by stylist. Each job they're assigned to shows the contract total, their pay % (from the Stylists page), and the dollar amount that % works out to, with a "Mark paid" button per job. Summary cards at the top total what's currently owed and what's been paid all-time, and you can filter by contractor or by paid/unpaid. This is the same per-job cut math already shown on each booking's "Stylists on this job" section — Payroll just rolls it up across every job so you don't have to click into each booking to add it up yourself. **Requires re-running `supabase/schema.sql`** — adds `payout_paid` / `payout_paid_at` to `booking_stylists`.

## 2026-08-11 (4)

- **Labeled the per-person stylist dropdown** — on the Wedding party section, the "min" text next to the prep-time field was sitting right next to the new stylist dropdown too, making it look like it labeled the wrong thing. The prep-time field and its "min" label are now grouped together, and the stylist dropdown has its own "Stylist" label next to it. No functional change.

## 2026-08-11 (3)

- **Timeline cards are now visually separated** — each stylist's schedule on the Timeline tab is its own bordered card with their name in a solid header bar at the top (plus their start time), laid out in a grid instead of just stacked sections. "Unassigned" gets a red-tinted card so it stands out as something to fix before the wedding.

## 2026-08-11 (2)

- **Multiple stylists on one job, each with their own timeline** — the Wedding party section now has a "Stylist" dropdown per person (populated from whoever's assigned to that job under "Stylists on this job"), so you can split the party between however many people are working it. The Timeline tab now builds a separate, parallel schedule for each stylist instead of one long sequential list — each section shows that stylist's own start time and person-by-person schedule, all working backward from the same ready-by time. Anyone not yet assigned to a stylist shows up under "Unassigned" so nothing gets missed. The bride-facing portal still shows one combined schedule, since that's what she needs to see. **Requires re-running `supabase/schema.sql`** — adds `party_members.assigned_stylist_id`.

## 2026-08-11

- **1099 contractor tracking on the Stylists page** — each person on your team now has a "1099" flag (on by default, since that's most of your team) and a pay % — their cut of a job's contract total. Editing the % saves instantly, same as the other quick-edit fields. This builds on what was already there rather than duplicating it: you already assign people to jobs from each booking's "Stylists on this job" section, and that assignment already shows up on the calendar — now that section also shows each assigned contractor's cut in dollars for that specific job (e.g. "40% · $320.00 on this job"), so you can see at a glance what everyone's owed. **Requires re-running `supabase/schema.sql`** — adds `is_1099` and `pay_percentage` columns to `stylists`.

## 2026-08-10 (9)

- **Removed per-person pricing from Wedding party, added a Build timeline button** — now that the invoice has its own pricing (service catalog, qty × rate, tip), the $ field on each wedding party member was duplicate data entry that could drift out of sync with the real invoice. Removed it — Wedding party is now just names, roles, hair/makeup, and chair time, with a note pointing to the invoice for pricing. Added a "Build timeline" button directly under the Wedding party list (in addition to the one already at the top of the page) so you can jump to the timeline right after entering the party. No schema change — `party_members.price` still exists in the database, it's just not edited from this screen anymore.

## 2026-08-10 (8)

- **"Saved" confirmation on quick-edit fields** — editing a booking's Wedding details (status, contract total, deposit, ready-by time, ceremony time, etc.), the Wedding party list, or a client's Details panel (name, wedding date, venue, contact info, etc.) already saved instantly on every change — there was just no feedback, so it looked like nothing happened. Now a small "Saved h:mm a ✓" note appears (booking page: top-right by the breadcrumb; client page: in the Details card header) right after each save, or a red "Couldn't save" note if a request fails. No schema change — these fields were never missing a save button, they just needed a visible confirmation.

## 2026-08-10 (7)

- **Quick-add placeholder bridesmaids** — the Wedding party section on a booking's timeline builder now has a "+ Add bridesmaids" control: enter a count and it adds that many placeholder rows named "Bridesmaid 1," "Bridesmaid 2," etc. (with hair + makeup on, 45 min prep, ready to build the timeline right away). Rename each one whenever you actually know who's in the party — the name field was already editable in place. "+ Add one" still adds a single blank member for bride/mother/other roles. No schema change.

## 2026-08-10 (6)

- **Default deposit** — Settings → Invoice now has a "Default deposit" control (percent of total, or a flat dollar amount) that's applied automatically to the Deposit / Retainer line the first time you open a booking's invoice, so you don't have to set it every time. It's still editable per booking right on the invoice (a new type + amount control under the Deposit row) for the rare case that needs something different. Saving an invoice now also writes the resolved deposit amount back to the booking, so the deposit figure shown on contracts and emails ({{deposit_amount}}) always matches what the invoice actually says. **Requires re-running `supabase/schema.sql`** — adds `default_deposit_type` / `default_deposit_percent` / `default_deposit_flat` to `studio_settings`.

## 2026-08-10 (5)

- **Invoice item picker redesigned** — instead of a dropdown on every row, there's now one "Search or add a new item" box below the table: type to filter your preset services (from Settings → Invoice), click one to add it as a line, or click "+ New item" to add a one-off item that isn't in your catalog. Once added, a row's description/qty/rate are just plain editable fields, matching how invoicing tools like Bloom handle it.
- **Tip section redesigned as tap cards** — "Leave a tip" now shows No tip / 10% / 15% / 20% as selectable cards with the live dollar amount under each (based on the current subtotal), plus a Custom tip card that reveals a dollar-amount field when selected.

## 2026-08-10 (4)

- **Preset services moved into Settings** — the service catalog (add/edit/remove your services and default rates) now lives under Settings → **Invoice** tab, instead of its own sidebar page. Same add/edit/remove functionality, seeded automatically with common bridal services on first visit. The invoice page's "Manage services" link now opens Settings directly on that tab (`/inquiry-settings?tab=invoice`).

## 2026-08-10 (3)

- **Invoice service dropdown now drives qty × rate directly** — each line item on `/invoices/[bookingId]` starts with a dropdown of your preset services (from `/services`). Pick one (e.g. "Bridesmaid Hair — $150"), type how many (e.g. 8), and the amount updates instantly (8 × $150 = $1,200) — rate comes straight from your catalog so you're not retyping it per bride. "Custom line item..." is still there for one-off items that aren't in your catalog. No schema change — this reuses the `invoice_line_items` jsonb column added earlier today, with one new optional field (`catalog_id`) so a row remembers which preset it's tied to.

## 2026-08-10 (2)

- **Invoice builder + service catalog** — `/invoices/[bookingId]` is now a real invoice builder instead of a read-only summary. It has an itemized services table (qty × rate, with a "fill from service catalog" dropdown per row so you're not typing the same service names every time), a tip section (none / percent / custom), a running subtotal/tip/total summary, a three-part payment schedule (Deposit/Retainer, Trial/Preview, Remaining Balance) where each payment's due date can be a fixed date **or** "N days before the wedding" (e.g. balance due 1 week prior), an auto-remind toggle per payment, and a "Mark paid" button that logs a real payment record. A Collected / Outstanding / Invoice total footer sits above a Notes & Terms box. Saving the invoice keeps `bookings.contract_total` in sync with the line-item subtotal, so the rest of the app (Bride Portal, Dashboard, Analytics) stays accurate.
- **New: Services page** (`/services`) — each studio manages its own list of services and default rates here (seeded automatically with common bridal services the first time you visit). This is what the invoice's per-row dropdown pulls from.
- **Requires re-running `supabase/schema.sql`** — adds a new `service_catalog` table (with RLS), a `'trial'` payment type, and two new jsonb columns on `bookings` (`invoice_line_items`, `invoice_settings`) to store the invoice builder's state.

## 2026-08-10

- **Contract Details quick-fill panel** — the per-booking contract page (`/contracts/[bookingId]`) now has an editable "Contract Details" card above the contract itself, so you can enter or correct the bride's name, wedding date, wedding location, contract total, and deposit amount right there instead of jumping to the client and booking pages first. Saving updates the client record and the booking record, and the contract's merge fields (and the invoice, since it reads the same `contract_total`/`deposit_amount`) reflect the change immediately. No schema changes — this only edits existing columns on `clients` and `bookings`.

## 2026-08-09

- **Bride Portal** — a no-login, front-facing page you can share with a bride once her booking is confirmed. From any booking (once it's "booked" or "completed"), click "Bride portal" in the sub-nav to preview it or "Copy link" to grab the shareable URL (`/portal/[bookingId]`) to text or email her. It shows a countdown to her wedding day, her getting-ready time and location, a day-of timeline (built from the same timeline your studio builds internally), upcoming appointments (trial + wedding day), a payment tracker (paid installments plus any remaining balance), her booked services, her trial notes (collapsible), and a few reminders — plus your studio's phone/email as tap-to-contact buttons. **Requires re-running `supabase/schema.sql`** — it adds `clients.partner_name` and a `get_bride_portal(uuid)` function. That function is intentionally narrow: it only returns the fields the portal needs for one booking at a time, so brides can never browse or query your other clients' data.


- **Mileage tracker + category budgets on Expenses** — `/expenses` now has a full mileage log: log trips (date, client, from/to, miles), an editable IRS mileage rate (defaults to $0.70/mile, the 2025 standard), automatic per-trip and monthly deduction totals, and a CSV export formatted for your CPA. The "By category" panel is now a real budget tracker — click any category's amount to set a monthly budget, and the bar turns red with an "over budget" note if you exceed it. **Requires re-running `supabase/schema.sql`** — it adds a `mileage_trips` table and two new columns (`mileage_rate`, `expense_budgets`) on `studio_settings`.


- **Public inquiry form** — new page at `/inquire/[your-user-id]` that anyone can fill out without logging in (name, wedding date, venue, party size, contact info, how they heard about you, and a message). Submitting it creates a client and an inquiry automatically in your account. Your personal link is now shown on the Dashboard under "Your public inquiry form," with a copy button — that's what you hand out to stylists or put on a website. **Requires re-running `supabase/schema.sql` in your Supabase SQL editor** — it adds two new policies that let the public submit (insert-only; they can never read or change existing data).


- **Bookings split into Inquiries / Projects tabs** — `/bookings` now has two tabs: "Inquiries" (status = inquiry) and "Projects" (everything past that stage — booked, completed, cancelled, ghosted). Each inquiry row has a one-click "Convert to project" button that moves it straight to "booked" without opening the booking detail page.


- **Fixed: client wedding date couldn't be edited after creation** — this is why new bookings weren't showing on the calendar. The client page only displayed info; there was no field anywhere to set or change the wedding date once a client existed (the booking page only has time fields, like ready-by and ceremony time — not a date). Added a full editable "Details" section to each client's page (name, wedding date, venue, email, phone, referral source, notes), so setting or updating the date now actually saves and the booking will appear on the calendar and in Upcoming jobs right away.


- **Calendar redesigned as a 3-column dashboard** — `/calendar` now matches the team-calendar layout you shared: a left "Stylists" column (avatar, name, and a live status of Available/Partially booked/Heavy schedule based on this month's job count), the month grid in the middle with each booking pill colored by its assigned stylist, and a right column with "Upcoming jobs" (bride, date, party size, assigned-stylist avatars), a "Team color key," and a per-stylist availability bar for the visible month. Kept the app's existing light color palette rather than the dark theme from the reference image. "Filter" toggles the existing stylist dropdown; "Add stylist" and "New job" link to the relevant pages.

## 2026-08-08

- **Bookings sorted by wedding date** — `/bookings` now lists bookings in chronological order (soonest wedding date first, by month then day), instead of by when the booking was created. Bookings with no wedding date set yet sort to the bottom.
