import { MetadataRoute } from "next";

const BASE_URL = "https://vayled.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = ["", "/features", "/pricing", "/about", "/login"];

  return publicRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
