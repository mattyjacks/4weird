# 🍉 VocRehab on 4weird — Modular Implementation Plan
## `4weird.com/vocrehab/` as a rip-out-safe, split-off-ready course + minigames module
### Location: `v2/vcw4w/public/swarm/vocrehab-IMPLEMENTATION-PLAN.md`
### Live URL (after merge): `https://4weird.com/swarm/vocrehab-IMPLEMENTATION-PLAN.md`
### Version: `1.0.0-VOCREHAB` · Status: `READY FOR SWARM ORCHESTRATION` · Lane: `docs` (plan only, zero code)
### Skill contract: `v2/vcw4w/public/skill.md` (canonical `https://4weird.com/skill.md`) + DevSwarm bus (`public/swarm/BRAIN.md`, `LANES.md`, `FOR-BOTS.md`, `MEMORY.md`, `QUEUE.md`, `STATUS.json`, `schema.json`)
### Hard rules honored: `old-v1/` read-only · no secrets in `public/swarm/` · Markdown only · never create `public/swarm/index.html` · parity-locked game bundles untouched · coin-ledger tables untouched

---

## TABLE OF CONTENTS

- [0. One-paragraph thesis](#0-one-paragraph-thesis)
- [1. Goals, non-goals, and the rip-out guarantee](#1-goals-non-goals-and-the-rip-out-guarantee)
- [2. The smartest decisions ever (isolation architecture)](#2-the-smartest-decisions-ever-isolation-architecture)
- [3. Route map and information architecture for `/vocrehab/`](#3-route-map-and-information-architecture-for-vocrehab)
- [4. Module 1 — Discovery and Assessment: from forms to scenario micro-games](#4-module-1--discovery-and-assessment-from-forms-to-scenario-micro-games)
- [5. Module 2 — Narrative and Interview Suite: from static scripts to real-time AI roleplay](#5-module-2--narrative-and-interview-suite-from-static-scripts-to-real-time-ai-roleplay)
- [6. Module 3 — Decision Logistics: from dry calculators to dynamic visual mapping](#6-module-3--decision-logistics-from-dry-calculators-to-dynamic-visual-mapping)
- [7. Module 4 — Admin and Professional Workflow: from intentional tools to ambient structuring](#7-module-4--admin-and-professional-workflow-from-intentional-tools-to-ambient-structuring)
- [8. Course wrapper: VocRehab as a playable course](#8-course-wrapper-vocrehab-as-a-playable-course)
- [9. Database architecture: Supabase migrations, all tables `vocrehab_*`](#9-database-architecture-supabase-migrations-all-tables-vocrehab_)
- [10. API architecture: everything under `/api/vocrehab/*`](#10-api-architecture-everything-under-apivocrehab)
- [11. Library architecture: everything under `lib/vocrehab-*`](#11-library-architecture-everything-under-libvocrehab-)
- [12. Component architecture: everything under `components/vocrehab/*`, CSS `vocrehab-`](#12-component-architecture-everything-under-componentsvocrehab-css-vocrehab-)
- [13. Security, privacy, and clean data download without vulnerabilities](#13-security-privacy-and-clean-data-download-without-vulnerabilities)
- [14. Accessibility: immersive accessibility is the product](#14-accessibility-immersive-accessibility-is-the-product)
- [15. Monetization: why this can make a LOT of money](#15-monetization-why-this-can-make-a-lot-of-money)
- [16. Split-off playbook: from `/vocrehab/` folder to standalone site](#16-split-off-playbook-from-vocrehab-folder-to-standalone-site)
- [17. Swarm execution roadmap: envelopes, lanes, waves, gates](#17-swarm-execution-roadmap-envelopes-lanes-waves-gates)
- [18. Verification, QA, and definition of done](#18-verification-qa-and-definition-of-done)
- [19. Risks, open questions, and explicit non-promises](#19-risks-open-questions-and-explicit-non-promises)
- [Appendix A — Full file manifest (allowed to create)](#appendix-a--full-file-manifest-allowed-to-create)
- [Appendix B — Table dictionary (`vocrehab_*`)](#appendix-b--table-dictionary-vocrehab_)
- [Appendix C — API contract table](#appendix-c--api-contract-table)
- [Appendix D — skill.md integration notes](#appendix-d--skillmd-integration-notes)
- [Appendix E — Pointer diff: the ONLY shared-manifest edits allowed](#appendix-e--pointer-diff-the-only-shared-manifest-edits-allowed)

---

## 0. One-paragraph thesis

VocRehab turns vocational rehabilitation paperwork into a playable,
accessible course at `4weird.com/vocrehab/`.
Job seekers never fill out a tedious form if a 3-minute scenario
micro-game can observe the same skill faster and kinder.
They never rehearse from a static script if a real-time AI roleplay
partner can listen, adapt, and encourage them out loud.
Counselors never retype a session if an ambient, consent-gated
assistant can draft the case note, the IPE progress measure, and the
coaching rationalization from one transcript for one-click approval.
Complex federal math like SSI earnings becomes a high-contrast slider
with an instant visual gauge, not a worksheet.
The whole thing ships as a strictly namespaced module —
routes under `app/vocrehab/**`, UI under `components/vocrehab/**`,
logic under `lib/vocrehab-*`, data under `vocrehab_*` tables,
styles under `vocrehab-` prefixes —
so it integrates with everything 4weird already does well
(auth, coins, docs, swarm bus, accessibility, security hardening)
while touching the existing site in at most four one-line pointer
edits, ripping out cleanly with one delete, and splitting off into
its own site later without a rewrite.

---

## 1. Goals, non-goals, and the rip-out guarantee

### 1.1 Goals

1. Ship `4weird.com/vocrehab/` as a course with four suites:
   Suite A Discovery and Assessment (5 tools, all evolved to micro-games).
   Suite B Narrative and Interview (4 tools, all evolved to AI roleplay).
   Suite C Decision Logistics (2 tools, both evolved to visual mapping).
   Suite D Admin and Professional Workflow (4 tools, all evolved to ambient structuring).
2. Make every tool usable by voice, keyboard, screen reader, switch,
   and high-contrast modes from day one, not as a retrofit.
3. Keep ALL new code inside the `vocrehab` namespace so a future
   lead can delete the module or promote it to its own domain
   without hunting stray imports.
4. Keep ALL new data inside `vocrehab_*` tables with
   Row Level Security (RLS), audit logging, and an allowlisted
   export path so a customer can download their own data cleanly
   with zero vulnerability surface.
5. Reuse 4weird's proven platform (Supabase Auth, coin ledger,
   Valley Net moderation, age bands, swarm bus, `skill.md` bot API)
   by reference only, never by fork or duplicate column.
6. Publish this plan at `/swarm/vocrehab-IMPLEMENTATION-PLAN.md`
   per the DevSwarm public-bus contract (Markdown only, secret-free).

### 1.2 Non-goals (explicitly out of scope for v1)

1. No public labor marketplace, no open freelancer directory,
   no employer job board with applicant PII.
   The remastery ruling on worker-marketplace risk applies here
   in full: private coaching workspaces only, invite-only sharing.
2. No new currency, no new balance column, no VocRehab coin.
   If AI roleplay or ambient transcription ever meters coins,
   it calls the existing `meter_game_ai_usage`-family RPCs
   through the economy lane, never a parallel ledger.
3. No medical diagnosis, no disability determination,
   no legal advice, no benefits-filing automation.
   The SSI slider is an educational estimate with a dated
   disclaimer, not a benefits determination.
4. No background-check integration, no criminal-record database,
   no employer ATS integration in v1.
5. No auto-recording of sessions without explicit per-session consent.
   Ambient means consent-gated transcription assistance,
   never silent surveillance.
6. No fork of the 4weird design system, auth, or coin economy.
   VocRehab reads them; it does not redefine them.

### 1.3 The rip-out guarantee (binding)

1. Deleting these paths returns 4weird to exactly its pre-VocRehab
   behavior plus four reverted one-line pointers (see Appendix E):
   `v2/vcw4w/app/vocrehab/**`,
   `v2/vcw4w/components/vocrehab/**`,
   `v2/vcw4w/lib/vocrehab-*.ts`,
   `v2/vcw4w/types/vocrehab-*.ts`,
   `v2/vcw4w/supabase/migrations/*_vocrehab_*.sql` (one file, see §9),
   `v2/vcw4w/scripts/verify-vocrehab.mjs`,
   `v2/vcw4w/public/swarm/vocrehab-*.md`,
   `v2/vcw4w/app/docs/vocrehab/**` (docs live inside the module's
   own docs subtree, wired by the integrator only).
2. No VocRehab file may import from another feature's
   private component. Imports allowed from VocRehab:
   `@/lib/supabase/*` (server/client helpers),
   `@/lib/vocrehab-*` (own libs),
   `@/components/ui/*` (shared primitives only),
   `@/lib/site-nav`, `@/lib/seo` (read-only constants),
   existing-metering RPCs via server action (no direct coin writes).
3. No VocRehab migration may alter an existing table.
   It may only `CREATE TABLE public.vocrehab_*`,
   `CREATE INDEX` on those tables,
   `ENABLE ROW LEVEL SECURITY` on those tables,
   `CREATE POLICY` on those tables,
   and `CREATE OR REPLACE FUNCTION public.vocrehab_*`
   plus `GRANT`/`REVOKE` for those functions.
   Any violation fails `verify-vocrehab.mjs` and blocks `done`.
4. A `scripts/verify-vocrehab-ripout.mjs` dry-run check proves the
   guarantee in CI: it asserts every `vocrehab` import resolves
   inside the namespace and every shared-manifest touch is limited
   to the four pointer lines.

---

## 2. The smartest decisions ever (isolation architecture)

### 2.1 One namespace to rule the module

1. Routes: `v2/vcw4w/app/vocrehab/**` only.
   No VocRehab page exists outside this directory.
2. APIs: `v2/vcw4w/app/api/vocrehab/**` only.
   No VocRehab endpoint exists outside this directory.
3. UI: `v2/vcw4w/components/vocrehab/**` only.
   Shared `components/ui/*` primitives are consumed, never copied.
4. Logic: `v2/vcw4w/lib/vocrehab-*.ts` only.
   Every export starts with `vocrehab` in camelCase
   (for example `vocrehabCalculateSsiEstimate`,
   `vocrehabValidateGameEvent`,
   `vocrehabInteropChannel`).
5. Types: `v2/vcw4w/types/vocrehab-*.ts` only.
   Every interface starts with `Vocrehab`
   (for example `VocrehabGameSession`, `VocrehabRoleplayTurn`).
6. Styles: every class starts with `vocrehab-`
   (for example `vocrehab-shell`, `vocrehab-slider-track`),
   every CSS variable starts with `--vocrehab-`
   (for example `--vocrehab-focus`, `--vocrehab-gauge-good`).
7. Storage keys: every `localStorage` key starts with `vocrehab-`
   (for example `vocrehab-course-progress-v1`,
   `vocrehab-a11y-prefs-v1`).
8. Events: every interop event starts with `vocrehab:`
   (for example `vocrehab:game:completed`,
   `vocrehab:course:module-done`,
   `vocrehab:export:ready`).
   Transport reuses the canonical bus channel
   `4weird_interop_bus` by emitting only, never by forking it.
9. Database: every table starts with `vocrehab_`
   (for example `vocrehab_game_sessions`).
   Every RPC starts with `vocrehab_`
   (for example `vocrehab_export_snapshot`).
   Every storage bucket path (if ever needed) nests under
   `vocrehab/` prefix, never the bucket root.
10. Docs: user guides live at `app/docs/vocrehab/**`
    but are authored as NEW files inside that subtree only,
    wired by the docs integrator via `QUEUE.md`.

### 2.2 Why this naming looks redundant on purpose

1. `grep -r "vocrehab_" supabase/migrations` must return the complete
   data surface in one command for auditors and acquirers.
2. `grep -r "vocrehab-" app components lib` must return the complete
   code surface for a split-off copy-paste.
3. `grep -rv "vocrehab" <new-file>` must return empty for any file
   claiming to be part of the module: if it does not say
   `vocrehab` in its path or its exports, it does not belong.
4. Future domain move (`vocrehab.example.com` or a customer
   white-label) becomes a path-prefix swap plus an env swap,
   not a rename refactor across 200 files.

### 2.3 Directory map (nothing outside this tree is writable by VocRehab lanes)

```text
v2/vcw4w/
├── app/
│   ├── vocrehab/
│   │   ├── page.tsx                      # /vocrehab hub (course home)
│   │   ├── layout.tsx                    # VocRehab shell ONLY (a11y toolbar + progress)
│   │   ├── discover/
│   │   │   ├── page.tsx                  # Suite A index
│   │   │   ├── ipe/page.tsx              # Vocational Assessment (IPE builder)
│   │   │   ├── barriers/page.tsx         # Barrier Buster game + strategies
│   │   │   ├── readiness/page.tsx        # Work Readiness profile
│   │   │   ├── goals/page.tsx            # Job Goal Alignment Checker
│   │   │   └── remote/page.tsx           # Remote Work Feasibility Analyzer
│   │   ├── play/
│   │   │   ├── page.tsx                  # Micro-games arcade index
│   │   │   ├── file-sort/page.tsx        # Game 1: remote file-sort sim
│   │   │   ├── inbox-sprint/page.tsx     # Game 2: mock-message triage sim
│   │   │   ├── focus-shift/page.tsx      # Game 3: interruption + refocus sim
│   │   │   ├── barrier-run/page.tsx      # Game 4: barrier-buster scenario run
│   │   │   └── schedule-juggle/page.tsx  # Game 5: schedule + accommodation sim
│   │   ├── interview/
│   │   │   ├── page.tsx                  # Suite B index
│   │   │   ├── prep/page.tsx             # Interview Prep Generator + roleplay entry
│   │   │   ├── pivot/page.tsx            # Criminal Background Pivot roleplay
│   │   │   ├── disclosure/page.tsx       # Disclosure + Accommodation roleplay
│   │   │   └── resume/page.tsx           # Resume Builder (structured export)
│   │   ├── decide/
│   │   │   ├── page.tsx                  # Suite C index
│   │   │   ├── ssi/page.tsx              # SSI visual slider + gauge
│   │   │   └── disclosure-paths/page.tsx # Disclosure choose-your-own-adventure
│   │   ├── pro/
│   │   │   ├── page.tsx                  # Suite D index (counselor-gated)
│   │   │   ├── sessions/page.tsx         # Ambient session assistant inbox
│   │   │   ├── sessions/[id]/page.tsx    # Review + approve dashboard
│   │   │   ├── outreach/page.tsx         # Business Outreach Generator
│   │   │   └── measures/page.tsx         # Progress Measures + Rationalizer library
│   │   ├── course/
│   │   │   ├── page.tsx                  # Course outline + progress
│   │   │   └── [module]/page.tsx         # Per-module lesson player
│   │   ├── export/page.tsx               # Clean data download (own data only)
│   │   ├── privacy/page.tsx              # Module privacy + consent explainer
│   │   └── accessibility/page.tsx        # Module a11y statement + controls
│   ├── api/
│   │   └── vocrehab/
│   │       ├── games/
│   │       │   └── route.ts              # POST game session + events (telemetry ingest)
│   │       ├── assessments/route.ts      # GET/POST assessment snapshots
│   │       ├── documents/route.ts        # GET/POST resumes, scripts, pivots
│   │       ├── roleplay/
│   │       │   ├── route.ts              # POST start/turn (fail-open stub + LLM when configured)
│   │       │   └── feedback/route.ts     # POST turn feedback (tone/phrasing, encouraging)
│   │       ├── ssi/route.ts              # POST estimate (pure function, no PII stored by default)
│   │       ├── disclosure/route.ts       # POST path choice (adventure state machine)
│   │       ├── pro/
│   │       │   ├── sessions/route.ts     # POST transcript assist (consent-gated)
│   │       │   ├── approve/route.ts      # POST approve/edit generated drafts
│   │       │   └── outreach/route.ts     # POST outreach draft
│   │       └── export/route.ts           # GET own-data snapshot (allowlisted CSV/JSON)
│   ├── docs/
│   │   └── vocrehab/
│   │       ├── page.tsx                  # Docs hub (integrator-wired)
│   │       ├── getting-started/page.tsx
│   │       ├── counselors/page.tsx
│   │       ├── privacy-safety/page.tsx
│   │       └── ssi-math/page.tsx         # Dated SSI explainer + disclaimer
│   └── sitemap.ts                        # POINTER ONLY (integrator adds /vocrehab rows)
├── components/
│   └── vocrehab/
│       ├── vocrehab-shell.tsx            # Hub shell + a11y toolbar + progress rail
│       ├── vocrehab-course-card.tsx
│       ├── vocrehab-game-frame.tsx       # Shared micro-game wrapper (timer, pause, exit)
│       ├── vocrehab-game-file-sort.tsx
│       ├── vocrehab-game-inbox-sprint.tsx
│       ├── vocrehab-game-focus-shift.tsx
│       ├── vocrehab-game-barrier-run.tsx
│       ├── vocrehab-game-schedule-juggle.tsx
│       ├── vocrehab-roleplay-panel.tsx   # Chat + voice roleplay viewport
│       ├── vocrehab-ssi-slider.tsx       # Visual slider + gauge
│       ├── vocrehab-disclosure-tree.tsx  # Choose-your-own-adventure map
│       ├── vocrehab-session-review.tsx   # Counselor approve dashboard
│       ├── vocrehab-export-button.tsx
│       └── vocrehab-a11y-toolbar.tsx
├── lib/
│   ├── vocrehab-course.ts                # Course outline, XP, badges, progress math
│   ├── vocrehab-games.ts                 # Game registry, scoring rubrics, validators
│   ├── vocrehab-assessments.ts           # Assessment shapes + profile synthesis
│   ├── vocrehab-roleplay.ts              # Roleplay prompts, guards, feedback rubric
│   ├── vocrehab-ssi.ts                   # Pure SSI estimate math (testable, dated)
│   ├── vocrehab-disclosure.ts            # Disclosure adventure graph + transitions
│   ├── vocrehab-session-assist.ts        # Ambient draft builders (notes/measures/rationales)
│   ├── vocrehab-export.ts                # Allowlisted export serializer (CSV/JSON)
│   ├── vocrehab-interop.ts               # vocrehab: event emitters (bus thin wrapper)
│   └── vocrehab-privacy.ts               # Consent shapes, redaction helpers, audit copy
├── types/
│   ├── vocrehab-course.ts
│   ├── vocrehab-games.ts
│   ├── vocrehab-documents.ts
│   └── vocrehab-sessions.ts
├── supabase/
│   └── migrations/
│       └── 20261208000000_vocrehab_module_v1.sql  # THE ONLY migration file (see §9)
└── scripts/
    └── verify-vocrehab.mjs              # THE ONLY new verifier (see §18)
```

### 2.4 Dependency arrows (one-way, no cycles)

1. `app/vocrehab/**` may import from
   `components/vocrehab/**`, `lib/vocrehab-*`,
   `types/vocrehab-*`, `@/components/ui/*`,
   `@/lib/supabase/*`, `@/lib/site-nav` (constants only).
2. `components/vocrehab/**` may import from
   `lib/vocrehab-*`, `types/vocrehab-*`, `@/components/ui/*`.
   Never from `app/**` or another feature's components.
3. `lib/vocrehab-*` may import from `types/vocrehab-*` and
   `lib/supabase/*` (server helpers) only.
   Never from components or app routes.
4. `app/api/vocrehab/**` may import from `lib/vocrehab-*`
   and `@/lib/supabase/*` only.
   Coin metering, when ever needed, goes through one named
   server helper (`vocrehabMeterAiUsage`) that calls the existing
   platform RPC, so the call site stays greppable and removable.
5. Interop is emit-only: VocRehab emits `vocrehab:*` events on
   `4weird_interop_bus` and reads its own `localStorage`
   `vocrehab-*` keys. It never subscribes to another module's
   private channel and never writes another module's keys.

### 2.5 The four pointer edits (and nothing else)

1. `lib/site-nav.ts`: one link row (`/vocrehab`, label, quick, detail).
2. `app/sitemap.ts`: one `VOCREHAB` const array + spread into the sitemap.
3. `app/docs` index data (whichever file owns `DOCS_DATA`):
   one entry pointing at `/docs/vocrehab`.
   If the docs hub is generated from the filesystem, zero edits:
   the new `app/docs/vocrehab/**` files auto-register.
4. `package.json` verify chain: one line
   `"verify:vocrehab": "node scripts/verify-vocrehab.mjs"`
   plus appending it to the `test` chain.
   All four are integrator-owned via `QUEUE.md`.
   Lane agents create NEW files and file wiring requests;
   they never touch these four files directly.

---

## 3. Route map and information architecture for `/vocrehab/`

### 3.1 Hub (`/vocrehab`)

1. Hero states the promise in one line:
   no forms that feel like tests, no scripts you read alone,
   no dry calculators, no retyping sessions.
2. Four suite cards (Discover, Interview, Decide, Pro),
   each with a 2-minute entry game or demo.
3. Course progress rail (signed-in) or guest preview rail
   (anonymous, local-only, zero DB writes).
4. Accessibility toolbar pinned to the layout:
   text size, contrast, voice input toggle, reduced motion,
   keyboard hints. Persisted to `vocrehab-a11y-prefs-v1` only.
5. Trust strip: privacy explainer link, SSI disclaimer link,
   counselor-gate explainer, export-your-data link.
6. SEO: `title "VocRehab — Learn Work Skills by Playing | 4weird"`,
   `description` one line, `alternates.canonical "/vocrehab"`.
   Static shell + cached copy, dynamic progress in `<Suspense>`.

### 3.2 Suite A — Discover (`/vocrehab/discover`, 5 tools)

1. `/vocrehab/discover/ipe` — Vocational Assessment for IPE development.
   Game-observed signals prefill the draft; the user edits in plain
   language; the counselor approves. Exports as structured JSON + printable.
2. `/vocrehab/discover/barriers` — Barrier Buster.
   Scenario runs surface barriers (transport, schedule, disclosure fear,
   AT needs, benefits fear) then map each to 2–3 strategies.
3. `/vocrehab/discover/readiness` — Work Readiness Assessment.
   Composite profile (skills, stamina, supports, accommodations)
   synthesized from game telemetry, never from self-report alone.
4. `/vocrehab/discover/goals` — Job Goal Alignment Checker.
   Cross-references stated goals with observed strengths and
   user-entered local-market notes (v1 is manual market entry;
   no labor-market API in v1).
5. `/vocrehab/discover/remote` — Remote Work Feasibility Analyzer.
   Verdict comes from the file-sort + inbox-sprint + focus-shift
   telemetry triple, with explicit accommodation callouts.

### 3.3 Arcade (`/vocrehab/play`, 5 micro-games)

1. `/vocrehab/play/file-sort` — sort 12 digital files into 3 folders
   against a 3-minute timer with one mid-task interruption.
2. `/vocrehab/play/inbox-sprint` — triage 8 mock messages
   (urgent, FYI, phishing-ish, accommodation request) by priority.
3. `/vocrehab/play/focus-shift` — sustained-attention task with
   a scripted interruption, then measure refocus time.
4. `/vocrehab/play/barrier-run` — branching commute/crisis scenario:
   bus late, shift swap, disclosure moment, AT failure.
5. `/vocrehab/play/schedule-juggle` — weekly schedule puzzle with
   medication, transport, childcare, and rest constraints.
6. Every game page uses `vocrehab-game-frame` (intro, practice round,
   timed run, pause/exit, results, retry, send-to-profile).
   No game writes to the DB for guests; signed-in runs POST to
   `/api/vocrehab/games` with a signed session id.

### 3.4 Suite B — Interview (`/vocrehab/interview`, 4 tools)

1. `/vocrehab/interview/prep` — generator + roleplay entry.
   Pick a job goal, get 5 tailored practice questions, then
   rehearse each one with the AI hiring manager by text or voice.
2. `/vocrehab/interview/pivot` — Criminal Background Pivot.
   Growth-framed, accountability-forward, short.
   Roleplay adapts follow-ups; feedback praises specifics.
3. `/vocrehab/interview/disclosure` — Disclosure and Accommodation
   Script Builder + roleplay. Scripts stay user-owned and editable;
   the AI never pressures disclosure.
4. `/vocrehab/interview/resume` — Resume Builder.
   Structured sections from goals + observed strengths;
   export as clean JSON + print CSS. No auto-submission anywhere.

### 3.5 Suite C — Decide (`/vocrehab/decide`, 2 tools)

1. `/vocrehab/decide/ssi` — SSI Disability and Work Earnings visualizer.
   Hourly-wage slider, hours slider, gauge showing estimated
   SSI shift. Dated 2026 parameters, big disclaimer, no PII stored
   unless the user explicitly saves the run.
2. `/vocrehab/decide/disclosure-paths` — Disclosure Decision Helper
   as a choose-your-own-adventure map.
   Nodes for before-applying, interview, offer, on-the-job;
   each choice branches to consequences + scripts + exit ramps.

### 3.6 Suite D — Pro (`/vocrehab/pro`, counselor-gated, 4 tools)

1. `/vocrehab/pro/sessions` — inbox of ambient-assisted sessions.
2. `/vocrehab/pro/sessions/[id]` — unified review dashboard:
   transcript (consented), extracted case-note draft,
   IPE progress-measure draft, coaching rationalization draft,
   outreach draft when relevant. Approve, edit, or discard per box.
3. `/vocrehab/pro/outreach` — Business Outreach Generator.
   Employer partnership emails from templates + user edits.
   No auto-send in v1; copy + user-sent only.
4. `/vocrehab/pro/measures` — Progress Measure + Rationalizer library.
   Past approvals searchable by the counselor, exportable per client
   with consent. JCTS/SE/CE language templates live here as text,
   not as automated eligibility decisions.

### 3.7 Course (`/vocrehab/course`)

1. `/vocrehab/course` — outline: 4 suites as 4 chapters,
   each with 3–5 bite lessons ending in a game or roleplay.
2. `/vocrehab/course/[module]` — lesson player:
   short explainer, try-it (game/roleplay/slider),
   reflect (2 questions), done (XP + badge).
3. Progress is per-user (`vocrehab_module_progress`),
   resumable, printable certificate-of-completion (local PDF/print,
   not a credential).

### 3.8 Utility routes

1. `/vocrehab/export` — own-data download (see §13).
2. `/vocrehab/privacy` — consent, retention, deletion, export explainer.
3. `/vocrehab/accessibility` — controls + statement.
4. `/docs/vocrehab/**` — guides (getting started, counselors,
   privacy-safety, SSI math explainer).

---

## 4. Module 1 — Discovery and Assessment: from forms to scenario micro-games

### 4.1 Design principle (why games beat forms here)

1. Self-report punishes the exact users VocRehab serves:
   low literacy, test anxiety, unfamiliar jargon, internalized stigma.
2. A 3-minute simulated remote task observes interaction speed,
   comprehension, error recovery, help-seeking, and access needs
   directly, with zero questions that feel like a test.
3. The AI never labels a person. It summarizes observed behaviors
   ("sorted 11/12 files in 2:41, used keyboard-only, paused once")
   and proposes supports ("consider screen-reader-friendly file names").
   The user + counselor decide what it means.
4. Every game ships practice → timed → results → retry.
   No surprise timing, no hidden scoring, no fail state that locks
   the course. Retry is always one tap.

### 4.2 Original tool 1 — Vocational Assessment for IPE development

1. Input: game telemetry (opt-in send-to-profile) + plain-language
   prompts ("What kind of work sounds good? What gets in the way?").
2. Output: structured IPE-ready draft with strengths, interests,
   support needs, accommodation flags, and 3 suggested employment goals.
3. Shape: `vocrehab_assessments(kind='ipe', payload jsonb, profile jsonb)`.
4. Counselor flow: draft lands in Pro review queue on approval;
   counselor edits, then copies into the system of record.
   VocRehab never claims to be the system of record.
5. Print: clean print CSS, no 4weird chrome, no coin mentions.

### 4.3 Original tool 2 — Barrier Buster

1. Game `barrier-run` surfaces barriers in context instead of asking
   "list your barriers" cold.
2. Each surfaced barrier maps to 2–3 concrete strategies from
   `lib/vocrehab-assessments.ts` (`vocrehabBarrierStrategies`):
   transport backup plan, shift-swap script, AT trial, benefits-counseling
   referral note, disclosure timing option, rest-break request shape.
3. Strategies are suggestions with exit ramps, never prescriptions.
   Medical, legal, and benefits referrals are handoffs, not answers.

### 4.4 Original tool 3 — Work Readiness Assessment

1. Composite from the telemetry triple (file-sort + inbox-sprint +
   focus-shift) plus schedule-juggle constraints.
2. Dimensions (all phrased as supports, not scores):
   task throughput, comprehension accuracy, error recovery,
   interruption tolerance, written-communication clarity,
   schedule consistency, accommodation signals.
3. Profile rendering: strengths first, supports second,
   accommodations third. Numbers stay behind an explainer;
   the headline is always human language.
4. Accommodation signals are flags for conversation
   ("keyboard-only run completed — ensure keyboard paths in training"),
   never automated AT prescriptions.

### 4.5 Original tool 4 — Job Goal Alignment Checker

1. Inputs: stated goal (free text + category pick),
   observed strengths (from telemetry),
   local-market notes (user-entered: "warehouse hiring on Route 9,
   needs forklift cert").
2. Output: alignment map (strong fit / stretch / mismatch signals)
   with reasons tied to observed behaviors, not stereotypes.
3. v1 has no labor-market API and no automated hiring prediction.
   The checker compares goals to strengths and to the user's own
   market notes. Any market-data integration is a post-v1 proposal
   with its own privacy review.

### 4.6 Original tool 5 — Remote Work Feasibility Analyzer

1. Verdict from the 3-minute remote-task simulation plus an
   environment checklist (quiet space, reliable internet,
   device, backup plan) the user self-checks with pictures, not jargon.
2. Output: readiness band (exploring / supported-remote / ready)
   with required supports listed first.
3. Explicit hybrid path: many users land on "hybrid with supports"
   rather than binary remote/not-remote. The UI celebrates that.

### 4.7 The five micro-games (build spec, shared frame + per-game rules)

#### 4.7.1 Shared frame (`vocrehab-game-frame`)

1. States: `intro → practice → countdown → run → results`.
   Pause and exit available in every state except the 3-second countdown.
2. Props: `vocrehabGameId`, `vocrehabTimeLimitSec`,
   `vocrehabOnComplete(telemetry)`, `vocrehabOnExit()`.
3. Telemetry event shape (validated by `vocrehabValidateGameEvent`):
   `{ t_ms, kind, detail }` where kind is one of
   `start|action|error|help|pause|resume|interrupt|complete`.
4. Timing uses `performance.now()` deltas, never wall-clock math.
   Timers live in `useEffect` + refs; no SSR time reads.
5. Results screen shows: what happened, what it suggests,
   what to try next, retry button, send-to-profile button
   (signed-in only; guests see "sign in to save").
6. All games honor reduced motion (no shake/flash),
   keyboard-only completion, and screen-reader live regions.

#### 4.7.2 Game 1 — File Sort (remote-task core sim)

1. 12 cards (file names, some ambiguous), 3 folders
   (Invoices, Schedules, Client Notes).
2. Interactions: click/tap or keyboard (arrows + Enter),
   drag optional, never required.
3. Scoring: accuracy (correct folder), throughput (files/min),
   recovery (corrections after an error), help use.
4. Interruption: at 90 seconds a mock message appears
   ("Manager: prioritize Client Notes"); handling it is scored
   as comprehension, not obedience — both orders are accepted
   if done consistently.
5. Accessibility probes: keyboard-only flag, text-size flag,
   extra-time flag (user can grant themselves +60s with zero penalty
   to the support profile; speed percentile is informational only).

#### 4.7.3 Game 2 — Inbox Sprint (message triage sim)

1. 8 mock messages: 2 urgent, 3 normal, 1 FYI, 1 phishing-ish,
   1 accommodation request requiring a careful reply shape.
2. Actions per message: reply now / schedule / file / flag.
   One message requires a 1–2 sentence reply from a sentence-starter.
3. Scoring: prioritization accuracy, clarity of the one reply
   (length + keyword coverage, never grammar shaming),
   phishing caution (flagging is praised, clicking through is
   coached, never punished).
4. Voice path: dictate the reply via Web Speech API where available;
   fallback is always a text box. Both produce the same telemetry.

#### 4.7.4 Game 3 — Focus Shift (interruption + refocus sim)

1. Sustained task: match 10 pairs (symbols, high contrast)
   while a scripted interruption fires at pair 6
   (mock announcement + 5-second overlay).
2. Measures: pre/post-interruption pace delta, refocus time,
   error burst after interruption.
3. Framing: "interruptions happen at work; this shows what helps
   you refocus" — with a post-run question offering supports
   (written instructions, quiet corner, check-in buddy).

#### 4.7.5 Game 4 — Barrier Run (scenario branches)

1. Branching story: morning commute → shift swap → disclosure moment
   → tool failure. Each node offers 2–3 choices, all valid,
   each mapping to barrier + strategy pairs.
2. No timer. Progress saves per node. Replay shows alternate paths.
3. Output feeds Barrier Buster directly: chosen path becomes
   the strategy shortlist.

#### 4.7.6 Game 5 — Schedule Juggle (constraints puzzle)

1. 7-day grid, 5 constraint cards (transport windows, medication,
   childcare, rest needs, class). Place 3 shifts + 1 training block.
2. Validation is soft: conflicts highlight with plain-language
   explanations and one-tap fixes, never red errors.
3. Output feeds readiness (schedule consistency) and IPE
   (availability + support needs).

### 4.8 Anti-gaming and honesty rules

1. Games are low-stakes by design; cheating them only cheats
   the user's own support plan. No leaderboards, no anti-cheat
   telemetry, no device fingerprinting.
2. Telemetry is capped (max ~200 events/run, payload caps,
   server-side validation). Oversized runs are truncated
   fail-open, never rejected with a scary error.
3. Scores are never shown as IQ-like numbers. Bands and
   supports only. Raw numbers live one tap deeper with explainers.

---

## 5. Module 2 — Narrative and Interview Suite: from static scripts to real-time AI roleplay

### 5.1 Design principle (practice out loud, not on paper)

1. A printed script helps for 10 minutes; a rehearsed conversation
   helps for 10 years. VocRehab turns every generator into a
   rehearsal room with an AI hiring manager that listens, adapts,
   and encourages.
2. Voice-first but never voice-only: full chat parity for every
   roleplay, one-tap mic toggle, transcript always visible.
3. Feedback is encouraging and specific: what landed, one tweak,
   try-again prompt. Never a grade, never a red score.
4. The user owns every word. AI suggestions are inserts the user
   accepts or rewrites. Nothing auto-sends anywhere.

### 5.2 Original tool 1 — Job Interview Preparation Generator

1. Input: job goal + 2 strengths + 1 worry (plain language).
2. Output: 5 tailored questions (tell-me-about-yourself, strength,
   challenge, teamwork, why-this-role) plus 2 likely follow-ups.
3. Each question has a Rehearse button opening the roleplay panel
   pre-seeded with that question as the hiring manager's opener.
4. Saved question sets live in `vocrehab_documents(kind='prep')`.

### 5.3 Original tool 2 — Criminal Background Pivot

1. Content rules (binding, reviewed by counselors before launch):
   accountability-forward, growth-framed, short (30–60 seconds spoken),
   no graphic detail, no legal claims, ends on the present
   (skills, reliability, supports).
2. Builder flow: 3 prompts (what happened in one neutral line,
   what changed, what is true now) → draft → user edit →
   roleplay the delivery.
3. Roleplay: AI asks the hard question once, then follows up
   based on length, specificity, and forward-lean.
   If the user rambles or apologizes in loops, the AI gently
   offers the 3-sentence shape and invites a retry.
4. Safety: the AI never asks for case numbers, charges in detail,
   or identifying court info. Inputs are capped, stored only
   on explicit save, deletable in one tap.

### 5.4 Original tool 3 — Disclosure and Accommodation Script Builder

1. Decision-first: the builder links to the disclosure adventure
   (Suite C) so users choose timing before wording.
2. Script shapes: 2-sentence disclosure + 1-sentence accommodation
   request + 1-sentence benefit ("this helps me do X well").
   Separate shapes for interview vs after-offer vs on-the-job.
3. Roleplay: AI plays a neutral manager ("Thanks for sharing —
   what would help?") and practices the accommodation ask,
   including a confused-manager branch and a supportive-manager branch.
4. The AI never pressures disclosure. "Not disclosing now" is
   always a valid ending with its own script ("I will follow up
   if a need arises").

### 5.5 Original tool 4 — Resume Builder

1. Structured sections: header (name + contact, user-entered only),
   goal line, strengths (from observed telemetry, user-approved),
   experience (including volunteer, caregiving, gigs, training —
   all valid), skills, accommodations-needed-only-if-user-opts-in.
2. No resume parsing in v1, no employer submission.
   Output is clean JSON + print CSS the user downloads or prints.
3. Saved in `vocrehab_documents(kind='resume')` on explicit save only.

### 5.6 Real-time AI roleplay agent (build spec)

#### 5.6.1 Interaction contract

1. Transport: chat POST turns to `/api/vocrehab/roleplay`
   (`{ session_id, scenario, message }` → `{ reply, feedback, done }`).
   Voice is a client-side speech-to-text layer over the same endpoint;
   no audio leaves the device except as transcribed text, and only
   when the user taps Send.
2. Scenarios: `prep | pivot | disclosure`.
   Each has a system prompt with persona (neutral hiring manager),
   boundaries (no disallowed content, no legal advice),
   and a 6-turn cap per rehearsal (then a wrap + retry offer).
3. Fail-open: if the AI provider is unconfigured or errors,
   the panel serves a scripted fallback manager
   (3 rotating follow-ups + the same feedback rubric).
   Rehearsal never bricks.
4. History: turns persist to `vocrehab_roleplay_turns` only
   when signed in AND the user taps Save rehearsal.
   Default is ephemeral (in-memory + local draft).

#### 5.6.2 Feedback rubric (encouraging, specific, private)

1. Dimensions: clarity (1 idea per answer), specificity
   (one concrete example), forward-lean (ends on present/future),
   tone (steady, no self-attack language).
2. Output shape: one praise (quote the user's own words),
   one tweak (offer a rewritten sentence, never a command),
   one invitation ("Want to try that tweak out loud?").
3. Tone policing is banned. Feedback targets phrasing choices,
   never accent, dialect, speech pattern, or disability.
4. All feedback copy is counselor-reviewed seed text in
   `lib/vocrehab-roleplay.ts`, not live model improvisation
   for the rubric lines.

#### 5.6.3 Voice details

1. Input via Web Speech API where available (`SpeechRecognition`
   guarded by feature detection); always paired with a text box.
2. Output speech via `speechSynthesis` opt-in toggle, default off.
   Rate + voice pickers in the a11y toolbar.
3. No audio recording, no audio upload, no audio storage in v1.
   The transcript text is the only thing that ever posts.

#### 5.6.4 Safety and moderation

1. Every user turn passes the existing Valley Net text screen
   (same helper other features use) before reaching the model;
   flagged turns get a coaching redirect, never a raw model call.
2. Model outputs pass a VocRehab-specific blocklist
   (legal conclusions, medical conclusions, benefits guarantees,
   requests for sensitive identifiers) before render.
   Blocked outputs fall back to the scripted manager line.
3. Rate limits: per-user per-minute caps on roleplay turns
   (generous for real rehearsal, tight enough to stop abuse),
   plus per-session turn caps. 429s carry `Retry-After`.
4. Counselor note: roleplay transcripts are the user's private
   rehearsal space. Counselors see them only if the user
   explicitly shares a saved rehearsal.

---

## 6. Module 3 — Decision Logistics: from dry calculators to dynamic visual mapping

### 6.1 Original tool 1 — SSI Disability and Work Earnings Calculator (2026 visualizer)

#### 6.1.1 What it is and is not

1. It IS an educational estimate: "if you earn about X,
   your SSI cash benefit might shift roughly like this."
2. It IS NOT a benefits determination, filing, or appeal tool.
   It does not ask for SSN, claim numbers, or any identifier.
   It stores nothing by default; saving a run is explicit and optional.
3. Every render carries a dated disclaimer:
   "Estimate only · 2026 parameters · not legal or benefits advice ·
   confirm with a benefits counselor (WIPA/SOAR/VR) before deciding."
4. Parameters live in ONE versioned constant
   (`vocrehabSsiParams2026` in `lib/vocrehab-ssi.ts`) with
   source links and an effective-date stamp, so a 2027 update
   is a one-constant change plus a verifier expectation update.

#### 6.1.2 Interaction (the slider + gauge)

1. Two high-contrast sliders: hourly wage ($0–$40, $0.25 steps)
   and hours/week (0–40, 1-hour steps).
   Full keyboard operability (arrows, PageUp/Down, Home/End),
   visible focus, live-region announcements of the estimate.
2. Instant gauge: three zones (no estimated change / gradual shift /
   review-with-counselor threshold) rendered as color + label + pattern,
   never color alone.
3. Monthly math shown in plain rows: gross earnings → countable-income
   sketch → estimated SSI shift → estimated combined total.
   Every row labeled "about" and rounded to whole dollars in the UI
   (cents stay in the pure function for tests).
4. Presets: 10/15/20 hrs at $12/$16/$20 for one-tap exploration.
5. Save run (optional, signed-in): POST to `/api/vocrehab/ssi`
   stores `{ wage, hours, estimate_json, params_version }`
   in `vocrehab_calculator_runs`. Guests get the same math with
   zero writes.

#### 6.1.3 Math (pure, tested, dated)

1. `vocrehabCalculateSsiEstimate({ hourlyWage, hoursPerWeek })`
   is a pure function with zero I/O, 100% unit-covered in
   `verify-vocrehab.mjs` (boundary table: 0 hrs, part-time,
   threshold crossing, over-threshold).
2. The function returns `{ monthlyEarnings, countableSketch,
   estimatedSsiShift, combinedSketch, paramsVersion, disclaimer }`.
   Names say "sketch/estimated" on purpose.
3. The UI never presents more precision than the function's
   documented confidence. No cents, no "you will receive $X."
4. A `paramsVersion` mismatch between client and server fails
   closed to the server's math with a visible "updated" note.

### 6.2 Original tool 2 — Disability Disclosure Decision-Making Helper (adventure map)

#### 6.2.1 Structure (choose-your-own-adventure, not pros/cons)

1. Graph in `lib/vocrehab-disclosure.ts`
   (`vocrehabDisclosureGraph`): nodes for timing
   (before applying / interview / after offer / on the job /
   not now), branches for goal (ask accommodation / share context /
   say nothing yet), outcomes with consequences + scripts + exits.
2. Every node shows: what happens, what it might feel like,
   one script starter, and two exits (try another path, talk to counselor).
3. No node recommends a single "right" answer.
   The map's job is to make tradeoffs legible, not to decide.
4. State machine endpoint `/api/vocrehab/disclosure`
   validates transitions server-side against the same graph
   (no client-forged jumps); progress saves only on explicit save.

#### 6.2.2 Content rules

1. Plain language, short nodes (under 80 words each),
   always paired with a script starter and an exit ramp.
2. Separate manager reactions (supportive / neutral / confused)
   so users rehearse the hard branch, not just the easy one.
3. Links into Suite B roleplay at every decision node
   ("Rehearse this branch out loud").
4. Counselor-reviewed copy only. Model-generated adventure text
   is banned in v1; the graph is static reviewed content.

---

## 7. Module 4 — Admin and Professional Workflow: from intentional tools to ambient structuring

### 7.1 Design principle (consent-gated ambient, human-approved everything)

1. Today: the counselor opens a tool, speaks/types, gets one note.
2. VocRehab v1: with explicit per-session consent, the counselor
   pastes (or dictates) a session transcript/counselor dictation
   once, and the assistant drafts the case note + progress measure +
   coaching rationalization (+ outreach draft when relevant) side by side
   for review. The counselor approves, edits, or discards each box.
3. Nothing auto-files, auto-sends, or auto-decides eligibility.
   JCTS/SE/CE rationalizer language is a template starting point,
   never an automated need determination.
4. No background listening, no always-on mic, no calendar scraping,
   no employer contact without the counselor pressing send in
   their own email client (v1 is copy-only).

### 7.2 Original tool 1 — Voice Case Note Editor

1. Input: pasted transcript, pasted bullet dictation, or in-browser
   dictation via Web Speech API (same voice stack as roleplay).
2. Output: SOAP-ish / VR-agency-friendly case note draft
   (session date, attendees, topics, observed progress, next steps)
   with PII redaction pass (see §13) before render.
3. Drafts live in `vocrehab_case_notes(status='draft')` only
   after the counselor taps Save draft. Approve flips to `approved`.
   Discard deletes. Every transition audit-logged.

### 7.3 Original tool 2 — Progress Measure Generator

1. Input: IPE goal (user-entered) + session transcript excerpt.
2. Output: individualized, measurable progress line
   ("By [date], client will [observable behavior] in [context]
   with [supports], measured by [evidence], [x/y trials]").
3. Library: past approvals searchable in `/vocrehab/pro/measures`
   (counselor's own drafts only, never cross-counselor).
   Copy-forward with one-tap date roll.

### 7.4 Original tool 3 — JCTS / SE / CE Rationalizer

1. Input: support needs + fading plan sketch.
2. Output: justification paragraph citing intensity, fading criteria,
   and review cadence, in agency-expected language.
3. Banner on every render: "Template starting point — counselor
   determines need and writes the final determination."
   No auto-eligibility, no score-to-service mapping.

### 7.5 Original tool 4 — Business Outreach Generator

1. Input: employer name (user-entered), partnership type
   (tour, trial, training partnership), 2 local details.
2. Output: short professional email draft (subject + 3 paragraphs +
   one-ask close) in the counselor's voice, copy-button only.
3. No auto-send, no contact database, no tracking pixel.
   The counselor sends from their own client.

### 7.6 Ambient session assistant (build spec)

#### 7.6.1 Consent and input contract

1. Per-session consent checkbox with plain language:
   "Use this session's notes to draft paperwork I will review.
   Nothing files or sends itself. I can delete drafts."
   Consent row stored in `vocrehab_consents`.
2. Inputs accepted: pasted transcript, pasted dictation bullets,
   in-browser dictation. No file upload of audio in v1,
   no third-party transcription API in v1.
3. Client-identified participants only (initials or role labels).
   Full-name + DOB + SSN patterns trigger a pre-submit warning
   and a one-tap redact pass.

#### 7.6.2 Extraction (one input, four draft boxes)

1. Single POST to `/api/vocrehab/pro/sessions`
   (`{ transcript_text, client_ref, consent_id }`)
   returns `{ case_note_draft, measure_draft, rationale_draft,
   outreach_draft_or_null, redactions_applied }`.
2. v1 extraction is deterministic-template + counselor-editable:
   extractive summary (first-pass sentences), slot-fill for
   measures/rationales, keyword-suggested outreach trigger.
   An LLM pass is an optional post-v1 enhancement behind
   the same endpoint contract and the same approval UI.
3. Every draft renders in its own box with Edit / Approve / Discard.
   Batch Approve-all requires a second confirm.
   Nothing leaves `status='draft'` without an explicit tap.

#### 7.6.3 Review dashboard (`/vocrehab/pro/sessions/[id]`)

1. Left: consented transcript (redacted view + raw toggle for
   the counselor only, both RLS-scoped).
2. Right: four draft boxes with diff-friendly editing.
3. Bottom: audit strip (who drafted, who edited, who approved, when).
4. Export: approved notes export per client with consent
   through the same allowlisted export path (§13).

---

## 8. Course wrapper: VocRehab as a playable course

### 8.1 Chapter outline (4 chapters, 14 bite modules)

1. Chapter 1 Discover (4 modules):
   Welcome + How This Course Works (no-test promise),
   Know Your Strengths (file-sort + inbox-sprint),
   Name Barriers, Map Supports (barrier-run + schedule-juggle),
   Pick a Direction (goals + remote analyzer).
2. Chapter 2 Tell Your Story (4 modules):
   Interview Basics (prep generator), The Pivot (background),
   The Ask (disclosure + accommodation), Paper Trail (resume).
3. Chapter 3 Decide With Confidence (3 modules):
   Money Maps (SSI slider), When To Share (adventure map),
   My Decision One-Pager (combined export).
4. Chapter 4 Work With Your Counselor (3 modules):
   What IPEs Are, How Sessions Help, My Next 3 Steps.
5. Each module: 2-minute read/watch-equivalent (text-first, no video
   dependency in v1) + one try-it (game/roleplay/slider) +
   2 reflect questions + Done (XP + badge).

### 8.2 Progression, XP, and badges (no coins in v1)

1. XP is local + per-user (`vocrehab_module_progress`):
   10 XP per lesson, 25 per game completion, 25 per roleplay rehearsal,
   50 per chapter. No XP for speed; retries earn the same XP.
2. Badges: First Sort, Clear Inbox, Steady Refocus, Path Finder,
   Schedule Solver, Out-Loud (first roleplay), Money Mapper,
   My Decision, Ready With Supports.
3. Course progress emits `vocrehab:course:module-done` on the bus
   so future modules (and the split-off site) can react without
   tight coupling.
4. v1 earns no Vibe Coins and spends no Vibe Coins.
   Any future coin tie-in (sponsored cohorts, agency seats) is
   an economy-lane proposal with its own migration and meter review.

### 8.3 Guest vs signed-in contract

1. Guests: full course playable, games + sliders + adventure fully
   interactive, progress in `localStorage` (`vocrehab-course-progress-v1`),
   zero DB writes, zero PII collected.
2. Signed-in: progress syncs to `vocrehab_module_progress`,
   telemetry saves on explicit send-to-profile,
   documents save on explicit save, export available.
3. Sign-in prompts appear at save/export boundaries only,
   never mid-game, never mid-roleplay.

---

## 9. Database architecture: Supabase migrations, all tables `vocrehab_`

### 9.1 Migration discipline (binding)

1. ONE new migration file:
   `supabase/migrations/20261208000000_vocrehab_module_v1.sql`.
   If a second file is ever needed, its name must contain
   `vocrehab` and it must obey the same table-prefix rule.
   `verify-migration-versions.mjs` ordering stays green.
2. The file creates ONLY `public.vocrehab_*` tables, indexes,
   policies, and `public.vocrehab_*` functions.
   Zero `ALTER TABLE` on existing tables. Zero new columns
   on `profiles`, `coin_ledger`, `coin_lots`, or any economy table.
3. Append-only: if this file ever ships, later fixes are new
   `*_vocrehab_*.sql` files, never edits to the shipped file.
4. RLS enabled on every table. Default-deny: no policy means
   no access. Service-role bypass is never relied on for reads;
   user paths use `auth.uid()`-scoped policies.
5. All timestamps `TIMESTAMPTZ DEFAULT NOW()`.
   All ids `UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
   All user refs `UUID REFERENCES auth.users(id) ON DELETE CASCADE`.

### 9.2 Table list (16 tables, all `vocrehab_` prefixed)

1. `vocrehab_consents` — per-session or per-client consent receipts.
2. `vocrehab_course_modules` — static course outline seeded in code,
   mirrored here only if counselor-customized (else code is canon).
3. `vocrehab_module_progress` — per-user lesson/XP state.
4. `vocrehab_game_sessions` — one row per timed run (signed-in only).
5. `vocrehab_game_events` — capped event stream per session.
6. `vocrehab_assessments` — IPE/barrier/readiness/goals/remote snapshots.
7. `vocrehab_documents` — prep sets, pivots, scripts, resumes (user-saved).
8. `vocrehab_roleplay_sessions` — rehearsal metadata (scenario, turns count).
9. `vocrehab_roleplay_turns` — saved turns only (explicit save).
10. `vocrehab_calculator_runs` — saved SSI runs (explicit save).
11. `vocrehab_disclosure_states` — adventure progress (explicit save).
12. `vocrehab_coaching_sessions` — ambient assist parent row (consent-linked).
13. `vocrehab_case_notes` — drafts + approvals.
14. `vocrehab_progress_measures` — IPE measure drafts + approvals.
15. `vocrehab_rationalizations` — JCTS/SE/CE drafts + approvals.
16. `vocrehab_outreach_drafts` — employer email drafts (copy-only).
17. `vocrehab_export_log` — append-only audit of own-data downloads.

### 9.3 Reference DDL (abridged canon; full SQL ships in the migration file)

```sql
-- 20261208000000_vocrehab_module_v1.sql (abridged here; full file is canon)
-- All tables start with vocrehab_. No ALTER on existing tables. RLS everywhere.

create table if not exists public.vocrehab_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_ref text not null default 'self',
  purpose text not null check (purpose in ('session-assist','roleplay-save','data-export','course-sync')),
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  note text
);

create table if not exists public.vocrehab_module_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_slug text not null check (module_slug ~ '^[a-z0-9-]{1,64}$'),
  status text not null default 'started' check (status in ('started','done')),
  xp integer not null default 0 check (xp >= 0 and xp <= 1000),
  updated_at timestamptz not null default now(),
  primary key (user_id, module_slug)
);

create table if not exists public.vocrehab_game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null check (game_id in ('file-sort','inbox-sprint','focus-shift','barrier-run','schedule-juggle')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  profile_sent boolean not null default false
);

create table if not exists public.vocrehab_game_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.vocrehab_game_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  t_ms integer not null check (t_ms >= 0 and t_ms <= 600000),
  kind text not null check (kind in ('start','action','error','help','pause','resume','interrupt','complete')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('ipe','barrier','readiness','goals','remote')),
  payload jsonb not null default '{}'::jsonb,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('prep','pivot','script','resume','decision-onepager')),
  title text not null default '',
  body jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vocrehab_roleplay_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario text not null check (scenario in ('prep','pivot','disclosure')),
  turns integer not null default 0,
  saved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_roleplay_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.vocrehab_roleplay_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','manager','feedback')),
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_calculator_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hourly_wage numeric(6,2) not null check (hourly_wage >= 0 and hourly_wage <= 200),
  hours_per_week numeric(5,2) not null check (hours_per_week >= 0 and hours_per_week <= 80),
  estimate jsonb not null default '{}'::jsonb,
  params_version text not null default '2026-v1',
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_disclosure_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  node_id text not null default 'start',
  path jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.vocrehab_coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users(id) on delete cascade,
  client_ref text not null default 'self',
  consent_id uuid references public.vocrehab_consents(id) on delete set null,
  source text not null default 'pasted' check (source in ('pasted','dictated')),
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_case_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.vocrehab_coaching_sessions(id) on delete cascade,
  counselor_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','approved','discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vocrehab_progress_measures (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.vocrehab_coaching_sessions(id) on delete set null,
  counselor_id uuid not null references auth.users(id) on delete cascade,
  client_ref text not null default 'self',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','approved','discarded')),
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_rationalizations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.vocrehab_coaching_sessions(id) on delete set null,
  counselor_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'SE' check (kind in ('JCTS','SE','CE')),
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','approved','discarded')),
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users(id) on delete cascade,
  employer text not null default '',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','copied','discarded')),
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_export_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  format text not null check (format in ('json','csv')),
  bytes integer not null default 0,
  created_at timestamptz not null default now()
);
```

### 9.4 RLS policies (own-data-only, counselor-scoped where noted)

```sql
alter table public.vocrehab_consents enable row level security;
alter table public.vocrehab_module_progress enable row level security;
alter table public.vocrehab_game_sessions enable row level security;
alter table public.vocrehab_game_events enable row level security;
alter table public.vocrehab_assessments enable row level security;
alter table public.vocrehab_documents enable row level security;
alter table public.vocrehab_roleplay_sessions enable row level security;
alter table public.vocrehab_roleplay_turns enable row level security;
alter table public.vocrehab_calculator_runs enable row level security;
alter table public.vocrehab_disclosure_states enable row level security;
alter table public.vocrehab_coaching_sessions enable row level security;
alter table public.vocrehab_case_notes enable row level security;
alter table public.vocrehab_progress_measures enable row level security;
alter table public.vocrehab_rationalizations enable row level security;
alter table public.vocrehab_outreach_drafts enable row level security;
alter table public.vocrehab_export_log enable row level security;

-- Pattern repeated per table (own rows only; no cross-user reads):
-- create policy "vocrehab_<table>_own" on public.<table>
--   for all using (auth.uid() = user_id or auth.uid() = counselor_id)
--   with check (auth.uid() = user_id or auth.uid() = counselor_id);
-- Game events additionally require session ownership:
--   exists (select 1 from public.vocrehab_game_sessions s
--           where s.id = session_id and s.user_id = auth.uid());
-- Roleplay turns additionally require session ownership.
-- Case notes/measures/rationalizations scope to counselor_id.
-- Export log is insert + select-own only (no update, no delete).
```

### 9.5 Indexes (query paths only, no exotic indexes)

1. `vocrehab_module_progress(user_id, module_slug)` (PK covers it).
2. `vocrehab_game_sessions(user_id, started_at desc)`.
3. `vocrehab_game_events(session_id, created_at)`.
4. `vocrehab_assessments(user_id, kind, created_at desc)`.
5. `vocrehab_documents(user_id, kind, updated_at desc)`.
6. `vocrehab_roleplay_turns(session_id, created_at)`.
7. `vocrehab_case_notes(session_id, status)`.
8. `vocrehab_export_log(user_id, created_at desc)`.

### 9.6 Functions (all `vocrehab_` prefixed, SECURITY DEFINER minimal)

1. `vocrehab_export_snapshot()` — returns the caller's allowlisted
   rows as JSONB (see §13). `SECURITY DEFINER`, `SET search_path = public`,
   `REVOKE ALL ... FROM public, anon`, `GRANT EXECUTE ... TO authenticated`.
2. `vocrehab_log_export(p_format text, p_bytes integer)` — appends
   one audit row for the caller. Same grant shape.
3. No coin functions, no ledger writes, no cross-user lookups.
   The verifier asserts the migration contains zero mentions of
   `coin_ledger`, `coin_lots`, `profiles`, and zero `ALTER TABLE`
   outside `vocrehab_*`.

### 9.7 Realtime (off by default, opt-in later)

1. v1 ships with Realtime disabled for all `vocrehab_*` tables.
2. If a later wave wants live counselor dashboards, enable per-table
   publications in a NEW `*_vocrehab_*.sql` file with an explicit
   privacy note. Never enable on roleplay turns without a second review.

---

## 10. API architecture: everything under `/api/vocrehab/*`

### 10.1 Global API rules

1. Every route returns `{ success: true, ... }` or
   `{ success: false, error }` per `skill.md` §Part A conventions.
2. Auth: cookie session or bot key where the platform already
   supports it; anonymous allowed ONLY for pure-compute endpoints
   (SSI estimate) which take no PII and write nothing.
3. Validation: every POST validates with `vocrehab*` validators
   in `lib/vocrehab-*` (length caps, enums, numeric ranges).
   Overlong input truncates or 400s with a friendly message per
   existing platform precedent — never a stack trace.
4. Rate limits: per-user per-minute caps on games ingest, roleplay
   turns, session-assist, and export (export tightest: 5/min,
   20/day). 429 carries `Retry-After`.
5. No-store: all `/api/vocrehab/*` responses carry
   `Cache-Control: no-store` (inherits the platform's `/api/*` rule).
6. Metering: v1 meters nothing. If a post-v1 AI pass needs metering,
   it calls the existing platform meter RPC from ONE helper
   (`vocrehabMeterAiUsage`) owned by the economy lane.

### 10.2 Endpoint specs (see Appendix C for the table)

1. `POST /api/vocrehab/games` — ingest one run.
   Body: `{ game_id, events[<=200], summary }`.
   Validates enums + caps, creates `vocrehab_game_sessions` +
   `vocrehab_game_events` rows for `auth.uid()` only.
   Guests get 401 with a "sign in to save" message, never a write.
2. `GET/POST /api/vocrehab/assessments` — snapshots.
   `GET ?kind=` lists own snapshots (cap 50, newest first).
   `POST { kind, payload, profile }` validates kind enum + size caps.
3. `GET/POST /api/vocrehab/documents` — resumes/scripts/preps.
   Same own-only shape. `body` JSONB capped (~20 KB).
4. `POST /api/vocrehab/roleplay` — `{ session_id?, scenario, message }`.
   Creates ephemeral or saved sessions per the save flag.
   Valley Net screen → scripted fallback or model call → blocklist
   → `{ reply, feedback, done }`. Turn cap enforced.
5. `POST /api/vocrehab/roleplay/feedback` — standalone tweak request
   (`{ text, scenario }` → `{ praise, tweak, invitation }`).
   Same guards as roleplay.
6. `POST /api/vocrehab/ssi` — pure estimate + optional save.
   Anonymous: returns estimate, writes nothing.
   Signed-in with `{ save: true }`: writes `vocrehab_calculator_runs`.
7. `POST /api/vocrehab/disclosure` — `{ from, to }` transition.
   Server validates against `vocrehabDisclosureGraph`; rejects
   forged jumps with 400. Save is explicit.
8. `POST /api/vocrehab/pro/sessions` — consent-gated assist.
   Requires `{ consent_id, transcript_text<=20000 chars, client_ref }`.
   Verifies consent belongs to caller and is unrevoked.
   Returns four drafts + redaction report. Writes parent row + drafts
   as `status='draft'` only.
9. `POST /api/vocrehab/pro/approve` — `{ table, id, body?, decision }`.
   Allowlisted tables only
   (`vocrehab_case_notes|vocrehab_progress_measures|
   vocrehab_rationalizations|vocrehab_outreach_drafts`).
   Decision in (`approved|edited|discarded`). No cross-counselor writes.
10. `POST /api/vocrehab/pro/outreach` — `{ employer, kind, details }`.
    Returns a copy-only draft. No send, no contact storage.
11. `GET /api/vocrehab/export?format=json|csv` — own-data snapshot.
    Calls `vocrehab_export_snapshot()`, serializes via
    `vocrehabSerializeExport`, logs via `vocrehab_log_export`,
    streams the file with `Content-Disposition: attachment`.
    Rate-limited, audit-logged, allowlisted columns only.

---

## 11. Library architecture: everything under `lib/vocrehab-*`

### 11.1 File list and ownership

1. `lib/vocrehab-course.ts` — `vocrehabCourseOutline`,
   `vocrehabModuleXp`, `vocrehabBadgeFor`,
   `vocrehabCourseProgressFrom` (local + remote merge).
2. `lib/vocrehab-games.ts` — `vocrehabGameRegistry` (5 games,
   instructions, time limits, scoring rubrics),
   `vocrehabScoreFileSort`, `vocrehabScoreInboxSprint`,
   `vocrehabScoreFocusShift`, `vocrehabScoreBarrierRun`,
   `vocrehabScoreScheduleJuggle`, `vocrehabValidateGameEvent`,
   `vocrehabSummarizeRun` (human-language summary).
3. `lib/vocrehab-assessments.ts` — `vocrehabBarrierStrategies`,
   `vocrehabReadinessBands`, `vocrehabAlignmentMap`,
   `vocrehabRemoteReadiness`, `vocrehabSynthesizeProfile`.
4. `lib/vocrehab-roleplay.ts` — `vocrehabRoleplayScenarios`,
   `vocrehabRoleplaySystemPrompt(scenario)`,
   `vocrehabRoleplayFallback(scenario, turn)`,
   `vocrehabFeedbackRubric`, `vocrehabBlocklistCheck(text)`.
5. `lib/vocrehab-ssi.ts` — `vocrehabSsiParams2026`,
   `vocrehabCalculateSsiEstimate(input)` (pure),
   `vocrehabSsiDisclaimer` (dated string constant).
6. `lib/vocrehab-disclosure.ts` — `vocrehabDisclosureGraph`
   (nodes + edges + scripts + exits),
   `vocrehabDisclosureTransition(from, to)` (validator).
7. `lib/vocrehab-session-assist.ts` — `vocrehabDraftCaseNote`,
   `vocrehabDraftMeasure`, `vocrehabDraftRationale`,
   `vocrehabDraftOutreach`, `vocrehabRedactTranscript`.
8. `lib/vocrehab-export.ts` — `vocrehabExportAllowlist`
   (table → columns), `vocrehabSerializeExport(snapshot, format)`.
9. `lib/vocrehab-interop.ts` — `vocrehabEmit(event, detail)`,
   `vocrehabInteropChannel` (constant for the bus name),
   thin wrapper only, zero new bus infrastructure.
10. `lib/vocrehab-privacy.ts` — `vocrehabConsentText(purpose)`,
    `vocrehabRedactPii(text)` (patterns for SSN-like, DOB-like,
    phone-like, email-like), `vocrehabAuditCopy(action)`.

### 11.2 Purity rules (testability)

1. SSI math, disclosure transitions, game scoring, export
   serialization, and redaction helpers are pure functions
   with zero I/O. `verify-vocrehab.mjs` unit-covers them with
   boundary tables (see §18).
2. Server-only helpers (Supabase server client, Valley Net call)
   live behind `vocrehab*Server` suffixed exports and are never
   imported by client components.
3. No `window`/`localStorage` reads at module top level.
   All browser access happens inside effects/handlers with guards,
   preserving SSR safety and zero hydration errors.

---

## 12. Component architecture: everything under `components/vocrehab/*`, CSS `vocrehab-`

### 12.1 Shared shell

1. `vocrehab-shell.tsx` — hub layout: heading, suite cards,
   progress rail, trust strip. Server component with cached copy
   + `<Suspense>` dynamic progress.
2. `vocrehab-a11y-toolbar.tsx` — text size (3 steps), contrast
   (standard/high), voice toggle, motion toggle, keyboard hints.
   Persists to `vocrehab-a11y-prefs-v1`. Applies via
   `vocrehab-` classes + `--vocrehab-` vars on the module root only,
   never global `body` overrides that leak to the rest of 4weird.
3. `vocrehab-course-card.tsx` — chapter/module cards with XP + Done state.
4. `vocrehab-game-frame.tsx` — the shared game wrapper (§4.7.1).
5. `vocrehab-export-button.tsx` — format picker + consent line +
   download trigger. Fail-open: on export error, shows how to retry
   + how to request deletion instead.

### 12.2 Game components (one per game, all client, all guarded)

1. `vocrehab-game-file-sort.tsx`, `vocrehab-game-inbox-sprint.tsx`,
   `vocrehab-game-focus-shift.tsx`, `vocrehab-game-barrier-run.tsx`,
   `vocrehab-game-schedule-juggle.tsx`.
2. Each exposes the same props as the frame expects and emits
   the same telemetry shape. Swapping a game's internals never
   changes the frame contract.
3. Each is keyboard-complete, screen-reader-announced,
   reduced-motion-safe, and high-contrast-safe.

### 12.3 Roleplay, slider, adventure, review components

1. `vocrehab-roleplay-panel.tsx` — chat list + composer + mic toggle
   + scenario picker + turn counter + save toggle + fallback badge
   ("Practice partner is offline — using built-in prompts").
2. `vocrehab-ssi-slider.tsx` — dual sliders + gauge + rows + presets
   + disclaimer + save-run toggle. High-contrast slider track
   (`vocrehab-slider-track`), thumb (`vocrehab-slider-thumb`),
   gauge zones (`vocrehab-gauge-*`), all labeled, all keyboardable.
3. `vocrehab-disclosure-tree.tsx` — node card + choice buttons +
   path breadcrumb + rehearse-this-branch button + exit ramps.
4. `vocrehab-session-review.tsx` — four draft boxes + per-box
   Edit/Approve/Discard + batch confirm + audit strip.

### 12.4 Styling contract

1. Tailwind utilities for layout + a small `vocrehab-` CSS layer
   for module-specific states (gauge zones, game cards, focus rings).
   No global CSS edits. No `!important` wars with the site theme.
2. Focus visibility: `--vocrehab-focus` (3px outline, offset 2px)
   on every interactive element inside `/vocrehab/`.
3. Gauge zones use color + label + pattern (stripes/dots),
   never color alone. Game feedback uses icon + text, never icon alone.
4. Print CSS for resumes, IPE drafts, decision one-pagers:
   ink-friendly, single column, no nav, no coin mentions.

---

## 13. Security, privacy, and clean data download without vulnerabilities

### 13.1 Threat model (what we defend against)

1. IDOR: user A reading user B's rehearsal, note, or export.
   Defense: RLS own-only on every table + server-side
   `auth.uid()` checks on every route + session-ownership checks
   on child rows (events, turns).
2. PII over-collection: SSNs, claim numbers, full DOBs, audio files.
   Defense: never ask, warn + redact on paste, no audio upload in v1,
   SSI endpoint takes only wage + hours.
3. Injection: SQL, HTML, markdown, SVG, CSV formula injection.
   Defense: no dynamic SQL (static policies + RPCs only),
   escape-first markdown renderer reuse, SVG sanitization reuse,
   CSV export prefixes `=`, `+`, `-`, `@` cells with a single quote.
4. Abuse: telemetry spam, roleplay spam, export scraping.
   Defense: per-route rate limits + size caps + turn caps +
   `Retry-After`, all logged.
5. Privilege confusion: guests writing, counselors reading
   other counselors' drafts, bots reading private rehearsals.
   Defense: guest writes 401, counselor scope is own-drafts-only,
   bot-key paths reuse existing platform scopes (no new scopes in v1).
6. Supply-chain: a VocRehab dependency breaking the whole site.
   Defense: zero new runtime dependencies in v1.
   Charts are hand-rolled SVG/divs; no chart lib.

### 13.2 PII minimization rules (binding)

1. The only identifiers VocRehab stores are `auth.users(id)`
   foreign keys + user-entered `client_ref` labels
   (initials/roles, counselor-chosen) + user-entered document text
   the user explicitly saves.
2. No SSN field exists anywhere. No claim-number field.
   No DOB field. No address field except inside free-text
   resume/document bodies the user authors and can delete.
3. Transcripts are stored only as counselor-pasted text for
   consented sessions, redact-passed, draft-status, deletable.
4. Roleplay turns are ephemeral by default; persistence requires
   explicit save + unrevoked consent.
5. SSI runs store wage + hours + estimate only, on explicit save.
   Anonymous estimates write nothing.

### 13.3 Redaction (`vocrehabRedactPii`, `vocrehabRedactTranscript`)

1. Patterns: SSN-like (`\d{3}-\d{2}-\d{4}`), 9-digit runs,
   email-like, phone-like (10+ digits with separators),
   DOB-like (`MM/DD/YYYY` + `MM-DD-YYYY`).
2. Behavior: replace with `[redacted-<kind>]`, count replacements,
   return `{ text, redactions_applied }`.
   The review UI shows the count and offers undo-before-save
   (undo restores the counselor's pasted text pre-redaction
   in-memory only; the stored draft keeps the redacted text
   once saved unless the counselor edits it back deliberately).
3. The verifier unit-tests redaction with a boundary table
   (each pattern + a false-positive guard like "Room 2026").

### 13.4 Clean data download (the money-safe export)

1. Scope: the caller downloads ONLY their own rows from the
   allowlist (`vocrehabExportAllowlist`): progress, game summaries
   (not raw event streams by default; summaries + opt-in events),
   assessments, documents, saved roleplay turns, saved calculator
   runs, disclosure states, approved notes/measures (counselor),
   consent receipts, export log (own entries).
2. Path: `GET /api/vocrehab/export?format=json|csv` →
   `auth.uid()` check → `vocrehab_export_snapshot()` RPC
   (static SQL, no parameters except the caller id from `auth.uid()`)
   → `vocrehabSerializeExport` → `vocrehab_log_export` →
   attachment download. No signed-URL dance, no bucket, no
   background job, no email delivery in v1.
3. Why this is vulnerability-free by construction:
   no dynamic table names (allowlist constant),
   no user-supplied SQL (zero string-interpolated queries),
   no cross-user id parameter (server derives id from session),
   no HTML rendering (JSON/CSV attachment with `nosniff`),
   CSV formula-injection guard (prefix risky cells),
   size caps (pagination inside the RPC + row caps per table),
   rate limits (5/min, 20/day) + audit rows.
4. Deletion: export page links to the platform's existing
   data-rights surface (`/my/rights` + `POST /api/my/rights`
   per `skill.md`). VocRehab adds no parallel delete path;
   its tables cascade on user delete (`ON DELETE CASCADE`)
   and the plan documents that mapping for the rights flow.
5. Acquirer/auditor story: `SELECT * FROM vocrehab_export_log`
   proves who downloaded what when; the allowlist file proves
   what CAN leave; RLS proves what CANNOT leave across users.

### 13.5 Counselor-gating without a new role system

1. v1 gates `/vocrehab/pro` behind signed-in + an explicit
   "I am a counselor/professional" attestation checkbox
   (stored in `vocrehab_consents(purpose='session-assist')`),
   not behind a new DB role or admin flag.
2. Post-v1 (agency seats, per-client sharing) gets its own
   proposal with team/org integration review — explicitly NOT
   smuggled into v1 via a boolean `is_counselor` column.
3. Client sharing in v1 is out-of-band (print/PDF handoff) or
   same-account review. No cross-account client record access.

---

## 14. Accessibility: immersive accessibility is the product

### 14.1 Commitments (WCAG 2.2 AA target, tested per release)

1. Keyboard: every game, slider, adventure node, roleplay composer,
   and review button reachable + operable by keyboard alone.
   Visible focus everywhere inside `/vocrehab/`.
2. Screen readers: live regions for game results, gauge changes,
   roleplay replies, draft arrivals. No information conveyed
   by color, motion, or icon alone.
3. Voice: input everywhere text is accepted (games with text replies,
   roleplay, dictation for counselors). Output speech opt-in.
   Voice is an accelerator, never a gate.
4. Contrast: high-contrast mode meets 7:1 for body text in-module.
   Gauge zones + game states keep label + pattern redundancies.
5. Motion: `prefers-reduced-motion` disables all non-essential
   animation; no auto-playing motion; no flashing above 3Hz ever.
6. Timing: every timed game offers practice untimed + one-tap
   extra time (+60s, zero penalty to supports) + pause (except
   the 3s countdown) + exit with progress kept.
7. Language: plain language (grade 6–8 target), jargon explained
   inline, no timed reading comprehension gates.

### 14.2 The a11y toolbar (in the VocRehab layout, module-scoped)

1. Controls: Text size (100/112/125%), Contrast (standard/high),
   Voice input (on/off), Voice output (off/on), Motion (full/reduced),
   Keyboard hints (show/hide).
2. Persistence: `vocrehab-a11y-prefs-v1` in `localStorage` only.
   No account write, no tracking, respected on every `/vocrehab/` page
   via the layout. The rest of 4weird is untouched.
3. Every control is itself keyboard + screen-reader operable
   with immediate effect (no save button, no reload).

### 14.3 Testing

1. `verify-vocrehab.mjs` asserts: no `tabindex` positive values,
   no `onClick`-only controls without keyboard handlers
   (static grep over `components/vocrehab/**`),
   every image/svg-icon has a text companion,
   every slider has `aria-valuetext` with human language.
2. Manual pass per release: keyboard-only full course run,
   screen-reader run (NVDA + VoiceOver spot checks),
   200% zoom run, voice-input run.
3. Findings file as `QUEUE.md` follow-ups, never silent fixes
   in another lane's files.

---

## 15. Monetization: why this can make a LOT of money

### 15.1 Who pays (and for what)

1. VR agencies + nonprofits (B2B seats): per-counselor monthly seat
   for the Pro suite (ambient drafts, measure library, outreach,
   per-client exports with consent). Priced per active counselor,
   not per client record, to avoid per-head PII incentives.
2. Schools + transition programs (B2B cohorts): per-cohort course
   packaging (progress dashboards, completion certificates,
   counselor review queues). No student PII leaves the org.
3. White-label split-off (enterprise): the module as its own site
   (§16) with agency branding, custom SSI parameter packs,
   and SSO. Highest ACV, latest in the roadmap.
4. Individuals: free. The job-seeker course stays free forever
   in v1. Monetization never gates a job seeker's access to
   games, roleplay practice, sliders, or their own export.

### 15.2 Why the isolation architecture IS the pricing power

1. Auditors buy boundaries: `vocrehab_*` tables + RLS + export log
   + redaction pass = a 10-minute security review instead of
   a 10-week one.
2. Agencies buy portability: "your data downloads cleanly,
   your branding swaps in, your instance splits off" wins RFPs.
3. 4weird keeps optionality: if VocRehab outgrows the arcade,
   it leaves as a friend (same auth pattern, same DB project
   or a forked snapshot, same skill contract) and can even
   keep cross-linking back to 4weird games for engagement.
4. No coin entanglement in v1 means no revenue-share confusion:
   B2B seats are priced in USD invoices (existing business suite),
   not in Vibe Coins. Any future coin tie-in is additive and optional.

### 15.3 Pricing shapes (proposals, not promises; economy lane owns final)

1. Counselor seat: flat/month/active-counselor, unlimited drafts,
   unlimited clients-reviewed (no per-client fee).
2. Cohort pack: flat/cohort/semester, completion reporting included.
3. Split-off license: annual platform fee + onboarding.
4. All prices USD-invoiced via the existing business/invoicing
   surfaces. No new checkout, no new ledger in v1.

### 15.4 Moat (why this is hard to copy)

1. Observed-skill telemetry beats self-report forms:
   every game run improves the support rubrics (in aggregate,
   never by exposing individual data).
2. Encouraging roleplay with counselor-reviewed rubrics beats
   generic chatbots: the feedback lines are VR-informed, not
   model-improvised.
3. Ambient structuring that respects consent beats dictation apps:
   one paste → four approvable drafts, nothing auto-filed.
4. Accessibility as the product (not a setting) beats compliance
   checklists: voice + high-contrast + keyboard + reduced-motion
   from the first sketch.

---

## 16. Split-off playbook: from `/vocrehab/` folder to standalone site

### 16.1 What moves (copy, never cut, until the new site is live)

1. `app/vocrehab/**` → new app's `app/**` (hub becomes `/`).
2. `app/api/vocrehab/**` → new app's `app/api/**` (drop the
   `vocrehab` segment or keep it; either is a prefix swap).
3. `components/vocrehab/**` → new app's `components/**`.
4. `lib/vocrehab-*.ts` → new app's `lib/**` (rename or keep prefix).
5. `types/vocrehab-*.ts` → new app's `types/**`.
6. `supabase/migrations/20261208000000_vocrehab_module_v1.sql`
   → new project's migrations (re-stamp the version prefix only).
7. `scripts/verify-vocrehab.mjs` → new project's verifier.
8. `public/swarm/vocrehab-*.md` → new project's docs seed.
9. The four pointer lines stay behind on 4weird as cross-links
   ("Looking for VocRehab? It lives at its own home now").

### 16.2 What stays (reused by reference, reimplemented thinly)

1. Auth: new site provisions its own Supabase project (or a forked
   snapshot) and reuses the same `auth.uid()`-RLS pattern.
   No auth code is copied beyond the helper-call shape.
2. Economy: new site starts with NO coin system. If it ever needs
   metering, it adopts the ledger pattern fresh (single ledger,
   paired entries) rather than importing 4weird's tables.
3. Moderation: new site reuses the Valley Net pattern (screen text,
   fail-open) with its own key and thresholds.
4. Skill/API contract: new site publishes its own `skill.md`-style
   agent surface if it wants bots; the shape is copied, not the keys.

### 16.3 Data migration (clean, consented, auditable)

1. Per-user export from 4weird (`/vocrehab/export` JSON) is the
   migration vehicle. No bulk dump, no service-role copy.
2. Import on the new site is user-initiated upload of their own
   export file, validated by the same `vocrehab*` validators.
3. Agency records migrate per-counselor with client consent receipts
   (`vocrehab_consents`) attached. No consent, no import.
4. `vocrehab_export_log` on the old site + import log on the new
   site give a complete chain of custody.

### 16.4 Cutover checklist

1. Freeze v1 module on 4weird (read-only banner + export nudge).
2. Snapshot DB (Supabase backup) + verify export round-trip
   (export → import → export diff empty).
3. DNS + canonical swaps (`/vocrehab` becomes a redirect to new home).
4. Sitemap + nav pointers flipped by the integrator (2 lines).
5. Announce in docs + swarm bus (`MEMORY.md` line + `QUEUE.md` close-out).
6. Delete module from 4weird ONLY after 30 days of redirect health
   (the rip-out guarantee makes this a non-event).

---

## 17. Swarm execution roadmap: envelopes, lanes, waves, gates

### 17.1 Envelope plan (prefix `DS-VOCREHAB-`, docs lane seeds, workers per lane)

1. `DS-VOCREHAB-00` (docs, plan + contract): this file + verifier spec.
   Gates: `node scripts/verify-vocrehab.mjs --plan-only`.
2. `DS-VOCREHAB-01` (infra, migration): the ONE migration file.
   Scope: `v2/vcw4w/supabase/migrations/*vocrehab*.sql` only.
   Gates: `verify-migration-versions` + `verify-vocrehab` schema slice.
3. `DS-VOCREHAB-02` (web, shell + hub + course): `app/vocrehab/page`,
   `layout`, `course/**`, `components/vocrehab/vocrehab-shell*`,
   `vocrehab-course-card*`, `lib/vocrehab-course.ts`.
4. `DS-VOCREHAB-03` (games, micro-games): `app/vocrehab/play/**`,
   `components/vocrehab/vocrehab-game-*.tsx`,
   `lib/vocrehab-games.ts`, `lib/vocrehab-assessments.ts`,
   `app/api/vocrehab/games`, `app/api/vocrehab/assessments`.
5. `DS-VOCREHAB-04` (vcw, roleplay): `app/vocrehab/interview/**`,
   `components/vocrehab/vocrehab-roleplay-panel.tsx`,
   `lib/vocrehab-roleplay.ts`, `app/api/vocrehab/roleplay/**`,
   `app/api/vocrehab/documents`.
6. `DS-VOCREHAB-05` (web, decide): `app/vocrehab/decide/**`,
   `components/vocrehab/vocrehab-ssi-slider.tsx`,
   `vocrehab-disclosure-tree.tsx`, `lib/vocrehab-ssi.ts`,
   `lib/vocrehab-disclosure.ts`, `app/api/vocrehab/ssi`,
   `app/api/vocrehab/disclosure`.
7. `DS-VOCREHAB-06` (web, pro + ambient): `app/vocrehab/pro/**`,
   `components/vocrehab/vocrehab-session-review.tsx`,
   `lib/vocrehab-session-assist.ts`, `lib/vocrehab-privacy.ts`,
   `app/api/vocrehab/pro/**`.
8. `DS-VOCREHAB-07` (docs, guides + export): `app/docs/vocrehab/**`,
   `app/vocrehab/export/**`, `lib/vocrehab-export.ts`,
   `app/api/vocrehab/export`, `lib/vocrehab-interop.ts`.
9. `DS-VOCREHAB-08` (infra, integrator): the FOUR pointer edits
   (site-nav, sitemap, docs index, package.json verify chain)
   + `scripts/verify-vocrehab.mjs` wiring + `STATUS.json` recount.
   Single writer. Everyone else files `QUEUE.md` wiring requests.

### 17.2 Lane mapping (one lane per envelope, no stretching)

1. docs: 00 (this plan), 07 (guides).
2. infra: 01 (migration), 08 (integrator + verifier wiring).
3. web: 02 (shell/course), 05 (decide), 06 (pro UI).
4. games: 03 (micro-games + assessments).
5. vcw: 04 (roleplay agents).
6. economy: reviewer only (no VocRehab coin work in v1;
   consult on any future metering proposal via `QUEUE.md`).
7. desktop: explicitly uninvolved in v1 (no desktop paths).

### 17.3 Wave order (dependencies first)

1. Wave 0: 00 (plan, this file) → 01 (migration) → verifier green.
2. Wave 1: 02 (shell/course) + 07 (export skeleton) in parallel
   (file-disjoint by construction).
3. Wave 2: 03 (games) + 05 (decide) in parallel.
4. Wave 3: 04 (roleplay) + 06 (pro) in parallel.
5. Wave 4: 08 (integrator pointers + sitemap/nav/docs wiring).
6. No envelope writes code before its claim (`claimed` → `in_progress`
   + owner + log line). No shared-manifest edits except 08.

### 17.4 Claim protocol (per `BRAIN.md` + `FOR-BOTS.md`)

1. Poll `STATUS.json`, read newest `MEMORY.md` bullets,
   pick the oldest open `DS-VOCREHAB-*` envelope you can own.
2. Claim exactly one envelope. Work inside its `scope` only.
3. Re-read the envelope + target files immediately before
   the first write (untracked-tree overwrites are unrecoverable).
4. File shared wiring as `QUEUE.md` lines for 08.
5. Gate before done (see §18). Paste evidence into `log`.
   Red → `blocked` + reason, never `done`.

---

## 18. Verification, QA, and definition of done

### 18.1 New verifier: `scripts/verify-vocrehab.mjs` (ships with the module)

1. Slice 1 Namespace: every new file's path contains `vocrehab`;
   every new export/symbol contains `vocrehab`/`Vocrehab`;
   every CSS class/var contains `vocrehab-`/`--vocrehab-`;
   every table/RPC contains `vocrehab_`.
2. Slice 2 Migration hygiene: migration filename contains `vocrehab`;
   zero `ALTER TABLE` outside `vocrehab_*`;
   zero mentions of `coin_ledger|coin_lots|profiles` (except in
   comments explaining non-touch);
   RLS enabled on every `vocrehab_*` table;
   version ordering green via `verify-migration-versions`.
3. Slice 3 Purity: SSI math boundary table green
   (0 hrs, 10/15/20 hrs at sample wages, threshold crossing);
   disclosure transition table green (valid jumps pass, forged jumps fail);
   game-event validator table green (valid/oversized/bad-enum);
   redaction table green (SSN/email/phone/DOB redacted, Room 2026 kept);
   export serializer table green (allowlisted columns only,
   formula-cell prefixing, no HTML).
4. Slice 4 A11y static: no positive `tabindex`, no `onClick`-without-keyboard
   in `components/vocrehab/**`, every slider has `aria-valuetext`,
   every gauge/game state has a text companion.
5. Slice 5 Secrets: no long `sk-...` keys, no bot keys, no `BEGIN PRIVATE`,
   no email literals in `public/swarm/vocrehab-*` or new module files
   (scan both trees).
6. Slice 6 Rip-out dry-run: simulate deleting the manifest paths
   (Appendix A) and assert zero remaining `vocrehab` references
   outside the four pointer lines.
7. Exit 0 = all slices green. Any red = envelope stays
   `blocked` with the failing slice pasted in `log`.

### 18.2 Repo gates per envelope (subset of the platform chain)

1. `node scripts/verify-vocrehab.mjs` (always).
2. `node scripts/verify-migration-versions.mjs` (when migration touched).
3. `node scripts/verify-devswarm.mjs` (envelope shape + counts sanity).
4. `node scripts/verify-sitemap.mjs` (only 08, after pointer wiring).
5. `npx tsc --noEmit` (when `.ts/.tsx` touched; scope-clean required).
6. `npx eslint <touched-paths>` (zero output required).
7. `node --check` for every new `.js` file (verifier itself included).
8. Full `npm test` chain stays integrator-owned (08 runs it last).

### 18.3 Manual QA checklist (per wave, evidence in envelope logs)

1. Guest full-course run (no login): games → roleplay (chat) →
   sliders → adventure → export-nudge (sign-in prompt only).
2. Keyboard-only run: full course without a mouse.
3. Screen-reader spot run: hub → one game → one roleplay → SSI gauge.
4. Counselor run: paste transcript → four drafts → edit/approve/discard
   → export. Revoke-consent run: consent → revoke → assist refused.
5. Threat spot-checks: user B id in user A session URL (must 404/403),
   oversized telemetry (must truncate fail-open),
   forged disclosure jump (must 400), export without login (must 401).

### 18.4 Definition of done (module v1)

1. All 8 envelopes `done` with gate evidence in logs.
2. `/vocrehab` + all suite indexes + 5 games + 3 roleplays +
   SSI slider + adventure + pro review + export all reachable
   and interactive in a local boot (`next dev` + curl + click-through).
3. `verify-vocrehab.mjs` exit 0, `verify-devswarm.mjs` exit 0,
   `tsc` scope-clean, `eslint` clean on touched paths.
4. `STATUS.json` recounted, `QUEUE.md` wiring fulfilled by 08,
   `MEMORY.md` lesson appended (rip-out + split-off notes).
5. No secrets in `public/swarm/`, no `index.html` created,
   no `old-v1/` writes, no game-bundle edits, no coin-table edits.

---

## 19. Risks, open questions, and explicit non-promises

### 19.1 Risks and mitigations

1. SSI parameters drift (2026 → 2027 rules change).
   Mitigation: versioned constant + paramsVersion plumbing +
   dated disclaimer + verifier expectation table.
2. Roleplay quality without a tuned model.
   Mitigation: counselor-reviewed scripted fallback is the baseline;
   the model is an enhancement, never a dependency.
3. Counselor trust in ambient drafts (hallucinated session facts).
   Mitigation: extractive-first templates, per-box approval,
   audit strip, no auto-file, redact pass, discard path.
4. Scope creep into marketplace/ATS/benefits-filing.
   Mitigation: non-goals are binding; new surfaces need new
   envelopes + privacy review, never drive-by additions.
5. Concurrent-swarm overwrites (untracked tree, 10+ agents).
   Mitigation: claim-before-write, re-read before first write,
   file-disjoint scopes, single integrator for pointers.
6. Split-off data-portability disputes.
   Mitigation: export-first migration (§16.3), consent receipts,
   audit logs, no bulk dumps.

### 19.2 Open questions (for counselors + stewards, not blockers)

1. Which VR agency's IPE/progress-measure wording should be
   the v1 template default (state variance is real)?
2. Which SSI parameter source should be cited as canonical
   in the 2026 disclaimer (SSA publication + date)?
3. Which employer-outreach voice (first-person counselor vs
   agency-letterhead) should be the v1 default template?
4. Should post-v1 roleplay add a Spanish-language track first,
   or an ASL-video prompt track first (both requested by advocates)?
5. Should post-v1 telemetry add an opt-in aggregate analytics view
   for counselors (cohort-level, never individual-level)?

### 19.3 Explicit non-promises (do not quote these as commitments)

1. No promise of employment outcomes, benefit amounts,
   accommodation approvals, or record-clearing results.
2. No promise of HIPAA compliance in v1 (hygiene yes, attestation no;
   agencies needing BAA-gated hosting wait for the split-off enterprise tier).
3. No promise of offline mode in v1 (course progress caches locally,
   but saves/exports need connectivity).
4. No promise of native mobile apps (responsive web only in v1).

---

## Appendix A — Full file manifest (allowed to create)

### A.1 Routes (NEW files only)

```text
v2/vcw4w/app/vocrehab/page.tsx
v2/vcw4w/app/vocrehab/layout.tsx
v2/vcw4w/app/vocrehab/discover/page.tsx
v2/vcw4w/app/vocrehab/discover/ipe/page.tsx
v2/vcw4w/app/vocrehab/discover/barriers/page.tsx
v2/vcw4w/app/vocrehab/discover/readiness/page.tsx
v2/vcw4w/app/vocrehab/discover/goals/page.tsx
v2/vcw4w/app/vocrehab/discover/remote/page.tsx
v2/vcw4w/app/vocrehab/play/page.tsx
v2/vcw4w/app/vocrehab/play/file-sort/page.tsx
v2/vcw4w/app/vocrehab/play/inbox-sprint/page.tsx
v2/vcw4w/app/vocrehab/play/focus-shift/page.tsx
v2/vcw4w/app/vocrehab/play/barrier-run/page.tsx
v2/vcw4w/app/vocrehab/play/schedule-juggle/page.tsx
v2/vcw4w/app/vocrehab/interview/page.tsx
v2/vcw4w/app/vocrehab/interview/prep/page.tsx
v2/vcw4w/app/vocrehab/interview/pivot/page.tsx
v2/vcw4w/app/vocrehab/interview/disclosure/page.tsx
v2/vcw4w/app/vocrehab/interview/resume/page.tsx
v2/vcw4w/app/vocrehab/decide/page.tsx
v2/vcw4w/app/vocrehab/decide/ssi/page.tsx
v2/vcw4w/app/vocrehab/decide/disclosure-paths/page.tsx
v2/vcw4w/app/vocrehab/pro/page.tsx
v2/vcw4w/app/vocrehab/pro/sessions/page.tsx
v2/vcw4w/app/vocrehab/pro/sessions/[id]/page.tsx
v2/vcw4w/app/vocrehab/pro/outreach/page.tsx
v2/vcw4w/app/vocrehab/pro/measures/page.tsx
v2/vcw4w/app/vocrehab/course/page.tsx
v2/vcw4w/app/vocrehab/course/[module]/page.tsx
v2/vcw4w/app/vocrehab/export/page.tsx
v2/vcw4w/app/vocrehab/privacy/page.tsx
v2/vcw4w/app/vocrehab/accessibility/page.tsx
v2/vcw4w/app/api/vocrehab/games/route.ts
v2/vcw4w/app/api/vocrehab/assessments/route.ts
v2/vcw4w/app/api/vocrehab/documents/route.ts
v2/vcw4w/app/api/vocrehab/roleplay/route.ts
v2/vcw4w/app/api/vocrehab/roleplay/feedback/route.ts
v2/vcw4w/app/api/vocrehab/ssi/route.ts
v2/vcw4w/app/api/vocrehab/disclosure/route.ts
v2/vcw4w/app/api/vocrehab/pro/sessions/route.ts
v2/vcw4w/app/api/vocrehab/pro/approve/route.ts
v2/vcw4w/app/api/vocrehab/pro/outreach/route.ts
v2/vcw4w/app/api/vocrehab/export/route.ts
v2/vcw4w/app/docs/vocrehab/page.tsx
v2/vcw4w/app/docs/vocrehab/getting-started/page.tsx
v2/vcw4w/app/docs/vocrehab/counselors/page.tsx
v2/vcw4w/app/docs/vocrehab/privacy-safety/page.tsx
v2/vcw4w/app/docs/vocrehab/ssi-math/page.tsx
```

### A.2 Components, libs, types, scripts, bus docs (NEW files only)

```text
v2/vcw4w/components/vocrehab/vocrehab-shell.tsx
v2/vcw4w/components/vocrehab/vocrehab-a11y-toolbar.tsx
v2/vcw4w/components/vocrehab/vocrehab-course-card.tsx
v2/vcw4w/components/vocrehab/vocrehab-game-frame.tsx
v2/vcw4w/components/vocrehab/vocrehab-game-file-sort.tsx
v2/vcw4w/components/vocrehab/vocrehab-game-inbox-sprint.tsx
v2/vcw4w/components/vocrehab/vocrehab-game-focus-shift.tsx
v2/vcw4w/components/vocrehab/vocrehab-game-barrier-run.tsx
v2/vcw4w/components/vocrehab/vocrehab-game-schedule-juggle.tsx
v2/vcw4w/components/vocrehab/vocrehab-roleplay-panel.tsx
v2/vcw4w/components/vocrehab/vocrehab-ssi-slider.tsx
v2/vcw4w/components/vocrehab/vocrehab-disclosure-tree.tsx
v2/vcw4w/components/vocrehab/vocrehab-session-review.tsx
v2/vcw4w/components/vocrehab/vocrehab-export-button.tsx
v2/vcw4w/lib/vocrehab-course.ts
v2/vcw4w/lib/vocrehab-games.ts
v2/vcw4w/lib/vocrehab-assessments.ts
v2/vcw4w/lib/vocrehab-roleplay.ts
v2/vcw4w/lib/vocrehab-ssi.ts
v2/vcw4w/lib/vocrehab-disclosure.ts
v2/vcw4w/lib/vocrehab-session-assist.ts
v2/vcw4w/lib/vocrehab-export.ts
v2/vcw4w/lib/vocrehab-interop.ts
v2/vcw4w/lib/vocrehab-privacy.ts
v2/vcw4w/types/vocrehab-course.ts
v2/vcw4w/types/vocrehab-games.ts
v2/vcw4w/types/vocrehab-documents.ts
v2/vcw4w/types/vocrehab-sessions.ts
v2/vcw4w/supabase/migrations/20261208000000_vocrehab_module_v1.sql
v2/vcw4w/scripts/verify-vocrehab.mjs
v2/vcw4w/public/swarm/vocrehab-IMPLEMENTATION-PLAN.md
```

### A.3 Explicitly NOT created

```text
v2/vcw4w/public/swarm/index.html            # NEVER (shadows /swarm route)
v2/vcw4w/app/vocrehab/../../anything-else   # no files outside app/vocrehab
old-v1/**                                    # read-only, zero writes
v2/vcw4w/public/games/html/**                # parity-locked, zero hand-edits
```

---

## Appendix B — Table dictionary (`vocrehab_`)

| Table | Owner key | Purpose | PII | Retention |
|---|---|---|---|---|
| `vocrehab_consents` | `user_id` | Consent receipts per purpose | minimal (purpose + note) | until revoked + audit kept |
| `vocrehab_module_progress` | `user_id` | Course XP + done flags | none | with account |
| `vocrehab_game_sessions` | `user_id` | Run summaries per game | none | with account |
| `vocrehab_game_events` | `user_id` + session FK | Capped telemetry | none | with account |
| `vocrehab_assessments` | `user_id` | IPE/barrier/readiness/goals/remote snapshots | user-authored text | with account |
| `vocrehab_documents` | `user_id` | Preps/pivots/scripts/resumes | user-authored text | with account |
| `vocrehab_roleplay_sessions` | `user_id` | Rehearsal metadata | none | with account |
| `vocrehab_roleplay_turns` | `user_id` + session FK | Saved turns only | user-authored rehearsal text | with account |
| `vocrehab_calculator_runs` | `user_id` | Saved SSI runs | wage + hours only | with account |
| `vocrehab_disclosure_states` | `user_id` | Adventure progress | none | with account |
| `vocrehab_coaching_sessions` | `counselor_id` | Ambient parent row | client_ref label | with account |
| `vocrehab_case_notes` | `counselor_id` | Drafts + approvals | session-derived text | with account |
| `vocrehab_progress_measures` | `counselor_id` | IPE measures | goal text | with account |
| `vocrehab_rationalizations` | `counselor_id` | JCTS/SE/CE drafts | support text | with account |
| `vocrehab_outreach_drafts` | `counselor_id` | Employer email drafts | employer name only | with account |
| `vocrehab_export_log` | `user_id` | Download audit | format + bytes | append-only |

---

## Appendix C — API contract table

| Method + path | Auth | Body | Writes | Returns |
|---|---|---|---|---|
| `POST /api/vocrehab/games` | signed-in | `{ game_id, events[<=200], summary }` | `vocrehab_game_sessions` + `vocrehab_game_events` (own) | `{ session_id, profile }` |
| `GET /api/vocrehab/assessments?kind=` | signed-in | — | none | `{ assessments[] }` (own, ≤50) |
| `POST /api/vocrehab/assessments` | signed-in | `{ kind, payload, profile }` | `vocrehab_assessments` (own) | `{ id }` |
| `GET /api/vocrehab/documents?kind=` | signed-in | — | none | `{ documents[] }` (own) |
| `POST /api/vocrehab/documents` | signed-in | `{ kind, title, body }` | `vocrehab_documents` (own) | `{ id }` |
| `POST /api/vocrehab/roleplay` | signed-in (save) / guest (ephemeral) | `{ session_id?, scenario, message }` | turns only when save-flagged | `{ reply, feedback, done }` |
| `POST /api/vocrehab/roleplay/feedback` | guest ok | `{ text, scenario }` | none | `{ praise, tweak, invitation }` |
| `POST /api/vocrehab/ssi` | guest ok (save needs login) | `{ hourlyWage, hoursPerWeek, save? }` | `vocrehab_calculator_runs` iff save | `{ estimate, disclaimer, paramsVersion }` |
| `POST /api/vocrehab/disclosure` | guest ok (save needs login) | `{ from, to }` | `vocrehab_disclosure_states` iff save | `{ node, exits }` |
| `POST /api/vocrehab/pro/sessions` | counselor-attested | `{ consent_id, transcript_text, client_ref }` | coaching row + 4 drafts (`draft`) | `{ drafts, redactions_applied }` |
| `POST /api/vocrehab/pro/approve` | counselor-attested | `{ table, id, body?, decision }` | status flip (own only) | `{ ok, status }` |
| `POST /api/vocrehab/pro/outreach` | counselor-attested | `{ employer, kind, details }` | `vocrehab_outreach_drafts` (`draft`) | `{ draft }` |
| `GET /api/vocrehab/export?format=` | signed-in | — | `vocrehab_export_log` append | attachment (`json`/`csv`) |

---

## Appendix D — skill.md integration notes

### D.1 What VocRehab reuses from `skill.md` unchanged

1. Response envelope (`{ success }`), session + bot-key auth shapes,
   rate-limit + `Retry-After` conventions, Valley Net screening pattern,
   coin-metering pattern (if ever needed), data-rights surfaces.
2. DevSwarm bus discipline: envelopes in `TASKS/`, wiring in `QUEUE.md`,
   lessons in `MEMORY.md`, counts in `STATUS.json`, boot in `SwarmStart.md`.
3. Bot surfaces stay as documented: VocRehab adds no new bot scopes,
   no new clan boards, no new coin endpoints in v1.

### D.2 What VocRehab adds beside `skill.md` (no edits to it in v1)

1. One nav row, sitemap rows, docs subtree, and one verifier line
   (Appendix E). If `skill.md` ever documents VocRehab for bots,
   that is a docs-lane follow-up with its own envelope, never a
   drive-by edit inside a feature envelope.
2. Event names (`vocrehab:*`) are new but transport-compatible:
   they ride `4weird_interop_bus` as opaque strings other modules
   already ignore safely.

---

## Appendix E — Pointer diff: the ONLY shared-manifest edits allowed

### E.1 `lib/site-nav.ts` (integrator, one row, exact shape)

```ts
// Inside the Learn group (or a new VocRehab group if the integrator prefers):
{ href: "/vocrehab", label: "🍉 VocRehab", quick: "Learn work skills by playing.", detail: "A playable course for job seekers and counselors: micro-games instead of forms, AI rehearsal instead of scripts, visual benefits maps, and consent-gated session help.\n\nFree for job seekers; counselors get review-and-approve drafts. Your data downloads cleanly anytime." },
```

### E.2 `app/sitemap.ts` (integrator, one const + one spread)

```ts
const VOCREHAB: Entry[] = [
  { path: "/vocrehab", changeFrequency: "weekly", priority: 0.8 },
  { path: "/vocrehab/discover", changeFrequency: "monthly", priority: 0.6 },
  { path: "/vocrehab/play", changeFrequency: "weekly", priority: 0.6 },
  { path: "/vocrehab/interview", changeFrequency: "monthly", priority: 0.6 },
  { path: "/vocrehab/decide", changeFrequency: "monthly", priority: 0.6 },
  { path: "/vocrehab/decide/ssi", changeFrequency: "monthly", priority: 0.6 },
  { path: "/vocrehab/course", changeFrequency: "weekly", priority: 0.7 },
  { path: "/vocrehab/export", changeFrequency: "monthly", priority: 0.4 },
  { path: "/vocrehab/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/vocrehab/accessibility", changeFrequency: "yearly", priority: 0.4 },
  { path: "/docs/vocrehab", changeFrequency: "monthly", priority: 0.6 },
];
// ... spread ...VOCREHAB into the staticEntries array alongside the other groups.
```

### E.3 Docs index (integrator, only if filesystem routing does not auto-register)

```text
If app/docs auto-registers from the filesystem: ZERO edits.
Else: one DOCS_DATA row pointing at /docs/vocrehab (title, blurb, href).
Filed as a QUEUE.md wiring request; docs integrator owns the edit.
```

### E.4 `package.json` (integrator, two-line diff)

```json
"verify:vocrehab": "node scripts/verify-vocrehab.mjs",
```

```text
Append "&& npm run verify:vocrehab" to the test chain in the same commit.
No other package.json edits from any VocRehab envelope.
```

### E.5 What the integrator verifies before merging pointers

1. `verify-vocrehab.mjs` exit 0 on the module tree.
2. `verify-sitemap.mjs` exit 0 after the sitemap spread.
3. `verify-devswarm.mjs` exit 0 (envelope shapes + counts).
4. `tsc --noEmit` scope-clean + `eslint` clean on touched pointer lines.
5. Live boot: `/vocrehab` 200, `/swarm/vocrehab-IMPLEMENTATION-PLAN.md` 200,
   `/api/vocrehab/ssi` pure-compute 200 with no login.

---

## Close-out

VocRehab wins by being the kindest way to do hard paperwork
and the cleanest module 4weird has ever shipped.
Games instead of forms. Rehearsal instead of scripts.
Sliders instead of worksheets. Approval instead of retyping.
Namespace everything with `vocrehab_` / `vocrehab-`,
touch the host site in four lines,
prove the rip-out in CI,
download data without vulnerabilities,
and keep the split-off door open from day one.
When this plan's eight envelopes close green,
`4weird.com/vocrehab/` is live, delightful, and removable —
which is exactly why it will be worth keeping. 🍉
