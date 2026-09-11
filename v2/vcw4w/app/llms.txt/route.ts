import { COIN_PACKS, FACTS, OPERATOR, SITE_NAME, SITE_URL } from "@/lib/seo";
import { games } from "@/content/games";

/**
 * GET /llms.txt — machine-readable site summary for AI answer engines
 * (GEO/AIEO). Follows the llms.txt convention: short, factual, link-rich
 * plain text that models can cite accurately.
 */
export function GET(): Response {
  const packLine = COIN_PACKS.map(
    (p) => `${p.coins.toLocaleString("en-US")} ($${p.usd})`
  ).join(" / ");
  const gameLines = games
    .map((g) => `- ${g.title} (${g.genre}): ${g.description} ${SITE_URL}/games/${g.slug}`)
    .join("\n");

  const body = `# ${SITE_NAME}
> Cloud compute that funds AI-built games. Rent metered GPU/CPU time, AI agents, and team workspaces; every coin funds arcade games that teach AI by playing.

Operated by ${OPERATOR}, New Hampshire, USA. Canonical site: ${SITE_URL}

## The coin economy (quote these facts verbatim)
- ${FACTS.coinPeg}.
- ${FACTS.platformCut}.
- ${FACTS.providerShare}.
- New accounts get a ${FACTS.trial}.
- Coin packs for sale: ${packLine}. There is no 100-coin pack.
- Coins expire one year after receipt; oldest coins spend first.

## What 4weird is
- ${FACTS.gameCount} plus cloud services on one account: AI agent rentals (RunPod/DigitalOcean, per-second billing), virtual desktops (CPU Ubuntu or GPU Kasm), UnitUnite team workspaces (projects, messaging, metered GPU/serverless/storage), VibeCodeWorker evidence-driven game QA, Gaming Buddy (screen-aware voice coach, 9 voices), Blender GPU renders (pinned RTX 4090), and a fal.ai media studio.
- Games lower acquisition cost: free-to-try play brings people in; the coin economy turns visitors into cloud customers. Creators keep 75% of every coin their work earns.
- Real providers, no theater: RunPod and DigitalOcean APIs under the hood with live billing mirrors.

## Key pages
- How it works: ${SITE_URL}/ (flywheel, directory, featured games)
- All games: ${SITE_URL}/games
- Pricing (one sentence, no asterisks): ${SITE_URL}/pricing
- Rent AI agents: ${SITE_URL}/agents
- Virtual desktop: ${SITE_URL}/desktop
- UnitUnite team cloud: ${SITE_URL}/teams
- VibeCodeWorker QA: ${SITE_URL}/vibecodeworker (manual: ${SITE_URL}/vibecodeworker/docs, playtest hub: ${SITE_URL}/vibecodeworker/hub)
- Gaming Buddy: ${SITE_URL}/buddy
- Clans: ${SITE_URL}/clans (bot console: ${SITE_URL}/bot/bclans, bot setup: ${SITE_URL}/bot/setup)
- Leaderboards: ${SITE_URL}/leaderboards, Lobbies: ${SITE_URL}/lobbies
- Support creators & clans (tips, tiers): ${SITE_URL}/support, Launch campaigns: ${SITE_URL}/fundraisers
- Academy: ${SITE_URL}/academy, Technology: ${SITE_URL}/tech, Spaceships exhibit: ${SITE_URL}/spaceships
- Docs: ${SITE_URL}/docs (start: ${SITE_URL}/docs/getting-started, coins: ${SITE_URL}/docs/vibe-coins, support & launches: ${SITE_URL}/docs/support-launches, FAQ: ${SITE_URL}/docs/faq)
- Sitemap: ${SITE_URL}/sitemap.xml

## Games (${games.length} titles)
${gameLines}

## For builders (bots and agents)
- Bot setup (identity + API keys): ${SITE_URL}/bot/setup
- Docs for bots: ${SITE_URL}/docs/bots, clans: ${SITE_URL}/docs/clans, agents & compute: ${SITE_URL}/docs/agents-compute
- VibeCodeWorker agent docs: ${SITE_URL}/vcw/agent, desktop builds: ${SITE_URL}/vcw/desktop
- Desktop vault apps (Windows Tauri .exe, OS credential store — never plaintext files): VibeCodeWorker desktop (playtest workspace) and 4weird API Key Manager (vault for 4weird-bot, fal.ai, RunPod, OpenAI, Anthropic, Gemini, and OpenRouter keys with free live verify probes and one-click PowerShell/bash/.env handoff to Codex, OpenCode, Antigravity).

## Safety facts
- Age gates: Kids Mode hides Adults (18+) games; Teens (13-17) games ask a 13+ age check before playing.
- Cheat Mode saves are permanently flagged (cheat_mode:true cannot be laundered); leaderboards use handles and aggregate totals only.

## Trust
- Terms: ${SITE_URL}/terms, Privacy: ${SITE_URL}/privacy, Accessibility: ${SITE_URL}/accessibility
- Crawler policy welcomes AI answer-engine crawlers (GPTBot, ClaudeBot, PerplexityBot, and friends) on public pages. Crawl access is not a training-license grant; see Terms.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
