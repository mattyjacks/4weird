# VocRehab cooperation gap audit (V7)

- Envelope: `TASKS/DS-VOCREHAB-V7.json` · owner `voc-v7` · status `in_progress` (claimed 2026-09-14T03:00Z).
- Method: plan `vocrehab-IMPLEMENTATION-PLAN.md` Appendix A manifest + §§3–12 vs disk truth
  (`Test-Path` / `dir /s /b` / `Select-String`, 2026-09-14). Read-only; zero C-crew bytes touched.
- Target `vocrehab-GAP-AUDIT.md` verified absent before write. No secrets in this doc (public dir).

## Disk truth snapshot

- C-crew landed: 17 components, 13 libs (`vocrehab-games.ts` … `vocrehab-juggle-scenarios.ts`),
  4 types, full `app/vocrehab/{decide,discover,export,interview,play,pro}` + `app/api/vocrehab/**`
  (8 routes), `app/docs/vocrehab/**` (hub + 5 guides incl. `games/`), both migrations
  (`20261208000000` v1 16 tables, `20261209000000` pack-2), `scripts/verify-vocrehab.mjs`.
- 09 pack-2 DONE: 8 files (migration + `lib/vocrehab-games2.ts` + 3 components + 3 play routes).
- V-crew: V1 component PRESENT (`vocrehab-game-resume-rescue.tsx`, in_progress),
  V3 lib PRESENT (`lib/vocrehab-games3.ts`, in_progress), V6 guide PRESENT
  (`app/docs/vocrehab/games/page.tsx`, in_progress). V2/V4 targets ABSENT (V2/V4 open, unowned).

## Gaps for FULLY working (each: owner + QUEUE line filed)

- G1 — C6 hub/shell pages ABSENT: `app/vocrehab/page.tsx`, `layout.tsx`, `course/**`,
  `privacy/page.tsx`, `accessibility/page.tsx` all `Test-Path False`. C6 still `claimed`.
  Owner: `vocrehab-c6`. QUEUE: `DS-VOCREHAB-V7-G1`.
- G2 — Canonical-registry merge (C3): `lib/vocrehab-games.ts` has zero hits for
  `phone-greeting|time-punch|tool-match|resume-rescue|energy-budget`; pack-2 lives only in
  sidecar `lib/vocrehab-games2.ts`. Owner: `vocrehab-c3`. QUEUE: `DS-VOCREHAB-V7-G2`.
- G3 — Play-index cards (C4): `app/vocrehab/play/page.tsx` lists the 5 base games only;
  no cards for pack-2 ×3, energy-budget, (future) resume-rescue/drill.
  Owner: `vocrehab-c4`. QUEUE: `DS-VOCREHAB-V7-G3`.
- G4 — Drill link (C4): `app/vocrehab/play/inbox-sprint/page.tsx` has zero `drill` hits;
  link pending V4 landing (V4 open). Owner: `vocrehab-c4` (blocked on V4). QUEUE: `DS-VOCREHAB-V7-G4`.
- G5 — Pointer edits (08): site-nav/sitemap/docs-data/package.json all zero `vocrehab` hits;
  08 `in_progress`, Wave-4 deferred. 07's 4 requests (QUEUE 384–387) stand; sitemap rows should
  also cover pack-2/energy routes when C6/C4 cards land. Owner: `vocrehab-lead` (08).
  QUEUE: `DS-VOCREHAB-V7-G5`.
- G6 — Docs-index link (C7): `app/docs/vocrehab/page.tsx` has no link to `games/` guide
  (only a prose "games" mention, line 28). Owner: `vocrehab-c7`. QUEUE: `DS-VOCREHAB-V7-G6`.
- G7 — Verifier coverage of new games (C7): `scripts/verify-vocrehab.mjs` has zero hits for
  `phone-greeting|time-punch|tool-match|resume-rescue|energy-budget|inbox-drill|games2|games3`
  and no play-route parity check. Owner: `vocrehab-c7`. QUEUE: `DS-VOCREHAB-V7-G7`.
- G8 — V2/V4 unowned + absent: `play/resume-rescue/page.tsx`, `lib/vocrehab-inbox-drill.ts`,
  `play/inbox-sprint/drill/page.tsx` all `Test-Path False`; V2/V4 `open`, owner null.
  Owner: UNOWNED — lead/steward to dispatch. QUEUE: `DS-VOCREHAB-V7-G8`.
- G9 — Unowned extra on disk: `play/energy-budget/page.tsx` + `lib/vocrehab-energy.ts` +
  `lib/vocrehab-juggle-scenarios.ts` exist under no envelope (not C4/C3/09/V1–V6 scope).
  Needs single-owner ruling + registry/index/verifier promotion like pack-2.
  Owner: UNOWNED — steward to rule. QUEUE: `DS-VOCREHAB-V7-G9`.
- G10 — Games guide new-game sections (V6 follow-up): `app/docs/vocrehab/games/page.tsx`
  covers base games only, zero pack-2/resume/drill mentions. Update once G2/G8 land.
  Owner: `voc-v6`. QUEUE: `DS-VOCREHAB-V7-G10`.

## DB needs

- 09 migration covers pack-2: `20261209000000` widens `vocrehab_game_sessions_game_id_check`
  to 8 ids (5 base + 3 pack-2). LANDED, no further migration for pack-2.
- My games reuse `POST /api/vocrehab/assessments` `kind=readiness` (allowlist verified in
  route line 4: `ipe|barrier|readiness|goals|remote`). No new tables, no migration needed.
- Caveat: `energy-budget` is NOT in the game_id check — it must save via the assessments
  path (like 09) until the check is widened or G2 merges the registry. Folded into G9.

## Non-gaps confirmed (no action)

- 09 close-out promotion asks (QUEUE 381–382) stand and are superseded by G2/G3 here — no dup filing.
- 07 wiring requests (QUEUE 384–387) stand and are re-affirmed by G5 — no dup filing.
- V1/V3/V6 files present and in_progress with their owners; V5 verifying. Not gaps, just open.
