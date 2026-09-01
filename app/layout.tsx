import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Pinyon_Script, Italiana } from "next/font/google";
import "./globals.css";

// Cormorant Garamond is now also the site-wide body-text default (see the
// `body` font-family rule in globals.css) as well as the font-serif/font-heading
// role. DM Sans stays the explicit font-sans role, used wherever a number or
// dense UI figure needs even, legible digits (analytics/expenses/payroll
// stats, timeline durations) instead of Cormorant's old-style numerals.
// Pinyon Script and Italiana are free lookalikes standing in for the paid
// Sloop Script Pro / Black Gold fonts Kate wants, until she buys licenses:
// Pinyon Script → font-script (big decorative page titles: Analytics,
// Expenses, Calendar, a booking's bride name, contract thank-you/letterhead).
// Italiana → font-logo (the "VAYLED" wordmark only).
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const pinyonScript = Pinyon_Script({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-script-display",
  display: "swap",
});

const italiana = Italiana({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-logo-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vayled.com"),
  title: {
    default: "Vayled",
    template: "%s · Vayled",
  },
  description: "CRM for bridal hair & makeup stylists",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable} ${pinyonScript.variable} ${italiana.variable}`}>
      <body>{children}</body>
    </html>
  );
}
