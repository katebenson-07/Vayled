import Link from "next/link";
import Logo from "./Logo";

export default function MarketingFooter() {
  return (
    <footer className="bg-charcoal text-beige/60 mt-24">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <Logo size="sm" className="text-ivory" />
          <p className="text-xs mt-2">The booking system built for bridal hair &amp; makeup studios.</p>
        </div>
        <nav className="flex flex-wrap gap-6 text-xs uppercase tracking-widest-lg">
          <Link href="/features" className="hover:text-ivory transition-colors">Features</Link>
          <Link href="/pricing" className="hover:text-ivory transition-colors">Pricing</Link>
          <Link href="/about" className="hover:text-ivory transition-colors">About</Link>
          <Link href="/login" className="hover:text-ivory transition-colors">Sign in</Link>
        </nav>
      </div>
      <div className="border-t border-ivory/10">
        <div className="max-w-6xl mx-auto px-6 py-4 text-[11px] text-beige/40">
          © {new Date().getFullYear()} Vayled. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
