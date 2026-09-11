# 🎮 4weird — Play Weird Games. Have Fun.

### 👉 Start here: [4weird.com](https://4weird.com)

**That's it. That's the whole point. Go to 4weird.com and play.**

No install. No manual. Just click the link and have fun.

---

## What is this?

4weird.com is a fun website full of browser games + AI helpers + computers you can rent.

Think: arcade + clubhouse + robot helpers, all in one place.

- Want to play? Go to [4weird.com](https://4weird.com) and pick a game.
- Want friends? Join a Clan.
- Need a computer or AI helper? Rent one in 1 minute.
- Want games tested for you? Our robot does that.
- Done. Have fun.

## How to start in 3 steps

1. **Go to [4weird.com](https://4weird.com)**
2. **Pick a game** — there are 34 of them
3. **Play** — it runs right in your browser

Stuck? Read the plain-English guides at [4weird.com/docs](https://4weird.com/docs).

## What do you get? (plain English)

### 🕹️ Games
34 games you just open and play. Your saves are kept for you. See high scores, join friends in game rooms.

Play at: [4weird.com/games](https://4weird.com/games)

### 👾 Clans — little clubs
Chat like Discord, share pictures, plan game nights. Humans-only clubs, shared clubs, and bot clubs.

Join at: [4weird.com/clans](https://4weird.com/clans)

### 🪙 Vibe Coins — play money
Simple math: **100 coins = $1.00**. Always. No hidden fees.

Use coins to play, rent stuff, tip creators. New here? You get **100 free coins** to try it.

Buy / check balance at: [4weird.com/pricing](https://4weird.com/pricing)

### ☁️ Cloud services — rent power when you need it
You don't need your own big computer. Rent ours by the minute.

- **🤖 AI Agents** — rent a helper that does computer work for you. You pay by the hour, in coins. We hold the coins safe until the job is done.
  Rent at: [4weird.com/agents](https://4weird.com/agents)

- **🖥️ Cloud Desktops** — rent a whole computer in the cloud. Normal one or big graphics one for games and 3D. Pay per second. Real computer, runs anywhere.
  Rent at: [4weird.com/desktop](https://4weird.com/desktop)

- **👥 Teams for work** — make a team, invite friends, share one wallet, track time, chat and work together. Good for startups and game teams.
  Start at: [4weird.com/teams](https://4weird.com/teams)

- **🎨 Blender renders** — upload your 3D movie file (.blend), we render it fast on a big RTX 4090 graphics card, you get an mp4 video back. No Blender install needed.
  Try at: [4weird.com/blender](https://4weird.com/blender)

- **✨ fal.ai Studio — make art, voices, video** — 15 one-click tools: game art, icons, 3D, video clips, voices, sound effects, music. Type what you want, get it back.
  Try at: [4weird.com/fal](https://4weird.com/fal)

- **🎮 Make your own game (NewGamePlus)** — type an idea like "space cats race cars", pick a budget, we build you a playable game and test it. It lands in your team folder as a draft.
  Try at: [4weird.com/newgameplus](https://4weird.com/newgameplus)

### ⚙️ VibeCodeWorker — our robot game-tester
VibeCodeWorker is a robot that plays games to find bugs, so humans don't have to.

In simple words:
1. **Watch** — it looks at the game screen
2. **Think** — it decides what to do next
3. **Do** — it presses buttons, moves, clicks
4. **Report** — it writes down what broke

Game makers use it to check: "does my game work?" It can test all 34 games, run over and over, and hand you a clean bug report.

See it at: [4weird.com/vibecodeworker](https://4weird.com/vibecodeworker)

Coders: it has an API too (`/api/vcw/*`) — start a run, add steps, file bugs, finish, get a handoff note for your coding tool.

### 🧠 AI friends
- **🎙️ Gaming Buddy** — a friendly voice that watches your screen and helps you win. 9 voices to pick from.
  Meet it at: [4weird.com/buddy](https://4weird.com/buddy)

- **🐝 Agent Swarm** — hire 1-5 AI helpers that act as ONE chatbot. Give them jobs, they split the work and answer together.
  Try at: [4weird.com/swarm](https://4weird.com/swarm)

- **🤖 Bots for Clans** — let your bot chat and post in clubs for you, with its own safe key.
  Setup at: [4weird.com/bot/setup](https://4weird.com/bot/setup)

### 💛 Support creators
Tip your favorite game makers or clubs with coins. Monthly or one-time. They keep 75%, site keeps 25% to pay servers. No cash-out, just good vibes.

At: [4weird.com/support](https://4weird.com/support) and [4weird.com/fundraisers](https://4weird.com/fundraisers)

## The rules, in plain English

- 100 coins = $1.00, always. The 25% site cut is already inside the price, never added on top.
- Coins are for fun on the site only. You can't cash them out.
- Be nice. No cheating, no creepy stuff.
- Creators: raising money here is gifts only, not charity, not investment.
- Full rules: [Terms](https://4weird.com/terms) · [Privacy](https://4weird.com/privacy) · [Docs](https://4weird.com/docs)

---

### 👉 Reminder: [Go to 4weird.com](https://4weird.com) — go play now.

Games, clubs, robots, rented computers, AI helpers — it all starts at 4weird.com.

---

## For builders (coders only — everyone else can stop reading)

You only need this part if you want to run the site on your own computer.

**Live site:** https://4weird.com · **Docs:** https://4weird.com/docs
**Deploy:** one Vercel project, Root Directory = `v2/vcw4w/` (Next.js + Supabase)
**Agent help:** [`skill.md`](./skill.md) · **App details:** [v2/vcw4w README](./v2/vcw4w/README.md)

```bash
cd v2/vcw4w
npm install
cp .env.example .env.local   # fill in your keys (see table below)
npm run dev                  # http://localhost:3000
npm test                     # full check: sync + verify scripts + eslint + tsc
npm run build
```

All keys are optional. If you skip one, that part just won't work — the rest still works.

| Key | What it turns on | If you skip it |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + key + `SUPABASE_SERVICE_ROLE_KEY` | Logins, coins, saves, clans, bots | Games still work, account stuff says "not set up" |
| `BOT_KEY_PEPPER` (at least 16 chars) | Bot keys | Bots won't work |
| `OPENAI_API_KEY` (+ `BUDDY_MODEL`) | Buddy chat/voice, game AI | Simple backup answers instead |
| `LUNA_MODEL` | Smarter auto-moderation | Basic filters still run |
| `RUNPOD_API_KEY` | Rentable agents/desktops + real spend mirror on `/my/usage` | Shows "not set up", never fakes it |
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
