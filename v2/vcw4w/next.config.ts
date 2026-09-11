import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "next-themes", "@radix-ui/react-checkbox", "@radix-ui/react-dropdown-menu", "@radix-ui/react-label", "@radix-ui/react-slot"],
  },
  async headers() {
    return [{ source: "/account", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }, { source: "/auth/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }, { source: "/protected", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }, { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] }, { source: "/api/vcw/health", headers: [{ key: "Cache-Control", value: "no-store" }] },
    // Static game bundles: public, 1h fresh + 24h stale-while-revalidate.
    // frame-ancestors explicitly allows the play shell to frame them from any
    // first-party host (apex/www 4weird.com): Vercel redirects
    // apex -> www, so a shell on one origin routinely frames a bundle that
    // settled on the other. No X-Frame-Options is emitted anywhere, so
    // same-origin framing keeps working and cross-host framing is governed
    // here, not by a deny-all default.
    { source: "/games/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }, { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://4weird.com https://www.4weird.com" }] },
    { source: "/vcw/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }] },
    { source: "/vibecodeworker-legacy/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }] },
    // Crawlable metadata endpoints: cheap to serve, safe to cache briefly.
    { source: "/sitemap.xml", headers: [{ key: "Cache-Control", value: "public, max-age=3600" }] },
    { source: "/robots.txt", headers: [{ key: "Cache-Control", value: "public, max-age=3600" }] },
    { source: "/llms.txt", headers: [{ key: "Cache-Control", value: "public, max-age=3600" }, { key: "Content-Type", value: "text/plain; charset=utf-8" }] },
    { source: "/manifest.webmanifest", headers: [{ key: "Cache-Control", value: "public, max-age=3600" }] },
    // Perf workers: immutable static JS, safe to cache for a year. They are
    // versioned by filename; bump the file when the protocol changes.
    { source: "/workers/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] },
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
      // NOTE: no /my/:section redirect - /my/usage/ and /my/rights/ are live
      // login-gated pages (see app/my/*/page.tsx). A catch-all here would
      // shadow them, since redirects run before page routes.
      { source: "/lobbies/", destination: "/lobbies", permanent: true },
      { source: "/games/html/platform-wars", destination: "/games/platform-wars/play", permanent: true },
      { source: "/games/html/platform-wars/", destination: "/games/platform-wars/play", permanent: true },
      { source: "/tech.html", destination: "/tech", permanent: true },
      { source: "/web-apps.html", destination: "/web-apps", permanent: true },
      // NOTE: /spaceships.html is the live WebGL embed framed by /spaceships
      // (see components/spaceships/spaceship-runtime.tsx). Do NOT redirect it
      // to /spaceships; that makes the page frame itself (infinite nesting).
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
      // VibeCodeWorker short links (used by the legacy nav + landing pages).
      // /vcw/agent/ and /vcw/desktop/ are NOT redirected: real static pages
      // (agent MCP docs, desktop download guide) are served there (see the
      // rewrites below; a redirect would loop against Next's trailing-slash
      // normalization: /vcw/agent -> /vcw/agent/ -> /vcw/agent -> ...).
      { source: "/vcw", destination: "/vibecodeworker", permanent: true },
      { source: "/vcw/", destination: "/vibecodeworker", permanent: true },
      { source: "/vcw/web/run", destination: "/vibecodeworker/run", permanent: true },
      { source: "/vcw/web/run/", destination: "/vibecodeworker/run", permanent: true },
      { source: "/vcw/web/full", destination: "/vibecodeworker/full", permanent: true },
      { source: "/vcw/web/full/", destination: "/vibecodeworker/full", permanent: true },
      { source: "/vcw/web/hub", destination: "/vibecodeworker/hub", permanent: true },
      { source: "/vcw/web/hub/", destination: "/vibecodeworker/hub", permanent: true },
      { source: "/vcw/web/demo", destination: "/vibecodeworker/demo", permanent: true },
      { source: "/vcw/web/demo/", destination: "/vibecodeworker/demo", permanent: true },
      // Bot clan UI moved from /bot/clans to /bot/bclans (less confusing
      // next to the human /clans pages). The retired /api/bot/clans/*
      // endpoints intentionally have no redirect; they are gone (404).
      { source: "/bot/clans", destination: "/bot/bclans", permanent: true },
      { source: "/bot/clans/:path*", destination: "/bot/bclans/:path*", permanent: true },
      // Teams renamed to Squads (plural /squads, singular /squad alias). Old
      // page + API paths redirect so bookmarks and clients keep working.
      { source: "/squad", destination: "/squads", permanent: true },
      { source: "/squad/:path*", destination: "/squads/:path*", permanent: true },
      { source: "/teams", destination: "/squads", permanent: true },
      { source: "/teams/:path*", destination: "/squads/:path*", permanent: true },
      { source: "/api/teams/:path*", destination: "/api/squads/:path*", permanent: true },
    ];
  },
  async rewrites() {
    return {
      // Static VCW product pages have directory-index layouts
      // (agent/index.html). Filesystem slash handling loop-redirects their
      // clean URLs, so rewrite BEFORE files are checked.
      beforeFiles: [
        { source: "/vcw/agent", destination: "/vcw/agent/index.html" },
        { source: "/vcw/agent/", destination: "/vcw/agent/index.html" },
        { source: "/vcw/desktop", destination: "/vcw/desktop/index.html" },
        { source: "/vcw/desktop/", destination: "/vcw/desktop/index.html" },
      ],
      // The preserved v1 worker surfaces live under /vibecodeworker-legacy/,
      // but their HTML/JS was authored for the v1 path prefix /vibecodeworker/
      // (base href + absolute asset URLs). These rewrites serve those asset
      // requests from the legacy dir WITHOUT moving the files (byte parity
      // with old-v1 is enforced by verify:legacy-parity). afterFiles so the
      // live Next.js /vibecodeworker/* routes always win over file serving.
      // NOTE: no :path* source may match a bare /vibecodeworker/<section>
      // (zero-segment match shadows the page); asset-only sources below.
      afterFiles: [
        // Static guides: public/ serves exact paths only, so the slash-less
        // variants are rewritten (not redirected; a redirect would loop
        // against trailing-slash normalization).
        { source: "/vcw/agent", destination: "/vcw/agent/index.html" },
        { source: "/vcw/desktop", destination: "/vcw/desktop/index.html" },
        { source: "/vibecodeworker/style.css", destination: "/vibecodeworker-legacy/style.css" },
        { source: "/vibecodeworker/style_hub_simple.css", destination: "/vibecodeworker-legacy/style_hub_simple.css" },
        { source: "/vibecodeworker/hub-shared.css", destination: "/vibecodeworker-legacy/hub-shared.css" },
        { source: "/vibecodeworker/overview.css", destination: "/vibecodeworker-legacy/overview.css" },
        { source: "/vibecodeworker/vcw-nav.css", destination: "/vibecodeworker-legacy/vcw-nav.css" },
        { source: "/vibecodeworker/vcw-nav.js", destination: "/vibecodeworker-legacy/vcw-nav.js" },
        { source: "/vibecodeworker/app.js", destination: "/vibecodeworker-legacy/app.js" },
        { source: "/vibecodeworker/run.js", destination: "/vibecodeworker-legacy/run.js" },
        { source: "/vibecodeworker/full.js", destination: "/vibecodeworker-legacy/full.js" },
        { source: "/vibecodeworker/modules/:path*", destination: "/vibecodeworker-legacy/modules/:path*" },
        { source: "/vibecodeworker/demo/demo.css", destination: "/vibecodeworker-legacy/demo/demo.css" },
        { source: "/vibecodeworker/demo/images/:path*", destination: "/vibecodeworker-legacy/demo/images/:path*" },
      ],
    };
  },
};

export default withBotId(nextConfig);
