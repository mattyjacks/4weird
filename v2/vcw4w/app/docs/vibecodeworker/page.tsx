import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/vibecodeworker" },
  title: "VibeCodeWorker",
  description:
    "How to use VibeCodeWorker: check status, open QA runs, record observe-reason-act steps, file bugs, complete runs, export handoffs, and call the gateway with your own keys (hosted or BYOK).",
};

const theme = {
  bg: "bg-gradient-to-br from-orange-950 via-slate-950 to-stone-900",
  border: "border-orange-400/20",
  chip: "border-orange-300/40 bg-orange-300/10 text-orange-200",
  title: "bg-gradient-to-r from-orange-300 via-amber-200 to-yellow-300 bg-clip-text text-transparent",
};

export default function VcwPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · the QA lab"
        title={<>Break it. <span className={theme.title}>Prove it. Ship it.</span></>}
        lede={<>Evidence-driven QA: point VibeCodeWorker at a game, watch it observe → reason → act, and get runs, findings, bugs, and portable handoffs with proof. Start at /vibecodeworker.</>}
        stats={[
          ["3", "steps per loop"],
          ["4", "severities"],
          ["3", "verdicts"],
          ["1", "portable handoff"],
        ]}
        glyph="⚙️"
        theme={theme}
        crumb="VibeCodeWorker"
        art={
          <div className="flex flex-wrap items-center gap-2 text-sm font-black" aria-hidden="true">
            {["👁️ Observe", "🧠 Reason", "🎬 Act"].map((t, i) => (
              <span key={t} className="flex items-center gap-2">
                <span className="rounded-full border border-orange-300/40 bg-orange-300/10 px-4 py-2 text-orange-100">{t}</span>
                {i < 2 && <span className="text-orange-400">→</span>}
              </span>
            ))}
            <span className="text-orange-400">↺</span>
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The floor plan"
        title="Surfaces at /vibecodeworker/*"
        body="Overview, hub, run, full, phone, docs, and demo - each pairs a guide with the live surface plus a public service-status pill. If the pill reports trouble, wait before opening runs: the loop depends on the service underneath."
      />

      <SectionHead
        index="2"
        kicker="The assembly line"
        title="The 7-step agent loop"
        body="Signed in, every route returns success envelopes and rate-limits per user. Read the full run (trail + findings) before every next step."
      />
      <Steps
        items={[
          ["Check status", <>Confirm service health, catalog game count, recent runs/bugs. Unhealthy? Stop here.</>],
          ["Pick a target", <>List catalog games - slug, title, genre, play URL. Every legal run target comes from this list; first-party play URLs only.</>],
          ["Open a run", <>Catalog slug + a 1-500 character goal (“verify level-2 boss spawns adds”). You get a run ID. List yours with <code>?game_slug=</code> + <code>?status=open|completed</code> + <code>?verdict=pass|fail|inconclusive</code> + <code>?limit=</code> + <code>?before=</code> cursor paging; bugs filter by <code>?severity=</code> + <code>?game_slug=</code> + <code>?run_id=</code> the same way.</>],
          ["Observe → reason → act", <>Append one iteration at a time - observation, action, or finding (text + optional ≤10 KB data object). Open runs only.</>],
          ["File bugs", <>Title + description + severity (low/medium/high/critical, default medium), optionally pinned to a run (defaults the slug).</>],
          ["Complete the run", <>Close with summary + verdict: pass / fail / inconclusive. Closed runs are read-only history.</>],
          ["Hand off", <>Export a portable markdown brief for any coding tool (defaults to your latest run). The dashboard gives recent runs + bugs in one view.</>],
        ]}
      />

      <SectionHead
        index="3"
        kicker="Exhibit A"
        title="What good evidence looks like"
      />
      <MockWindow title="run #4821 - boss-spawn verification" badge="verdict: pass">
        <div className="space-y-2 text-xs sm:text-sm">
          <p><span className="rounded bg-sky-400/20 px-1.5 py-0.5 font-bold text-sky-300">OBSERVE</span> <span className="text-slate-300">screenshot: 3 adds spawn at 0:42, HP bars visible</span></p>
          <p><span className="rounded bg-violet-400/20 px-1.5 py-0.5 font-bold text-violet-300">REASON</span> <span className="text-slate-300">spawn matches spec §2.1 → engage, record score events</span></p>
          <p><span className="rounded bg-emerald-400/20 px-1.5 py-0.5 font-bold text-emerald-300">ACT</span> <span className="text-slate-300">cleared wave, no console errors, 60fps held</span></p>
          <p><span className="rounded bg-amber-300/20 px-1.5 py-0.5 font-bold text-amber-200">FINDING</span> <span className="text-slate-300">goal met - no bug filed, evidence attached</span></p>
        </div>
      </MockWindow>

      <SectionHead
        index="4"
        kicker="Field notes"
        title="Writing runs + bugs that get fixed"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["🎯 Goals", "One verifiable claim per run: “menu → new game → first checkpoint, no console errors.”"],
          ["🔬 Steps", "Small, timestamped, evidence-first: “screenshot shows…”, “score event fired…”."],
          ["🐞 Bugs", "Expected vs. actual + repro path + severity + run link. Critical = data loss, payment error, safety."],
          ["🏁 Verdicts", "Pass (evidence), fail (repro defect filed), inconclusive (blocked - say what blocked you)."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="cyan" title="Autoplay = a real remote, or an honest no.">
        Autoplay provisions a real remote to play for you - or reports it couldn&apos;t start (capacity, wrong tier for the
        title). Catalog games run on-site only; some titles need GPU-boosted off-site desktop remotes. The hosted site
        has no live browser: you drive play locally or via autoplay and record each iteration. See{" "}
        <Link className="underline" href="/docs/agents-compute">Agents &amp; cloud</Link> for the compute behind it.
      </Callout>

      <SectionHead
        index="5"
        kicker="Keys + gateway"
        title="Call the loop with your own tools"
        body="The run loop above uses your login session. The gateway (under /api/vcw/gateway/*) gives the same loop a key you can paste into your own agent tools - hosted on our GPUs, or routed to your own provider keys (BYOK)."
      />
      <Steps
        items={[
          ["Probe the gateway", <>No key needed: GET /api/vcw/gateway/status reports the hosted markups (15% standard, 9% enterprise) and the BYOK kinds. Start here before wiring anything.</>],
          ["Issue a key", <>Signed in: POST /api/vcw/gateway/keys with a label, scopes (vcw:read, vcw:write), and optional lifetime/daily budgets + expiry. The vcw_live_ secret is shown once and never again (max 10 active keys). List them anytime with GET - secrets never come back.</>],
          ["Register your providers (BYOK, optional)", <>POST /api/vcw/gateway/providers with kind (runpod, openai, fal, meshy, or custom + your https endpoint), a label, and your key. We store only kind + label + last-4 - your full secret is never stored, returned, or logged. DELETE removes one.</>],
          ["Dispatch a run", <>POST /api/vcw/gateway/dispatch with game_slug, compute (cpu/gpu/gpu-boosted), mode (hosted/byok), and goal - authenticated with your login, a bot key, or the gateway key (x-bot-key or Authorization: Bearer), with vcw:write scope. The MVP answers honestly: always started:false with the coin quote, the meter receipt, and the manual next step (POST /api/vcw/runs or autoplay). No worker URL is ever faked; low balance fails closed with 402.</>],
          ["Watch the spend", <>GET /api/vcw/gateway/usage shows your latest 50 metered rows. Every figure is gross with the 25% cut already inside - same as every metered surface on the site.</>],
        ]}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["💰 Gateway prices (gross, cut inside)", "run-open 10 · action-step 1 · bug-file 2 · handoff 5 · worker-min 6 · byok-route 2 coins. Hosted adds 15% over provider cost (9% enterprise); BYOK bills the base price. 100 coins = $1.00, always."],
          ["🔑 Key hygiene", "Copy the secret once, store it like a password, set a budget + expiry, revoke keys you stop using. Gateway-key reads and writes are metered to your coins like session calls."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <Pager current="/docs/vibecodeworker" />
    </article>
  );
}
