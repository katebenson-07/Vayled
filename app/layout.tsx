import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Montserrat } from "next/font/google";
import "./globals.css";
import NativeBridge from "@/components/NativeBridge";

// One typeface for everything, in the spirit of The Row: Hanken Grotesk (a
// free lookalike for their paid Basic Commercial). Light weights for titles,
// regular for body. font-script and font-logo resolve to it too (see
// tailwind.config.ts), so no page needed to change.
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});

// Wide capitals for the wordmark, menu, and page titles (the look of Cartier).
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vayled.com"),
  title: {
    default: "Vayled",
    template: "%s · Vayled",
  },
  description: "CRM for bridal hair & makeup stylists",
  appleWebApp: { capable: true, title: "Vayled", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

// viewport-fit=cover lets the app draw under the iPhone notch/home bar; the
// safe-area padding in globals.css keeps content clear of them.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4D0E12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${hanken.variable} ${montserrat.variable}`}>
      <body>
        {children}
        <NativeBridge />
      </body>
    </html>
  );
}
