import type { Metadata } from "next";
import Link from "next/link";
import FeatureVisual from "@/components/FeatureVisual";

export const metadata: Metadata = {
  title: "Booking software for bridal hair & makeup studios",
  description:
    "Vayled walks every wedding booking through one organized path, from first inquiry to wedding day — one timeline for your whole team and your bride, one place instead of five different apps.",
};

const PATH_STEPS = [
  "Inquiry received",
  "Contract signed",
  "Deposit paid",
  "Trial done",
  "Week of wedding",
  "Wedding day",
  "Balance & review",
];

const FEATURES = [
  {
    label: "Timeline builder",
    src: "/marketing/timeline-builder.jpg",
    title: "Build it once, send it to your whole team and your bride",
    body: "Assign stylists, split the wedding party by headcount, and edit anything right up until the morning of. Your team and your bride see the same up-to-date timeline — not five different versions floating around in a text thread.",
  },
  {
    label: "The path",
    src: "/marketing/pipeline.jpg",
    title: "A clear checklist for every single booking",
    body: "Inquiry, contract, deposit, trial, week-of, wedding day, balance — every job moves through the same steps in order, so you always know exactly what's done and what's still open, for every client at once.",
  },
  {
    label: "Reminders",
    src: "/marketing/dashboard.jpg",
    title: "Stay a step ahead of your clients, not behind them",
    body: "Vayled flags balance-due dates, trials that still need to be booked, and questionnaires that should've gone out — so you're the one reaching out first, instead of scrambling to catch up.",
  },
];

export default function MarketingHome() {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <p className="text-xs uppercase tracking-widest-lg text-gold mb-4">For bridal hair &amp; makeup studios</p>
        <h1 className="font-serif text-4xl md:text-6xl leading-[1.1] text-charcoal max-w-3xl">
          One organized path from inquiry to wedding day
        </h1>
        <p className="text-charcoal/70 text-lg mt-6 max-w-xl">
          Stop juggling five different apps to run a wedding. Vayled walks every booking through the same clear
          process, builds one timeline your stylists and your bride actually use, and keeps you a step ahead of
          your clients instead of chasing them.
        </p>
        <div className="flex flex-wrap gap-4 mt-8">
          <Link
            href="/login?mode=signup"
            className="bg-charcoal text-ivory text-xs uppercase tracking-widest-lg rounded-md px-6 py-3.5 hover:bg-charcoal/90 transition-colors"
          >
            Sign up
          </Link>
          <Link
            href="/features"
            className="border border-charcoal/20 text-charcoal text-xs uppercase tracking-widest-lg rounded-md px-6 py-3.5 hover:bg-white transition-colors"
          >
            See features
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <FeatureVisual label="Vayled dashboard" src="/marketing/dashboard.jpg" />
      </section>

      <section className="bg-white border-y border-charcoal/10">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="font-serif text-2xl md:text-3xl text-charcoal max-w-xl mb-3">
            Every booking follows the same clear path
          </h2>
          <p className="text-charcoal/70 max-w-xl mb-10">
            From the first inquiry to the morning of the wedding, nothing gets skipped and nothing gets forgotten —
            for one client or fifty at once.
          </p>
          <div className="flex flex-wrap gap-2">
            {PATH_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className="bg-ivory border border-charcoal/10 rounded-md px-3 py-2 text-xs md:text-sm text-charcoal/80 whitespace-nowrap">
                  {step}
                </span>
                {i < PATH_STEPS.length - 1 && <span className="text-charcoal/20">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20 space-y-20">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className={`grid md:grid-cols-2 gap-10 items-center ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}
          >
            <FeatureVisual label={f.label} src={f.src} />
            <div>
              <p className="text-xs uppercase tracking-widest-lg text-gold mb-3">{f.label}</p>
              <h3 className="font-serif text-2xl md:text-3xl text-charcoal mb-4">{f.title}</h3>
              <p className="text-charcoal/70">{f.body}</p>
            </div>
          </div>
        ))}
        <div className="text-center">
          <Link href="/features" className="text-sm text-gold hover:underline">
            See every feature →
          </Link>
        </div>
      </section>

      <section className="bg-charcoal">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-ivory max-w-2xl mx-auto">
            Built by a working bridal artist, for bridal artists
          </h2>
          <p className="text-beige/70 mt-4 max-w-xl mx-auto">
            Vayled started as one studio&apos;s answer to running weddings off spreadsheets and text chains.
            Now other artists can use it too.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link
              href="/login?mode=signup"
              className="bg-ivory text-charcoal text-xs uppercase tracking-widest-lg rounded-md px-6 py-3.5 hover:bg-beige transition-colors"
            >
              Sign up
            </Link>
            <Link
              href="/about"
              className="border border-ivory/30 text-ivory text-xs uppercase tracking-widest-lg rounded-md px-6 py-3.5 hover:bg-ivory/10 transition-colors"
            >
              Our story
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
