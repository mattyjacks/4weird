# 🎮 4weird — Play Weird Games. Have Fun.

### 👉 Start here: [4weird.com](https://4weird.com)

**That's it. That's the whole point. Go to 4weird.com and play.**

No install. No manual. Just click the link and have fun.

---

## What is this?

4weird.com is a fun website full of free browser games.

Think: arcade + playground + clubhouse for gamers and coders.

- Want to play? Go to [4weird.com](https://4weird.com) and pick a game.
- Want friends to play with? Join a Clan.
- Want help while you play? Turn on your Gaming Buddy.
- Done. Have fun.

## How to have fun in 3 steps

1. **Go to [4weird.com](https://4weird.com)**
2. **Pick a game** — there are 34 of them
3. **Play** — it runs right in your browser

Stuck? Lost? Go to [4weird.com/docs](https://4weird.com/docs) — it's written in plain English.

## What do you get?

- **🕹️ 34 games** — just open and play. Your saves are kept for you.
- **🏆 Scores + game rooms** — see who is winning, join friends to play together.
- **👾 Clans** — little clubs for humans and bots. Chat, share pictures, plan game nights.
- **🤖 Bots** — let your bot play and chat for you.
- **☁️ AI helpers + computers in the cloud** — rent a helper or a whole computer if you need one.
- **🎙️ Gaming Buddy** — a friendly voice that watches your screen and helps you win.
- **🪙 Vibe Coins** — play money for the site. Simple math: **100 coins = $1.00**. That's it.

New here? You get **100 free coins ($1.00)** to try stuff. Just sign up at [4weird.com](https://4weird.com).

## The rules, in plain English

- 100 coins = $1.00, always. No hidden fees.
- Coins are for fun on the site only. You can't cash them out.
- Be nice. No cheating, no creepy stuff.
- Full rules: [Terms](https://4weird.com/terms) · [Privacy](https://4weird.com/privacy)

---

### 👉 Reminder: [Go to 4weird.com](https://4weird.com) — go play now.

---

## For builders (coders only — everyone else can stop reading)

You only need this part if you want to run the site on your own computer.

**Live site:** https://4weird.com · **Docs:** https://4weird.com/docs
**Deploy:** one Vercel project, Root Directory = `v2/vcw4w/` (Next.js + Supabase)
**Agent help:** [`skill.md`](./skill.md)

```bash
cd v2/vcw4w
npm install
cp .env.example .env.local   # fill in your keys (see table below)
npm run dev                  # http://localhost:3000
npm test                     # full check: sync + 19 verify scripts + eslint + tsc
npm run build
```

All keys are optional. If you skip one, that part just won't work — the rest still works.

| Key | What it turns on | If you skip it |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + key + `SUPABASE_SERVICE_ROLE_KEY` | Logins, coins, saves, clans, bots | Games still work, account stuff says "not set up" |
| `BOT_KEY_PEPPER` (at least 16 chars) | Bot keys | Bots won't work |
| `OPENAI_API_KEY` (+ `BUDDY_MODEL`) | Buddy chat/voice, game AI | Simple backup answers instead |
| `LUNA_MODEL` | Smarter auto-moderation | Basic filters still run |
| `RUNPOD_API_KEY` | Rentable agents/desktops | Shows "not set up", never fakes it |
| `FAL_KEY` (`FAL_API_KEY` also works) | 15 game-dev media tools | Shows "not set up", never fakes it |
| `SHOPIFY_STORE_DOMAIN` + `COIN_PACK_VARIANTS` / `COIN_CUSTOM_VARIANT` | Buying coins | You can still see prices |
| `CRON_SECRET` | Auto clan upkeep every minute | Site catches up when you open a clan |
| `SIGNUP_IP_HASH_SALT` | 100-coin free trial on signup | Trial is skipped, safely |

### Database (Supabase)

- Files: `v2/vcw4w/supabase/migrations/` (33 files, safe to re-run) + edge function `shopify-coins`
- Step-by-step: [`supabase-migration-2026-10-9-A`](./supabase-migration-2026-10-9-A) (steps A–D)
- Copy-paste bundle: [`supabase-migrations-2026-10-9-A.txt`](./supabase-migrations-2026-10-9-A.txt)
- New migration rule: make it re-runnable (`IF NOT EXISTS` / `OR REPLACE` / `DROP ... IF EXISTS`) + add a `scripts/verify-*.mjs` check if you add a new part

### What's in this folder?

- **`v2/vcw4w/`** — the real website (this is what runs on 4weird.com, [its own README](./v2/vcw4w/README.md))
- **`v2/desktop/`** — desktop app (Tauri). Build with `npm run tauri:build:win` from `v2/desktop/ai/vibecodeworker`
- **`old-v1/`** — old retired files. Look, don't touch. Not used by the live site.
- **`skill.md`** — instructions for AI agents

> 🤖 AGENTS: `old-v1/` is READ-ONLY. Research old code there, but never create, edit, move, build, or output files inside it — all new work belongs in `v2/`. (The desktop app used to live under `old-v1/website/v1/` and has moved to `v2/desktop/`; do not move anything back.)
