import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/games/index.html", destination: "/games", permanent: true },
      { source: "/account.html", destination: "/account", permanent: true },
      { source: "/tech.html", destination: "/tech", permanent: true },
      { source: "/web-apps.html", destination: "/web-apps", permanent: true },
      { source: "/pricing/index.html", destination: "/pricing", permanent: true },
      { source: "/academy/index.html", destination: "/academy", permanent: true },
      { source: "/privacy.html", destination: "/privacy", permanent: true },
      { source: "/privacy-policy.html", destination: "/privacy", permanent: true },
      { source: "/accessibility-info.html", destination: "/accessibility", permanent: true },
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
  async rewrites() {
    const authOrigin = process.env.AUTH_APP_URL;
    if (!authOrigin) return [];
    return [{ source: "/auth-api/:path*", destination: `${authOrigin.replace(/\/$/, "")}/:path*` }];
  },
};

export default nextConfig;
