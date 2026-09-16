# DevSwarm Queue — live bus (v2/vcw4w)

OPEN items only. History lives in `QUEUE.archive-2026-09-15.md` (read-only,
570-line log through 2026-09-15 — never edit, never re-file from it).
World-readable: no secrets/keys/tokens/emails.

Truth order for any agent: `STATUS.json` counts → `TASKS/DS-*.json` envelopes →
`MEMORY.md` newest 5 → this file (pointers only, never the record).
A QUEUE line is one line: `DS-XXXX → owner/integrator: WHAT + scope paths +
gate state + date`. Evidence lives in the envelope `log`, not here.

## OPEN — steward rulings (global, newest first)

- Migration version collisions (2026-09-15): `20261219000000` x3, `0001` x3,
  `0002/0004/0005/0006/0007/0008` x2–3 — steward renames later files globally,
  then re-runs `verify-migration-versions` (SECWARN-02/04/06/08, SQLINT-09,
  SECLINT-10, RLS-LEAD → steward).
- pgcrypto KEEP-vs-MOVE (2026-09-15): SECWARN-02 + SQLINT-02 say KEEP in public
  (42883 blast radius), DS-SECLINT-02 MOVES to extensions — reconcile before any
  `db push` (→ steward).
- RPC grant conflicts (2026-09-15): `update_bot_key_policy`,
  `get_my_crown_converts`, `get_my_eligible_crown_lots`, `my_vcw_usage`,
  `charge_mmo_minutes` keep-vs-revoke across SECWARN-08 / SQLINT-07/08
  (→ steward/economy).
- FIXFB prod 503 (2026-09-15): human 3-point project-match check pending
  (URL ref vs dashboard project vs key origin); route degrades landed,
  migrations must be applied in prod (fixfb-lead → deploy).
- GG2DB convergence (2026-09-15): one `verify-gravegain2dB` chain slot from 4
  variants; `campaign/` vs `missions/` canonical; atlas single owner
  (gg2db-lead → steward).
- VOCSEED unblock (2026-09-14): 09/10 flip on `?seed=` hint-line ruling; R-wave
  vs VOCSEED bank/UI names converge to one canonical family, no silent deletes
  (vocseed-lead → steward).
- Pagefix-02 R2/R3 (2026-09-15): `verify-catalog-runtime` closed-catalog check
  must accept the cacheComponents pattern (`generateStaticParams` + `notFound`,
  no `dynamicParams` — fails build per Next v16 docs); bundles
  `divergedPrefixes` += soundpainter/soundpainter2/venturemechanically +
  template-demo (→ steward, scripts untouched by lanes).
- Ops note (standing): leaked-password protection is a Supabase dashboard Auth
  toggle — no SQL exists for it, never mint a migration for it.

## OPEN — wiring asks by lane (integrator single-writer, shared manifests)

- web/pro: mount `<VocrehabSeedControls>` + `<VocrehabSeedBar>` in play hosts,
  replay via `replayUrl`/CSV; wire `/docs/vocrehab/seeds` +
  `verify:vocrehab-seeds` slot (R-lead + VOCSEED-lead → integrator).
- vocrehab 08 Wave-4: site-nav + sitemap + DOCS_DATA + `verify:vocrehab` chain
  still single-writer (D7 pack stands; nothing applied yet).
- games: `/games` catalog density pass; neon slug canon (hyphenated vs dir);
  audio/template-demo diverged waivers (→ games lane, see R2/R3 above).
- docs: `DOCS_DATA` rows for seeds guide + mmorpg leftovers; bare
  `/docs/desktop` + `/docs/games` index ruling (→ site-nav).
- mmo/chat/economy proposals (no migration landed, owner ruling needed):
  `do_usage` SELECT own, `org_invites` inviter SELECT,
  `chat_participants` UPDATE/DELETE own (ss2adopt-lead → lane owners).
- music (parked): 4W-1 vs `$music:1` deploy convergence + submissions
  persistence migration (MUSF-LEAD → steward).
- DS-SQLINT-05-CHEAP20 (2026-09-15): 20-agent CHEAP read-only verification closed blocked-honest — content green (12/12 REVOKE in successor 20261220000014, per-caller tiers exact, signatures exact, REVOKE-only, caller matrix confirmed) with zero writes; gates split (verify-migration-versions exit 0, verify-devswarm exit 1 extrinsic: sibling DS-UXPASS2-01.json missing `updated` + STATUS drift on hot board) → steward (envelope repair + recount).
- DS-SECLINT3-CHEAP20 (2026-09-16): 20-agent CHEAP wave on Supabase lints CSV (200 rows) CLOSED 20/20 done — 20 NEW migrations 20261225000001..20 (infra/anon_reads/anon_sensitive/auth_a..q), lead audit: all 180 unique functions touched, zero GRANT TO public, 13 anon-kept w/ caller evidence vs 171 authenticated-only; lead neutralized worker-01's pgcrypto MOVE to KEEP pre-push (42883 blast radius, matches 3 landed rulings) + removed own colliding file-10 draft for worker-10's landed auth_g. Gates split: verify-migration-versions exit 0 (207 files) / verify-devswarm exit 1 extrinsic (STATUS open-count drift 1-vs-2 on hot board, not wave-caused) → steward (STATUS recount).

 - SJ-LEAD (2026-09-16): 20-agent wave DS-SJ-01..20 OPEN/unowned — monthly calendar + 24h day + presets/travel/difficulty/persist for schedule-juggle; file-disjoint NEW-file scopes, 20 integrator-owned wiring (page/frame/pools/games.ts/.env.example); worker tag == envelope id 1:1, claim-before-write, loser stands down zero-writes. (sj-lead → steward/integrator).

 - SJ-LEAD CLOSE (2026-09-16): 20-agent wave DS-SJ-01..20 closed 20/20 done — monthly calendar + 24h day + WA/NH/AK presets + travel API/fallback + Easy/Med/Hard + persist + seed bridge + tests/docs/verify/a11y + integrator wiring; lead gates: verify-vocrehab-schedule 3/3 PASS, tsc exit 0, tests 22/22 via tsc-emit (bare node --test needs strip-types+.js-import workaround, runner quirk not code), eslint clean all scopes; shared-manifest wiring (layout metadata, .env.example key line, package.json verify slot, docs nav/sitemap) queued for steward. (sj-lead → steward)

## Protocol (standing — not per-wave)

- Claim-before-write; live owner wins races, loser stands down zero-writes.
- One envelope per lane; file-disjoint scopes; NEW files only, shared manifests
  are integrator-owned (file wiring here, never edit them).
- `STATUS.json` is steward-owned: request recounts, never hand-edit.
- `TASKS/*.json` must be BOM-less UTF-8 (PowerShell `Set-Content` writes a BOM
  that breaks the verifier — use `[IO.File]::WriteAllText` UTF8-no-BOM).
- Worker tags unique per session (`MEMORY.md` r4 lesson); scan-then-claim in
  ONE pass on a hot board.
- Blocked-honest with evidence beats done-on-red, always.
- Boot: classic via `SwarmStart.md`, file-native via `ss3.md`
  (`ss2.md` legacy, still valid). Modes canonical:
  `v2/vcw4w/lib/swarm-ss2/modes.mjs`.
- uxp2-lead (2026-09-15): CHEAP 20-agent fan-out on uxpass-improvements-by-antigravity-2.md (DS-UXP2-01..20, open/unowned, page.tsx-only layout scopes, worker tag == envelope id 1:1) � live DS-UXPASS-15/18 owners unaffected (disjoint pass-2 prefix); sibling crews may claim any open envelope, loser stands down zero-writes.
- uxp2c-lead (2026-09-16): ADOPT DS-UXP2-01..20 (uxp2-lead open batches, full 70-page plan) for 20-agent CHEAP collab wave on uxpass-improvements-by-antigravity-2.md � worker tag == envelope id 1:1, 01..07 overlap live DS-UXPASS2 owners so agents stand down zero-writes on loss, 08..20 open ground builders work scope-only layout compactness; no new envelopes minted.
- uxp2c-lead (2026-09-16): 20-parallel fan-out interrupted at dispatch; board re-read: DS-UXP2-01..17 live-owned (uxp2-*/cheap20-lead), 18/19/20 open. Revised collab: 3 builders claim 18/19/20 + 17 read-only checkers (gates snapshot + spec??) zero-writes on live envelopes. Batches of 5 to avoid dispatch overload.

- uxpass2-lead: 20-agent CHEAP wave DS-UXPASS2-01..20 closed 20/20 done (pages 1-20, Phase 1 + workspaces + AI orchestration); eslint 20-file clean, tsc exit 0, envelopes 20/20 parse BOM-less; verify-devswarm red ONLY on extrinsic sibling DS-SECLINT3-09.json BOM (untouched, needs owner/steward repair); component-owned follow-ups (game-catalog, fal-studio, vault/stock widgets, desktop pods density) filed as envelope-log handoffs. (uxpass2-lead -> steward)
- DS-UXP2-20 → steward: pp63-70 layout pass green (eslint 7 paths clean, tsc zero errors, envelope parses BOM-less; verify-devswarm red extrinsic: STATUS open 1 vs TASKS 2, steward recount needed before done). HUB AUDIT (read-only, zero files): app/vibecodeworker/hub does NOT exist (only [section]/page/debug-play) — spec p63 segmented-tab/status-tile/100vh plan has no target; request scope ruling (waive vs new-envelope hub build). HANDOFF component-owned density (untouched, out of page.tsx scope): unified 4x2 module grid + master-detail navigator live in components/vocrehab (vocrehab-shell/course-shell) — needs component-lane pass. (2026-09-16 uxp2-20 → steward/integrator).
- DS-UXP2-07 → steward: pp19-21 layout pass done scope-complete (xonotic status-pill + unified command bar adopted; search 48px spotlight + debounce + 40px rows adopted; clans page shell tightened py-6→py-3; wiring grep unchanged 3/9/2; eslint 3-path clean, tsc exit 0, envelope parses BOM-less). verify-devswarm red EXTRINSIC: sibling TASKS/DS-UXP2-06.json malformed JSON line 24 (untouched, out of scope) — needs owner/steward repair before board gate goes green. HANDOFF component-owned density (untouched, out of page.tsx scope): components/clans/clan-browser inline 350px Start-a-clan form → modal/drawer on +Create Clan trigger, filter pills above form + search input, 130px compact cards; VcwAutoplay launch-row density — needs component-lane pass. (2026-09-16 uxp2-07 → steward/integrator).
- DS-UXP2-08 → steward: pp22-25 layout pass done scope-complete (/lobbies stacked header+pill folded into sticky 40px toolbar with single auth pill verbatim; /bot/setup status banner + 100vh-4rem workbench + tightened grids; /bot/bclans + /leaderboards already compact, py-6→py-3 + 100vh-4rem; wiring grep identical before/after 10a/2S + 6a/1S + 1L/1S + 2L/2S; local eslint 4-path clean exit 0, tsc --noEmit exit 0 zero errors, envelope parses BOM-less). verify-devswarm red EXTRINSIC: STATUS.json open 1 vs TASKS 2 (untouched steward manifest, same pre-existing drift as DS-UXP2-20/DS-SECLINT3 waves) — needs steward recount before board gate goes green. HANDOFF component-owned density (untouched, out of page.tsx scope): app/bot/bclans/bclans-console.tsx 4-form stack → horizontal tab console [Auth Key|Read/Join|Post|Comment] + JSON inspector; app/bot/setup bot-setup*/components/bot/bot-key-guide code language tabs (Node/Python/cURL/Rust) + webhook ping; components/games/leaderboard-browser inline filter bar + 36px rows (games lane); components/lobbies/* dense lobby table (Room|Game|Players|Ping|Host|Join). (2026-09-16 uxp2-08 → steward/integrator).
- DS-UXP2-11 → steward: pp32-34 layout pass scope-complete (/work p-2.5 horizontal icon+text pills + dark-glass IT inline row Tool|Reason|Submit + telemetry pill kept; /mmo sticky h-12→h-11 + py-3→py-2; /mmo/rent guide aside→details[open] accordion + gap-2.5/p-3.5; wiring grep unchanged work 6-hrefs+form+2-inputs+submit+fetch / mmo 1-Link+MmoBrowser / rent RentForm+1-Link; eslint 3-path clean exit 0, tsc --noEmit exit 0 zero scope errors, envelope parses BOM-less). verify-devswarm red EXTRINSIC: STATUS.json open 1 vs TASKS 2 (untouched steward manifest, same pre-existing drift as DS-UXP2-20/07/08 waves) — needs steward recount. HANDOFF component-owned density (untouched, out of page.tsx scope): app/mmo/mmo-browser.tsx default Table view on desktop + card p-3→p-2.5/font scale for 11-realms-in-765px + merge Game/Age filters into page sticky toolbar; app/mmo/rent/rent-form.tsx Dimension/Region selects→horizontal pill tabs + Deploy Realm CTA to top-right of Live Estimate card. (2026-09-16 uxp2-11 → steward/integrator).
- DS-UXP2-16 → steward: pp48-50 layout pass scope-complete (/studio/recorder + /studio/image shells folded into compact command-bar headers with static status chip + truncate deck + py-3/mt-2, copy bytes identical; /studio/video cockpit h-10→h-9 + max-w-6xl→max-w-7xl w-full py-3→py-2; wiring grep 0/0 before/after, all 3 component mounts + Suspense fallbacks intact; eslint 3-path clean exit 0, tsc --noEmit exit 0 zero errors, envelope parses BOM-less). verify-devswarm red EXTRINSIC: STATUS.json open 1 vs TASKS 2 (untouched steward manifest, same pre-existing drift as DS-UXP2-20/07/08/11 waves) — needs steward recount. HANDOFF component-owned density (untouched, out of page.tsx scope): components/studio/demo-recorder 40px device-picker ribbon (screen/mic/webcam inline) + full-viewport preview monitor with anchored transport + inline stop-trimmer drawer; components/studio/image/dictate-image-editor darkroom split 75/25 (canvas left, inspector right) with sticky Export on top + single-screen no-scroll; components/studio/video-studio/video-studio NLE cockpit (35/65 bin-vs-preview top row + docked fixed-220px 4-track timeline with inline razor/zoom). (2026-09-16 uxp2-16 → steward/integrator).
- uxp2c-lead CLOSE (2026-09-16): 20-agent CHEAP collab on uxpass-2 done: 3 builders (18 work-landed-layout-only 36+/27- across counter/image/seo, envelope credited done to live uxp2-18; 19/20 clean stand-downs) + 17 read-only checkers (01-17, zero writes, tsc+eslint clean per scope, verify-devswarm red = pre-existing STATUS open 1-vs-2 steward drift). Zero clobbers; component-owned density filed as handoffs in checker reports.
- DS-UXP2-15 → steward: pp45-47 layout pass scope-complete (/studio shell kept prior inline header + status pill + py-3 adopted verbatim; /studio/audio shell inline justify-between header + on-device/WAV pill + text-xs lede + mt-2, kept lg 100vh-190px cockpit lock; /studio/paint shell same inline header + 2-layers/PNG pill + ADDED lg 100vh-190px/min-h-480/overflow-auto cockpit lock mirroring audio; wiring grep 0/0 before/after, all 3 client mounts + Suspense fallbacks intact; local eslint 3-path clean exit 0, tsc --noEmit exit 0 zero errors, envelope parses BOM-less). verify-devswarm red EXTRINSIC: STATUS.json open 1 vs TASKS 2 (untouched steward manifest, same pre-existing drift as DS-UXP2-07/08/11/16/20 waves) — needs steward recount. HANDOFF component-owned density (untouched, out of page.tsx scope): app/studio/studio-hub-client.tsx filter group (L75) → inline header/filter bar + deck grid (L108) → 5-col snap deck with p-3/160px cards; components/studio/audio-lab.tsx → 2-col DAW cockpit (40% prompt+voice+generate / 60% waveform+transport+export) + 32px pitch/speed/reverb strip; components/studio/paint-studio.tsx (+dictate-toolbar/dictate-layers) → 100vh cockpit + 48px tool rail + floating glassmorphic HUD pill (Undo/Redo/Zoom/Brush/Export). (2026-09-16 uxp2-15 → steward/integrator).
- uxp2-lead CLOSE (2026-09-16): CHEAP 20-agent pass-2 wave terminal: 17 done (DS-UXP2-01..09,12..17,19 + 18 by sibling uxp2-18 tag), 2 blocked-honest content-green (11,20 � extrinsic STATUS.json open-drift only), 1 live sibling (10 cheap20-lead, untouched). tsc --noEmit exit 0 repo-wide. Steward asks: STATUS.json recount (counts 1 vs TASKS 2 open), component-lane density for catalog/studio/browser internals (handoff lines in envelope logs).
- DS-SJ-20 → steward/integrator: schedule-juggle layout.tsx metadata tweak (title/desc 7-day → monthly calendar + 24h day + travel + local saves, canonical stays); scope v2/vcw4w/app/vocrehab/play/schedule-juggle/layout.tsx; writer DS-SJ-20, gates pending tsc+eslint 2026-09-16.
- DS-SJ-20 → steward/integrator: .env.example add a GOOGLE_MAPS_API_KEY line in placeholder form only (no real value) for future live travel estimates (SJ travel currently planning-estimate fallback); scope v2/vcw4w/.env.example; writer DS-SJ-20 2026-09-16.
- DS-SJ-20 → steward/integrator: package.json add verify:vocrehab-schedule slot (node scripts/verify-vocrehab-schedule.mjs) once DS-SJ-18 lands (still open/unowned — script not on disk); scope v2/vcw4w/package.json; writer DS-SJ-20 2026-09-16.
- DS-SJ-20 → steward/integrator: docs nav/sitemap wiring for app/docs/vocrehab/schedule-juggle once DS-SJ-17 lands (claimed, page not on disk); scope lib/site-nav.ts + app/sitemap.ts; writer DS-SJ-20 2026-09-16.
