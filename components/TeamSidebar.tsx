"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Logo from "./Logo";
import NavIcon from "./NavIcon";

const NAV_ITEMS = [
  { href: "/team", label: "My Schedule", icon: "calendar" },
  { href: "/team/time-off", label: "Time Off", icon: "stylists" },
] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function TeamSidebarContent({ stylistName, onNavigate }: { stylistName: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-5">
        <Logo size="sm" className="text-ivory" />
        <p className="text-[11px] uppercase tracking-widest-lg text-beige/60 mt-1 ml-0.5">Team</p>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active ? "bg-ivory/10 text-ivory" : "text-beige/70 hover:bg-ivory/5 hover:text-ivory"
              }`}
            >
              <NavIcon name={item.icon} />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-ivory/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-beige/20 text-ivory text-xs font-medium flex items-center justify-center shrink-0">
          {initials(stylistName || "?")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ivory truncate">{stylistName || "Team member"}</p>
          <p className="text-xs text-beige/50 truncate">Stylist</p>
        </div>
        <button onClick={handleSignOut} title="Sign out" className="text-beige/50 hover:text-ivory shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function TeamSidebar({ stylistName }: { stylistName: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="md:hidden flex items-center justify-between bg-charcoal text-ivory px-4 py-3 sticky top-0 z-30 print:hidden">
        <Logo size="sm" className="text-ivory" />
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="text-ivory">
          <NavIcon name="menu" className="w-6 h-6" />
        </button>
      </div>

      <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-charcoal min-h-screen sticky top-0 print:hidden">
        <TeamSidebarContent stylistName={stylistName} />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-charcoal flex flex-col">
            <div className="flex justify-end px-4 pt-4">
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-ivory">
                <NavIcon name="close" className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <TeamSidebarContent stylistName={stylistName} onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
