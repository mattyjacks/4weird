# 4weird v2 (Next.js)

The v2 workspace is the Next.js shell for 4weird. It adds a typed catalog, account/coin/save APIs, metadata pages, and a stable migration boundary around the original v1 experiences...

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs at `http://localhost:3000` by default. Supabase variables are required for authenticated account features; the public catalog and games remain usable without them.

Optional service settings include `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ALLOWED_VARIANTS` (comma-separated numeric variant IDs), `VCW_SERVICE_URL`, and `OPENAI_API_KEY` (+ `BUDDY_MODEL`). Without those settings, the corresponding account/worker/buddy screens report explicit configuration states rather than failing silently.

## Verification

```bash
npm test
npm run build
```

`npm test` checks byte-for-byte game bundle parity, catalog/runtime invariants, lint, and TypeScript. The original games are intentionally served as static HTML/CSS/JavaScript under `public/games/html`; the Next.js UI hosts them without rewriting their internals.

Game saves use an authenticated, slot-isolated, versioned schema backed by the Supabase migration in `supabase/migrations/202609100001_game_saves.sql`.

## Migration layout

- `app/` — Next.js routes and API handlers.
- `components/` — site, game-runtime, and account UI.
- `content/games.ts` — canonical game metadata and runtime paths.
- `public/games/html/` — preserved v1 game bundles.
- `public/vibecodeworker-legacy/` and `public/vcw/` — preserved legacy product surfaces.
- `scripts/verify-game-bundles.mjs` — source/bundle parity guard.
- `V1_TO_NEXTJS_REFACTOR_SPEC.md` — full migration contract and acceptance criteria.

When adding a game, add its metadata to `content/games.ts`, copy its original bundle into `public/games/html/<legacy-path>/`, run `npm run sync:games` (also runs automatically before `test`/`build`) to regenerate the canonical `public/games/<slug>/` runtimes, and run `npm test` before opening a PR.
