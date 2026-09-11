# 4weird v1 to Next.js v2 - Complete Refactor Specification

## 1. Document control

- Status: implementation-ready discovery and migration specification.
- Audience: an AI or engineering team performing the v1-to-v2 rewrite.
- Legacy source root: `website/v1/`.
- Destination application root: `v2/vcw4w/`.
- Target: Next.js App Router, React 19, TypeScript, Tailwind, and existing Supabase SSR integration.
- Primary goal: preserve every user-facing v1 capability while making source ownership, routing, state, security, testing, and deployment explicit.
- Non-goal: blindly copy static HTML, global scripts, generated binaries, dependency folders, or desktop build outputs.
- Authority: observed repository behavior takes precedence over an inferred feature description.
- Required completion: do not call the refactor complete until the acceptance ledger in this document passes.

## 2. Executive summary

v1 is not one application. It is a static 4weird public site, a game catalog with independently authored browser games, an account/coins/save client, a 3D spaceship simulation, several VibeCodeWorker web UIs, a VibeCodeWorker Electron/Tauri/Node desktop product, an embedded MediaMogul desktop/video tool, and deployment/build artifacts.

The v2 repository currently contains a mostly uncustomized Next.js + Supabase starter in `v2/vcw4w/`. It has App Router pages, cookie-based Supabase helpers, a proxy, Tailwind, shadcn-style primitives, and starter authentication pages. It does **not** yet contain v1 product behavior.

The correct migration is a controlled product decomposition. Build one cohesive Next.js shell, migrate public routes and account behavior into typed React features, serve games as isolated runtime assets or progressively port them, and treat desktop-only VibeCodeWorker and MediaMogul code as separate products with explicit integration contracts. Never put Electron, Tauri, packaged binaries, or a copied `node_modules` directory inside the Next.js application.

## 3. Source inventory and scope boundary

- Observed v1 file count: approximately 22,292 files.
- Observed v1 HTML count: 146 files.
- Observed v1 JavaScript count: 4,177 files.
- Observed v1 Markdown count: 532 files.
- The apparent size is inflated by packaged desktop output, dependency trees, Rust build products, assets, and generated caches.
- First-party implementation must be identified by role, not by raw file count.
- `website/v1/ai/vibecodeworker/dist-current/` is packaged output, not migration source.
- Any `node_modules/` below v1 is dependency material, not migration source.
- Rust `target/`, Electron unpacked output, DLLs, PAKs, executables, source maps, and cache databases are not to be copied into v2.
- Preserve license notices where assets or code require them.
- Preserve source code only when it is an intentional product source of truth.

## 4. Destination architecture contract

### 4.1 Existing v2 baseline

- `app/layout.tsx` owns root HTML, global font setup, metadata, and theme provider.
- `app/page.tsx` is still the generic Supabase starter home page and must be replaced.
- `app/auth/*` already contains login, sign-up, forgotten-password, update-password, confirmation, error, and sign-up-success routes.
- `app/protected/*` contains starter authenticated route behavior.
- `lib/supabase/client.ts` is the browser client boundary.
- `lib/supabase/server.ts` is the server component/route-handler client boundary.
- `lib/supabase/proxy.ts` and root `proxy.ts` are the session refresh boundary.
- `components/ui/*` provides button, input, label, checkbox, dropdown, card, and badge primitives.
- `lib/utils.ts` provides shared utility composition.
- `globals.css` is the global style entrypoint.

### 4.2 Required v2 ownership

- `app/` owns routes, layouts, metadata, route handlers, and server actions.
- `components/` owns reusable presentational and client-interaction components.
- `features/` owns business domains rather than scattering product logic by file type.
- `lib/` owns framework-independent utilities, validation, constants, and service adapters.
- `content/` owns typed editorial/catalog content that does not need a database.
- `public/` owns static images, game runtime files, manifest icons, and other public assets.
- `tests/` owns unit, integration, and end-to-end tests.
- `docs/` owns design and migration documents, including this document.
- A sibling product directory owns desktop-only VibeCodeWorker runtime work if it remains in this repository.

### 4.3 Proposed v2 tree

```text
v2/vcw4w/
  app/
    (marketing)/
      page.tsx
      academy/page.tsx
      tech/page.tsx
      pricing/page.tsx
      privacy/page.tsx
      accessibility/page.tsx
    account/page.tsx
    games/page.tsx
    games/[slug]/page.tsx
    games/[slug]/play/page.tsx
    spaceships/page.tsx
    vibecodeworker/page.tsx
    vibecodeworker/overview/page.tsx
    vibecodeworker/hub/page.tsx
    vibecodeworker/run/page.tsx
    vibecodeworker/full/page.tsx
    vibecodeworker/phone/page.tsx
    vibecodeworker/docs/page.tsx
    web-apps/page.tsx
    api/games/[slug]/save/route.ts
    api/coins/balance/route.ts
    api/coins/history/route.ts
    api/coins/claim/route.ts
    api/checkout/route.ts
    api/vcw/[...path]/route.ts
    auth/...
    not-found.tsx
    sitemap.ts
    robots.ts
    manifest.ts
  components/site/
  components/games/
  components/account/
  components/vcw/
  components/spaceships/
  content/games.ts
  features/auth/
  features/coins/
  features/game-saves/
  features/catalog/
  features/vcw/
  lib/
  public/games/
  public/images/
  docs/
```

## 5. Canonical routing policy

- All v2 user-facing routes use clean paths without `.html`.
- Root legacy `index.html` becomes `/`.
- Legacy `games/index.html` becomes `/games`.
- Legacy `games/html/<slug>/index.html` becomes `/games/<slug>`.
- Game runtime play view becomes `/games/<slug>/play` when a React shell wraps a retained runtime.
- Legacy `account.html` becomes `/account`.
- Legacy `pricing/index.html` becomes `/pricing`.
- Legacy `academy/index.html` becomes `/academy`.
- Legacy `tech.html` becomes `/tech`.
- Legacy `spaceships.html` becomes `/spaceships`.
- Legacy `web-apps.html` becomes `/web-apps`.
- Legacy `vibecodeworker/index.html` becomes `/vibecodeworker`.
- Legacy `vibecodeworker/overview.html` becomes `/vibecodeworker/overview`.
- Legacy `vibecodeworker/hub.html` becomes `/vibecodeworker/hub`.
- Legacy `vibecodeworker/run.html` becomes `/vibecodeworker/run`.
- Legacy `vibecodeworker/full.html` becomes `/vibecodeworker/full`.
- Legacy `vibecodeworker/phone.html` becomes `/vibecodeworker/phone`.
- Legacy `vibecodeworker/docs/index.html` becomes `/vibecodeworker/docs`.
- Legacy 404 page becomes `app/not-found.tsx`.
- Both legacy privacy URLs must redirect to one canonical `/privacy` route.
- Preserve query parameters during every legacy redirect.
- Return HTTP 308 for permanent legacy path redirects.
- Do not redirect a game URL to another game because it is missing; return an intentional not-found state.

## 6. Shared site shell

- Create a typed `SiteHeader` component.
- Create a typed `SiteFooter` component.
- Replace `components.js` HTML injection with React composition.
- Use Next `Link` for internal links.
- Use ordinary anchor elements only for external destinations.
- Keep the 4weird Games brand wording.
- Keep the “Future Forward Fun” tagline.
- Keep Games, VibeCodeWorker, Account, GitHub, and contact navigation intent.
- Keep responsive mobile navigation.
- Use a real button for the mobile navigation trigger.
- Set `aria-expanded` on the trigger.
- Restore focus predictably when a mobile menu closes.
- Support Escape to close the mobile menu.
- Avoid duplicating header markup across routes.
- Avoid deriving relative paths by inspecting script tags.
- Use route constants for internal navigation.
- Preserve footer company, location, and external company link only after verifying current copy.
- Preserve a contact destination, but replace fake client-only success behavior with a deliberate implementation or remove the form.
- Do not claim that a contact message was sent unless a server-side submission succeeded.

## 7. Visual language and progressive enhancement

- Preserve the dark, futuristic, neon/cyberpunk visual identity where it is product intent.
- Convert common colors, radii, spacing, typography, z-index, and shadows into design tokens.
- Do not migrate one global `styles.css` into a new global unscoped stylesheet unchanged.
- Prefer Tailwind utilities plus component variants for shared UI.
- Use CSS modules or scoped styles for complex game/runtime shells when useful.
- Preserve desktop, tablet, and mobile layouts.
- Respect `prefers-reduced-motion` for starfields, typewriting, scrolling, parallax, and canvas motion.
- Do not make critical text legible only through animation.
- Never block rendering while a decorative 3D background loads.
- Keep a light-weight fallback for unsupported WebGL or low-power devices.
- Maintain keyboard-visible focus styling.
- Ensure neon colors meet contrast requirements when used as text.

## 8. Home page behavior

- Rebuild the v1 public landing page at `/`.
- Preserve the hero positioning and “Future Forward Fun” message.
- Preserve a game discovery call to action.
- Preserve a VibeCodeWorker call to action.
- Preserve catalog promotion / featured-game behavior.
- Preserve any technology/academy/account pathways present in v1 navigation or home content.
- Retain starfield ambience as a client-only progressive enhancement.
- Retain the 2D canvas fallback only if the 3D background cannot initialize.
- Never access `window`, `document`, canvas, or WebGL during server render.
- Load 3D background code with `next/dynamic` and `ssr: false`.
- Avoid hydration mismatch for randomized stars.
- Replace the legacy typewriter loop with a reduced-motion-safe component.
- Replace generic IntersectionObserver reveal code with reusable `Reveal` behavior.
- Do not use delayed DOM mutation as the only way to expose content.
- Replace arbitrary parallax listeners with requestAnimationFrame-throttled or CSS behavior.
- Preserve sticky header behavior without scroll-jank.
- Preserve the random game button behavior using the typed game catalog.

## 9. Game catalog model

The v1 catalog is currently duplicated between shared script data, game folders, thumbnails, and each game’s `game.json`. v2 must have one validated catalog source.

```ts
export type GameCatalogEntry = {
  slug: string;
  title: string;
  emoji: string;
  description: string;
  tags: string[];
  featured: boolean;
  weight: number;
  runtime: 'react' | 'legacy-static' | 'external' | 'planned';
  status: 'published' | 'experimental' | 'template' | 'archived';
  maker?: { name: string; bio?: string; url?: string; urlLabel?: string };
  credits?: Array<{ name: string; role: string; avatar?: string; url?: string; urlLabel?: string; primary?: boolean }>;
  legacyPath?: string;
  guideAvailable?: boolean;
  thumbnail?: string;
};
```

- Validate `content/games.ts` at build time with Zod or equivalent.
- Treat legacy `game.json` as import input, not as arbitrary browser-executable content.
- Require unique slugs.
- Require nonempty title and description.
- Restrict external maker/credit URLs to HTTP(S).
- Keep creator bios and credits text-only by default.
- Render content through JSX rather than `innerHTML`.
- Prevent malformed metadata from taking down the entire games page.
- Log metadata validation errors in CI.
- Add explicit publication status instead of silently listing incomplete templates.
- Derive featured games from catalog data.
- Derive random-game selection from published catalog data.
- Use weights only where product explicitly wants weighted selection.
- Exclude `template-demo` and `_TEMPLATE` from public discovery unless intentionally published.

## 10. Published game inventory

- `aiwhackamole`: 3D arcade; whack dangerous AI and spare helpful AI before time expires.
- `assassinanimals`: choose one of nine animal agents; procedural stealth-combat rogue-like facility runs.
- `battlesharks2`: cybernetic combat-shark mutation and deep-sea eating arcade loop.
- `demolichdom`: necromancer/skeleton-army demolition strategy action.
- `DiscoverAmerica`: Madi AI voyage, data-fragment collection, sorting, and progression puzzles.
- `financialfreedom`: US-family financial-independence simulator covering careers, taxes, debt, investments, real estate, and life events.
- `fridgesimulator`: multi-country food/nutrition/family-survival management simulator.
- `friendslop`: meme arcade feeding/dodging/combo experience.
- `gravegain2d`: dark-fantasy 2D action RPG with procedural dungeons, dialogue, lighting, and starship hub.
- `gravegain3d`: 3D billboard dark-fantasy action RPG with procedural dungeon and starship hub.
- `lastwordszombies`: cyberpunk typing survival game against approaching rogue cyber-units.
- `orbitaldrift`: hold/release orbital-control arcade with debris avoidance and stardust collection.
- `overtake`: pseudo-3D arcade racing, garage progression, route unlocks, and nitro.
- `semester-survival`: eight-semester student survival simulation.
- `serversavershield`: cyberattack/data-center defense and strategic management game.
- `soundpainter`: tile-based audiovisual music painter.
- `soundpainter2`: browser music studio, step sequencer, synthesis/effects, shareable composition URL.
- `venturemechanically`: cap-table / startup-exit educational simulator.
- `kouzi/neonbreaker`: neon brick-breaker.
- `kouzi/neoninvaders`: neon fixed shooter.
- `kouzi/neonracer`: neon traffic survival racer.
- `kouzi/neonsnake`: neon snake.
- `kouzi/neonvoidrunner`: neon endless runner.
- `madi/temple-of-lost-revenue`: business-revenue maze.
- `madi/the-ai-expedition`: data-routing/AI-automation adventure.
- `madi/the-cave-of-bottlenecks`: bottleneck-clearing cave game.
- `madi/the-lost-city-of-customers`: customer-location scanner game.
- `madi/the-madi-ai-universe`: Madi map / flagship universe.
- `madi/the-pipeline-mountain`: business growth climbing game.
- `madi/the-revenue-dragon`: growth-blocker boss fight.
- `madi/the-revenue-jungle`: process/data/decision jungle traversal.
- `madi/the-speed-portal`: legacy-speed obstacle racer.
- `madi/treasure-hunters`: claw-grapple business-value collection game.
- `template-demo`: sample template; preserve as developer documentation, not default public catalog content.
- `_TEMPLATE`: contributor template; preserve as source template only.

## 11. Game route requirements

- `/games` lists published game entries.
- `/games` supports filtering by tags if v1 exposes category/filter behavior.
- `/games` supports featured presentation.
- `/games` supports random game discovery.
- `/games/[slug]` resolves a catalog entry server-side.
- `/games/[slug]` returns `notFound()` for unknown slugs.
- `/games/[slug]` supplies title, description, image, canonical URL, and Open Graph metadata.
- `/games/[slug]` presents game identity before the runtime starts.
- `/games/[slug]` provides a keyboard-accessible Play action.
- `/games/[slug]` lists credits/maker information where data exists.
- `/games/[slug]` links to a guide only when a guide exists.
- `/games/[slug]` must not execute unsafe metadata as markup.
- `/games/[slug]/play` isolates the runtime from surrounding page layout.
- `/games/[slug]/play` provides an exit/back-to-details control.
- `/games/[slug]/play` handles full-screen permission failure gracefully.
- `/games/[slug]/play` captures focus intentionally without trapping ordinary browser navigation.
- `/games/[slug]/play` prevents Space scroll only while a focused active game actually requires it.
- `/games/[slug]/play` does not globally intercept Space for unrelated pages.

## 12. Legacy browser-game migration strategy

- Do not attempt to convert all game engines to React in a single change.
- First establish route, catalog, metadata, analytics, accessibility, and save contracts.
- Preserve each legacy runtime as a static isolated asset bundle under `public/games/<slug>/` when it cannot be ported safely yet.
- Render retained legacy games in a sandboxed iframe with the minimum required sandbox permissions.
- Omit `allow-same-origin` unless the game needs it and threat analysis accepts it.
- Use `postMessage` with a versioned schema for shell/runtime communication.
- Validate message origin and payload schema.
- Allow the host shell to request pause, resume, fullscreen, and save state.
- Allow the runtime to emit ready, score, error, save, and analytics events.
- Never trust a game-provided score, coin award, or identity claim without server validation.
- Use a Content Security Policy appropriate to same-origin static game assets.
- Keep assets relative to each game bundle or fix paths during copying.
- Make the runtime URL build-safe through `assetPrefix`/base-path-aware helpers.
- Give each migrated game a documented runtime classification.
- Port a game into React only when it yields a measurable maintainability, performance, or UX benefit.

## 13. Game persistence

- v1 includes `FourWeirdServer.getSaves(game, slot)` and `putSave(gameSlug, slot, data)`.
- Preserve named slot support.
- Preserve filtering by game and slot.
- Validate game slug against the v2 catalog.
- Validate slot syntax and maximum length.
- Validate maximum save payload size before storing.
- Store structured JSON, never code to execute.
- Associate every save with the authenticated user ID on the server.
- Enforce row-level security in Supabase.
- Use upsert semantics keyed by user, game slug, and slot.
- Store created and updated timestamps.
- Return a stable, typed save response.
- Handle offline/local game saves explicitly rather than pretending cloud persistence succeeded.
- Preserve legacy localStorage only as a one-time client-side migration source where feasible.
- Version game save schemas by game and migrate old payloads deliberately.
- Make a corrupted save recoverable through delete/reset UX.
- Never put Supabase service-role secrets in game code or browser bundles.

## 14. Account, authentication, coins, and commerce

### 14.1 Authentication

- v1 client communicates with an auth application through cookies and `/auth-api` proxy mode.
- v2 must use its existing Supabase SSR cookie architecture as the canonical session layer.
- Preserve sign-up with email/password.
- Preserve sign-in with email/password.
- Preserve sign-out.
- Preserve session lookup.
- Preserve email confirmation flow.
- Preserve forgotten-password and password-update flow.
- Preserve an error route for auth failures.
- Enforce email validation server-side as well as client-side.
- Enforce password policy server-side.
- Never expose access tokens through localStorage.
- Do not use client JavaScript as an authorization boundary.

### 14.2 Profile

- v1 supports profile retrieval.
- v1 supports display-name update.
- Display name is trimmed and limited to 40 characters in v1.
- Preserve a minimum visible-name rule with a user-readable error.
- Validate profile writes with a shared schema.
- Make profile updates authenticated server actions or route-handler calls.
- Configure Supabase RLS to permit only self-owned profile records.
- Keep UI optimistic only when rollback is possible.

### 14.3 Vibe Coins

- v1 supports balance retrieval.
- v1 supports transaction history with a 1-100 item requested limit and default 25.
- v1 supports claim processing.
- v1 supports coin-pack configuration.
- v1 generates a Shopify cart URL from validated store and variant configuration.
- The browser must never award coins directly.
- Use a server-side order/webhook reconciliation flow as authority for paid coins.
- Idempotently record purchase events.
- Keep a ledger, not only a mutable balance column.
- Derive or transactionally maintain balance from ledger entries.
- Return currency/coin amounts as integers.
- Reconcile orders by verified payment identity, not a browser-provided claim.
- Do not transfer a legacy insecure checkout URL without validating the business integration.

### 14.4 Suggested database entities

```text
profiles(id uuid PK references auth.users, display_name text, created_at, updated_at)
coin_ledger(id uuid PK, user_id uuid, amount integer, reason text, external_reference text unique nullable, created_at)
game_saves(id uuid PK, user_id uuid, game_slug text, slot text, schema_version integer, data jsonb, created_at, updated_at, unique(user_id, game_slug, slot))
purchase_claims(id uuid PK, user_id uuid nullable, provider text, provider_order_id text unique, email text, status text, created_at, updated_at)
```

## 15. Accessibility product requirements

- Preserve the legacy accessibility information route at `/accessibility`.
- Port useful controls from `accessibility.js` into a client component with persistent user preferences.
- Respect user browser zoom.
- Do not use visual-only icon buttons without labels.
- Add a skip-to-content link.
- Give every page one clear H1.
- Preserve heading order.
- Ensure menus work with keyboard and screen reader navigation.
- Ensure modal/dialog behavior traps focus only while open.
- Announce form submission success and failure via live regions.
- Give canvases and games textual instructions outside canvas.
- Provide pause/reduced-motion controls for motion-heavy content.
- Do not use color as the sole distinction for dangerous AI, game state, or validation errors.
- Make game thumbnails meaningful or decorative intentionally.
- Test header, account, catalog, and game launch with keyboard only.
- Test at 200% browser zoom.
- Test with a screen reader before declaring parity.

## 16. SEO, metadata, and PWA

- Convert `robots.txt` to `app/robots.ts` unless deployment requires a static file.
- Convert `sitemap.xml` to `app/sitemap.ts` and enumerate canonical published pages.
- Preserve or replace `manifest.json` through `app/manifest.ts`.
- Provide title templates and page-specific descriptions.
- Generate game-specific metadata from validated catalog data.
- Provide canonical URLs based on the deployment origin.
- Provide Open Graph and Twitter images appropriate to site/game pages.
- Do not retain starter “Next.js Supabase Starter Kit” metadata.
- Keep the service worker only if its cache strategy is audited and still desired.
- Do not cache authenticated API responses in a public service-worker cache.
- Version and invalidate game asset caches on deploy.
- Verify offline behavior explicitly rather than relying on an old `sw.js`.
- Preserve 404 noindex semantics.

## 17. Spaceships simulation

### 17.1 Source surface

- Legacy entry page: `website/v1/spaceships.html`.
- Legacy engine directory: `website/v1/spaceships/`.
- Core systems include `core.js`, `main.js`, `space-scene.js`, `fast-space-scene.js`, and `performance-manager.js`.
- Gameplay systems include ship generation, realistic ship generation, ship building, ship AI, weapons, loot, damage, difficulty, debug, and cinematic camera.
- Worker systems include physics and boids workers.
- Reusable part catalogs include hulls, cockpits, details, thrusters, wings, weapons, and station components.
- Station components include antenna mast, biodome pod, cargo rack, command bridge, connecting strut, core hub, defense platform, docking bay, fuel tank, gravity ring, habitat ring, hangar deck, observation deck, radiator wing, reactor core, refining refinery, sensor spire, shield pylon, solar array, and turret defense.

### 17.2 Migration requirements

- Create `/spaceships` as a route-level client boundary.
- Do not server-render WebGL initialization.
- Dynamically import the simulation only after its container exists.
- Keep workers as explicit public worker modules or bundler-supported workers.
- Terminate workers when the route unmounts.
- Dispose WebGL geometries, textures, materials, audio nodes, animation frames, and event listeners on unmount.
- Do not permit a leaked simulation loop after route navigation.
- Expose quality settings via a typed configuration object.
- Make quality adaptive behavior observable and testable.
- Preserve the legacy fullscreen intent.
- Provide a keyboard-accessible fullscreen control.
- Provide a non-WebGL explanation/fallback state.
- Preserve procedural part catalogs as data/modules rather than global scripts.
- Avoid moving thousands of geometry literals into React component render functions.
- Keep simulation engine state outside React render state; bridge it through a small controller API.
- Add a stable screenshot/visual regression scene for testing.

## 18. VibeCodeWorker product boundary

VibeCodeWorker is a separate product family embedded within v1. It has a static web experience, a richer hub/run/full/phone UI, a desktop Electron/Tauri runtime, an API server, an MCP server, agent/automation modules, cloud deployment configuration, tests, and documentation. A Next.js migration must not collapse all of that into one browser route.

### 18.1 Public VibeCodeWorker surfaces

- `/vibecodeworker`: evidence-driven QA product page.
- `/vibecodeworker/overview`: autonomous QA overview/marketing surface.
- `/vibecodeworker/hub`: playtest workspace/hub UI.
- `/vibecodeworker/run`: cloud-run UI.
- `/vibecodeworker/full`: full web version UI.
- `/vibecodeworker/phone`: remote phone/controller UI.
- `/vibecodeworker/docs`: browser-accessible manual/documentation entry.
- `/web-apps`: web-app play/debug entry point.
- `/pricing`: VibeCodeWorker launch plans.
- `/vcw/agent`, `/vcw/desktop`, and `/vcw/web/hub` are legacy variants that require route mapping or redirect decisions.

### 18.2 Web UI migration

- Convert static VibeCodeWorker pages into route-specific React feature modules.
- Preserve UI state with typed reducers or state machines where workflows have multiple states.
- Create a shared VibeCodeWorker shell/navigation component.
- Replace direct DOM querying and ID-coupled module access with component refs only at integration boundaries.
- Preserve visible workspace, run, telemetry, defect, sub-agent, game-brain, GPU, and viewport concepts where v1 exposes them.
- Preserve progressive status feedback.
- Avoid claiming remote agents ran when no server response confirms it.
- Treat web-client actions as commands to a service, not as permission to run desktop code inside a browser.
- Use server-sent events or WebSocket only after defining authentication, authorization, reconnect, and backpressure behavior.
- Provide clear disconnected, connecting, running, failed, and completed states.
- Keep long-running job history server-side.
- Make job cancellation explicit and idempotent.

### 18.3 Existing web modules to account for

- `core_state.js`: central mutable state candidate; replace with typed feature state.
- `data_store.js`: persistence/data abstraction candidate; define storage contract.
- `dom_elements.js`: DOM lookup cache; remove in favor of React composition.
- `agent_runner.js`: agent lifecycle/orchestration client surface.
- `defect_healer.js`: healing workflow surface.
- `game_brain.js`: game reasoning/controller surface.
- `gpu_remote.js`: remote GPU integration surface.
- `hub_manager.js`: hub workspace coordination surface.
- `subagents_manager.js`: sub-agent coordination surface.
- `tauri_smart_log.js`: desktop bridge/logging adapter; browser fallback required.
- `telemetry_logger.js`: telemetry adapter.
- `viewport_manager.js`: viewport/display coordination surface.
- `vcw-nav.js`: navigation behavior; replace with React shared navigation.
- `run.js` and `full.js`: route-specific orchestration/UI behavior.

### 18.4 Desktop-only source to preserve outside Next.js

- `website/v1/ai/vibecodeworker/app/main.js` is Electron main-process source.
- `src/main_process/*` contains desktop main-process modules.
- `src/runtime/*` contains browser/native engine and automation runtime modules.
- `src/components/*` contains desktop UI controllers.
- `src-tauri/*` contains Tauri/Rust project source.
- `server/*` contains API/MCP server entry points.
- `lib/api/*` contains service routes and handlers.
- `workers/heal_worker.js` contains worker-side healing execution.
- `deploy/*` contains cloud deployment materials.
- `tests/*` and `scripts/*` provide valuable behavior verification and tooling.
- Retain those in a dedicated desktop/service package or preserve in place with a documented boundary.
- Do not import Node, Electron, Tauri, filesystem, child-process, or native APIs into a Next client component.
- Do not put remote machine credentials in browser environment variables.

## 19. VibeCodeWorker backend contract

- Define a separate API namespace such as `/api/vcw/*`.
- Authenticate every non-public VCW action.
- Authorize ownership per project, run, artifact, and remote resource.
- Represent agent jobs with persistent IDs.
- Represent job states as `queued`, `starting`, `running`, `waiting_for_input`, `succeeded`, `failed`, `cancelled`.
- Include timestamps, structured error code, human-readable message, and retryability.
- Store logs as append-only events with cursor pagination.
- Store artifacts separately from log text.
- Stream events with a typed event envelope.
- Reject commands outside an allowlist of supported actions.
- Validate URLs, local paths, model identifiers, and project IDs server-side.
- Never proxy arbitrary network requests from the browser to a remote runner.
- Rate-limit run creation and command endpoints.
- Redact secrets from logs and screenshots.
- Add audit records for destructive or remote-machine actions.

## 20. MediaMogul boundary

- `website/v1/ai/mediamogul/` is an embedded desktop/video-production product, not a normal website feature.
- It includes Python applications, install/uninstall scripts, Shotcut filters, companion tooling, tests, media assets, and legal documentation.
- Do not copy the Python runtime or installers into `v2/vcw4w`.
- If v2 needs a web surface, create a product landing page or authenticated remote-job client only.
- Define a service boundary for production tasks before exposing controls in Next.js.
- Preserve `LEGAL_BOUNDARY.md` intent in any feature that invokes external media/action tooling.
- Treat video files and renders as durable artifacts with authorization checks.
- Keep ffmpeg/Shotcut/native dependencies on a controlled worker environment.
- Never execute user-supplied shell commands from a Next.js route handler.

## 21. Static content and legal routes

- Rebuild `/privacy` from the canonical legacy privacy content after comparing `privacy.html` and `privacy-policy.html`.
- Identify whether both files differ materially before discarding either.
- Rebuild `/accessibility` from `accessibility-info.html` and practical accessibility implementation.
- Rebuild `/academy` from `academy/index.html`.
- Rebuild `/tech` from `tech.html`.
- Rebuild `/pricing` from `pricing/index.html` and `pricing.css`.
- Rebuild `/web-apps` from `web-apps.html`.
- Preserve visible claims only if they are still accurate.
- Add page-level metadata for every legal/marketing page.
- Avoid client-only rendering for mostly static editorial pages.
- Use MDX/content modules only if editorial maintenance warrants it.

## 22. Service worker and client-storage audit

- v1 uses localStorage extensively (observed more than 100 references).
- v1 also uses sessionStorage, Web Workers, AudioContext, animation frames, fetch, one service worker registration, and a WebSocket reference.
- Inventory every storage key before deleting or changing it.
- Classify every key as preference, anonymous progress, authenticated save, cache, ephemeral UI, or unsafe legacy data.
- Namespace v2 client keys as `4weird:v2:<feature>:<key>`.
- Version every persisted browser schema.
- Never store session tokens, privileged data, or coins as client authority.
- Provide migration code only for data users reasonably expect to survive.
- Make migration idempotent.
- Record successful migration so it does not rerun.
- Keep local game data isolated per game slug.
- Make AudioContext initialization user-gesture driven.
- Suspend/resume sound with route visibility and game pause behavior.
- Use workers only when computation warrants serialization/transfer overhead.

## 23. Security requirements

- Use Supabase SSR cookies and existing proxy pattern correctly.
- Keep service-role keys server-only.
- Validate every route-handler input using a shared schema.
- Use server-side authorization for profile, coins, saves, VCW runs, artifacts, and checkout-related actions.
- Configure RLS for every user-owned table.
- Escape/encode untrusted content by using React JSX, not unsafe HTML APIs.
- Preserve the v1 `game-meta.js` intent: only safe HTTP(S) URLs for contributor metadata.
- Add CSP headers appropriate to first-party pages, iframe games, and required analytics.
- Add `frame-ancestors` policy deliberately.
- Use `rel="noopener noreferrer"` for external blank-target links.
- Protect mutating routes from CSRF according to the chosen cookie/session approach.
- Rate-limit sign-in, sign-up, save writes, coin claims, checkout creation, and agent actions.
- Log security-relevant failures without leaking sensitive data.
- Avoid `dangerouslySetInnerHTML` unless a sanitized, reviewed content pipeline is mandatory.
- Do not expose source maps or debug endpoints publicly unless intentionally configured.

## 24. Performance requirements

- Keep marketing routes server-rendered/static where possible.
- Lazy-load WebGL, canvas games, audio engines, large game bundles, and VCW dashboards.
- Avoid importing all game runtime code on the games listing page.
- Serve responsive thumbnails with Next Image when assets are compatible.
- Avoid Next Image optimization for dynamic game canvas output unless appropriate.
- Preload only assets required for first interaction.
- Give games a visible loading/progress state.
- Give games an error/retry state.
- Keep animation loops from running while tab/document is hidden when possible.
- Dispose client resources on navigation.
- Establish page and game performance budgets.
- Measure Web Vitals using a privacy-aware analytics integration.
- Preserve v1’s interest in CLS/LCP/FID-style tracking without injecting global scripts imperatively.
- Do not route large binary desktop distributions through Next.js static assets.

## 25. Analytics requirements

- Replace global Google Analytics script injection with a central analytics adapter.
- Preserve analytics only after consent/privacy requirements are decided.
- Track page view centrally.
- Track game card view/click and game start.
- Track game error separately from successful start.
- Track gameplay completion only from a validated runtime event.
- Track account/auth funnel steps without sending credentials.
- Track coin checkout initiation but never card/payment details.
- Track VCW run lifecycle without prompt contents or secrets by default.
- Keep event names documented and stable.
- Ensure analytics failure never blocks the product.
- Provide a no-op adapter for local/test environments.

## 26. Testing strategy

### 26.1 Unit tests

- Validate catalog parsing.
- Validate unique slugs.
- Validate safe external URL handling.
- Validate random-game selection boundaries.
- Validate game save schemas.
- Validate profile and coin input schemas.
- Validate route mapping helper behavior.
- Validate VCW event envelope parsing.
- Validate storage migration idempotence.
- Validate accessibility preference reducer behavior.

### 26.2 Integration tests

- Test Supabase-authenticated profile access.
- Test unauthorized save read/write rejection.
- Test save upsert and slot isolation.
- Test coin ledger authorization.
- Test checkout server validation.
- Test legacy redirects preserve query strings.
- Test game iframe message validation.
- Test VCW command authorization and state transitions.
- Test error handling for unavailable remote services.

### 26.3 End-to-end tests

- Visit public home, catalog, game detail, pricing, academy, tech, privacy, accessibility, and VibeCodeWorker pages.
- Navigate header and footer using keyboard.
- Open/close mobile navigation using keyboard and Escape.
- Launch at least one retained legacy game.
- Verify Space does not scroll an active compatible game.
- Verify Space still scrolls ordinary content pages.
- Sign up/sign in/sign out in a test Supabase project.
- Update a display name.
- Save and reload game state.
- Verify unknown game returns v2 not-found page.
- Verify reduced-motion setting suppresses decorative motion.
- Test at desktop and mobile viewport sizes.
- Capture visual snapshots for home, catalog, game shell, account, spaceships fallback, and VCW dashboard states.

## 27. Migration phases

### Phase 0 - Baseline and safety

- Freeze a reference list of legacy URLs.
- Capture screenshots and manual walkthrough notes for representative pages.
- Identify which v1 directories are build output versus source.
- Inventory environment variables and secrets without copying them into docs.
- Confirm v2 builds before product edits.
- Add lint, typecheck, and test scripts to v2.
- Decide canonical deployment origin and redirect host policy.

### Phase 1 - Shell and public content

- Replace starter home and metadata.
- Build shared header/footer and design tokens.
- Migrate home, games list, academy, tech, pricing, privacy, accessibility, and not-found routes.
- Add redirects for high-value legacy public URLs.
- Add sitemap, robots, and manifest.

### Phase 2 - Catalog and games

- Create typed catalog and metadata pipeline.
- Migrate game cards/details.
- Copy only needed runtime assets into structured public folders.
- Add iframe/runtime bridge.
- Migrate/save selected representative games first.
- Establish a per-game migration manifest.

### Phase 3 - Auth, profile, coins, and saves

- Align existing Supabase starter routes with 4weird product branding.
- Create profile and account dashboard.
- Add secure save endpoints and RLS migrations.
- Add ledger-backed coin read paths.
- Integrate commerce only through verified server/webhook workflow.

### Phase 4 - Advanced interactive products

- Migrate spaceships as a client-island with cleanup and fallback behavior.
- Migrate VibeCodeWorker public pages and web dashboard shell.
- Define service bridge for VCW jobs; do not copy desktop logic into client code.
- Define MediaMogul web/service boundary if product scope includes it.

### Phase 5 - Parity, removal, and release

- Run route parity matrix.
- Run security and accessibility checks.
- Run load/performance checks for game and WebGL routes.
- Compare screenshots and critical workflows.
- Ship redirects and monitor 404s.
- Remove only superseded v1 deployment paths after traffic and rollback windows permit it.

## 28. Per-game migration manifest format

Every game must receive one row or file using this shape before migration begins.

```ts
type GameMigrationManifest = {
  slug: string;
  sourcePaths: string[];
  runtime: 'react' | 'legacy-static';
  route: string;
  hasGuide: boolean;
  hasAudio: boolean;
  hasWorker: boolean;
  usesLocalStorage: boolean;
  cloudSaveSupport: 'none' | 'adapter-ready' | 'implemented';
  externalDependencies: string[];
  assetCopyPlan: string[];
  cleanupPlan: string[];
  testPlan: string[];
  status: 'not-started' | 'in-progress' | 'verified';
};
```

## 29. Per-game verification ledger

The following compact ledger is intentionally repetitive: an implementation agent must evaluate every item for every published game rather than assuming that a template migration covers all runtime differences.

### AI-whack-a-mole

- Confirm catalog identity uses slug `aiwhackamole`.
- Confirm title and dangerous-versus-helpful AI premise are preserved.
- Confirm runtime dependencies load from the v2 public asset path.
- Confirm canvas/3D initialization is client-only.
- Confirm game start interaction is keyboard reachable.
- Confirm audio waits for a user gesture.
- Confirm timer and score reset cleanly on replay.
- Confirm no duplicate animation loop survives navigation.
- Confirm dangerous/helpful state has a non-color cue.
- Confirm quote JSON is parsed as data and never rendered as HTML.
- Confirm local progress is namespaced and versioned.
- Confirm save adapter cannot award coins.
- Confirm runtime error is shown to the user.
- Confirm play route has an exit action.
- Confirm a smoke test launches the game.

### AssassinAnimals

- Confirm catalog identity uses slug `assassinanimals`.
- Confirm nine selectable animal agents remain selectable.
- Confirm procedural floor generation starts only in the client runtime.
- Confirm action/stealth controls are documented outside canvas.
- Confirm selection state resets deterministically on new run.
- Confirm generated-floor randomness does not create hydration output.
- Confirm all RAF loops stop on unmount.
- Confirm audio and input listeners are removed on unmount.
- Confirm maker/credits metadata is safely rendered.
- Confirm local save schema has a version.
- Confirm cloud save uses an authenticated slot.
- Confirm unsupported device gets a useful fallback.
- Confirm game detail metadata is correct.
- Confirm route back navigation preserves catalog position.
- Confirm a smoke test reaches playable state.

### Battlesharks 2

- Confirm catalog identity uses slug `battlesharks2`.
- Confirm shark mutation/progression system is retained.
- Confirm deep-sea arcade loop starts only after explicit play.
- Confirm images/audio load from v2-owned assets.
- Confirm upgrades are validated before persistence.
- Confirm legacy global variables do not leak to host page.
- Confirm restart clears runtime timers.
- Confirm mobile controls remain usable.
- Confirm keyboard controls remain usable.
- Confirm reduced motion does not hide critical gameplay.
- Confirm score UI has accessible text.
- Confirm failure state allows retry.
- Confirm save slot is user-owned when cloud enabled.
- Confirm game does not read host auth tokens.
- Confirm a smoke test starts a session.

### Demo Lichdom

- Confirm catalog identity uses slug `demolichdom`.
- Confirm skeleton-army demolition premise remains intact.
- Confirm linked guide route is migrated or intentionally retained.
- Confirm spells, upgrades, enemies, and powerup guide content remains reachable.
- Confirm strategy-action controls are discoverable.
- Confirm render loop cleanup is tested.
- Confirm any procedural building data is deterministic per seed where needed.
- Confirm localStorage keys move through an idempotent migration.
- Confirm guide anchors work after migration.
- Confirm visual feedback has text alternatives.
- Confirm mobile layout does not cover controls.
- Confirm error boundary handles runtime exceptions.
- Confirm canonical metadata excludes legacy `.html` URL.
- Confirm back-to-games control works.
- Confirm a smoke test starts demolition.

### Discover America

- Confirm catalog identity preserves case-safe slug mapping for `DiscoverAmerica`.
- Prefer canonical lowercase v2 slug `discover-america` with a legacy redirect.
- Confirm voyage/data-fragment collection loop remains intact.
- Confirm sorting puzzle remains keyboard operable.
- Confirm guide is migrated or redirected.
- Confirm ports/logbook/storm guide anchors remain reachable.
- Confirm puzzle state serialization excludes executable values.
- Confirm correct/incorrect feedback is not color-only.
- Confirm audio starts after user interaction.
- Confirm onboarding explains the next objective.
- Confirm replay resets journey state.
- Confirm local progress has a version.
- Confirm cloud save slot works if enabled.
- Confirm route metadata reflects Madi AI branding.
- Confirm a smoke test completes one interaction.

### Financial Freedom

- Confirm catalog identity uses slug `financialfreedom`.
- Confirm simulator covers career, tax, debt, investment, real estate, and life-event concepts.
- Confirm all calculations use explicit tested functions.
- Confirm monetary values are integer cents or decimal-safe representation.
- Confirm no financial output is presented as personalized advice.
- Confirm scenario inputs have validation bounds.
- Confirm reset restores default scenario.
- Confirm state can be exported/imported only through validated schemas.
- Confirm charts have table/text alternatives.
- Confirm keyboard controls work for all decisions.
- Confirm save data is user-owned.
- Confirm optimistic UI does not lose changes on network failure.
- Confirm no account balance/coin authority is mixed with simulator money.
- Confirm route metadata has accurate education/simulation wording.
- Confirm a smoke test traverses one life event.

### Fridge Simulator

- Confirm catalog identity uses slug `fridgesimulator`.
- Confirm multi-country management remains available.
- Confirm food purchasing, nutrition, and family survival loops remain intact.
- Confirm guide migration decision is documented.
- Confirm essential status signals include text/icons beyond color.
- Confirm input controls are usable on touch screens.
- Confirm long simulation tick stops when paused or unmounted.
- Confirm random food/event sources use controlled seeds where tests need reproducibility.
- Confirm inventory storage is schema-validated.
- Confirm a corrupt save can be reset.
- Confirm game never stores secrets in local storage.
- Confirm accessible labels explain nutrition metrics.
- Confirm error state protects unsaved local progress where feasible.
- Confirm play shell preserves fullscreen behavior.
- Confirm a smoke test buys food and advances one tick.

### FriendSlop

- Confirm catalog identity uses slug `friendslop`.
- Confirm meme-forward feed/dodge/combo loop remains intact.
- Confirm content moderation/product review of user-facing text is performed.
- Confirm game assets use v2 paths.
- Confirm audio handles browser autoplay policy.
- Confirm timers stop after route change.
- Confirm score/combo feedback is accessible.
- Confirm touch, mouse, and keyboard inputs are tested.
- Confirm local state keys are namespaced.
- Confirm no host-page scroll capture leaks after gameplay.
- Confirm game errors are recoverable.
- Confirm a play-again action is available.
- Confirm metadata has a suitable description.
- Confirm analytics event avoids content payloads.
- Confirm a smoke test reaches a combo.

### GraveGain2D

- Confirm catalog identity uses slug `gravegain2d`.
- Confirm dark-fantasy action RPG core loop remains intact.
- Confirm procedural dungeon generation runs client-side.
- Confirm dialogue system remains reachable.
- Confirm starship-management hub remains reachable.
- Confirm lighting effects have a quality fallback.
- Confirm lore module content is safely rendered.
- Confirm action input does not cause page scroll.
- Confirm pause behavior works on visibility change.
- Confirm save schema supports progression versioning.
- Confirm cloud-save merge/conflict policy is defined.
- Confirm audio nodes are disposed.
- Confirm mobile performance preset exists.
- Confirm route remains usable without WebGL if 2D path supports it.
- Confirm a smoke test enters a dungeon.

### GraveGain3D

- Confirm catalog identity uses slug `gravegain3d`.
- Confirm 3D billboard rendering is client-only.
- Confirm procedural dungeon generation is retained.
- Confirm combat, player, enemy, projectile, weapon-factory, collision, and camera systems are mapped.
- Confirm hub quarters and combat text UI are retained.
- Confirm graphics worker/bridge lifecycle is managed.
- Confirm texture and particle systems dispose resources.
- Confirm quality settings work before game start.
- Confirm input manager releases listeners on unmount.
- Confirm persistence engine is versioned.
- Confirm fallback explains unsupported GPU/WebGL.
- Confirm pause and resume work.
- Confirm no duplicate workers run after replay.
- Confirm a visual regression test scene exists.
- Confirm a smoke test starts a dungeon combat encounter.

### Last Words Zombies

- Confirm catalog identity uses slug `lastwordszombies`.
- Confirm typing-survival premise remains intact.
- Confirm keyboard focus is intentionally placed in the game runtime.
- Confirm typing does not trigger browser shortcuts unexpectedly.
- Confirm accessible instructions explain typing objective.
- Confirm word/enemy generation is deterministic in test mode.
- Confirm score and streak have screen-reader output at sensible intervals.
- Confirm game input handles IME/keyboard layouts appropriately or documents supported layouts.
- Confirm game over allows restart without page refresh.
- Confirm audio initialization is user-gesture gated.
- Confirm local leaderboard is not trusted as server authority.
- Confirm saved preferences use namespaced storage.
- Confirm route navigation stops all timers.
- Confirm page title metadata is correct.
- Confirm a smoke test accepts typed input.

### Orbital Drift

- Confirm catalog identity uses slug `orbitaldrift`.
- Confirm hold-to-expand and release-to-gravitate controls remain intact.
- Confirm debris avoidance remains intact.
- Confirm stardust collection remains intact.
- Confirm press-and-hold works with mouse, touch, and keyboard.
- Confirm pointer cancellation does not leave control stuck.
- Confirm animation loop is paused when hidden.
- Confirm 3D/space visuals are progressively enhanced.
- Confirm unsupported WebGL gets fallback copy.
- Confirm score state resets deterministically.
- Confirm saved settings are namespaced.
- Confirm no body scroll lock leaks after exit.
- Confirm game metadata is accurate.
- Confirm analytics emits only lifecycle data.
- Confirm a smoke test completes one orbit change.

### Overtake

- Confirm catalog identity uses slug `overtake`.
- Confirm pseudo-3D racing loop remains intact.
- Confirm garage progression remains intact.
- Confirm routes unlock under the original rules.
- Confirm nitro boost remains controllable.
- Confirm TypeScript source under legacy `src/main.ts` is considered source of truth where applicable.
- Confirm compiled artifacts are not copied over source indiscriminately.
- Confirm controller mapping works for keyboard and touch as supported.
- Confirm run state pauses on lost focus.
- Confirm checkpoint/progression save version is documented.
- Confirm benchmark behavior from legacy tests is retained where meaningful.
- Confirm no duplicate audio engine survives restart.
- Confirm high-speed visual effects have performance setting.
- Confirm game detail page describes unlock/progression accurately.
- Confirm a smoke test drives and uses nitro.

### Semester Survival

- Confirm catalog identity uses slug `semester-survival`.
- Confirm eight-semester structure remains intact.
- Confirm lecture/exam/portal/wallet events remain intact.
- Confirm state, controls, renderer, sound, and UI modules are mapped separately.
- Confirm state transitions have unit tests.
- Confirm event randomness supports deterministic tests.
- Confirm time progression pauses on hidden tab.
- Confirm UI is readable at mobile width.
- Confirm controls are keyboard accessible.
- Confirm game outcome is clear in text.
- Confirm save schema carries semester version.
- Confirm reset works without reload.
- Confirm audio is optional and gesture enabled.
- Confirm route metadata is accurate.
- Confirm a smoke test advances an event.

### Server Saver Shield

- Confirm catalog identity uses slug `serversavershield`.
- Confirm data-center defense loop remains intact.
- Confirm malware, DDoS, and virus enemy concepts remain intact.
- Confirm shield deployment remains intact.
- Confirm business, staff, server, wave, review, and powerup systems are mapped.
- Confirm worker renderer/game worker lifecycle is bounded.
- Confirm autosave behavior is audited and migrated.
- Confirm debug modules are not exposed in production by default.
- Confirm tutorial remains discoverable.
- Confirm guide migration is documented.
- Confirm canvas has accompanying textual game instructions.
- Confirm touch and keyboard controls work.
- Confirm saves are schema validated.
- Confirm no worker continues after route unmount.
- Confirm a smoke test survives one wave.

### Sound Painter

- Confirm catalog identity uses slug `soundpainter`.
- Confirm tile-click music/color painting remains intact.
- Confirm all tile controls have keyboard equivalent.
- Confirm AudioContext begins only after a user gesture.
- Confirm notes do not continue after route change.
- Confirm visual tiles have non-color state indicator.
- Confirm composition state schema is versioned.
- Confirm share/export behavior is safe and size-limited.
- Confirm local storage migration is idempotent.
- Confirm screen-reader instructions describe composition controls.
- Confirm reduced motion retains musical functionality.
- Confirm audio mute/volume is accessible.
- Confirm reset/clear asks appropriately if work will be lost.
- Confirm metadata describes creative music experience.
- Confirm a smoke test plays a tile.

### Sound Painter 2

- Confirm catalog identity uses slug `soundpainter2`.
- Confirm step sequencer remains intact.
- Confirm multi-instrument note drawing remains intact.
- Confirm synthesis parameter controls remain intact.
- Confirm digital audio effects remain intact.
- Confirm URL-sharing state is validated and size bounded.
- Confirm no unsafe arbitrary JSON is executed from URL state.
- Confirm keyboard sequence editing works.
- Confirm visual sequencer cells expose semantic labels.
- Confirm AudioContext/schedulers stop on navigation.
- Confirm effects graph disposes all nodes.
- Confirm composition save schema supports migrations.
- Confirm shared links preserve authored composition when valid.
- Confirm mobile layout has usable controls or intentional limited mode.
- Confirm a smoke test creates and replays a pattern.

### Exit Waterfall Machine

- Confirm canonical v2 slug is `venturemechanically` unless product owners rename it deliberately.
- Confirm public title remains “Exit Waterfall Machine.”
- Confirm cap-table simulator behavior remains intact.
- Confirm educational scenario explains startup acquisition outcome without personal financial advice.
- Confirm calculations are pure tested functions.
- Confirm ownership, liquidation, and payout assumptions are visible.
- Confirm input validation prevents nonsensical values.
- Confirm charts have tabular alternatives.
- Confirm reset restores initial model.
- Confirm share/export does not expose private data.
- Confirm scenario state is safely serializable.
- Confirm local save has versioned schema.
- Confirm keyboard navigation works through controls.
- Confirm metadata uses public title rather than folder name.
- Confirm a smoke test changes an ownership scenario.

## 30. Catalog/game implementation acceptance rules

- Each game has exactly one catalog entry.
- Each public game has exactly one canonical route.
- Every canonical game route has metadata.
- Every game has a declared runtime strategy.
- Every game has an asset plan.
- Every game has a cleanup plan.
- Every game has a test plan.
- Every game using storage has a schema version.
- Every game using audio has autoplay-safe initialization.
- Every game using a worker terminates it on unmount.
- Every game using WebGL has a fallback state.
- Every game with a guide has a working guide route or redirect.
- Every game’s legacy URL redirects or remains intentionally supported.
- No game receives auth credentials through the DOM, URL, or iframe message payload.
- No game can mint coins, modify other users’ saves, or invoke arbitrary server commands.

## 31. Legacy-source preservation map

- Preserve `website/v1/index.html` as reference until home parity is verified.
- Preserve `website/v1/styles.css` as visual reference, not a direct import target.
- Preserve `website/v1/script.js` as behavior reference for background, typewriter, reveal, navigation, contact, parallax, sticky nav, and random game.
- Preserve `website/v1/components.js` as reference for shared navigation/footer, analytics, and game keyboard guard behavior.
- Preserve `website/v1/accessibility.js` as accessibility-control reference.
- Preserve `website/v1/guide-layout.js` and `guide-style.css` as guide pattern reference.
- Preserve `website/v1/games/html/game-meta.js` as safe metadata rendering reference.
- Preserve `website/v1/auth/auth-server.js` as API surface reference.
- Preserve `website/v1/auth/config.example.js` as non-secret configuration-shape reference.
- Preserve `website/v1/sw.js` only after cache policy audit.
- Preserve `website/v1/manifest.json` as PWA metadata reference.
- Preserve `website/v1/sitemap.xml` and `robots.txt` as route/indexing reference.
- Preserve `website/v1/vercel.json` and `netlify.toml` as deployment/redirect reference.
- Preserve `website/v1/spaceships/README.md` as simulation technical reference.
- Preserve VibeCodeWorker docs as product/operational reference.
- Preserve VibeCodeWorker tests as behavior reference even where implementation changes.
- Preserve MediaMogul README and legal boundary as product reference.
- Do not preserve bundled executables as source.
- Do not preserve DLLs, PAKs, or cached packages as v2 source.
- Do not preserve transient test artifacts as v2 product assets.

## 32. Generated and excluded artifact rules

- Exclude `dist-current/win-unpacked` from v2 application source.
- Exclude all Electron builder output from v2 application source.
- Exclude Tauri `target` outputs from v2 application source.
- Exclude `node_modules` from v2 application source.
- Exclude lockfile duplication except the destination application lockfile.
- Exclude compiled/minified bundles when original source exists.
- Exclude test screenshots/videos unless they become curated visual-regression fixtures.
- Exclude local databases and journal files.
- Exclude `.env` files and credentials.
- Exclude vendor caches.
- Exclude platform-specific installer output.
- Exclude downloaded model files and runtime caches.
- Exclude source maps from public production deployment unless intentionally enabled.
- Exclude old backups such as `game-backup.js` unless verified as unique source.
- Exclude redundant duplicate HTML variants only after route parity confirms no unique behavior.

## 33. Environment-variable contract

- Keep `NEXT_PUBLIC_SUPABASE_URL` as public configuration.
- Keep `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as public configuration.
- Keep Supabase service-role credentials server-only.
- Define `NEXT_PUBLIC_SITE_URL` or equivalent canonical origin.
- Define analytics identifier only if analytics is enabled.
- Define Shopify configuration server-side where possible.
- Define VCW service base URL server-side unless a public read-only URL is needed.
- Define webhook secrets server-only.
- Define object storage credentials server-only.
- Never commit values into the specification or code.
- Document required variables in `.env.example`.
- Fail safely with a clear configuration error in development.
- Do not show raw secret/configuration errors to end users.

## 34. Data migration checklist

- Identify existing Supabase schema and migrations in repository root `supabase/`.
- Review current auth-app data contracts before replacing endpoints.
- Map legacy profile fields to `profiles`.
- Map legacy balance/history payloads to coin ledger responses.
- Map legacy saves payloads to game_saves records.
- Determine whether production legacy data exists before changing schema.
- Write reversible migrations when feasible.
- Backfill data with dry-run capability.
- Validate row counts before and after migration.
- Preserve historical purchase external references.
- Do not backfill corrupt/untrusted game JSON without schema validation.
- Create backups according to deployment policy before production migration.
- Test RLS with multiple users and anonymous visitor.
- Verify deleted-account handling for related rows.
- Document retention policy for logs, saves, purchases, and VCW artifacts.

## 35. Deployment architecture

- Deploy `v2/vcw4w` as the web application.
- Deploy Supabase database/auth separately through existing project configuration.
- Deploy VCW desktop/native agents separately from the web application.
- Deploy VCW remote API/worker separately when needed.
- Deploy MediaMogul workers separately when needed.
- Use a reverse proxy only for deliberate same-origin API integration.
- Do not use static-host rewrites as a substitute for authentication design.
- Configure redirects at framework/edge level and test them.
- Configure CSP, security headers, and cache headers intentionally.
- Cache immutable game assets with content-hashed/versioned paths when possible.
- Avoid caching dynamic authenticated pages publicly.
- Use preview deployments for route and visual verification.
- Maintain rollback plan for canonical URL switch.

## 36. AI execution protocol

- Read this document before modifying destination files.
- Inspect the exact legacy source path named for a feature before porting it.
- Never assume identical files are authoritative; compare duplicates.
- Work in small verified slices.
- Make only destination v2 changes unless an explicit compatibility redirect/change is required.
- Do not delete v1 source during migration.
- Do not copy generated artifacts.
- Type every external and persisted data boundary.
- Put browser-only logic behind client components/dynamic imports.
- Put privileged behavior in server code or external workers.
- Add tests with every behavioral migration.
- Run lint, typecheck, build, and relevant test suites after each phase.
- Update this specification’s migration status notes only with evidence.
- Treat a visual match without functional verification as incomplete.
- Treat a functional match without security/accessibility verification as incomplete.

## 37. Completion gate

- [ ] v2 home no longer presents Supabase starter branding.
- [ ] Shared 4weird shell replaces static HTML injection.
- [ ] All public v1 routes have canonical v2 route or intentional redirect.
- [ ] Catalog is typed and validated.
- [ ] Published games are discoverable through v2 catalog.
- [ ] Every game route has a migration manifest.
- [ ] Representative legacy games launch through v2.
- [ ] Game-save system is authenticated, validated, and RLS-protected.
- [ ] Account/profile flows work using v2 Supabase SSR auth.
- [ ] Coin logic is ledger-backed and server-authoritative.
- [ ] Spaceships route has lifecycle cleanup and fallback behavior.
- [ ] VCW web routes have explicit service contract.
- [ ] Desktop and MediaMogul native products are not bundled into Next.js.
- [ ] Privacy, accessibility, robots, sitemap, manifest, and not-found routes are migrated.
- [ ] Accessibility and reduced-motion checks pass.
- [ ] Security review passes for auth, saves, commerce, iframe, and VCW boundaries.
- [ ] Lint, typecheck, build, unit, integration, and end-to-end checks pass.
- [ ] Redirect and 404 monitoring is in place for production cutover.

## 38. Line-item implementation ledger

The following atomic lines are deliberately included as an execution checklist for an AI refactorer. Mark an item only after evidence exists in code and tests.

- [ ] L001 Create v2 route constants for canonical site navigation.
- [ ] L002 Replace starter layout metadata with 4weird defaults.
- [ ] L003 Add a canonical site-origin helper.
- [ ] L004 Add a shared `SiteHeader` server/client composition.
- [ ] L005 Add a shared `SiteFooter` component.
- [ ] L006 Add a keyboard-operable mobile navigation menu.
- [ ] L007 Add Escape handling to mobile navigation.
- [ ] L008 Add outside-navigation behavior without breaking keyboard focus.
- [ ] L009 Add skip-to-content link.
- [ ] L010 Add semantic main landmark to every layout.
- [ ] L011 Add design-token color variables.
- [ ] L012 Add design-token typography variables.
- [ ] L013 Add design-token spacing variables.
- [ ] L014 Add design-token focus-ring variables.
- [ ] L015 Add design-token z-index policy.
- [ ] L016 Remove starter tutorial content from home.
- [ ] L017 Remove starter deploy button from home.
- [ ] L018 Remove starter Supabase copy from public home.
- [ ] L019 Preserve Supabase auth plumbing beneath product UI.
- [ ] L020 Add home page server metadata.
- [ ] L021 Add client-only starfield component.
- [ ] L022 Add starfield canvas fallback.
- [ ] L023 Add reduced-motion starfield behavior.
- [ ] L024 Add typewriter reduced-motion behavior.
- [ ] L025 Add reusable reveal behavior.
- [ ] L026 Avoid hidden content before reveal JavaScript.
- [ ] L027 Add sticky-header scroll behavior.
- [ ] L028 Throttle scroll work.
- [ ] L029 Add random-game action from catalog.
- [ ] L030 Add random-game no-result safeguard.
- [ ] L031 Create `content/games.ts`.
- [ ] L032 Define game entry TypeScript type.
- [ ] L033 Define game status union.
- [ ] L034 Define runtime-strategy union.
- [ ] L035 Validate catalog at build time.
- [ ] L036 Enforce catalog slug uniqueness.
- [ ] L037 Enforce nonempty catalog titles.
- [ ] L038 Enforce nonempty catalog descriptions.
- [ ] L039 Validate optional external URLs.
- [ ] L040 Validate game thumbnail paths.
- [ ] L041 Add `publishedGames()` selector.
- [ ] L042 Add `featuredGames()` selector.
- [ ] L043 Add weighted random-game selector.
- [ ] L044 Exclude templates by default.
- [ ] L045 Add game-list route metadata.
- [ ] L046 Build responsive game-card component.
- [ ] L047 Build game-tag component.
- [ ] L048 Build featured-game component.
- [ ] L049 Build empty-catalog state.
- [ ] L050 Build game-detail route.
- [ ] L051 Return notFound for unknown slugs.
- [ ] L052 Generate game metadata server-side.
- [ ] L053 Add game canonical URL.
- [ ] L054 Add game Open Graph image rule.
- [ ] L055 Add maker profile component.
- [ ] L056 Add credits grid component.
- [ ] L057 Render credits as plain JSX text.
- [ ] L058 Reject unsafe credits URLs.
- [ ] L059 Add guide availability indicator.
- [ ] L060 Add play-game call to action.
- [ ] L061 Build game-play route.
- [ ] L062 Build game runtime loading state.
- [ ] L063 Build game runtime error state.
- [ ] L064 Build game runtime exit control.
- [ ] L065 Add fullscreen interaction control.
- [ ] L066 Add fullscreen unsupported state.
- [ ] L067 Add versioned iframe message envelope.
- [ ] L068 Validate runtime ready messages.
- [ ] L069 Validate runtime score messages.
- [ ] L070 Validate runtime save messages.
- [ ] L071 Validate runtime error messages.
- [ ] L072 Reject unknown runtime messages.
- [ ] L073 Validate iframe origin.
- [ ] L074 Define minimal iframe sandbox policy.
- [ ] L075 Document per-game sandbox exceptions.
- [ ] L076 Restrict host-to-game commands.
- [ ] L077 Add runtime pause command.
- [ ] L078 Add runtime resume command.
- [ ] L079 Add runtime cleanup on unmount.
- [ ] L080 Prevent global Space-scroll interception.
- [ ] L081 Add active-game-only Space prevention.
- [ ] L082 Test ordinary-page Space scrolling.
- [ ] L083 Test active-game Space behavior.
- [ ] L084 Add game save Zod schema.
- [ ] L085 Add game slot validation schema.
- [ ] L086 Add game save route GET.
- [ ] L087 Add game save route PUT.
- [ ] L088 Authenticate save GET.
- [ ] L089 Authenticate save PUT.
- [ ] L090 Authorize save ownership.
- [ ] L091 Add game_saves RLS policy.
- [ ] L092 Add unique user/game/slot key.
- [ ] L093 Add save payload size limit.
- [ ] L094 Add save schema-version field.
- [ ] L095 Add corrupt-save recovery UX.
- [ ] L096 Add local-save migration adapter.
- [ ] L097 Namespace v2 local keys.
- [ ] L098 Make local migration idempotent.
- [ ] L099 Add save failure UX.
- [ ] L100 Add save integration test.
- [ ] L101 Add account route.
- [ ] L102 Brand existing login route.
- [ ] L103 Brand existing sign-up route.
- [ ] L104 Brand password-reset route.
- [ ] L105 Brand update-password route.
- [ ] L106 Brand auth-error route.
- [ ] L107 Brand sign-up-success route.
- [ ] L108 Add authenticated account guard.
- [ ] L109 Add profile display component.
- [ ] L110 Add display-name form.
- [ ] L111 Share profile validation schema.
- [ ] L112 Add profile update server action.
- [ ] L113 Add profiles RLS policy.
- [ ] L114 Handle profile update error.
- [ ] L115 Handle profile update success.
- [ ] L116 Add coin balance server read.
- [ ] L117 Add coin history server read.
- [ ] L118 Clamp history limit server-side.
- [ ] L119 Add coin-ledger migration.
- [ ] L120 Add balance derivation policy.
- [ ] L121 Add claim endpoint authorization.
- [ ] L122 Add claim idempotency.
- [ ] L123 Add purchase reference uniqueness.
- [ ] L124 Add checkout creation endpoint.
- [ ] L125 Validate checkout pack server-side.
- [ ] L126 Validate checkout variant server-side.
- [ ] L127 Add payment webhook endpoint.
- [ ] L128 Verify webhook signature.
- [ ] L129 Add webhook replay protection.
- [ ] L130 Keep purchase fulfillment server-only.
- [ ] L131 Add privacy page.
- [ ] L132 Compare both legacy privacy documents.
- [ ] L133 Choose canonical privacy copy.
- [ ] L134 Add privacy redirect from alternate legacy URL.
- [ ] L135 Add accessibility page.
- [ ] L136 Port useful accessibility controls.
- [ ] L137 Persist accessibility preference safely.
- [ ] L138 Add reduced-motion preference handling.
- [ ] L139 Add high-contrast option only if supported thoroughly.
- [ ] L140 Add font-size preference only if layout tolerates it.
- [ ] L141 Add academy page.
- [ ] L142 Add technology page.
- [ ] L143 Add pricing page.
- [ ] L144 Audit pricing claims before publish.
- [ ] L145 Add web-apps page.
- [ ] L146 Add v2 not-found page.
- [ ] L147 Add legacy 404 redirect behavior decision.
- [ ] L148 Add sitemap generator.
- [ ] L149 Add robots generator.
- [ ] L150 Add web app manifest.
- [ ] L151 Add favicon/brand icon policy.
- [ ] L152 Remove starter OG images.
- [ ] L153 Add 4weird OG image.
- [ ] L154 Add game OG image fallback.
- [ ] L155 Add analytics interface.
- [ ] L156 Add no-op analytics adapter.
- [ ] L157 Add consent policy decision.
- [ ] L158 Track page views centrally.
- [ ] L159 Track game-card clicks.
- [ ] L160 Track game start.
- [ ] L161 Track game runtime error.
- [ ] L162 Track game completion safely.
- [ ] L163 Exclude credentials from analytics.
- [ ] L164 Exclude save payloads from analytics.
- [ ] L165 Exclude VCW prompts from analytics by default.
- [ ] L166 Add spaceships route.
- [ ] L167 Dynamically import spaceship runtime.
- [ ] L168 Add spaceship loading state.
- [ ] L169 Add spaceship error state.
- [ ] L170 Add non-WebGL fallback.
- [ ] L171 Add spaceship quality settings.
- [ ] L172 Add spaceship fullscreen control.
- [ ] L173 Dispose spaceship RAF loops.
- [ ] L174 Dispose spaceship textures.
- [ ] L175 Dispose spaceship materials.
- [ ] L176 Dispose spaceship geometries.
- [ ] L177 Dispose spaceship event listeners.
- [ ] L178 Terminate spaceship physics worker.
- [ ] L179 Terminate spaceship boids worker.
- [ ] L180 Add spaceship visual test fixture.
- [ ] L181 Add VCW landing route.
- [ ] L182 Add VCW overview route.
- [ ] L183 Add VCW hub route.
- [ ] L184 Add VCW run route.
- [ ] L185 Add VCW full route.
- [ ] L186 Add VCW phone route.
- [ ] L187 Add VCW docs route.
- [ ] L188 Add VCW shared navigation.
- [ ] L189 Add VCW status component.
- [ ] L190 Add VCW job-state union.
- [ ] L191 Add VCW job schema.
- [ ] L192 Add VCW event schema.
- [ ] L193 Add VCW command schema.
- [ ] L194 Add VCW API namespace.
- [ ] L195 Add VCW authentication check.
- [ ] L196 Add VCW authorization check.
- [ ] L197 Add VCW rate limit.
- [ ] L198 Add VCW project ownership model.
- [ ] L199 Add VCW job ownership model.
- [ ] L200 Add VCW artifact ownership model.
- [ ] L201 Add VCW queued status.
- [ ] L202 Add VCW starting status.
- [ ] L203 Add VCW running status.
- [ ] L204 Add VCW waiting-for-input status.
- [ ] L205 Add VCW succeeded status.
- [ ] L206 Add VCW failed status.
- [ ] L207 Add VCW cancelled status.
- [ ] L208 Add VCW cancellation endpoint.
- [ ] L209 Add VCW cancellation idempotency.
- [ ] L210 Add VCW log cursor pagination.
- [ ] L211 Redact VCW secrets in logs.
- [ ] L212 Redact VCW secrets in screenshots.
- [ ] L213 Add VCW reconnect behavior.
- [ ] L214 Add VCW disconnected state.
- [ ] L215 Add VCW remote-service unavailable state.
- [ ] L216 Add VCW API error mapping.
- [ ] L217 Keep Electron imports out of web bundle.
- [ ] L218 Keep Tauri imports out of web bundle.
- [ ] L219 Keep Node filesystem imports out of client bundle.
- [ ] L220 Keep child-process imports out of route handlers.
- [ ] L221 Document VCW desktop package boundary.
- [ ] L222 Document MediaMogul package boundary.
- [ ] L223 Keep native installers outside public assets.
- [ ] L224 Keep packaged binaries outside public assets.
- [ ] L225 Audit service worker relevance.
- [ ] L226 Remove old service worker if not retained.
- [ ] L227 Add v2 cache strategy if retained.
- [ ] L228 Do not cache authenticated API responses publicly.
- [ ] L229 Version game cache assets.
- [ ] L230 Add cache invalidation test.
- [ ] L231 Add legacy redirect table.
- [ ] L232 Redirect root index.html.
- [ ] L233 Redirect games index.html.
- [ ] L234 Redirect account.html.
- [ ] L235 Redirect tech.html.
- [ ] L236 Redirect spaceships.html.
- [ ] L237 Redirect web-apps.html.
- [ ] L238 Redirect pricing index.html.
- [ ] L239 Redirect academy index.html.
- [ ] L240 Redirect privacy.html.
- [ ] L241 Redirect privacy-policy.html.
- [ ] L242 Redirect accessibility-info.html.
- [ ] L243 Redirect VCW index.html.
- [ ] L244 Redirect VCW overview.html.
- [ ] L245 Redirect VCW hub.html.
- [ ] L246 Redirect VCW run.html.
- [ ] L247 Redirect VCW full.html.
- [ ] L248 Redirect VCW phone.html.
- [ ] L249 Redirect VCW docs index.html.
- [ ] L250 Redirect individual game index.html paths.

## 39. Final engineering judgement

This is a high-complexity platform migration, not a file-format conversion. Start with route and shared-shell parity, establish a typed catalog, preserve browser games through isolated runtimes, make auth/saves/coins server-authoritative, then integrate the spaceships and VibeCodeWorker product families through explicit client/service boundaries. The enormous legacy `ai/` tree must be triaged into source, service, desktop product, documentation, and generated artifacts before any copy operation. The destination Next.js project should become the clean web platform-not a container for every legacy binary and runtime.

## 40. Binding decision; retain original HTML games

This section supersedes any ambiguous wording elsewhere in this specification. The games are **not** a React-conversion backlog. They remain HTML-first applications in substantially their existing form.

- Copy each published game’s `index.html`, `game.css`, `game.js`, `game.json`, and game-specific supporting files as a coherent bundle.
- Preserve ordinary relative asset URLs inside each game whenever possible.
- Preserve a game’s own document, CSS cascade, global variables, canvas, WebGL, audio, workers, and initialization model.
- Do not translate game DOM into JSX merely because the catalog shell is Next.js.
- Do not place game source under `app/` or import a game runtime into a React component.
- Place retained bundles at `public/games/<slug>/` or an equivalently isolated static-runtime location.
- Next.js owns discovery, metadata, account UI, authorization, saves API, site navigation, redirects, and the surrounding play shell.
- The game bundle owns its in-game markup, style, controls, loop, state, and rendering.
- A `/games/<slug>` detail page may use React and link to the game.
- A `/games/<slug>/play` shell may embed the original game document in an iframe.
- A direct `/games/<slug>/runtime/index.html` static route may remain available for debugging and compatibility.
- Preserve original game URLs via permanent redirects where the hosting strategy permits them.
- Apply only surgical game changes: path corrections, safe `postMessage` bridge, save adapter, accessibility patches, and bug fixes proven necessary by the new hosting context.
- Do not reformat, reorganize, or modernize game code opportunistically during the platform refactor.
- Treat every game folder as a deployable compatibility unit; move all required sibling assets together.
- Keep `game.json` beside its corresponding legacy runtime when existing code fetches it relatively.
- Keep `guide.html` beside a game when its original links expect it; optionally add a Next.js wrapper/redirect later.
- Preserve worker file locations relative to the game that instantiates them.
- Preserve audio/media asset locations relative to each game.
- Use an iframe boundary so original global CSS and script assumptions cannot contaminate Next.js.
- The iframe bridge is additive and must be absent-safe: games that do not implement it still run.
- Do not add sandbox restrictions that block a verified original runtime without documenting the exception.
- Test every copied game by opening its raw static `index.html` before testing it through the React shell.
- A game is considered migrated when its original HTML runtime works under v2 hosting, not when its code has been rewritten.
- Prefer byte-for-byte copying of game source files first, followed by the smallest necessary hosting patch.
- Keep a per-game diff that explains every intentional departure from v1 source.
- Never allow static HTML games to receive secrets, Supabase tokens, service credentials, or unrestricted API authority.

## 41. HTML-game acceptance supplement

- [ ] Every published game has an intact HTML entry document.
- [ ] Every game’s local CSS remains game-scoped and operational.
- [ ] Every game’s local JavaScript remains its primary runtime.
- [ ] Every relative game asset resolves under v2 static hosting.
- [ ] Every game worker resolves at its original relative URL.
- [ ] Every guide page continues to open where it existed.
- [ ] Every game starts without requiring React hydration.
- [ ] Every game can be debugged directly at its retained HTML entry URL.
- [ ] Every React game detail page links to the retained runtime rather than duplicating it.
- [ ] Every gameplay code change is documented as a compatibility patch.
