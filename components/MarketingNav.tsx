"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

/**
 * Public site header in the Cartier style: menu on the left, centered
 * wordmark, Sign in on the right. The menu opens as a deep red panel.
 */
export default function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="bg-white text-charcoal sticky top-0 z-40 border-b border-charcoal/10">
        <div className="relative max-w-6xl mx-auto h-16 md:h-[72px] px-5 md:px-8 flex items-center justify-between">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex items-center gap-3 hover:text-wine"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-6 h-6">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            <span className="hidden md:inline text-[11px] uppercase tracking-[0.2em]">Menu</span>
          </button>

          <Link href="/" className="absolute left-1/2 -translate-x-1/2 text-wine" aria-label="Vayled home">
            <Logo size="md" />
          </Link>

          <div className="flex items-center gap-5 text-[11px] uppercase tracking-[0.2em]">
            <Link href="/login" className="hover:text-wine">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-full sm:w-[340px] bg-wine text-ivory overflow-y-auto">
            <div className="flex items-center h-16 px-5 md:px-8">
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-6 h-6">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="px-8 pb-10">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`block py-3.5 font-display text-[13px] font-medium uppercase tracking-[0.22em] border-b ${
                    pathname === l.href ? "border-ivory" : "border-ivory/15 text-ivory/90 hover:text-ivory"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-8 space-y-3">
                <Link href="/login" className="block text-sm tracking-wide text-ivory/70 hover:text-ivory">
                  Sign in
                </Link>
                <Link
                  href="/login?mode=signup"
                  className="inline-block border border-ivory font-display text-[11px] font-medium uppercase tracking-[0.28em] px-6 py-3.5 hover:bg-ivory hover:text-wine transition-colors"
                >
                  Join the waitlist
                </Link>
              </div>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
