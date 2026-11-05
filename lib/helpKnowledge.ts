/**
 * What the Vayled help chatbot knows. Edit this file to change its answers;
 * keep it factual, because the bot is told to say "I'm not sure" about anything
 * that isn't written here.
 */
export const SUPPORT_EMAIL = "katebenson@vayled.com";

export const HELP_KNOWLEDGE = `
ABOUT VAYLED
Vayled is a CRM built for bridal hair and makeup studios. It runs on the web at www.vayled.com and as an iPhone/Android app (the app shows the same site, so updates appear automatically). Vayled is in a founding beta and opens to the public on November 25, 2026. Until then, people join the waitlist on the website and are let in as spots open. Studios who join during the beta keep today's founding rate.

PRICING (after beta; previews may change before public launch)
- Solo: $29/month, 1 stylist.
- Pro: $49/month, up to 10 stylists. Most popular.
- Studio: $99/month, unlimited stylists, lead and assist roles, plus elite features (white-labeled bride portal, client preference profiles, polished contract and e-signature experience, VIP booking flags, shareable day-of timeline link for planners and venues, branded PDF exports, referral and repeat-client tracking).
- Yearly billing: pay for 10 months, get 12 (2 months free). Solo $290/year, Pro $490/year, Studio $990/year.
- Discount codes can be entered on the pricing page or the waitlist form. Types are percent off or free months. Codes can expire or have limited uses.
- The beta is free and needs no credit card.

FEATURES
- Bookings and inquiries: a public inquiry form (each studio gets its own link) collects name, wedding date, party size, venue, getting-ready location, email, phone, and optional text-message consent. Inquiries show up in the Inquiries page and the Inbox; booked jobs live on the Bookings page.
- Clients: each bride has a page with details and bookings.
- Timeline builder: build the wedding-day timeline for the whole team. Split the wedding party across stylists by headcount with Quick assign, set a shared start time or a ready-by time, set buffer between people and ceremony time, drag people between stylists, and print or share it.
- Appointments: preview sessions, rehearsals, and other meetings in one date-grouped list. Appointment titles (Preview, Rehearsal, Bridal Shower, or your own) and saved locations (including "At the client's address") are managed in Settings > Appointments. Times are chosen from dropdowns.
- Preview scheduling: offer a few times and send the bride a link; she picks one on a calendar and it fills in the date and time.
- Contracts: edit your contract sections, preview what the client sees, send for signing.
- Invoices: line items, tips, a payment schedule (deposit, preview, rehearsal, remaining balance) with auto-reminders before due dates, and marking payments paid.
- Bride portal: a phone-friendly page for each bride showing days to go, payments, the day-of timeline, and appointments. Share it from the booking page.
- Client feedback form: after a preview, Vayled can automatically text the bride a short feedback form (star ratings, what she loved or wants changed, final look choices). Turn it on in Settings > Appointments under "Texts to your brides". Answers show on the preview session page.
- Texts to brides: booking confirmations and a 24-hour reminder, with wording you edit in Settings, plus extra info you add. Texts are only sent to clients who consented or were added manually. Clients can reply STOP to opt out. Texting needs the studio's text number to be approved, which Vayled handles.
- Calendar: team schedule with stylist colors, availability, and upcoming jobs.
- Stylists: add your team, set pay percent, mark 1099 contractors, invite stylists to log in (they see only their own jobs), and track time off.
- Payroll: shows what each 1099 contractor is owed based on pay percent and contract total, and lets you mark jobs paid.
- Emails: send emails to clients from templates and keep a library of templates.
- Expenses: log expenses, budgets by category, mileage log with an IRS rate, CSV export for your CPA.
- Analytics: revenue by month, average booking value, inquiry pipeline and booked rate.
- Delete account: Settings > Profile has a delete-account option that removes your data.

COMMON HOW-TOS
- Change text message wording: Settings > Appointments > Texts to your brides.
- Add a saved location: Settings > Appointments > Saved locations.
- Invite a stylist: Stylists page > Invite to log in on their card.
- Share the inquiry form: Settings has your inquiry link to copy.
- Get the app: the iPhone and Android apps are coming around the November 25 launch; until then Vayled works in any phone browser.

SUPPORT
For account problems, billing, bugs, or anything not covered here, email ${SUPPORT_EMAIL}.
`;
