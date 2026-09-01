import type { Metadata } from "next";
import { Bodoni_Moda, Mrs_Saint_Delafield, DM_Sans } from "next/font/google";
import "./globals.css";

// Display serif (headlines, logo, page titles) is Bodoni Moda — a high-contrast
// Didone in the same family as the boutique/editorial wordmark look Kate wanted
// to match. Script accent (contract letterhead/footer, dashboard page titles
// like "Analytics"/"Calendar", booking names) is a true cursive, Mrs Saint
// Delafield, restoring a dedicated script instead of aliasing it to the serif.
// Body/UI stays DM Sans, unchanged. Same CSS variable names as before, so none
// of the font-serif/font-sans/font-script/font-heading/font-logo/font-tagline
// classes used across the app needed to change — only what each variable
// points to, here and in tailwind.config.ts.
const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const mrsSaintDelafield = Mrs_Saint_Delafield({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-script",
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
    <html lang="en" className={`${bodoniModa.variable} ${mrsSaintDelafield.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
