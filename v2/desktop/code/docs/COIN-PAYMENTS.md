# COIN-PAYMENTS.md — Desktop coin client (DS-OCT-07)

Desktop-side coin payments for VibeCodeWorker: balance lookup + spend-request
against the 4weird API, with a quota guard that pauses the heal loop when coins
run out. Implementation: `../lib/coin_client.js`. Tests:
`../tests/test_coin_client.js` (`node tests/test_coin_client.js`).

> Env-file note: `.env.example` is owned by DS-OCT-09 — this doc lists the coin
> keys here instead of editing that file. Never commit real key values.

## 1. Environment

| Variable | Required | Purpose |
|---|---|---|
| `FOURWEIRD_BOT_KEY` | preferred | Bot key (`bot4weird_` + 20 chars, shown once at `https://4weird.com/bot/setup`). Fallback store: desktop BOT TOKEN drawer (OS app-data file). |
| `VIBE_API_TOKEN` | fallback | Reused as bot-key fallback when `FOURWEIRD_BOT_KEY` is unset (same token the `:42069` API server expects via `X-Vibe-Auth`/Bearer). |
| `FOURWEIRD_BASE_URL` | optional | API base URL override (default `https://4weird.com`; mirrors `lib/parity/backend_client.js`). |

Resolution order (first non-empty wins): explicit `botKey` argument →
`FOURWEIRD_BOT_KEY` → `VIBE_API_TOKEN` → error (`no bot key configured` thrown
before any network call).

Auth on every request (both headers, same key):

```text
Authorization: Bearer <key>
x-bot-key: <key>
```

## 2. Quote shape (consumes DS-OCT-06)

DS-OCT-06 (`v2/vcw4w/app/api/desktop/metering`, still open at build time — coded
to its envelope contract) quotes compute as:

```json
{ "coins": 250, "usd": 2.50 }
```

Rules honored by `parseQuote()` / `coinsToUsd()`:

- **Parity: 100 coins = $1.00.** `usd = coins / 100`, rounded to cents.
- `coins` must be a non-negative integer (floored); `usd` fills from parity
  when absent and flags `usdMismatch` when a provided value disagrees.
- 75/25 split fields (creator/platform) ride on the server receipt — the
  desktop treats them as opaque passthrough (`receipt` object), never
  recomputed locally.

## 3. Flows

### 3a. Balance lookup

```js
const { getBalance, CoinGuard } = require('../lib/coin_client');
const guard = new CoinGuard(); // optional; pass to auto-pause on 402
const bal = await getBalance({ botKey: undefined /* env */, fetchImpl: fetch }, guard);
// -> { coins: 1000, usd: 10.00, usdMismatch: false, raw: <server body> }
```

`GET {base}/api/coins/balance`. Logs `coin_client: balance ok coins=… usd=…`
(key redacted — §5).

### 3b. Spend request

```js
const { requestSpend } = require('../lib/coin_client');
const out = await requestSpend(
  { coins: 50, reason: 'heal-iter-3', idempotencyKey: 'run-abc-iter-3', fetchImpl: fetch },
  guard,
);
// -> { coins: 50, usd: 0.50, receipt: <server body> }
```

`POST {base}/api/coins/spend` with `{ coins, usd, reason?, idempotencyKey? }`.
`usd` derives from parity when omitted. `reason`/`idempotencyKey` are optional
but recommended for heal-loop idempotency.

### 3c. Quota guard (heal-loop pause)

`isQuotaSignal()` treats these as exhausted quota: **HTTP 402**, or any
`code`/`error` containing `insufficient` / `quota` / `exhausted` / `balance`
(status or body). Via `guard.guardedCall()` (used internally by both calls
when a guard is passed):

- guard flips `paused=true` and logs the exact line:

```text
coin_client: quota exhausted (402/insufficient balance) — pausing heal loop until topped up. reason=402/insufficient_balance
```

- the thrown `CoinApiError` carries `quotaPaused=true`.
- heal-loop wiring: check `guard.shouldRun()` at the top of each pass and
  break with verdict `budget_exhausted`-adjacent (`quota_paused`) — mirrors
  `workers/heal_worker.js runHealLoopWithBudget` (DS-OCT-02, read-only).
- `guard.resume()` clears the pause and logs
  `coin_client: quota restored — resuming heal loop.`

401/403 never pause (auth problem, not quota).

### 3d. Retry with backoff

`requestJson()` retries **5xx and network errors only** (default `maxRetries: 3`,
`baseBackoffMs: 250`, waits `250 → 500 → 1000ms`). 4xx (including 402) never
retry. Each retry logs `coin_client: … -> <status> (attempt n/m) — retrying in
<wait>ms` with the key redacted.

## 4. Heal-loop wiring example

```js
const { CoinGuard, getBalance, requestSpend } = require('../lib/coin_client');

const guard = new CoinGuard(); // default logger = console (redacted)
const bal = await getBalance({}, guard);
for (let i = 1; i <= maxIterations; i++) {
  if (!guard.shouldRun()) { verdict = 'quota_paused'; break; } // 402 trip
  // ... bugtest -> opencode fix -> retest ...
  await requestSpend({ coins: costFor(iteration), reason: `heal-iter-${i}` }, guard)
    .catch((e) => { if (!e.quotaPaused) throw e; verdict = 'quota_paused'; });
  if (verdict === 'quota_paused') break;
}
```

Token budgets (`lib/heal_budget.js`, DS-OCT-02) and coin quota compose: either
can stop the loop; report which one tripped in the run verdict.

## 5. Secret hygiene

- `safeLog(logger, msg, key?)` redacts **every** occurrence of the key plus any
  `bot4weird_<chars>`-shaped token before writing; tests assert the raw key is
  absent from all captured lines.
- Never `console.log` headers, URLs with query keys, or raw server bodies that
  might echo credentials — pass strings through `safeLog`/`redactKeyFromText`.
- Keys live in env or the OS app-data drawer only — never in `public/`,
  logs, or committed files.
