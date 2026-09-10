import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "next-themes", "@radix-ui/react-checkbox", "@radix-ui/react-dropdown-menu", "@radix-ui/react-label", "@radix-ui/react-slot"],
  },
  async headers() {
    return [{ source: "/account", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }, { source: "/protected", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }, { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] }, { source: "/api/vcw/health", headers: [{ key: "Cache-Control", value: "no-store" }] },
    // Static game bundles: public, 1h fresh + 24h stale-while-revalidate.
    { source: "/games/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }] },
    { source: "/vcw/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }] },
    { source: "/vibecodeworker-legacy/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }] },
    // Crawlable metadata endpoints: cheap to serve, safe to cache briefly.
    { source: "/sitemap.xml", headers: [{ key: "Cache-Control", value: "public, max-age=3600" }] },
    { source: "/robots.txt", headers: [{ key: "Cache-Control", value: "public, max-age=3600" }] },
    { source: "/manifest.webmanifest", headers: [{ key: "Cache-Control", value: "public, max-age=3600" }] },
    { source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
    ] }];
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/games/index.html", destination: "/games", permanent: true },
      { source: "/account.html", destination: "/account", permanent: true },
      { source: "/protected", destination: "/account", permanent: true },
      { source: "/protected/", destination: "/account", permanent: true },
      { source: "/me", destination: "/account", permanent: true },
      { source: "/me/", destination: "/account", permanent: true },
      { source: "/me/:path*", destination: "/account", permanent: true },
      { source: "/my", destination: "/account", permanent: true },
      { source: "/my/", destination: "/account", permanent: true },
      { source: "/my/:section", destination: "/account?tab=:section", permanent: true },
      { source: "/my/:section/", destination: "/account?tab=:section", permanent: true },
      { source: "/lobbies/", destination: "/lobbies", permanent: true },
      { source: "/games/html/platform-wars", destination: "/games/platform-wars/play", permanent: true },
      { source: "/games/html/platform-wars/", destination: "/games/platform-wars/play", permanent: true },
      { source: "/tech.html", destination: "/tech", permanent: true },
      { source: "/web-apps.html", destination: "/web-apps", permanent: true },
      { source: "/spaceships.html", destination: "/spaceships", permanent: true },
      { source: "/spaceships/index.html", destination: "/spaceships", permanent: true },
      { source: "/pricing/index.html", destination: "/pricing", permanent: true },
      { source: "/academy/index.html", destination: "/academy", permanent: true },
      { source: "/privacy.html", destination: "/privacy", permanent: true },
      { source: "/privacy-policy.html", destination: "/privacy", permanent: true },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/accessibility-info.html", destination: "/accessibility", permanent: true },
      { source: "/accessibility-info", destination: "/accessibility", permanent: true },
      { source: "/vibecodeworker/index.html", destination: "/vibecodeworker", permanent: true },
      { source: "/vibecodeworker/overview.html", destination: "/vibecodeworker/overview", permanent: true },
      { source: "/vibecodeworker/hub.html", destination: "/vibecodeworker/hub", permanent: true },
      { source: "/vibecodeworker/run.html", destination: "/vibecodeworker/run", permanent: true },
      { source: "/vibecodeworker/full.html", destination: "/vibecodeworker/full", permanent: true },
      { source: "/vibecodeworker/phone.html", destination: "/vibecodeworker/phone", permanent: true },
      { source: "/vibecodeworker/docs/index.html", destination: "/vibecodeworker/docs", permanent: true },
      { source: "/vibecodeworker/demo/index.html", destination: "/vibecodeworker/demo", permanent: true },
      { source: "/vcw/agent", destination: "/vibecodeworker/hub", permanent: true },
      { source: "/vcw/agent/", destination: "/vibecodeworker/hub", permanent: true },
      { source: "/vcw/desktop", destination: "/vibecodeworker", permanent: true },
      { source: "/vcw/desktop/", destination: "/vibecodeworker", permanent: true },
      { source: "/vcw/web/hub", destination: "/vibecodeworker/hub", permanent: true },
      { source: "/vcw/web/hub/", destination: "/vibecodeworker/hub", permanent: true },
    ];
  },
};

export default nextConfig;
