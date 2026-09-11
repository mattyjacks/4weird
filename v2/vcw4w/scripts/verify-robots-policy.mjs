import fs from "node:fs";

const exists = (file) => fs.existsSync(new URL(file, import.meta.url));
const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");

// The app routes are canonical (per V1_TO_NEXTJS_REFACTOR_SPEC: robots.txt ->
// app/robots.ts, sitemap.xml -> app/sitemap.ts). A leftover static copy in
// public/ conflicts with the route and 500s in dev, while production silently
// serves the route — so the static copies must not exist.
for (const dead of ["../public/robots.txt", "../public/sitemap.xml"]) {
  if (exists(dead)) throw new Error(`Conflicting static copy must go (route wins in prod, 500s in dev): ${dead}.`);
}

const generated = read("../app/robots.ts");
for (const path of ["/account", "/account.html", "/api/", "/auth/", "/protected", "/v1-legacy/", "/games/html/", "/ai/", "/temp/"]) {
  if (!generated.includes(`"${path}"`)) throw new Error(`Missing crawler exclusion: ${path}.`);
}
if (!generated.includes("/sitemap.xml")) throw new Error("Robots must point at the sitemap.");

// Auth surfaces are login-gated: robots disallows them AND the server sends
// X-Robots-Tag noindex (defense in depth — disallow alone leaves
// URL-only listings possible via external links).
const nextConfig = read("../next.config.ts");
if (!nextConfig.includes('"/auth/:path*"') || !nextConfig.includes("noindex, nofollow")) {
  throw new Error("next.config must send X-Robots-Tag noindex on /auth/*.");
}

// The sitemap route must enumerate the canonical published pages + every game.
const sitemap = read("../app/sitemap.ts");
for (const path of ["/games", "/pricing", "/tech", "/privacy", "/terms", "/teams"]) {
  if (!sitemap.includes(`"${path}"`)) throw new Error(`Sitemap missing canonical page: ${path}.`);
}
if (!sitemap.includes("game.slug}/play")) throw new Error("Sitemap must include per-game play URLs.");
console.log("Robots policy checks OK.");
