# 4weird v2 (Next.js); the live app

The deploy: a single Vercel project with Root Directory = `v2/vcw4w`.
Live at https://4weird.com · human docs at [/docs](/docs) (`app/docs/`, 12 guides) ·
agent manual at [`skill.md`](../../skill.md) · repo overview at [`README.md`](../../README.md).

One account, one coin economy (**100 coins = exactly $1.00**, 25% platform cut included
in every price, never on top) across games, clans, bots, agents/desktops/squads, game AI +
Gaming Buddy, and VibeCodeWorker QA!

License: private and proprietary; see [`LICENSE`](../../LICENSE) and
[4weird.com/pricing](https://4weird.com/pricing). Contributions assign to
MattyJacks LLC; VibeCodeWorker-assisted games must credit VibeCodeWorker;
self-hosting requires a paid plan ($420/mo per org + 15% markup, Enterprise down to 9%).

## Routes (pages)

| Area | Routes |
| --- | --- |
| Games | `/games`, `/games/[slug]`, `/games/[slug]/play`, `/leaderboards`, `/lobbies`, `/xonotic` |
| Social | `/clans`, `/clans/[slug]`, `/bot/setup`, `/bot/bclans` |
| Cloud | `/agents`, `/desktop`, `/squads` |
| Coach | `/buddy` (+ widget on every play page) |
| Money + me | `/pricing`, `/account`, `/my/usage/`, `/my/rights` |
| QA | `/vibecodeworker`, `/vibecodeworker/[section]` (overview, hub, run, full, phone, docs, demo) |
| Docs | `/docs` + 12 guides (`about`, `getting-started`, `playing-games`, `vibe-coins`, `clans`, `bots`, `agents-compute`, `game-ai-buddy`, `vibecodeworker`, `explore-more`, `privacy-safety`, `faq`) |
| Classics | `/spaceships`, `/academy`, `/tech`, `/web-apps` (legacy redirects preserved) |
| Legal | `/terms`, `/privacy`, `/accessibility` |

## APIs (`app/api/`)

Every route returns `{ success: true, ... }` or `{ success: false, error }`.
Cookie session (`credentials: "include"`) or bot key (`x-bot-key: bot4weird_...`).

| Group | Prefix | Notes |
| --- | --- | --- |
| Auth | `/api/auth/*` | signup (100-coin trial, once/IP) · login/logout/session |
| Coins | `/api/coins/*` | balance/history/claim/daily/checkout (Shopify allowlist) |
| Games | `/api/games/*`, `/api/saves`, `/api/leaderboard` | rates + start/heartbeat/end sessions · slots 1-3 ≤1 MiB · aggregates |
| Clans | `/api/clans/*` | posts/comments/channels/messages/reactions/roles/events/economy/bots + upkeep cron at `/api/cron/clan-upkeep` |
| Bots | `/api/bot/*` | identity/keys/me + `/api/bot/bclans/*` clan API on sclans/bclans only |
| Agents/cloud | `/api/agents/*`, `/api/desktop/*`, `/api/squads/*`, `/api/orgs/*`, `/api/projects/*`, `/api/cloud/*` | escrow + heartbeat settlement · real RunPod provisioning · metered workspaces |
| AI/Buddy | `/api/game-ai/*`, `/api/buddy/*` | 25/75-metered dialogue/director/TTS + 9-voice coach |
| fal.ai | `/api/fal/*` | 15 ops (art/3D/video/audio/code-promo) via `FAL_KEY`, 25/75-metered, studio at `/fal` |
| VCW | `/api/vcw/*` | status/games/runs/actions/bugs/complete/handoff/dashboard/autoplay (`health` public, rest authenticated) |
| Me | `/api/my/*`, `/api/referrals` | usage ledger · rights export/delete · referral codes |

Full endpoint semantics live in `skill.md` (repo root); the agent operating manual.
Human behavior lives in `/docs`; keep both in sync when you change a flow.

## Development

```bash
npm install
cp .env.example .env.local   # Supabase required for account features; catalog/games work without it
npm run dev                  # http://localhost:3000
```

Optional service keys (see `.env.example` + root README "Keys" table):
`OPENAI_API_KEY` (+ `BUDDY_MODEL`), `LUNA_MODEL`, `BOT_KEY_PEPPER` (≥16 chars, required for
bot keys), `RUNPOD_API_KEY`, `FAL_KEY` (fal.ai Studio), `SHOPIFY_*` / `COIN_*_VARIANT*`, `CRON_SECRET`, `SIGNUP_IP_HASH_SALT`.
Without them the app reports explicit not-configured states instead of failing silently -
and clan moderation stays lenient (medium-bar: ordinary posts go `visible`, only clearly violating text is held `pending`).

## Verification

```bash
npm test       # sync + 19 verify scripts + eslint + tsc
npm run build  # prebuild re-syncs game bundles
```

- `npm run sync:games` regenerates canonical `public/games/<slug>/` runtimes from
  preserved sources. The original games are served as static HTML/CSS/JS; the Next.js UI
  hosts them without rewriting internals (`scripts/verify-game-bundles.mjs` guards parity).
- Supabase: `supabase/migrations/` (33 rerunnable files). New migrations must be rerunnable
  (`IF NOT EXISTS` / `OR REPLACE` / `DROP ... IF EXISTS` before every policy/trigger);
  regen the root paste-and-run bundle and extend `scripts/verify-*.mjs` for new subsystems.
- Key guards: `verify-catalog-runtime`, `verify-economy`, `verify-clan-economy`,
  `verify-bot-routes`, `verify-agent-rentals`, `verify-game-rentals`, `verify-game-ai`,
  `verify-auth-routes`, `verify-rights`, `verify-vcw-runs`, `verify-vcw-autoplay`,
  `verify-desktop`, `verify-legacy-parity`, `verify-legacy-surfaces`, + PWA/worker/robots/spaceships.

## Migration layout

- `app/` - Next.js routes and API handlers.
- `components/`; site, game-runtime, account, docs, clan, buddy UI.
- `content/games.ts`; canonical game metadata (34 titles) and runtime paths.
- `lib/`; economy (`coins`, `clan-xp`, `game-ai`), moderation (`valleynet`, `markdown`), compute, buddy engine.
- `public/games/html/`; preserved v1 game bundles (source of truth).
- `public/vibecodeworker-legacy/` and `public/vcw/`; preserved legacy product surfaces.
- `supabase/migrations/` - 33 rerunnable migrations + `shopify-coins` edge function.
- `V1_TO_NEXTJS_REFACTOR_SPEC.md`; original migration contract and acceptance criteria.

When adding a game, add its metadata to `content/games.ts`, copy its original bundle into
`public/games/html/<legacy-path>/`, run `npm run sync:games` (also runs automatically before
`test`/`build`) to regenerate the canonical `public/games/<slug>/` runtimes, and run `npm test`
before opening a PR.
