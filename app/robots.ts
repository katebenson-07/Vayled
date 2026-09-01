import { MetadataRoute } from "next";

// Everything behind AuthGuard (the actual app) plus the client-facing
// portal/inquiry links (meant to be shared privately, not surfaced in
// search) is kept out of the index. Only the public marketing pages and
// the login/signup page are crawlable.
const DISALLOWED = [
  "/dashboard",
  "/inbox",
  "/clients",
  "/inquiries",
  "/bookings",
  "/calendar",
  "/appointments",
  "/stylists",
  "/payroll",
  "/contracts",
  "/emails",
  "/analytics",
  "/expenses",
  "/inquiry-settings",
  "/invoices",
  "/trials",
  "/portal",
  "/inquire",
  "/api",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOWED,
    },
    sitemap: "https://vayled.com/sitemap.xml",
  };
}
