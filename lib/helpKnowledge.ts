/**
 * What the Vayled help chatbot knows. Edit this file to change its answers;
 * keep it factual, because the bot is told to say "I'm not sure" about anything
 * that isn't written here.
 */
export const SUPPORT_EMAIL = "info@vayled.com";

export const HELP_KNOWLEDGE = `
ABOUT VAYLED
Vayled is a CRM built for bridal hair and makeup studios. It runs on the web at www.vayled.com and as an iPhone/Android app (the app shows the same site, so updates appear automatically). Vayled is in a founding beta and opens to the public on November 25, 2026. Until then, people join the waitlist on the website and are let in as spots open. Studios who join during the beta keep today's founding rate.

PRICING (after beta; previews may change before public launch)
- Solo: $29/month, 1 stylist.
- Pro: $49/month, up to 10 stylists. Most popular.
- Studio: $99/month, unlimited stylists, lead and assist roles, plus elite features (white-labeled bride portal, client preference profiles, polished contract and e-signature experience, VIP booking flags, shareable day-of timeline link for planners and venues, branded PDF exports, referral and repeat-client tracking).
- Vayled never takes a percentage of a studio's bookings or payments. Studios pay one flat subscription. The only fee on a card payment is Stripe's standard card processing fee, which goes to Stripe, not Vayled. (Collecting client payments through Vayled invoices is planned but not available yet; for now payments are marked paid by hand.)
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

/**
 * Plain answers used when the AI service isn't reachable (for example the API
 * key isn't set yet), so the chat still helps instead of going quiet. Each
 * entry matches if the question contains any of its keywords.
 */
const FAQ: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["cost", "price", "pricing", "how much", "plan", "$", "subscription", "pay for"],
    answer:
      "Vayled is free during the founding beta. After beta, plans are Solo $29/month (1 stylist), Pro $49/month (up to 10 stylists), and Studio $99/month (unlimited stylists plus elite features). Yearly billing gives you 2 months free: Solo $290, Pro $490, Studio $990 per year. Studios who join during the beta keep the founding rate.",
  },
  {
    keywords: ["yearly", "annual", "discount", "code", "promo", "coupon"],
    answer:
      "Yearly billing is 10 months for the price of 12. If you have a discount code, enter it on the pricing page or the waitlist form and it's saved with your signup.",
  },
  {
    keywords: ["percent", "cut", "fee", "commission", "stripe", "processing"],
    answer:
      "Vayled never takes a percentage of your bookings or payments. You pay one flat subscription. The only fee on a card payment is Stripe's standard processing fee, which goes to Stripe, not Vayled.",
  },
  {
    keywords: ["join", "waitlist", "sign up", "signup", "start", "launch", "when", "beta", "access"],
    answer:
      "Vayled is in a founding beta and opens to the public on November 25, 2026. Join the waitlist on the website and we'll email you as spots open. The beta is free and needs no credit card.",
  },
  {
    keywords: ["what is", "what does", "what do", "about", "vayled do", "features", "feature"],
    answer:
      "Vayled is a CRM for bridal hair and makeup studios. It handles inquiries and bookings, contracts, invoices and payment schedules, wedding-day timelines for your whole team, appointments, stylist payroll, expense and mileage tracking, analytics, and a bride portal your clients can open on their phone.",
  },
  {
    keywords: ["text", "sms", "reminder", "confirmation"],
    answer:
      "Vayled can text your brides a booking confirmation and a 24-hour reminder, and you edit the wording. In the app, go to Settings > Appointments > Texts to your brides. Texts only go to clients who consented or were added manually, and anyone can reply STOP to opt out.",
  },
  {
    keywords: ["feedback", "survey", "review"],
    answer:
      "After a preview, Vayled can automatically text the bride a short feedback form with star ratings, what she loved or wants changed, and final look choices. Turn it on in Settings > Appointments > Texts to your brides. Her answers appear on the preview session page.",
  },
  {
    keywords: ["stylist", "team", "invite", "payroll", "1099", "contractor"],
    answer:
      "Add your team on the Stylists page, set each person's pay percent, and mark 1099 contractors. Use Invite to log in on a stylist's card so they can see their own jobs. The Payroll page shows what each contractor is owed and lets you mark jobs paid.",
  },
  {
    keywords: ["timeline", "day-of", "wedding day", "schedule"],
    answer:
      "Open a booking and choose the Timeline tab. Use Quick assign to split the wedding party across your stylists, set a start time or ready-by time, and drag anyone to a different stylist. You can print or share the timeline.",
  },
  {
    keywords: ["invoice", "deposit", "contract", "payment"],
    answer:
      "Each booking has a contract and an invoice with a payment schedule (deposit, preview, rehearsal, and balance) and automatic reminders before due dates. For now you mark payments as paid by hand. Collecting card payments through invoices is planned.",
  },
  {
    keywords: ["app", "iphone", "android", "phone", "download"],
    answer:
      "The iPhone and Android apps are coming around the November 25 launch. Until then, Vayled works in any phone browser at vayled.com.",
  },
  {
    keywords: ["delete", "cancel account", "close account"],
    answer: "You can delete your account in Settings > Profile. That removes your data.",
  },
];

export function fallbackAnswer(question: string): string {
  const q = question.toLowerCase();
  let best: { score: number; answer: string } | null = null;
  for (const item of FAQ) {
    const score = item.keywords.filter((k) => q.includes(k)).length;
    if (score > 0 && (!best || score > best.score)) best = { score, answer: item.answer };
  }
  return (
    best?.answer ??
    `I'm not sure about that one. Please email ${SUPPORT_EMAIL} and we'll help you directly.`
  );
}
