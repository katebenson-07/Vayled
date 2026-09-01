import type { Metadata } from "next";
import { Lora, Bellefair, Italiana } from "next/font/google";
import "./globals.css";

// Lora is the one universal text font — body copy, section headers, and stat
// numbers/tabular data all share it (font-serif, font-sans, font-heading,
// and font-tagline all resolve to the same --font-sans variable; see
// tailwind.config.ts). Bellefair covers font-script (big decorative page
// titles: every internal page's <h1>, a booking's bride name, contract
// thank-you/letterhead). Italiana is a free lookalike standing in for the
// paid Black Gold font Kate wants, until she buys a license — used only for
// font-logo (the "VAYLED" wordmark).
const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});

const bellefair = Bellefair({
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
    <html lang="en" className={`${lora.variable} ${bellefair.variable} ${italiana.variable}`}>
      <body>{children}</body>
    </html>
  );
}
