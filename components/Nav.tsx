"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/bookings", label: "Bookings" },
  { href: "/calendar", label: "Calendar" },
  { href: "/stylists", label: "Stylists" },
  { href: "/contracts", label: "Contracts" },
  { href: "/emails", label: "Emails" },
  { href: "/analytics", label: "Analytics" },
  { href: "/expenses", label: "Expenses" },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <nav className="bg-charcoal text-ivory">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Link href="/" className="font-serif text-xl tracking-widest-lg uppercase text-ivory">
          Vayled
        </Link>
        <div className="flex gap-5 text-xs uppercase tracking-wide items-center flex-wrap">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`hover:text-beige transition-colors ${
                pathname === l.href ? "text-beige" : "text-ivory/70"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/inquiry-settings"
            aria-label="Inquiry form settings"
            title="Inquiry form settings"
            className={`hover:text-beige transition-colors ${
              pathname === "/inquiry-settings" ? "text-beige" : "text-ivory/70"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
          <button onClick={handleSignOut} className="text-ivory/50 hover:text-ivory normal-case tracking-normal">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
