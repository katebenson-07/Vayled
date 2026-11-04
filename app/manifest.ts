import type { MetadataRoute } from "next";

// Lets people add Vayled to their phone's home screen from the browser, and
// gives the native iOS/Android wrapper the same name, colors, and icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vayled",
    short_name: "Vayled",
    description: "CRM for bridal hair & makeup studios",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#FAF8F5",
    theme_color: "#4D0E12",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
