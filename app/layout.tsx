import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

// Consolidated from six typefaces down to two: Cormorant Garamond for every
// serif/display role (headlines, logo, page titles, the old script accent),
// DM Sans for every body/UI role. Same CSS variable names as before, so none
// of the font-serif/font-sans/font-script/font-heading/font-logo/font-tagline
// classes used across the app needed to change — only what each variable
// points to, here and in tailwind.config.ts.
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
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
