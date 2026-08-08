import type { Metadata } from "next";
import { Playfair_Display, Jost, Pinyon_Script, Hina_Mincho } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const pinyon = Pinyon_Script({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-script",
  display: "swap",
});

const hinaMincho = Hina_Mincho({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vayled",
  description: "CRM for bridal hair & makeup stylists",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${jost.variable} ${pinyon.variable} ${hinaMincho.variable}`}>
      <body>{children}</body>
    </html>
  );
}
