import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Vayled is in early access — free for studios who join the beta, with founding pricing locked in after.",
};

const INCLUDED = [
  "Wedding-day timeline builder for your whole team",
  "Contracts, invoicing, and deposit tracking",
  "Client-facing bride portal",
  "Payroll for 1099 stylists",
  "Calendar, inquiry form, and smart reminders",
  "Unlimited bookings during the beta",
];

export default function PricingPage() {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 md:pt-24 text-center">
        <p className="text-xs uppercase tracking-widest-lg text-gold mb-4">Pricing</p>
        <h1 className="font-serif text-4xl md:text-5xl text-charcoal max-w-2xl mx-auto">
          Free while Vayled is in beta
        </h1>
        <p className="text-charcoal/70 text-lg mt-6 max-w-xl mx-auto">
          Vayled is in early access. Studios who join now get the full product at no cost, and lock in founding
          pricing before public plans are announced.
        </p>
      </section>

      <section className="max-w-md mx-auto px-6 pb-24">
        <div className="bg-white border border-charcoal/10 rounded-xl p-8 text-center">
          <p className="text-xs uppercase tracking-widest-lg text-gold mb-2">Beta studio</p>
          <p className="font-serif text-5xl text-charcoal mb-1">Free</p>
          <p className="text-charcoal/50 text-sm mb-6">during early access</p>
          <ul className="text-left space-y-3 mb-8">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-charcoal/70">
                <span className="text-gold mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/login?mode=signup"
            className="block w-full bg-charcoal text-ivory text-xs uppercase tracking-widest-lg rounded-md px-6 py-3.5 hover:bg-charcoal/90 transition-colors"
          >
            Join the beta
          </Link>
        </div>
        <p className="text-center text-charcoal/50 text-xs mt-6">
          No credit card required. Have questions about what comes after beta? Reach out from the sign-up form.
        </p>
      </section>
    </div>
  );
}
