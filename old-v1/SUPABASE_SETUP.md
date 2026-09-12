# 4weird + Supabase + Shopify (Vibe Coins) - Setup Guide

This wires login, saved data, and Vibe Coins purchases. You do the dashboard
clicks once; everything else is already coded. Nothing here needs confirmation
emails (per current decision) - read **§5 Tradeoffs** before taking real money.

## 0. What lives where

| Piece | Location | Secrets? |
|---|---|---|
| Browser (HTML + `auth-server.js`) | `website/v1/account.html`, `website/v1/auth/` | **None.** No keys, no tokens (httpOnly cookies) |
| Auth + user-data service | `auth-app/` (Next.js, separate deploy) | All Supabase keys, server-side only |
| Local non-secret config | `website/v1/auth/config.js` (copy from `config.example.js`) | No - service URL + shop settings only, gitignored anyway |
| Database + RLS money rules | `supabase/schema.sql` (+ timestamped copy in `supabase/migrations/`, applied by the GitHub integration on merge to main) | No |
| Shopify fulfillment | `supabase/functions/shopify-coins/index.ts` | service_role + webhook secret live in Supabase secrets, never in repo |

Login flow: `account.html` → `POST auth-app/api/auth/*` → httpOnly session
cookies → all data routes (`/api/me/*`, `/api/coins/*`, `/api/saves`)
authorize the cookie session server-side. Reads use the caller's own token
so Postgres RLS still applies; only coin grant/ledger writes use
service_role. Page JavaScript never holds anything worth stealing.

## 1. Create the Supabase project

1. https://supabase.com/dashboard → New project. Save the database password
   in a password manager (you will not need it again for this setup).
2. Project Settings → API: copy the **Project URL**, the **publishable**
   key, and the **secret** key into `auth-app/.env` (see
   `auth-app/.env.example`). Keys live server-side only - never in website
   files, never in chat, never in git.
3. Deploy `auth-app/` per `auth-app/README.md` (env vars live there,
   server-side). Then copy `website/v1/auth/config.example.js` →
   `website/v1/auth/config.js` and set `AUTH_APP_URL` to the deployed
   service URL. The browser config holds no keys by design.

## 2. Auth settings (no confirmation emails)

Authentication → Providers → Email: **ON**, **Confirm email: OFF**.
Then Authentication → Settings:

- **Site URL:** `https://4weird.com`
- **Redirect URLs:** add `https://4weird.com/account.html` and
  `https://www.4weird.com/account.html` (plus `http://localhost:8888/account.html`
  if you test locally).
- **Minimum password length:** 8 (the site also enforces 8+ client-side).
- **Leaked password protection:** ON (free, blocks HaveIBeenPwned passwords).

## 3. Database

SQL Editor → New query → paste the entire `supabase/schema.sql` → Run.
Expected: `Success. No rows returned`. This creates `profiles`,
`game_saves`, `coin_grants`, `coin_ledger`, the signup trigger, the balance
function, and RLS policies that deny all client writes to money tables.

## 4. Edge Function (Shopify fulfillment)

```bash
npm i -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy shopify-coins --no-verify-jwt
supabase secrets set \
  SUPABASE_URL="https://YOUR-REF.supabase.co" \
  SUPABASE_ANON_KEY="YOUR-ANON-KEY" \
  SUPABASE_SERVICE_ROLE_KEY="YOUR-SERVICE-ROLE-KEY" \
  SHOPIFY_WEBHOOK_SECRET="PASTE-FROM-STEP-5" \
  SITE_ORIGINS="https://4weird.com,https://www.4weird.com"
```

`--no-verify-jwt` is correct here: Shopify cannot mint Supabase JWTs, so the
function authenticates webhooks with HMAC-SHA256 instead (verified inside
the code), and the `/claim` route validates the user's JWT itself.

## 5. Shopify (shop.mattyjacks.com)

1. Products → create three products (any price/name you like) with EXACT SKUs:
   `VIBE-COINS-100`, `VIBE-COINS-550`, `VIBE-COINS-1300`. These SKUs must
   match `COIN_SKU_MAP` in the Edge Function or orders grant nothing.
   Digital goods: uncheck "requires shipping", no fulfillment needed.
2. Open each variant and copy its **numeric variant ID** (in the variant URL)
   into `config.js` `COIN_PACKS[].variantId` (digits only; the page refuses
   anything else so a placeholder can never build a checkout link).
3. Settings → Notifications → Webhooks → Create webhook:
   Event `Order payment`, Format JSON,
   URL `https://YOUR-REF.supabase.co/functions/v1/shopify-coins/webhook`.
   Copy the **signing secret** (shown once) into `SHOPIFY_WEBHOOK_SECRET`.
4. Buyers always pay on Shopify hosted checkout - card data never touches
   4weird, so PCI scope stays with Shopify. Test with Shopify Bogus gateway
   or test mode before going live.

## 6. Test checklist

1. Open `/account.html` → create account → log out → log in. No emails sent.
2. Balance shows 0; history empty; packs hidden until variant IDs are set.
3. Place a test order with the **same email as the test account** → webhook
   delivers (Shopify webhook log: 200) → balance updates after refresh.
4. Place a test order with an **unknown email** → grant parked → log in with
   that email → "Check for new purchases" attaches it.
5. Re-send the webhook from Shopify admin → balance unchanged (idempotent).

## 7. §5 Tradeoffs of skipping confirmation emails (read me)

With "Confirm email" OFF, anyone can register anyone's address. RLS still
protects all rows (an attacker who registers your email gets *their own*
`uid`, never your data), BUT: coin claims match paid-order email to account
email, so whoever registers an address first can claim orders sent to it.
Practical posture:

- Fine for launch/testing and for saved-game data (nothing leaks across users).
- **Before real money volume: turn "Confirm email" ON** (one toggle, zero
  code changes - signup/login/claims work identically either way).
- Until then: keep pack values small, watch Shopify + function logs for odd
  email patterns, and refund-and-revoke manually if a dispute appears.

## 8. Ongoing hygiene

- RLS is the lock; review `schema.sql` diffs before re-running.
- If any key leaks: Supabase API settings → roll the key, update `config.js`
  / secrets. The anon key is public by design - leaking it is not an
  incident; leaking `service_role` or the webhook secret is.
- Never add a client write policy to `coin_grants`/`coin_ledger` - that would
  let any logged-in user mint unlimited Vibe Coins.
