import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/search" },
  title: "Site Search — Instant Keywords + Luna AI Rerank",
  description:
    "Search 4weird instantly from a static keyword index, with an optional Luna AI rerank. Tagging conventions for makers, bot API examples against /api/search, and cost notes.",
};

const theme = {
  bg: "bg-gradient-to-br from-cyan-950 via-slate-950 to-violet-950",
  border: "border-cyan-300/20",
  chip: "border-cyan-300/40 bg-cyan-300/10 text-cyan-200",
  title: "bg-gradient-to-r from-cyan-300 via-sky-200 to-violet-300 bg-clip-text text-transparent",
};

export default function SearchDocsPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · search"
        title={<>Find anything. <span className={theme.title}>Instantly, then intelligently.</span></>}
        lede={<>Site search pairs a zero-cost static keyword index (built at deploy time, searched on-device) with an optional Luna AI rerank for intent and typos. Press Ctrl/⌘+K anywhere, or share a link to /search?q=.</>}
        stats={[
          ["$0", "keyword searches"],
          ["60s", "Luna result cache"],
          ["x5", "title match weight"],
          ["100k", "pages per shard plan"],
        ]}
        glyph="🔍"
        theme={theme}
        crumb="Search"
        art={
          <div className="flex items-center gap-2 font-mono text-xs" aria-hidden="true">
            <div className="docs-float rounded-full border border-cyan-200/50 bg-cyan-300/10 px-4 py-2 text-cyan-200">
              /search?q=neon
            </div>
            <div className="docs-float rounded-full border border-violet-200/50 bg-violet-300/10 px-4 py-2 text-violet-200" style={{ animationDelay: "0.8s" }}>
              ✨ Luna rerank
            </div>
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="How search works"
        title="Instant keywords first, Luna AI on request"
        body="Every keystroke searches a static index (public/search/index.json plus lazy shards) on-device: tokenize, weighted rank — title ×5, tags ×3, quick ×2, detail ×1 — typo-tolerant prefix match, top-N with scores. No network, no cost, works offline. The Luna AI pass is opt-in per query: it reads intent and re-ranks the top-20 keyword hits."
      />
      <MockWindow title="search — “neon racer”" badge="instant + Luna">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Neon Racer — Racing</span><span className="font-black text-cyan-300">0.98 instant</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>Neon Void Runner — Endless Runner</span><span className="font-black text-cyan-300">0.91 instant</span></div>
          <div className="flex justify-between gap-3 rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2"><span className="font-bold text-violet-200">✨ Luna: you meant arcade racing, neon first</span><span className="font-black text-violet-200">reranked</span></div>
        </div>
      </MockWindow>
      <Callout tone="cyan" title="Landing alongside this page">
        The search wave (DS-SEARCH-01…06) is landing the index builder, ranker lib, <code>/api/search</code>, overlay UI, header mount, and <code>/search</code> page next to this doc. Anything below marked planned describes the sibling contract, not shipped code — the verifier (<code>scripts/verify-search.mjs</code>) checks each piece and skips what has not landed yet.
      </Callout>

      <SectionHead
        index="2"
        kicker="For makers"
        title="Tagging convention: tag it and it is findable"
        body="Search only finds what entries declare. The planned tag rules (sibling DS-SEARCH-06) derive tags per kind and let any page override them in a registry: games carry genre + tags + age rating, docs carry section + keywords, music carries mood + instruments, servers carry dimension + band."
      />
      <Steps
        items={[
          ["Games: genre + tags + rating", <>The catalog already gives every game a genre, a tags array, and an age rating — the index builder reads <code>content/games.ts</code> directly, so a game with <code>tags: [&quot;Racing&quot;, &quot;Arcade&quot;]</code> answers both queries. Keep tags short, lowercase-friendly, player words.</>],
          ["Docs: section + keywords", <>Docs pages declare their section (<code>studio</code>, <code>music</code>, <code>search</code>) plus 3–5 keywords in frontmatter. This page, for example, answers “search”, “luna”, “keyword”, and “bot api”.</>],
          ["Overrides beat derivations", <>A per-page override registry wins over derived tags. Use it for synonyms and event names (“mmo”, “4weird-fest”) that the derivation rules cannot guess — never fork the rules file for one page.</>],
          ["Check your page is indexed", <>After the builder lands, run <code>node scripts/build-search-index.mjs</code> then <code>node scripts/verify-search.mjs</code>: the gate fails if any <code>content/games.ts</code> slug is missing from the index, and warns while sibling routes are still in flight.</>],
        ]}
      />

      <SectionHead
        index="3"
        kicker="Bot API"
        title="Query search from a bot"
        body="Bots hit the same planned endpoint the overlay uses. GET is the instant keyword pass; POST adds the Luna rerank. Both are rate-limited per IP, and Luna answers are cached for 60 seconds. When Luna is unconfigured or down, the endpoint fails OPEN to keyword results — never an error."
      />
      <MockWindow title="terminal — bot search examples" badge="curl">
        <div className="space-y-2 overflow-x-auto font-mono text-xs">
          <p className="whitespace-pre rounded-lg bg-white/5 px-3 py-2">curl &quot;https://4weird.com/api/search?q=neon+racer&quot;</p>
          <p className="whitespace-pre rounded-lg bg-white/5 px-3 py-2">{"curl -X POST https://4weird.com/api/search \\"}</p>
          <p className="whitespace-pre rounded-lg bg-white/5 px-3 py-2">{"  -H 'Content-Type: application/json' \\"}</p>
          <p className="whitespace-pre rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2">{"  -d '{\"q\":\"neon racer\",\"luna\":true}'"}</p>
        </div>
      </MockWindow>
      <Callout tone="violet" title="Planned: /api/search is a sibling scope">
        Sibling DS-SEARCH-03 owns <code>app/api/search/route.ts</code> (GET instant results, POST Luna intent + rerank of the top-20, 10s abort, fail-open to keywords). Until it lands, these examples describe the contract — point bots at the overlay UI or the static <code>public/search/index.json</code> instead.
      </Callout>

      <SectionHead
        index="4"
        kicker="Cost"
        title="Keywords are free; Luna is cached and limited"
        body="Keyword search costs nothing: it runs against a static file, on-device, with zero backend calls. Luna only spends when a query opts into the AI pass — and then the 60-second cache, per-IP rate limit, and top-20 rerank cap keep it bounded. Keys stay server-side: the verifier fails the build if a Luna key ever appears in the client overlay bundle."
      />
      <Callout tone="emerald" title="Never ship the key">
        The client overlay must never reference <code>OPENAI_API_KEY</code> or embed an <code>sk-</code> secret — <code>scripts/verify-search.mjs</code> scans the overlay, the static index, and this page for secret-shaped literals on every run.
      </Callout>

      <Pager current="/docs/search" />
    </article>
  );
}
