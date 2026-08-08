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
  { href: "/inquiry-settings", label: "Inquiry Form" },
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
          <button onClick={handleSignOut} className="text-ivory/50 hover:text-ivory normal-case tracking-normal">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
