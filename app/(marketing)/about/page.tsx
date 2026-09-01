import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "Vayled was built by a working bridal hair & makeup artist who was tired of running a studio on spreadsheets and text chains.",
};

export default function AboutPage() {
  return (
    <div>
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-20 md:pt-24">
        <p className="text-xs uppercase tracking-widest-lg text-gold mb-4">About</p>
        <h1 className="font-serif text-4xl md:text-5xl text-charcoal mb-8">
          Built by an artist, because the spreadsheets stopped working
        </h1>

        <div className="space-y-6 text-charcoal/70 text-lg leading-relaxed">
          <p>
            Vayled started the way most useful tools do — out of frustration with the alternative. Running a
            bridal hair &amp; makeup studio means juggling trials, contracts, deposits, wedding-day timelines,
            and a team of contractors, usually across a spreadsheet, a group text, and whatever app seemed
            promising last season.
          </p>
          <p>
            None of it talked to each other. A deposit could slip through without anyone noticing. A wedding
            morning timeline lived in a text thread instead of somewhere every stylist could actually check it.
            Payroll meant rebuilding the same math after every job.
          </p>
          <p>
            Vayled was built to fix that — by someone doing the work, not just building software for it. It
            started as a tool for one studio and is now open to other bridal artists who are ready to run their
            business like one.
          </p>
        </div>

        <div className="mt-12">
          <Link
            href="/login?mode=signup"
            className="inline-block bg-charcoal text-ivory text-xs uppercase tracking-widest-lg rounded-full px-7 py-3.5 hover:bg-charcoal/90 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </section>
    </div>
  );
}
