import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
