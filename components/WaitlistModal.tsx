"use client";

import { useEffect, useState } from "react";
import WaitlistForm from "@/components/WaitlistForm";

const DISMISS_KEY = "vayled-waitlist-modal-dismissed";

/**
 * Popup modal nudging visitors who don't have an account yet toward the beta
 * waitlist. Auto-opens shortly after the page loads (public signup is
 * disabled — see CHANGELOG #86 — so most first-time visitors need to be
 * pointed at the waitlist). Shows at most once per browser session across
 * every page it's mounted on: dismissing it (X, backdrop click, or
 * successfully joining) sets a shared sessionStorage flag so it doesn't nag
 * again later in the same session, even after navigating to another page
 * that also renders it.
 */
export default function WaitlistModal({ source = "popup" }: { source?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    const timer = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(timer);
  }, []);

  function close() {
    setOpen(false);
    sessionStorage.setItem(DISMISS_KEY, "1");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-6"
      onClick={close}
    >
      <div
        className="w-full max-w-sm bg-ivory rounded-xl p-8 relative shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-4 right-4 text-charcoal/40 hover:text-charcoal text-lg leading-none"
        >
          ✕
        </button>
        <p className="text-xs uppercase tracking-widest-lg text-gold mb-2">Private beta</p>
        <p className="font-serif text-2xl text-charcoal mb-3">Not a studio yet?</p>
        <p className="text-sm text-charcoal/60 mb-6">
          We&apos;re onboarding bridal hair &amp; makeup studios in small batches. Join the waitlist and
          we&apos;ll email you when it&apos;s your turn.
        </p>
        <WaitlistForm source={source} dark={false} />
        <button
          onClick={close}
          className="text-sm text-charcoal/50 hover:text-charcoal mt-6"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
