import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots { const host = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"; return { rules: { userAgent: "*", allow: "/", disallow: ["/account", "/api/", "/protected"] }, sitemap: `${host.replace(/\/$/, "")}/sitemap.xml` }; }
