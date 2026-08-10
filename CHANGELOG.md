# Changelog

Running log of changes requested while testing the app. Newest first.

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
