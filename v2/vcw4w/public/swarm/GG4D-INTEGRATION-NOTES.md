# GG4D Integration Notes — economy lane (DS-GG4D-10)

Owner: gg4d-10 · Status: notes only, no code · 2026-09-13
Scope: `v2/vcw4w/public/swarm/GG4D-INTEGRATION-NOTES.md` (NEW file only).
No edits made to QUEUE.md / STATUS.json / manifests / sitemap / nav — wiring asks are returned as text for the lead to append.

Sibling GG4D files may still be landing — this note scopes from contracts, not disk.

## 1. Coin play-rate parity (same as gravegain3d)

- GG4D meters exactly like gravegain3d: signed-in `POST /api/games/session` lifecycle (`start` → per-second `heartbeat` → `end`), billed on `active_seconds` deltas.
- Reference: `components/games/play-gate.tsx:760-784` — visible-tab-only beat every `GAME_HEARTBEAT_SECONDS`, posts `{ action: "heartbeat", session_id, active_seconds: GAME_HEARTBEAT_SECONDS }`, reads back `body.beat.active_seconds` as the authoritative counter driving the still-playing check; insufficient-coins pauses metering, never the game.
- Ask: register slug `gravegain4d` under the same metered-session rate table / RPC path as `gravegain3d`. No new rate, no discount, no premium — parity by default. Any future GG4D-specific tuning (e.g. longer sessions, event multipliers) goes through economy lane + paired-ledger migration, not a forked meter.
- Budget-confirm pattern (from `lib/spend-permission.ts`): single processing step auto-approves up to the caller's ceiling (default 20 gross coins), anything above needs explicit `confirmed:true`; system-wide `BUDGET_CONFIRM_THRESHOLD` 250 is the absolute ceiling. All figures are gross Vibe Coins, 25% platform cut INCLUDED. GG4D creation/build spends follow the same rule — no special-case ceiling.

## 2. Teen age band + gating ask

- Proposed band: **teens** (same as gravegain3d, assuming equivalent gore/wording level). Sibling game lane to confirm content rating; economy does not rate content.
- Gating ask (games/auth lane): enforce at `POST /api/games/session` server-side (mirror `session/route.ts` age-band check), plus guest-pass and quick-match paths per the sec-games QUEUE findings. Fail closed on missing/forged band. Kid band denied unless an explicit kid-mode path is ruled in; adult band unaffected.
- If GG4D ships heavier gore than GG3D, escalate band to 18+ before catalog entry — do not land as `kids` default. Unlisted slugs currently default permissively (see sec-games fail-open finding) so the catalog entry (below) must land together with the rating.

## 3. Catalog entry ask (slug `gravegain4d`)

- Ask (steward / site-nav / data lane): add `gravegain4d` to `content/games.ts` + `content/game-manifests.ts` mirroring the gravegain3d entry shape (slug, title, rating=teens pending confirmation, metered=true, session heartbeat).
- Do NOT fork the mods seed: `modsForGame(slug)` should resolve `gravegain4d` through the same `validateGameModManifest` path as GG3D (see W1/W3 games QUEUE convergence notes). No `old-v1/` writes.

## 4. Sitemap / nav / docs asks

- Routes (steward / site-nav lane): wire `/games/gravegain4d/play` (play-gate metering surface) and `/docs/gravegain4d` (player guide: metering, heartbeat, out-of-coins behavior, age band).
- Nav: games index + docs index entries only. No other manifest edits from this lane.
- Docs page should state: per-minute heartbeat metering, game-keeps-running on broke/limit, server-authoritative receipts — same copy pattern as GG3D.

## 5. Ledger note (economy owns the SQL, infra sequences)

- All GG4D coin movement goes through the paired ledger (`coin_ledger` delta-SUM convention, 100 coins = $1.00 parity, 75/25 creator/platform split where applicable). No parallel balance column on any GG4D table, no direct balance writes from routes.
- Quote/read paths (e.g. budget or squad-pool style `SUM(delta)` reads) are ledger READ-ONLY, fail-open quotes; mints/debits only via guarded RPCs.
- Economy owns the coin/economy/ledger SQL; infra owns sequencing/push. If a GG4D migration needs earned-accrual or split columns, file as an economy-lane migration — do not add coin columns into game/remastery files (per rem-infra/economy QUEUE boundary lines).
- Privacy: never log balances, keys, or PII on economy paths.

## QUEUE wiring lines (returned as text — lead to append, not written by this lane)

See final report message for the exact `DS-GG4D-10 → <lane>` lines.
