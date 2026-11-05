import type { Metadata } from "next";
import Link from "next/link";
import FeatureVisual from "@/components/FeatureVisual";
import WaitlistForm from "@/components/WaitlistForm";
import WaitlistModal from "@/components/WaitlistModal";

export const metadata: Metadata = {
  title: "Booking software for bridal hair & makeup studios",
  description:
    "Vayled walks every wedding booking through one organized path, from first inquiry to wedding day — one timeline for your whole team and your bride, one place instead of five different apps.",
};

const PATH_STEPS = [
  "Inquiry received",
  "Contract signed",
  "Deposit paid",
  "Preview done",
  "Balance paid (week of)",
  "Wedding day",
  "Review",
];

const FEATURES = [
  {
    label: "Timeline builder",
    src: "/marketing/timeline-builder.jpg",
    title: "Build it once, send it to your whole team and your bride",
    body: "Assign stylists, split the wedding party by headcount, and edit anything right up until the morning of. Your team and your bride see the same up-to-date timeline — not five different versions floating around in a text thread.",
  },
  {
    label: "Preview scheduling",
    src: "/marketing/trial-scheduling.jpg",
    title: "Offer a few times, let her pick",
    body: "Add a handful of open preview times and send one link — your bride picks a slot on a real calendar and it's booked, no more back-and-forth texts trying to land on a date that works.",
  },
  {
    label: "The path",
    src: "/marketing/pipeline.jpg",
    title: "A clear checklist for every single booking",
    body: "Inquiry, contract, deposit, preview, week-of, wedding day, balance — every job moves through the same steps in order, so you always know exactly what's done and what's still open, for every client at once.",
  },
  {
    label: "Reminders",
    src: "/marketing/dashboard.jpg",
    title: "Stay a step ahead of your clients, not behind them",
    body: "Vayled flags balance-due dates, previews that still need to be booked, and questionnaires that should've gone out — so you're the one reaching out first, instead of scrambling to catch up.",
  },
  {
    label: "Bookings",
    src: "/marketing/bookings.jpg",
    title: "Every project, at a glance",
    body: "Search by name or venue, filter by status, and see the date, venue, contract total, and deposit progress on every card — no more opening five different jobs to find the one bride who just texted you back.",
  },
];

export default function MarketingHome() {
  return (
    <div>
      <WaitlistModal source="homepage-popup" title="Join the waitlist" showTier />
      <section className="bg-wine text-ivory text-center">
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-28 md:pt-36 md:pb-40">
          <p className="text-[11px] uppercase tracking-[0.4em] text-ivory/80 mb-7">Bridal hair &amp; makeup studios</p>
          <h1 className="font-display font-semibold text-3xl md:text-5xl leading-[1.35] uppercase tracking-[0.14em]">
            One organized path from inquiry to wedding day
          </h1>
          <p className="text-ivory/80 text-base md:text-lg mt-8 max-w-xl mx-auto leading-relaxed">
            Stop juggling five different apps to run a wedding. Vayled walks every booking through the same clear
            process, builds one timeline your stylists and your bride actually use, and keeps you a step ahead of
            your clients.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-11">
            <Link
              href="/login?mode=signup"
              className="border border-ivory font-display text-[11px] font-medium uppercase tracking-[0.28em] px-8 py-4 hover:bg-ivory hover:text-wine transition-colors"
            >
              Join the waitlist
            </Link>
            <Link
              href="/features"
              className="font-display text-[11px] font-medium uppercase tracking-[0.28em] px-8 py-4 text-ivory/80 hover:text-ivory underline underline-offset-8 decoration-ivory/40"
            >
              See features
            </Link>
          </div>
        </div>
      </section>

      <p className="text-center text-[11px] uppercase tracking-[0.3em] text-charcoal/45 mt-12 px-6">
        Built by a working bridal artist. A real product, already running real weddings.
      </p>

      <section className="max-w-6xl mx-auto px-6 pt-12 pb-20">
        <FeatureVisual label="Vayled dashboard" src="/marketing/dashboard.jpg" />
      </section>

      <section className="bg-white border-y border-charcoal/10">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="font-display font-semibold text-lg md:text-xl uppercase tracking-[0.2em] text-charcoal max-w-xl mb-4">
            Every booking follows the same clear path
          </h2>
          <p className="text-charcoal/70 max-w-xl mb-10">
            From the first inquiry to the morning of the wedding, nothing gets skipped and nothing gets forgotten —
            for one client or fifty at once.
          </p>
          <div className="flex flex-wrap gap-2">
            {PATH_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className="bg-ivory border border-charcoal/10 rounded-none px-4 py-2 text-xs md:text-sm text-charcoal/80 whitespace-nowrap">
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
              <p className="text-[11px] uppercase tracking-[0.3em] text-wine mb-3">{f.label}</p>
              <h3 className="font-display font-semibold text-base md:text-lg uppercase tracking-[0.18em] text-charcoal mb-4 leading-relaxed">{f.title}</h3>
              <p className="text-charcoal/70">{f.body}</p>
            </div>
          </div>
        ))}
        <div className="text-center">
          <Link href="/features" className="text-[12px] uppercase tracking-[0.2em] text-charcoal border-b border-charcoal pb-1 hover:text-wine hover:border-wine">
            See every feature
          </Link>
        </div>
      </section>

      <section className="bg-charcoal">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="font-display font-semibold text-xl md:text-2xl uppercase tracking-[0.2em] text-ivory max-w-2xl mx-auto leading-relaxed">
            Built by a working bridal artist, for bridal artists
          </h2>
          <p className="text-beige/70 mt-4 max-w-xl mx-auto">
            Vayled started as one studio&apos;s answer to running weddings off spreadsheets and text chains.
            Now other artists can use it too.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link
              href="/login?mode=signup"
              className="border border-ivory font-display text-[11px] font-medium uppercase tracking-[0.28em] px-8 py-4 hover:bg-ivory hover:text-wine transition-colors"
            >
              Join the beta
            </Link>
            <Link
              href="/about"
              className="font-display text-[11px] font-medium uppercase tracking-[0.28em] px-8 py-4 text-ivory/80 hover:text-ivory underline underline-offset-8 decoration-ivory/40"
            >
              Our story
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-charcoal border-t border-ivory/10">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-ivory/70 mb-3">Not ready yet?</p>
          <h2 className="font-display font-semibold text-lg md:text-xl uppercase tracking-[0.2em] text-ivory mb-3">Get on the list</h2>
          <p className="text-beige/70 mb-6 max-w-md">
            Leave your email and we&apos;ll let you know as Vayled keeps rolling out — no spam, just the occasional update.
          </p>
          <WaitlistForm source="homepage" />
        </div>
      </section>
    </div>
  );
}
