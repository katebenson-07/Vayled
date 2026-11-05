"use client";

import PageTabs from "./PageTabs";

export type BookingTabKey = "booking" | "preview" | "rehearsal" | "contract" | "invoice";

/**
 * The same tab bar on every page that belongs to one booking, so you can hop
 * between the booking, preview, rehearsal, contract, invoice, and the bride's
 * portal without going back first.
 */
export default function BookingTabs({
  bookingId,
  active,
  className = "",
}: {
  bookingId: string;
  active: BookingTabKey;
  className?: string;
}) {
  return (
    <PageTabs
      className={`print:hidden ${className}`}
      active={active}
      tabs={[
        { key: "booking", label: "Booking", href: `/bookings/${bookingId}` },
        { key: "preview", label: "Preview session", href: `/trials/${bookingId}` },
        { key: "rehearsal", label: "Rehearsal", href: `/rehearsal/${bookingId}` },
        { key: "contract", label: "Contract", href: `/contracts/${bookingId}` },
        { key: "invoice", label: "Invoice", href: `/invoices/${bookingId}` },
        "divider",
        { key: "portal", label: "Bride portal", href: `/portal/${bookingId}`, external: true },
      ]}
    />
  );
}
