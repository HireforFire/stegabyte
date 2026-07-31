import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  "https://stegabyte.app";

/**
 * Static sitemap for Stegabyte. Update the `lastModified` field whenever
 * the corresponding route's content materially changes; Next.js will
 * regenerate the served `/sitemap.xml` on each build.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    "",
    "/dashboard",
    "/encrypt",
    "/extract",
    "/analyze",
    "/settings",
    "/about",
    "/privacy",
    "/terms",
    "/security",
    "/license",
  ];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: path === "" ? 1.0 : 0.6,
  }));
}
