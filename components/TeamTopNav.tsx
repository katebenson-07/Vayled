"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Logo from "./Logo";
import NavIcon from "./NavIcon";

const ITEMS = [
  { href: "/team", label: "My schedule" },
  { href: "/team/time-off", label: "Time off" },
] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Top bar for invited stylists: same look as the studio's, with just their pages. */
export default function TeamTopNav({ stylistName }: { stylistName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-charcoal/10">
        <div className="relative max-w-4xl mx-auto h-16 px-4 md:px-8 flex items-center justify-between">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex items-center gap-3 text-charcoal hover:text-wine"
          >
            <NavIcon name="menu" className="w-6 h-6" />
            <span className="hidden md:inline text-[11px] uppercase tracking-[0.2em]">Menu</span>
          </button>
          <Link href="/team" className="absolute left-1/2 -translate-x-1/2 text-wine" aria-label="Vayled team home">
            <Logo size="sm" />
          </Link>
          <span className="w-8 h-8 rounded-full border border-charcoal text-[10px] tracking-wider flex items-center justify-center">
            {initials(stylistName || "?")}
          </span>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-full sm:w-[340px] bg-wine text-ivory overflow-y-auto">
            <div className="flex items-center h-16 px-4 md:px-8">
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <NavIcon name="close" className="w-6 h-6" />
              </button>
            </div>
            <nav className="px-8 pb-10">
              <p className="text-[10px] uppercase tracking-[0.3em] text-ivory/60 mb-4">{stylistName || "Team"}</p>
              {ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block py-3.5 font-display text-[13px] font-medium uppercase tracking-[0.22em] border-b ${
                    pathname === item.href ? "border-ivory" : "border-ivory/15 text-ivory/90 hover:text-ivory"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <button onClick={handleSignOut} className="block mt-8 text-sm tracking-wide text-ivory/65 hover:text-ivory">
                Sign out
              </button>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
