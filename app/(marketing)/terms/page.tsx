import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you use Vayled.",
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-2xl text-charcoal mt-10 mb-3">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-charcoal/70 leading-relaxed mb-4">{children}</p>;
}

export default function TermsPage() {
  return (
    <div>
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-24 md:pt-24">
        <p className="text-xs uppercase tracking-widest-lg text-gold mb-4">Legal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-charcoal mb-4">Terms of Service</h1>
        <p className="text-sm text-charcoal/50 mb-10">Last updated August 31, 2026</p>

        <P>
          These terms cover your use of vayled.com and the Vayled app. By creating an account, accepting an invite
          to join a studio, or submitting a public form linked to a studio using Vayled, you’re agreeing to them.
        </P>

        <H2>What Vayled is</H2>
        <P>
          Vayled is booking and business-management software for bridal hair and makeup studios — client records,
          wedding-day timelines, contracts, invoicing, payment tracking, and team scheduling. We provide the
          software; the studio using it is responsible for the accuracy of what they enter and for how they run
          their own business.
        </P>

        <H2>Accounts</H2>
        <P>
          You’re responsible for keeping your login credentials secure and for anything that happens under your
          account. Studio owners are responsible for the stylists they invite and for what those stylists can see,
          which is scoped to that studio’s own bookings. Let us know right away if you suspect unauthorized access.
        </P>

        <H2>Your data, your clients</H2>
        <P>
          Client and wedding information entered into Vayled belongs to the studio that entered it. We store and
          process it to run the app — we don’t claim ownership of it, sell it, or use it beyond what’s described in
          our Privacy Policy.
        </P>

        <H2>Acceptable use</H2>
        <P>
          Vayled is for legitimate wedding-industry business use. Don’t use it to submit fraudulent inquiries, scrape
          or resell other studios’ data, attempt to access accounts or data that aren’t yours, or interfere with the
          service for other users.
        </P>

        <H2>Payments &amp; plans</H2>
        <P>
          Current pricing is listed on our{" "}
          <a href="/pricing" className="text-gold hover:underline">
            pricing page
          </a>
          . Vayled tracks deposits, balances, and payments a studio records manually — Vayled does not currently
          process payments on a studio’s behalf, and isn’t a party to any payment arrangement between a studio and
          their clients or contractors.
        </P>

        <H2>Service availability</H2>
        <P>
          We work to keep Vayled available and reliable, but like any software, it can have downtime, bugs, or
          require maintenance. We’ll do our best to communicate anything that affects your ability to use the app.
        </P>

        <H2>Termination</H2>
        <P>
          You can stop using Vayled and request account deletion at any time. We may suspend or terminate accounts
          that violate these terms or misuse the service, including the public inquiry and trial-scheduling forms.
        </P>

        <H2>Disclaimer &amp; limitation of liability</H2>
        <P>
          Vayled is provided “as is,” without warranties of any kind. We aren’t liable for indirect, incidental, or
          consequential damages arising from your use of the app, including data entry errors, missed reminders, or
          scheduling conflicts — Vayled is a tool to help run your studio, not a substitute for your own review and
          judgment on client-facing commitments.
        </P>

        <H2>Changes to these terms</H2>
        <P>
          If we make meaningful changes, we’ll update the date at the top of this page. Continuing to use Vayled
          after a change means you accept the updated terms.
        </P>

        <H2>Contact</H2>
        <P>
          Questions about these terms — email{" "}
          <a href="mailto:katebenson@vayled.com" className="text-gold hover:underline">
            katebenson@vayled.com
          </a>
          .
        </P>

        <p className="text-xs text-charcoal/40 mt-12 border-t border-charcoal/10 pt-6">
          This page is a general terms-of-service template adapted to how Vayled actually works, and isn’t a
          substitute for review by a licensed attorney in your jurisdiction.
        </p>
      </section>
    </div>
  );
}
