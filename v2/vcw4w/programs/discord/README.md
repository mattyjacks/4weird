# 4weird clan-raid Discord bot (skeleton)

Remastery README §4.6 Feature 19 — community & clan-raid Discord bot, Wave 2
slice. A **discord.js v14** skeleton: it connects, registers four slash
commands, and answers. Persistence and ledger wiring are explicitly stubbed
(see "What is stubbed" below).

## Commands

| Command           | What it does (today)                                    |
| ----------------- | ------------------------------------------------------- |
| `/raid-signup`    | Signs you up for a raid — STUB: in-memory, lost on restart |
| `/raid-leaderboard` | Ranks signups in signup order — STUB: reads the stub store only |
| `/balance`        | Vibe Coin balance lookup — STUB: answers "not wired", never a number |
| `/clan-roster`    | Clan roster — STUB: no membership source, shows a notice |

## Required env (no real tokens — ever)

Copy the names below into your own `.env` (gitignored by convention — do NOT
commit it, and never paste tokens into chat, envelopes, or `public/swarm/`):

```sh
DISCORD_TOKEN=      # bot token from the Discord Developer Portal (required: npm start)
DISCORD_CLIENT_ID=  # application id (required: npm run register)
DISCORD_GUILD_ID=   # optional dev-guild id — guild registration is instant; global takes ~1h
LEDGER_API_URL=     # optional future ledger endpoint (currently unwired; see below)
```

## Build / run

```sh
cd v2/vcw4w/programs/discord
npm install
npm run build    # tsc -> dist/
npm run lint     # eslint src
npm run register # push slash commands (needs DISCORD_TOKEN + DISCORD_CLIENT_ID)
npm start        # connect (needs DISCORD_TOKEN)
```

## What is stubbed (and the rules around it)

- **Coin balances (hard rule): the bot never invents balances.** `/balance`
  goes through `src/lib/ledger.ts` `lookupCoinBalance`, which mirrors the
  canonical convention — balance = `SUM(delta)` over the `coin_ledger` table
  per user, 100 coins = exactly $1.00 (cf. `v2/vcw4w/lib/bot-auth.ts`
  `ownerCoinBalance`, `v2/vcw4w/lib/economy.ts`) — and until a real
  `LedgerReader` is injected (via `setLedgerReader` or the future
  `LEDGER_API_URL` wiring) it answers with an explicit stub notice.
  A notice is never a number.
- **Raid signups** live in a `Map` in `src/commands/raid-signup.ts`.
  Lost on restart. The Wave-2+ slice persists them (e.g. a `raid_signups`
  table); the leaderboard reads only this stub store — never the ledger.
- **Clan roster** has no membership source wired (future: `team_members` /
  clan tables) and says so instead of fabricating members.
- **Discord → 4weird identity linking** is TODO in `src/commands/balance.ts`.

## Layout

```text
programs/discord/
  package.json            standalone npm package (discord.js v14 + TS)
  tsconfig.json           strict, outDir dist/
  eslint.config.mjs       flat config (TS recommended)
  README.md               this file
  src/
    index.ts              gateway bootstrap + env guard
    register-commands.ts  one-shot command registration
    commands/
      index.ts            registry (payloads + dispatch + registerCommands)
      raid-signup.ts      /raid-signup (stub store lives here)
      raid-leaderboard.ts /raid-leaderboard (reads stub store only)
      balance.ts          /balance (ledger stub, hard rules in comments)
      roster.ts           /clan-roster (stub notice)
    lib/
      ledger.ts           lookupCoinBalance + parity helpers (STUB until wired)
```
