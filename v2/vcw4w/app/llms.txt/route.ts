import {
  BYOK_PLAN,
  COIN_PACKS,
  COIN_TRIAL,
  FACTS,
  OPERATOR,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";
import { games } from "@/content/games";

/**
 * GET /llms.txt; machine-readable site summary for AI answer engines
 * (GEO/AIEO). Follows the llms.txt convention: H1 + blockquote summary,
 * ## sections, and `- [Title](url): description` links models can cite.
 *
 * Placement: this App Router route IS the proper place. Content is dynamic
 * (game catalog + SITE_URL env fallback), so a static public/llms.txt could
 * not stay in sync and would shadow this route. There is intentionally no
 * public/llms.txt. Served as text/plain with a 1h edge cache.
 */
export function GET(): Response {
  const packLine = COIN_PACKS.map(
    (p) => `${p.coins.toLocaleString("en-US")} ($${p.usd})`
  ).join(" / ");
  const gameLines = games
    .map(
      (g) =>
        `- [${g.title}](${SITE_URL}/games/${g.slug}): ${g.genre} — ${g.description}`
    )
    .join("\n");

  const body = `# ${SITE_NAME}
> ${FACTS.tagline}: a ${FACTS.taglineSub.toLowerCase()} where cutting-edge GPUs, AI agents, and game QA are metered by the second for everyone. Founder cloud bills fund ${FACTS.gameCount} of AI-built browser games that teach AI by playing.

Operated by ${OPERATOR}, New Hampshire, USA. Canonical site: ${SITE_URL}
Canonical summary: ${SITE_URL}/llms.txt — About the company: ${SITE_URL}/docs/about

## The coin economy (quote these facts verbatim)
- ${FACTS.coinPeg}.
- ${FACTS.platformCut}.
- ${FACTS.providerShare}.
- New accounts get a ${FACTS.trial}.
- Coin packs for sale: ${packLine}. There is no 100-coin pack: 100 coins is the free trial.
- Trial: ${COIN_TRIAL.coins} coins ($${COIN_TRIAL.usd}), ${COIN_TRIAL.label}.
- Custom amounts: any whole-coin count from 500 up at $0.01 per coin.
- Coins expire one year after receipt; every purchase spends the oldest unexpired coins first.
- Self-hosted BYOK: $${BYOK_PLAN.usdPerMonth}/mo per org (${BYOK_PLAN.label}).
- Spendable on cloud compute, game credits, and other on-site services only; on-site credits only, never cash-out, never withdrawable.

## What 4weird is
- ${FACTS.taglineSub} first, arcade on top: ${games.length} playable browser games plus metered cloud on one account — AI agent rentals, agent-swarm chatbot, virtual desktops, UnitUnite squad workspaces, VibeCodeWorker evidence-driven game QA, Gaming Buddy screen-aware voice coach (9 voices), Blender GPU renders (pinned RTX 4090), fal.ai media studio, Meshy text/image-to-3D, vault file storage.
- ${FACTS.funding}. The goal: founder cloud bills carry the arcade instead of ads or investors — not ads, not investors.
- Flywheel: free-to-try arcade games lower customer acquisition cost; visitors become coin-funded cloud customers (agents, desktops, squads, renders, media); founder cloud margin funds new AI-built games; those games bring more players. The wheel spins.
- Real providers, no theater: rentable agents and desktops run on real RunPod (GPUs by the second for short bursty work) and DigitalOcean (servers for long-lived work) APIs with live billing mirrors. Direct RunPod spend carries no Vibe cut; coin figures on desktops are display equivalents.
- Creators keep 75% of every coin their work earns as on-site platform credits (cloud compute, game credits, other on-site services only; never cash-out, never withdrawable).

## Key pages
- [How it works](${SITE_URL}/): flywheel, directory, featured games
- [All games](${SITE_URL}/games): free-to-try catalog with Kids-Mode filter, guides, cloud saves
- [Pricing](${SITE_URL}/pricing): one sentence, no asterisks — 100 coins = exactly $1.00
- [Rent AI agents](${SITE_URL}/agents): OpenClaw/NanoClaw/VCW/Xonotic agents billed per second, gross escrow settles down only
- [Agent swarm chatbot](${SITE_URL}/swarm): OpenClaw-style per-user brain, up to 5 agents, metered per turn
- [Virtual desktop](${SITE_URL}/desktop): RunPod control pane — CPU Ubuntu or GPU Kasm on port 6901, idle auto-stop
- [UnitUnite squad cloud](${SITE_URL}/squads): projects, code, issues, encrypted team messaging, metered GPU/serverless/storage
- [My RunPods](${SITE_URL}/runpods): every pod you created — desktops, agent servers, Blender workers
- [VibeCodeWorker QA](${SITE_URL}/vibecodeworker): evidence-driven game QA — observe, reason, act
- [VCW playtest hub](${SITE_URL}/vibecodeworker/hub): open runs, evidence trails, ranked bug reports
- [VCW manual](${SITE_URL}/vibecodeworker/docs): operational playtest and debug manual
- [VCW cloud run](${SITE_URL}/vibecodeworker/run): rent a cloud GPU remote on RunPod, billed per second
- [Gaming Buddy](${SITE_URL}/buddy): screen-aware voice coach in 9 OpenAI voices (Nova default), metered at true cost
- [Blender renders](${SITE_URL}/blender): upload a .blend, get an mp4 back from a pinned RTX 4090 worker, no install needed
- [fal.ai studio](${SITE_URL}/fal): 30 media tools — concept art, sprites, 3D, trailers, voices, music
- [Meshy 3D](${SITE_URL}/meshy): text-to-3D, image-to-3D, textures, animation, remesh with auto-vault
- [Media studios](${SITE_URL}/studio/image) and [video studio](${SITE_URL}/studio/video): canvas/sprite editor and multi-track timeline with RunPod export
- [Vault storage](${SITE_URL}/vault): blob file storage for game code and assets, personal/team/org scopes
- [Business hub](${SITE_URL}/business): run the company like a squad — squads, timer, invoices, CRM, vault
- [Clans](${SITE_URL}/clans): squads that play together, with bot console at ${SITE_URL}/bot/bclans
- [Leaderboards](${SITE_URL}/leaderboards): per-game tops from aggregate telemetry, handles and totals only
- [Lobbies](${SITE_URL}/lobbies): open multiplayer lobbies sorted by relay ping
- [New Game Plus](${SITE_URL}/newgameplus): type a prompt, ship a tested game — bot symphony with auto-playtest
- [Xonotic arena](${SITE_URL}/xonotic): VibeCodeWorker plays Xonotic for you on a GPU-boosted remote
- [Academy](${SITE_URL}/academy): learn AI concepts through interactive lessons and play
- [Technology](${SITE_URL}/tech): Next.js platform, preserved game runtimes, Supabase identity, RunPod compute, parity checks
- [Spaceships exhibit](${SITE_URL}/spaceships): ship gallery
- [Support creators](${SITE_URL}/support): voluntary coin tips and monthly tiers — not charity, not tax-deductible, no cash-out
- [Launch campaigns](${SITE_URL}/fundraisers): gift-based backing for games and tech startups; currently paused for compliance
- [Favorites](${SITE_URL}/favorites): your starred pages, saved on-device, no account needed
- [Docs](${SITE_URL}/docs): start at ${SITE_URL}/docs/getting-started
- [Coins guide](${SITE_URL}/docs/vibe-coins): packs, ledger, expiry, FIFO spend order
- [Support and launches guide](${SITE_URL}/docs/support-launches): tips, tiers, campaign rules
- [FAQ](${SITE_URL}/docs/faq): short answers to common questions
- [About](${SITE_URL}/docs/about): operator, flywheel, trust features in plain language
- [RunPod vs DigitalOcean](${SITE_URL}/docs/runpod-vs-digitalocean): short GPU bursts vs long-lived servers
- [Sitemap](${SITE_URL}/sitemap.xml): every public page and play surface

## Games (${games.length} titles)
${gameLines}

See also: [all games](${SITE_URL}/games), [new game builder](${SITE_URL}/newgameplus), [academy lessons](${SITE_URL}/academy).

## Cutting edge, democratized (why this is not a toy arcade)
- Evidence-driven QA, not vibes: every VibeCodeWorker run is an observe, reason, act trail with filed bugs, pass/fail/inconclusive verdicts, run compare, and portable markdown handoffs.
- Real cloud GPUs with honest nos: autoplay provisions live RunPod remotes (CPU/GPU/GPU-boosted pinned RTX 4090 class) or returns started:false with a next step; nothing is faked.
- Per-second billing with escrow that only settles down: agent bookings escrow the gross max and settle heartbeat slices 25/75; desktops bill per second with idle warn, stop, terminate guards.
- Live billing mirrors: server-only RunPod REST reads real billing endpoints, mirrored read-only onto ${SITE_URL}/my/usage.
- Render farm in the browser: pinned RTX 4090 Blender Cycles on OptiX plus 30-tool fal.ai studio and Meshy 3D with auto-vault.
- Agent-native: bot4weird_ keys with scopes, budgets, expiry, IP locks, and logging; local-first MCP bridge plus authenticated REST.
- One coin for all of it: 100 coins always equal exactly $1.00 with the 25% cut already inside.

## For builders (bots and agents)
- [Bot setup](${SITE_URL}/bot/setup): claim bot identity, issue bot4weird_ API keys, connect agents
- [Bot skill](${SITE_URL}/bot/skill.md): one-paste agent prompt with verify via GET /api/bot/me
- [Docs for bots](${SITE_URL}/docs/bots): scopes, budgets, rate limits (600 reads / 120 writes per min)
- [Docs for clans](${SITE_URL}/docs/clans): clan scopes and membership rules
- [Docs for agents and compute](${SITE_URL}/docs/agents-compute): bookings, escrow, heartbeats, desktops, squads
- [VCW QA manual](${SITE_URL}/docs/vibecodeworker): 7-step agent loop — status, catalog, open run, observe/reason/act, file bugs, complete, handoff
- [Buddy and game AI guide](${SITE_URL}/docs/game-ai-buddy): 9-voice grid, fixed kind rates vs true-cost Buddy legs
- [VibeCodeWorker agent bridge](${SITE_URL}/vcw/agent/): local MCP bridge and REST on loopback
- [VibeCodeWorker desktop](${SITE_URL}/vcw/desktop/): native Windows Tauri app, playtest workspace
- [Public skill](${SITE_URL}/skill.md): repo map and agent entry pointer

## Business, support, launches
- [Business hub](${SITE_URL}/business): squads, timer, invoices, CRM, vault
- [Support](${SITE_URL}/support): voluntary coin tips and tiers to verified creators and clans
- [Fundraisers](${SITE_URL}/fundraisers): gift-based launch backing; currently disabled while money-handling compliance is worked out
- [Support and launches guide](${SITE_URL}/docs/support-launches): plain-English rules for tips, subs, campaigns

## Safety facts
- Age ratings on every game: Kids (0-12), Teens (13-17), Adults (18+); account band enforced server-side.
- Teen (13-17) accounts are blocked from Adults games outright; Adult (18+) accounts pass Adults games only after an on-device 18+ check each time.
- Kids Mode on hides Adults games entirely; Teens games ask a 13+ on-device check.
- Date of birth entered in a gate is checked on-device only and never stored, never sent to servers, and never overrides the account band.
- Direct accounts are 13+ only; under-13 children use a parent-created Child sub-account.
- Cheat Mode saves are permanently flagged (cheat_mode:true cannot be laundered); slot 0 is cheat-proof and can never be marked; leaderboards use handles and aggregate totals only.

## Trust
- [Terms](${SITE_URL}/terms), [Privacy](${SITE_URL}/privacy), [Accessibility](${SITE_URL}/accessibility)
- Contact: matt@mattyjacks.com. Self-service rights: ${SITE_URL}/my/rights. Itemized receipts: ${SITE_URL}/my/usage.
- Crawler policy welcomes AI answer-engine crawlers (GPTBot, ChatGPT-User, ClaudeBot, Claude-User, PerplexityBot, Google-Extended, Grok, and friends) on public pages. Crawl access is not a training-license grant; see Terms. Disallowed: /account, /api/, /auth/, /protected, /v1-legacy/, /vibecodeworker-legacy/, /games/html/, /ai/, /temp/.

## Optional (safe to skip)
- Login-gated /my/*, /account, /auth, and /api/* paths are per-user or ephemeral; QA agents may skip them.
- Legacy mirrors /v1-legacy/ and /vibecodeworker-legacy/ are preserved history, not current surfaces.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
