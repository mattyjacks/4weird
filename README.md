# 4weird — single Vercel deploy

The live app is **`v2/vcw4w/`** (Next.js). It serves the site, the game
catalog/runtime, the account hub, lobbies, and every `/api/*` route from one
deployment.

- **Vercel setting:** Root Directory = `v2/vcw4w`.
- **Docs/env:** see `v2/vcw4w/README.md` and `v2/vcw4w/.env.example`.
- **Supabase migrations/functions:** `v2/vcw4w/supabase/`.

**`old-v1/`** is the retired archive: the legacy static site (`website/`),
the standalone `auth-app` service, root-level Supabase files, and legacy
docs. It is not deployed. Reference only.
