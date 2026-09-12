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
          ["20", "steps per batch"],
          ["2000", "steps per export"],
          ["500", "bugs per export"],
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

      <SectionHead
        index="6"
        kicker="Full fidelity"
        title="Read the whole trail, then compare"
        body="The run detail caps the trail for speed (steps_limit 1-200, bugs_limit 1-100), but nothing is lost: the export removes the caps for archiving, and compare answers “did the fix work” side-by-side. Detail, export, and compare are read-only, so none of them meter coins."
      />
      <MockWindow title="GET /api/vcw/runs/[id]/export" badge="format: vcw-run-export/1">
        <div className="space-y-2 text-xs sm:text-sm">
          <p><span className="text-slate-400">run</span> <span className="text-slate-300">id · game_slug · goal · status · verdict · summary · timestamps</span></p>
          <p><span className="text-slate-400">steps</span> <span className="text-slate-300">every step in order, up to 2000 (id · kind · text · data · created_at)</span></p>
          <p><span className="text-slate-400">bugs</span> <span className="text-slate-300">every filed bug in order, up to 500 (id · title · severity · description · created_at)</span></p>
          <p><span className="rounded bg-emerald-400/20 px-1.5 py-0.5 font-bold text-emerald-300">COMPARE</span> <span className="text-slate-300">GET /api/vcw/runs/compare?a=&lt;uuid&gt;&amp;b=&lt;uuid&gt; - verdicts, step-kind mix, bug-severity mix, plus same_game</span></p>
        </div>
      </MockWindow>
      <Callout tone="cyan" title="Two runs, one question.">
        Ship a fix, re-run the same goal, then compare the two run ids: step counts and severity mixes tell you
        whether the fix worked before you read a single screenshot. Both runs must be yours - compare is
        owner-only, and passing the same id twice is refused. Full trails stay on the detail route or the export.
      </Callout>

      <SectionHead
        index="7"
        kicker="Batch + media"
        title="Batch steps, chain fal media"
        body="The loop usually produces a whole observe → reason → act triplet per iteration. Recording it one step at a time costs three metered round trips - batch appends 1-20 steps in one call, validated exactly like single steps."
      />
      <Steps
        items={[
          ["One triplet, one call", <>POST /api/vcw/runs/[id]/actions/batch with <code>{"{ steps: [{ kind, text, data? }] }"}</code>. Each item needs a legal kind, 1-5000 characters of text, and a data object that fits in 10 KB - the first bad item rejects the whole batch.</>],
          ["All-or-nothing metering", <>Every step meters 1 coin gross (action-step, 25% cut inside). If any debit fails, the whole batch rolls back - steps are never free and partial batches never linger. Low balance answers 402, closed runs answer 409.</>],
          ["Tag media in the trail", <>Write <code>[tool: fal.generate; op=&lt;op&gt; prompt=&quot;...&quot;]</code> in an action-step text or data object and the route answers with the gross quote plus the next hop (POST /api/fal/generate with source “vcw”). Unknown ops get a hint naming the 30-op catalog instead.</>],
          ["Pick the right phase", <>Observe and reason prefer the fast text/image/audio ops; video and 3D ops are act-phase only (slow). GET /api/vcw/status lists every op grouped by phase plus whether fal is configured - probe it before tagging.</>],
        ]}
      />
      <Callout tone="violet" title="Media never leaves the trail.">
        The fal tag lives inside an ordinary run step, so the quote, the prompt, and the result stay attached to
        the evidence that asked for them. The /fal studio page runs the same 30 tools by hand when you want to
        experiment outside a run first.
      </Callout>

      <SectionHead
        index="8"
        kicker="Remotes"
        title="Autoplay: real remotes, honest no's"
        body="Autoplay starts a RunPod remote that drives the play page for you - cpu for cheap, gpu for vision, gpu-boosted (pinned RTX 4090 class) for the hardest titles. It never fakes a worker URL: no stock, no credentials, or over budget comes back as started:false with the code and the manual next step."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["🖥️ cpu · 0.14/min", "Cheapest seat: a CPU remote drives the first-party play page. A 60-minute run lands around 9 coins."],
          ["🎮 gpu · 0.63/min", "Vision seat: a GPU remote watches and plays the same on-site page. About 38 coins for a full hour."],
          ["🚀 gpu-boosted · 2.2/min", "Fastest eyes, exact quote at start: pinned RTX 4090 class (5090 fallback), required for off-site Xonotic. About 132 coins per hour ceiling."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="emerald" title="On-site for catalog games, off-site only for Xonotic.">
        Catalog games autoplay on-site only - the browser may touch just your game&apos;s play URL on 4weird
        origins. Xonotic is the one exception: gpu-boosted only, off-site only, desktop app installed. Anything
        else is refused with an honest error (needsDesktop points at /vcw/desktop/). Idle remotes warn after 60
        quiet minutes, then stop instead of burning your hour - and GET /api/vcw/autoplay/mine lists your remotes.
      </Callout>

      <SectionHead
        index="9"
        kicker="Look before you leap"
        title="Probe status + dashboard first"
        body="Two authenticated reads prove the loop is usable before you spend a coin: status for the control plane, dashboard for your own recent runs and bugs. Both are rate-limited per user and both refuse strangers with 401."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["📡 GET /api/vcw/status", "Service health (ok, degraded, unavailable, or unconfigured), catalog game count, your run/bug totals, every fal op grouped by observe/reason/act phase, plus the swarm tools hint for multi-agent QA."],
          ["🗂️ GET /api/vcw/dashboard", "Service state plus your 10 most recent runs and 10 most recent bugs in one call - with counts for open runs, runs by verdict, and bugs by severity. The hint field points at the deeper run/bug filters."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="cyan" title="Unhealthy? Stop here.">
        The service pill answers in coarse words on purpose - it never forwards upstream bodies. If status or
        dashboard reports anything but ok, wait before opening runs: every later step in the loop depends on the
        service underneath. GET /api/vcw/health gives the same probe without login when you just need a pulse.
      </Callout>

      <SectionHead
        index="10"
        kicker="Who may do what"
        title="Three doors, one keychain"
        body="Every gateway call resolves its caller from exactly one credential, tried in order: your login session, a bot key carrying a vcw scope, or a vcw_live_ gateway key. All failures collapse to one uniform “authentication required” - the how is never leaked."
      />
      <Steps
        items={[
          ["Session first", <>Signed in with Supabase, you get full read + write with no key at all. Key issuance itself (POST /api/vcw/gateway/keys) needs the session plus same-origin - keys can&apos;t mint keys.</>],
          ["Bot keys carry scopes", <>A bot key with <code>vcw:read</code> or <code>vcw:write</code> rides the same loop; write implies read. Keys are looked up by prefix with constant-time comparison, and unknown prefixes still burn a dummy compare so timing leaks nothing.</>],
          ["Gateway keys carry budgets", <>Issue with a 1-80 character label, scopes (<code>vcw:read</code> default, <code>vcw:write</code> for writes), optional lifetime/daily budgets, max uses, and a future expiry date. Max 10 active keys; the full secret shows once, only its hash is stored. Present it via <code>x-vcw-key</code>, <code>x-gateway-key</code>, or Bearer.</>],
          ["The floor holds", <>Keys with a low-balance floor fail closed when the owner&apos;s coin balance can&apos;t be read or sits at/below the floor; spent budgets and expired or revoked keys refuse the same way. Every use bumps counters and refreshes the daily window.</>],
        ]}
      />
      <Callout tone="rose" title="No pepper, no keys.">
        Key hashing needs a strong server pepper - without it, issuance refuses and gateway-key auth fails closed
        rather than comparing against anything weak. If key creation ever answers “service not configured,” that
        pepper is what&apos;s missing; session auth keeps working meanwhile.
      </Callout>

      <SectionHead
        index="11"
        kicker="Take it with you"
        title="Handoffs: markdown any tool can read"
        body="POST /api/vcw/handoff with an optional run_id and reason (defaults to your latest run) returns a portable markdown brief capped for pasting: trail digest, 50 steps, 50 bugs, and next actions for the coding agent. Metered at 5 coins gross - assembled only for a paid handoff."
      />
      <MockWindow title="handoff.md - goal, digest, steps, bugs, next" badge="50 + 50 caps">
        <div className="space-y-2 text-xs sm:text-sm">
          <p><span className="text-slate-400"># VCW run handoff</span> <span className="text-slate-300">game slug · goal · status + verdict · reason · run id · updated-at · summary</span></p>
          <p><span className="text-slate-400">## Trail digest</span> <span className="text-slate-300">step count by kind · bug count by severity · fal.generate mentions</span></p>
          <p><span className="text-slate-400">## Steps (50)</span> <span className="text-slate-300">[kind] @ timestamp + first 300 chars each</span></p>
          <p><span className="text-slate-400">## Bugs (50)</span> <span className="text-slate-300">[severity] title + first 300 chars of description</span></p>
          <p><span className="rounded bg-violet-400/20 px-1.5 py-0.5 font-bold text-violet-300">NEXT</span> <span className="text-slate-300">replay last observe → action · fix critical → low · emit fal tags for media · complete with verdict</span></p>
        </div>
      </MockWindow>
      <Callout tone="emerald" title="Capped for chat, uncapped for archives.">
        The handoff truncates past 50 + 50 with a pointer back to the detail route, and the whole brief stays
        under 20,000 characters. Need everything? The export (up to 2000 steps / 500 bugs) is the archival twin -
        same run, no caps, JSON instead of markdown.
      </Callout>

      <Pager current="/docs/vibecodeworker" />
    </article>
  );
}
