"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Logo from "./Logo";
import NavIcon from "./NavIcon";
import { fetchInboxItems, getInboxLastSeen } from "@/lib/inbox";

// Top row of the menu, then the rest in a quieter list (same pages as before).
const MAIN_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inbox", label: "Inbox" },
  { href: "/bookings", label: "Bookings" },
  { href: "/calendar", label: "Calendar" },
  { href: "/appointments", label: "Appointments" },
  { href: "/clients", label: "Clients" },
] as const;

const MORE_ITEMS = [
  { href: "/inquiries", label: "Inquiries" },
  { href: "/contracts", label: "Contracts" },
  { href: "/stylists", label: "Stylists" },
  { href: "/payroll", label: "Payroll" },
  { href: "/emails", label: "Emails" },
  { href: "/analytics", label: "Analytics" },
  { href: "/expenses", label: "Expenses" },
  { href: "/inquiry-settings", label: "Settings" },
] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Cartier-style header: menu button on the left, centered wordmark, inbox and
 * account on the right. The menu opens as a deep red panel with every page.
 */
export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [inquiryCount, setInquiryCount] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from("studio_settings")
        .select("studio_name")
        .eq("studio_id", user.id)
        .maybeSingle();

      setDisplayName(profile?.studio_name || user.email || "Your studio");
      setSubtitle(profile?.studio_name ? user.email ?? "" : "Studio owner");

      const items = await fetchInboxItems();
      const lastSeen = getInboxLastSeen();
      setUnreadCount(items.filter((i) => i.timestamp > lastSeen).length);

      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "inquiry");
      setInquiryCount(count ?? 0);
    }
    load();
  }, []);

  // Close menus when you move to another page or press Escape.
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setAccountOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const badge = (n: number) =>
    n > 0 ? (
      <span className="ml-3 bg-ivory text-wine text-[10px] font-medium rounded-full min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center align-middle">
        {n}
      </span>
    ) : null;

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-charcoal/10">
        <div className="relative max-w-6xl mx-auto h-16 px-4 md:px-8 flex items-center justify-between">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="flex items-center gap-3 text-charcoal hover:text-wine"
          >
            <NavIcon name="menu" className="w-6 h-6" />
            <span className="hidden md:inline text-[11px] uppercase tracking-[0.2em]">Menu</span>
          </button>

          <Link
            href="/dashboard"
            className="absolute left-1/2 -translate-x-1/2 text-wine"
            aria-label="Vayled dashboard"
          >
            <Logo size="sm" />
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/inbox" aria-label="Inbox" className="relative text-charcoal hover:text-wine">
              <NavIcon name="inbox" className="w-[22px] h-[22px]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-wine text-ivory text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setAccountOpen((v) => !v)}
              aria-label="Account"
              className="w-8 h-8 rounded-full border border-charcoal text-[10px] tracking-wider flex items-center justify-center hover:border-wine hover:text-wine"
            >
              {initials(displayName || "?")}
            </button>
          </div>

          {accountOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAccountOpen(false)} />
              <div className="absolute right-4 md:right-8 top-14 z-20 w-64 bg-white border border-charcoal/15 py-3">
                <div className="px-5 pb-3 border-b border-charcoal/10">
                  <p className="text-sm truncate">{displayName}</p>
                  <p className="text-xs text-charcoal/50 truncate">{subtitle}</p>
                </div>
                <Link href="/inquiry-settings" className="block px-5 py-2.5 text-sm hover:bg-ivory">
                  Settings
                </Link>
                <button onClick={handleSignOut} className="block w-full text-left px-5 py-2.5 text-sm hover:bg-ivory">
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-full sm:w-[340px] bg-wine text-ivory flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between h-16 px-4 md:px-8 shrink-0">
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="text-ivory">
                <NavIcon name="close" className="w-6 h-6" />
              </button>
            </div>
            <nav className="px-8 pb-10">
              {MAIN_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block py-3.5 font-logo text-[13px] uppercase tracking-[0.22em] border-b ${
                      active ? "border-ivory" : "border-ivory/15 text-ivory/90 hover:text-ivory"
                    }`}
                  >
                    {item.label}
                    {item.href === "/inbox" && badge(unreadCount)}
                  </Link>
                );
              })}
              <div className="mt-8">
                {MORE_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block py-2 text-sm tracking-wide ${
                      pathname === item.href ? "text-ivory" : "text-ivory/65 hover:text-ivory"
                    }`}
                  >
                    {item.label}
                    {item.href === "/inquiries" && badge(inquiryCount)}
                  </Link>
                ))}
                <button onClick={handleSignOut} className="block py-2 text-sm tracking-wide text-ivory/65 hover:text-ivory">
                  Sign out
                </button>
              </div>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
