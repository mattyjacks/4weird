# DS-BLDFIX-07 — Desktop + PWA build-health audit (bldfix-07)

Date: 2026-09-17. Envelope: DS-BLDFIX-07. Worker tag: bldfix-07.
Scope: `v2/desktop/**` (read/audit only — Tauri untouched), `v2/vcw4w/app/desktop/**`, `v2/vcw4w/public/manifest.json`.
Rule: NEW files only; shared manifests via QUEUE to steward. This note lives in owned scope `v2/desktop/ai/**`
(outside the Next.js tree) so it cannot affect `npm run build`.

## Findings

1. Tauri app (`v2/desktop/code`, own package.json + `src-tauri/`) is NOT part of the Next.js build.
   Only the web side (`v2/vcw4w/app/desktop/**`) + PWA (`app/manifest.ts`, `public/manifest.json`) matter. No action.
2. Desktop pages are build-static by construction:
   - `app/desktop/page.tsx` — static shell + `CachedTestingGuide` / `CachedPlansGuide` (`"use cache"`,
     `cacheLife("hours")` + `cacheTag("desktop)`), client components (`DesktopRental`, `RunpodDashboard`)
     behind `Suspense` with fallbacks. No request-time reads in the static shell.
   - `app/desktop/remastery|wave2|wave3/page.tsx` + `parity.ts` — route lists are build-time constants,
     `"use cache"` cached boards, no fetch/request usage. No scope-only prerender blockers.
   - `app/api/desktop/**` routes (provision, mine, metering, [id]/heartbeat|pod|policy) are runtime
     route handlers, not statically generated — they cannot stall "Finalizing page optimization".
3. PWA: `app/manifest.ts` carries `start_url: "/"`, first icon `/vcw/vcw-logo.png` (`image/png`)
   EXISTS on disk (`public/vcw/vcw-logo.png` present). `verify:pwa` checks the first icon only → green.
   Hardening noted for steward (not edited — shared/out-of-scope files):
   - second icon `/icon.svg` is MISSING from `public/` (verifier does not check it; browsers fall back to PNG).
   - `public/manifest.json` is stale legacy (data-URI SVG icons, old name/description) and is NOT what
     `verify:pwa` checks (`app/manifest.ts` is canonical). Suggest steward ruling: update or remove it.
4. Baseline build stall ("Finalizing page optimization" after 601/601 pages) is NOT attributable to
   desktop/PWA scope: no scope-only dynamic/prerender blockers found. No NEW-file fix required;
   recording green gates + QUEUE handoffs instead of manufacturing a change.

## Gates (evidence)

- `npm run verify:desktop` → `Virtual Desktop integrity OK.` EXIT 0 (2026-09-17).
- `npm run verify:pwa` → `PWA manifest integrity OK.` EXIT 0 (2026-09-17).
- Scoped lint + repo typecheck recorded in the envelope log at close.

## QUEUE asks for steward (no direct edits — shared manifests)

- `public/manifest.json` legacy vs `app/manifest.ts` canonical: update-or-remove ruling.
- `app/manifest.ts` second icon `/icon.svg` missing from `public/`: add real SVG or drop the entry.
- Sitemap wiring (if any desktop/PWA sitemap gap is found by the sitemap lane): via QUEUE, not here.
