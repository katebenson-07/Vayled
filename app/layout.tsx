import type { Metadata } from "next";
import { Lora, Spectral, Prata } from "next/font/google";
import "./globals.css";

// Lora is the one universal text font — body copy, section headers, and stat
// numbers/tabular data all share it (font-serif, font-sans, font-heading,
// and font-tagline all resolve to the same --font-sans variable; see
// tailwind.config.ts). Spectral covers font-script (every internal page's
// <h1>, a booking's bride name, contract thank-you/letterhead) — chosen over
// Abril Fatface, which Kate felt was too big/heavy at these sizes. Spectral
// is a lighter, more restrained serif, so it uses the same page-title sizes
// that were sized down for Abril Fatface (text-4xl / text-3xl) rather than
// sizing back up — Kate approved it at this scale in the comparison preview.
// Prata is a free lookalike standing in for the paid Black Gold font Kate
// wants, until she buys a license — used only for font-logo (the "VAYLED"
// wordmark). Replaced Italiana, which Kate felt looked too plain/generic at
// this size; Prata's higher-contrast strokes read closer to Black Gold's
// elegant-serif style. Kate approved Prata directly from an HTML preview.
const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-script-display",
  display: "swap",
});

const prata = Prata({
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
    <html lang="en" className={`${lora.variable} ${spectral.variable} ${prata.variable}`}>
      <body>{children}</body>
    </html>
  );
}
