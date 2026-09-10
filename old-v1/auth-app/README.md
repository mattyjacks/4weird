# 4weird-auth — minimal login + user-data service

Scope is deliberately narrow (security only): sessions in httpOnly cookies,
user-scoped reads with RLS still enforced, and server-side Vibe Coins claims.
The static HTML site stays as-is; it calls this service instead of Supabase
directly, so page JavaScript never holds tokens or keys.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | no | Deploy checks (no secrets) |
| POST | `/api/auth/signup` | rate-limited | Create account, set session cookies |
| POST | `/api/auth/login` | rate-limited | Set session cookies |
| POST | `/api/auth/logout` | no | Clear session cookies |
| GET | `/api/auth/session` | cookie | Current user (auto-refreshes once) |
| GET/PATCH | `/api/me/profile` | cookie | Read / rename own profile |
| GET | `/api/coins/balance` | cookie | `get_my_coin_balance()` for caller |
| GET | `/api/coins/history` | cookie | Own ledger rows |
| POST | `/api/coins/claim` | cookie | Attach paid orders by order email |
| GET/PUT | `/api/saves` | cookie | Own game saves (1 MiB cap) |

Money writes use `service_role` and only there; every read uses the caller's
own access token so Postgres RLS applies on top of the code checks.

## Deploy (Vercel)

1. New project from this repo, **Root Directory: `auth-app`**.
2. Environment Variables (all server-side, never `NEXT_PUBLIC_`):
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SITE_URL=https://auth.4weird.com`,
   `ALLOWED_ORIGINS=https://4weird.com,https://www.4weird.com`,
   `COOKIE_SECURE=true`, `COOKIE_SAMESITE=None`.
3. Point DNS (e.g. `auth.4weird.com`) or call the `*.vercel.app` URL from
   `AUTH_APP_URL` in `website/v1/auth/config.js`.
4. Local dev: `npm install && npm run dev`, `.env` with
   `COOKIE_SECURE=false`, `ALLOWED_ORIGINS=http://localhost:8888`.

## Optional hardening (same-origin)

To make cookies first-party instead of cross-site, proxy the API through the
static site: on the static Vercel project, rewrite `/auth-api/:path*` to this
service's `/api/:path*`, set `AUTH_APP_URL` to `''` (same-origin mode in
`auth-server.js`), and switch to `COOKIE_SAMESITE=Lax`. Behavior is
otherwise identical.
