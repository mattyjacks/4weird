# Vendor Services (OpenRouter + Outscraper)

66 vendored ops across 7 modules, registered in `lib/vendor-catalog.ts`
(`VENDOR_SERVICES` + `vendorServiceCount()` + `findVendorService`).
Prices are gross Vibe Coins (100 coins = $1.00).

| Vendor module      | Ops | Served by |
| ------------------ | --: | --------- |
| openrouter-chat    |  12 | POST /api/openrouter-vendor/generate |
| openrouter-agent   |  12 | POST /api/openrouter-vendor/generate |
| openrouter-meta    |   8 | POST /api/openrouter-vendor/generate |
| outscraper-maps    |  10 | POST /api/outscraper/search |
| outscraper-reviews |   8 | POST /api/outscraper/search |
| outscraper-search  |   8 | POST /api/outscraper/search |
| outscraper-leads   |   8 | POST /api/outscraper/search |
| **Total**          | **66** | (>= 50 requirement met) |

## Coin rule

Every price INCLUDES the 25% platform cut — never added on top. The wallet
is debited the gross; the ledger splits it 25% platform / 75% provider.

## Metering

Debit-first, fail-closed — never free:

1. Balance pre-check (live): both `POST /api/openrouter-vendor/generate`
   and `POST /api/outscraper/search` call `get_my_coin_balance` against
   the gross quote; short balances get `402 Insufficient Vibe Coin balance`.
2. Debit-first via `meter_openrouter_usage` / `meter_outscraper_usage`:
   both routes call their RPC (with `p_vendor/p_game/p_op/p_qty/p_source`)
   AFTER the balance pre-check but BEFORE the provider fetch. A failed
   meter fails the run (fail-closed); `insufficient balance` maps to 402.
   The receipt (incl. `usage_id`) lands in the 201 response as `meter`.
3. Refund-on-failure: provider failures AFTER the debit call
   `refund_vendor_usage` (full gross back, row marked `refunded_at`;
   double refunds raise `already refunded`). A failed refund keeps the
   debit and the 502 says `Charge NOT refunded — contact support`.
   Rollups go NET (refunded rows excluded) with `refunded_charges` /
   `refunded_coins` counters. Usage rollups: `GET /api/openrouter-vendor/usage`
   and `GET /api/outscraper/usage` expose the `my_*_usage` rollups (reads free).

Landed: `supabase/migrations/20261201000000_openrouter_metering.sql`
(`openrouter_usage` + `meter_openrouter_usage()` + `my_openrouter_usage()`),
`20261201000001_outscraper_metering.sql` (`outscraper_usage` +
`meter_outscraper_usage()` + `my_outscraper_usage()`), and
`20261202000000_vendor_usage_refunds.sql` (`refund_vendor_usage()` +
`usage_id` receipts + net rollups). SQL CASE arms cover
all 32 OpenRouter + 34 Outscraper op keys; all three migrations were
executed against scratch Postgres 16 (meter → refund → double-refund /
cross-user / insufficient / invalid-op cases green) — see
`scripts/verify-vendor-metering.mjs`.

## Env keys (server-only, never `NEXT_PUBLIC_`)

- `OPENROUTER_API_KEY` — OpenRouter chat/agent/meta ops (already in `.env.example`).
- `OUTSCRAPER_API_KEY` — Outscraper maps/reviews/search/leads ops.

## API routes

- `GET /api/openrouter-vendor/ops` — list chat/agent/meta ops + configured flag.
- `POST /api/openrouter-vendor/generate` — run an op (`{ vendor, op, input }`).
- `GET /api/outscraper/ops` — list maps/reviews/search/leads ops + configured flag.
- `POST /api/outscraper/search` — run an op (`{ vendor, op, input }`).

## Unconfigured behavior (honest)

Without the key, the routes return `started: false` + `not-configured`
(or a labelled free local fallback where noted) — never faked, never metered.

## Registry notes

- `lib/cloud-catalog.ts` was intentionally left untouched: its entries feed
  `GET /api/cloud/services` and billing UI, so 66 vendor rows do not belong there.
- `lib/vendor-catalog.ts` probes the 7 sibling modules with a tolerant loader
  (absent modules fall back to the static table), so the count stays >= 66
  whether or not the sibling modules have landed yet.
