import type { Metadata } from "next";
import Link from "next/link";
import FeatureVisual from "@/components/FeatureVisual";

export const metadata: Metadata = {
  title: "Booking software for bridal hair & makeup studios",
  description:
    "Vayled is the CRM built specifically for bridal hair & makeup artists — wedding-day timelines, contracts, invoicing, and payroll for your whole team, in one place.",
};

const PAIN_POINTS = [
  "A double-booked trial you don't catch until the week of the wedding",
  "A deposit that quietly never got paid because no one followed up",
  "The wedding-morning schedule living in three different group texts",
  "Paying your contractors off a spreadsheet you rebuild every time",
];

const FEATURES = [
  {
    label: "Timeline builder",
    src: "/marketing/timeline-builder.jpg",
    title: "Build the wedding-day timeline in minutes, not a group chat",
    body: "Assign your whole team, split the wedding party by headcount, and drag people between stylists when plans change. Every stylist sees their own schedule.",
  },
  {
    label: "Invoicing & deposits",
    src: "/marketing/invoicing.jpg",
    title: "Deposits and balances that track themselves",
    body: "Send a contract and invoice from one place, and know exactly who still owes what — without digging through email threads to check.",
  },
  {
    label: "Payroll",
    src: "/marketing/payroll.jpg",
    title: "Pay your 1099 team without rebuilding a spreadsheet",
    body: "Payouts are calculated straight from the percentages already set on each job, so payday is a review, not a re-calculation.",
  },
];

export default function MarketingHome() {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <p className="text-xs uppercase tracking-widest-lg text-gold mb-4">For bridal hair &amp; makeup studios</p>
        <h1 className="font-serif text-4xl md:text-6xl leading-[1.1] text-charcoal max-w-3xl">
          Run your bridal beauty business without the spreadsheet chaos
        </h1>
        <p className="text-charcoal/70 text-lg mt-6 max-w-xl">
          Vayled is the booking system built specifically for hair and makeup artists — timelines, contracts,
          invoicing, and payroll for your whole team, all in one place.
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
          <h2 className="font-serif text-2xl md:text-3xl text-charcoal max-w-xl">
            If any of this sounds familiar, you&apos;re not alone
          </h2>
          <div className="grid md:grid-cols-2 gap-4 mt-10">
            {PAIN_POINTS.map((p) => (
              <div key={p} className="flex gap-3 items-start bg-ivory rounded-xl p-5 border border-charcoal/10">
                <span className="text-gold mt-0.5">—</span>
                <p className="text-charcoal/70 text-sm">{p}</p>
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
