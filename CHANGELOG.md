# Changelog

Running log of changes requested while testing the app. Newest first.

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
