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

const PLANS = [
  {
    name: "Starter",
    price: 39,
    blurb: "For solo stylists running their own bookings.",
    stylists: "1 stylist",
    bookings: "Up to 5 active bookings",
    included: ["Timelines, contracts, invoicing, calendar", "Inquiry form & smart reminders"],
  },
  {
    name: "Pro",
    price: 79,
    blurb: "For small teams with a couple of stylists on staff.",
    stylists: "Up to 3 stylists",
    bookings: "Up to 15 active bookings",
    tag: "Most popular",
    included: [
      "Everything in Starter, plus:",
      "Payroll for 1099 stylists",
      "Bride portal & trial self-scheduling",
    ],
  },
  {
    name: "Studio",
    price: 149,
    blurb: "For growing studios with a full stylist team.",
    stylists: "Unlimited stylists, lead & assist roles",
    bookings: "Unlimited active bookings",
    tag: "Best for studios",
    elevated: true,
    included: [
      "Everything in Pro, plus:",
      "Full analytics & revenue reporting",
      "Expense & mileage tracking with budgets",
      "Vendor team management",
      "Priority onboarding & support",
    ],
  },
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

      <section className="bg-white border-y border-charcoal/10">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center max-w-xl mx-auto mb-12">
            <p className="text-xs uppercase tracking-widest-lg text-gold mb-3">After beta</p>
            <h2 className="font-serif text-2xl md:text-3xl text-charcoal mb-3">What plans will look like once beta ends</h2>
            <p className="text-charcoal/70">
              Join now and today&apos;s founding rate is locked in for your studio — these are the plans everyone
              else will see later.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 border flex flex-col ${
                  plan.elevated
                    ? "border-charcoal bg-charcoal text-ivory shadow-md md:-my-3 md:py-9"
                    : plan.tag
                      ? "border-charcoal bg-ivory shadow-sm"
                      : "border-charcoal/10 bg-ivory/50"
                }`}
              >
                {plan.tag && (
                  <p className={`text-xs uppercase tracking-widest-lg mb-2 ${plan.elevated ? "text-gold" : "text-gold"}`}>
                    {plan.tag}
                  </p>
                )}
                <p className={`font-serif text-lg mb-1 ${plan.elevated ? "text-ivory" : "text-charcoal"}`}>{plan.name}</p>
                <p className={`text-sm mb-4 ${plan.elevated ? "text-beige/70" : "text-charcoal/50"}`}>{plan.blurb}</p>
                <p className="mb-5">
                  <span className={`font-serif text-3xl ${plan.elevated ? "text-ivory" : "text-charcoal"}`}>
                    ${plan.price}
                  </span>
                  <span className={`text-sm ${plan.elevated ? "text-beige/60" : "text-charcoal/50"}`}> /mo</span>
                </p>
                <ul className={`text-left space-y-2.5 text-sm flex-1 ${plan.elevated ? "text-beige/80" : "text-charcoal/70"}`}>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-0.5">✓</span>
                    {plan.stylists}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold mt-0.5">✓</span>
                    {plan.bookings}
                  </li>
                  {plan.included.map((item) =>
                    item.startsWith("Everything") ? (
                      <li key={item} className="italic opacity-70 pt-1">
                        {item}
                      </li>
                    ) : (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-gold mt-0.5">✓</span>
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-center text-charcoal/50 text-xs mt-10">
            Pricing shown here is a preview and may change before public launch. Studios who join during beta keep
            today&apos;s rate regardless of what&apos;s shown above.
          </p>
        </div>
      </section>
    </div>
  );
}
