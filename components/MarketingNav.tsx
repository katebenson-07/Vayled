"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export default function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-wine text-ivory sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          <Logo size="sm" className="text-ivory" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm tracking-wide transition-colors ${
                pathname === l.href ? "text-ivory" : "text-beige/70 hover:text-ivory"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm text-beige/70 hover:text-ivory transition-colors">
            Sign in
          </Link>
          <Link
            href="/login?mode=signup"
            className="bg-ivory text-charcoal text-xs uppercase tracking-widest-lg rounded-md px-4 py-2.5 hover:bg-beige transition-colors"
          >
            Join the beta
          </Link>
        </div>

        <button
          className="md:hidden text-ivory"
          aria-label="Open menu"
          onClick={() => setOpen(!open)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            {open ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-ivory/10 px-6 py-4 space-y-4">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block text-sm text-beige/80"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-ivory/10 flex flex-col gap-3">
            <Link href="/login" onClick={() => setOpen(false)} className="text-sm text-beige/80">
              Sign in
            </Link>
            <Link
              href="/login?mode=signup"
              onClick={() => setOpen(false)}
              className="bg-ivory text-charcoal text-xs uppercase tracking-widest-lg rounded-md px-4 py-2.5 text-center"
            >
              Join the beta
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
