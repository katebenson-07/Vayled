# Changelog

Running log of changes requested while testing the app. Newest first.

## 2026-08-09

- **Public inquiry form** — new page at `/inquire/[your-user-id]` that anyone can fill out without logging in (name, wedding date, venue, party size, contact info, how they heard about you, and a message). Submitting it creates a client and an inquiry automatically in your account. Your personal link is now shown on the Dashboard under "Your public inquiry form," with a copy button — that's what you hand out to stylists or put on a website. **Requires re-running `supabase/schema.sql` in your Supabase SQL editor** — it adds two new policies that let the public submit (insert-only; they can never read or change existing data).


- **Bookings split into Inquiries / Projects tabs** — `/bookings` now has two tabs: "Inquiries" (status = inquiry) and "Projects" (everything past that stage — booked, completed, cancelled, ghosted). Each inquiry row has a one-click "Convert to project" button that moves it straight to "booked" without opening the booking detail page.


- **Fixed: client wedding date couldn't be edited after creation** — this is why new bookings weren't showing on the calendar. The client page only displayed info; there was no field anywhere to set or change the wedding date once a client existed (the booking page only has time fields, like ready-by and ceremony time — not a date). Added a full editable "Details" section to each client's page (name, wedding date, venue, email, phone, referral source, notes), so setting or updating the date now actually saves and the booking will appear on the calendar and in Upcoming jobs right away.


- **Calendar redesigned as a 3-column dashboard** — `/calendar` now matches the team-calendar layout you shared: a left "Stylists" column (avatar, name, and a live status of Available/Partially booked/Heavy schedule based on this month's job count), the month grid in the middle with each booking pill colored by its assigned stylist, and a right column with "Upcoming jobs" (bride, date, party size, assigned-stylist avatars), a "Team color key," and a per-stylist availability bar for the visible month. Kept the app's existing light color palette rather than the dark theme from the reference image. "Filter" toggles the existing stylist dropdown; "Add stylist" and "New job" link to the relevant pages.

## 2026-08-08

- **Bookings sorted by wedding date** — `/bookings` now lists bookings in chronological order (soonest wedding date first, by month then day), instead of by when the booking was created. Bookings with no wedding date set yet sort to the bottom.
