import type { Metadata } from "next";
import Link from "next/link";
import FeatureVisual from "@/components/FeatureVisual";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Everything a bridal hair & makeup studio needs to run wedding days: timelines, contracts, invoicing, payroll, and a client-facing portal.",
};

const SECTIONS = [
  {
    label: "Timeline builder",
    src: "/marketing/timeline-builder.jpg",
    title: "One timeline, your whole team",
    body: "Split the wedding party across your stylists by headcount instead of assigning people one at a time. Drag anyone to a different stylist's schedule if plans change, and every stylist sees exactly where they need to be and when.",
  },
  {
    label: "Calendar",
    src: "/marketing/calendar.jpg",
    title: "See every booking without guessing",
    body: "Click any day to see everything on it — brides, venues, party size, and which stylists are already assigned. Assign a lead and an assist stylist to every job right from the calendar, so everyone knows their role before you say yes to something that conflicts.",
  },
  {
    label: "Trial scheduling",
    src: "/marketing/trial-scheduling.jpg",
    title: "Offer a few times, let her pick",
    body: "Add a handful of open trial times and send one link — your bride picks a slot on a real calendar and it's booked automatically, no more back-and-forth texts trying to land on a date that works for both of you.",
  },
  {
    label: "Contracts",
    src: "/marketing/contracts.jpg",
    title: "Contracts that send themselves out consistently",
    body: "Build a reusable contract template with your own terms, and generate a client-ready version for every booking automatically, instead of editing an old Word doc each time.",
  },
  {
    label: "Invoicing & deposits",
    src: "/marketing/invoicing.jpg",
    title: "Deposits and balances that track themselves",
    body: "Every payment logs against the booking, so the balance due is always accurate — and reminders go out for deposits and final balances before they become a problem.",
  },
  {
    label: "Bride portal",
    src: "/marketing/bride-portal.jpg",
    title: "A clean, branded page for your client",
    body: "Each bride gets her own link with her wedding-day timeline and details, so she's not relying on a screenshot of a text message on the morning of.",
  },
  {
    label: "Payroll",
    src: "/marketing/payroll.jpg",
    title: "Payroll pulled straight from the timeline",
    body: "Payouts for 1099 stylists are calculated from the percentages already set on the job, with lead/assist roles factored in — payday is a review, not a re-calculation.",
  },
  {
    label: "Expenses & mileage",
    src: "/marketing/expenses.jpg",
    title: "Know your real profit, not just your revenue",
    body: "Log expenses by category, track business mileage at the IRS rate, and set a budget per category — so you always know your net profit, not just what came in.",
  },
  {
    label: "Analytics",
    src: "/marketing/analytics.jpg",
    title: "See what's actually working",
    body: "Revenue by month, average booking value, and your inquiry-to-booked rate — the numbers that tell you whether the business is actually growing, not just busy.",
  },
  {
    label: "Inquiry form",
    src: "/marketing/inquiry-form.jpg",
    title: "A booking inquiry form that's actually yours",
    body: "A public form your leads fill out — customize the questions, and every submission lands directly in your dashboard, ready to follow up on.",
  },
  {
    label: "Smart reminders",
    src: "/marketing/smart-reminders.jpg",
    title: "Nudges for the things that fall through the cracks",
    body: "Vayled flags balance-due dates, unbooked trials, and pre-trial questionnaires that need to go out — you still send it, it just tells you when.",
  },
];

export default function FeaturesPage() {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 md:pt-24">
        <p className="text-xs uppercase tracking-widest-lg text-gold mb-4">Features</p>
        <h1 className="font-serif text-4xl md:text-5xl text-charcoal max-w-2xl">
          Everything it takes to run a wedding day, in one dashboard
        </h1>
        <p className="text-charcoal/70 text-lg mt-6 max-w-xl">
          No more piecing your studio together out of spreadsheets, group texts, and whatever app you tried last.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20 space-y-20">
        {SECTIONS.map((f, i) => (
          <div
            key={f.title}
            className={`grid md:grid-cols-2 gap-10 items-center ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}
          >
            <FeatureVisual label={f.label} src={f.src} />
            <div>
              <p className="text-xs uppercase tracking-widest-lg text-gold mb-3">{f.label}</p>
              <h2 className="font-serif text-2xl md:text-3xl text-charcoal mb-4">{f.title}</h2>
              <p className="text-charcoal/70">{f.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="bg-charcoal">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-ivory">Ready to see it on your own bookings?</h2>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link
              href="/login?mode=signup"
              className="bg-ivory text-charcoal text-xs uppercase tracking-widest-lg rounded-md px-6 py-3.5 hover:bg-beige transition-colors"
            >
              Sign up
            </Link>
            <Link
              href="/pricing"
              className="border border-ivory/30 text-ivory text-xs uppercase tracking-widest-lg rounded-md px-6 py-3.5 hover:bg-ivory/10 transition-colors"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
