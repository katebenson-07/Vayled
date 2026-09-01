import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Vayled collects, uses, and protects your information and your clients’ information.",
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-2xl text-charcoal mt-10 mb-3">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-charcoal/70 leading-relaxed mb-4">{children}</p>;
}

export default function PrivacyPage() {
  return (
    <div>
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-24 md:pt-24">
        <p className="text-xs uppercase tracking-widest-lg text-gold mb-4">Legal</p>
        <h1 className="font-serif text-4xl md:text-5xl text-charcoal mb-4">Privacy Policy</h1>
        <p className="text-sm text-charcoal/50 mb-10">Last updated August 31, 2026</p>

        <P>
          This policy covers what Vayled (“we,” “us”) collects when you use vayled.com and the Vayled app, whether
          you’re a studio owner, a stylist invited to a studio’s account, or a bride submitting an inquiry or
          viewing a portal link. It’s written in plain language on purpose — if anything here is unclear, email us
          and we’ll explain it directly.
        </P>

        <H2>Information we collect</H2>
        <P>
          <strong>Account information.</strong> When a studio signs up, we collect an email address, password (stored
          by our authentication provider, never in plain text we can read), and business name.
        </P>
        <P>
          <strong>Client and wedding data.</strong> Studios enter information about their own clients into Vayled —
          names, contact details, wedding dates and venues, notes, payment and contract records, and photos uploaded
          for trial or styling reference. This data belongs to the studio that entered it, and we treat it as
          confidential business information, not ours to use for anything beyond running the app.
        </P>
        <P>
          <strong>Public form submissions.</strong> If you submit a public inquiry form or pick a trial time through
          a link a studio shared, the information you enter (name, contact info, wedding details) is sent directly
          to that studio’s account.
        </P>
        <P>
          <strong>Usage information.</strong> We don’t run third-party analytics or advertising trackers on Vayled
          today. The only cookies in use are the ones our authentication provider sets to keep you signed in.
        </P>

        <H2>How we use it</H2>
        <P>
          To operate the app: authenticate accounts, enforce that each studio only ever sees its own data, send
          transactional emails you or a studio requested (invites, contracts, reminders), and provide support when
          asked. We don’t sell any information, and we don’t use client or bridal data to train models or for
          marketing outside of the account it belongs to.
        </P>

        <H2>Where it’s stored</H2>
        <P>
          Vayled runs on Supabase (Postgres database, authentication, and file storage) and is hosted on Vercel.
          Every studio’s data is scoped by row-level security enforced at the database layer, so one studio’s
          records are never returned by another studio’s queries. Transactional email, where configured, is sent
          through Resend.
        </P>

        <H2>Sharing</H2>
        <P>
          We share information only with the infrastructure providers above, strictly to operate the service — not
          with advertisers, data brokers, or anyone else. We’ll disclose information if required by law, or to
          protect the rights, safety, or property of Vayled, our users, or the public.
        </P>

        <H2>Data retention &amp; deletion</H2>
        <P>
          Studio accounts and their data are retained for as long as the account is active. If you’d like your
          studio’s account and data deleted, email us and we’ll process that request. Public inquiry and trial-pick
          submissions become part of the receiving studio’s own client records, governed by this same policy.
        </P>

        <H2>Children’s privacy</H2>
        <P>
          Vayled is a business tool for wedding professionals and isn’t directed at children, and we don’t knowingly
          collect information from anyone under 18.
        </P>

        <H2>Your choices</H2>
        <P>
          You can request access to, correction of, or deletion of your information at any time by emailing us. If
          you’re a bride who submitted an inquiry or received a portal link and want your information removed,
          reach out to us or to the studio directly — they control that record.
        </P>

        <H2>Changes to this policy</H2>
        <P>
          If this policy changes in a meaningful way, we’ll update the date at the top of this page. Continued use
          of Vayled after a change means you accept the updated policy.
        </P>

        <H2>Contact</H2>
        <P>
          Questions about this policy or your data — email{" "}
          <a href="mailto:katebenson@vayled.com" className="text-gold hover:underline">
            katebenson@vayled.com
          </a>
          .
        </P>

        <p className="text-xs text-charcoal/40 mt-12 border-t border-charcoal/10 pt-6">
          This page is provided for transparency about our data practices and isn’t a substitute for legal advice.
        </p>
      </section>
    </div>
  );
}
