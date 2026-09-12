import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, Pager } from "@/components/docs/docs-bits";
import { AgentBotNav } from "@/components/agents/agent-bot-nav";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/runpod-vs-digitalocean" },
  title: "RunPod vs DigitalOcean",
  description:
    "Plain-English guide to 4weird cloud providers: RunPod for GPU, short, and serverless work; DigitalOcean for long-term servers. Costs, env keys, API routes, and the never-fake rule.",
};

const theme = {
  bg: "bg-gradient-to-br from-sky-950 via-slate-950 to-indigo-950",
  border: "border-sky-400/20",
  chip: "border-sky-300/40 bg-sky-300/10 text-sky-200",
  title: "bg-gradient-to-r from-sky-300 via-blue-200 to-indigo-300 bg-clip-text text-transparent",
};

export default function RunpodVsDigitaloceanPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · pick the right cloud"
        title={<>RunPod vs DigitalOcean, <span className={theme.title}>in plain English.</span></>}
        lede={<>Two providers, two jobs. RunPod rents you GPUs by the second for short bursty work. DigitalOcean rents you whole servers by the month for things that stay up. This page tells you which to pick, what each costs, and which buttons talk to which.</>}
        stats={[
          ["GPU", "RunPod's job"],
          ["24h+", "DigitalOcean's job"],
          ["0", "faked rows, ever"],
          ["2", "env keys"],
        ]}
        glyph="⚖️"
        theme={theme}
        crumb="RunPod vs DigitalOcean"
      />

      <SectionHead
        index="1"
        kicker="The one-sentence version"
        title="Which cloud for what?"
        body="RunPod = short, bursty, GPU-heavy work (rent an agent box for hours, render something, run a serverless job, shut it down). DigitalOcean = long-term servers (a Droplet that stays up for days or weeks, with attached volumes and point-in-time snapshots). Under 24 hours or needs a GPU? RunPod. Stays up for weeks? DigitalOcean."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 p-4"><p className="text-3xl" aria-hidden="true">🎮</p><p className="mt-1 font-black">RunPod — the supercomputer rental</p></div>
          <p className="p-4 text-sm text-muted-foreground">GPU pods (always-on boxes), serverless endpoints (scale-to-zero jobs), network volumes. Billed per-second-ish by RunPod on your card; mirrored read-only onto /my/usage/ with no Vibe cut.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="bg-gradient-to-r from-sky-500/20 to-cyan-500/10 p-4"><p className="text-3xl" aria-hidden="true">🌊</p><p className="mt-1 font-black">DigitalOcean — the apartment lease</p></div>
          <p className="p-4 text-sm text-muted-foreground">Droplets (whole servers), volumes (attached disks), snapshots (restore points). Monthly-first pricing that rewards leaving the box up. Best for persistent agent servers, bots, and game servers.</p>
        </div>
      </div>

      <SectionHead
        index="2"
        kicker="Money"
        title="Cost comparison"
        body="Shapes differ more than prices: RunPod meters GPU time tightly (great for bursts, punishing to idle on), DigitalOcean charges flat monthly-ish rates (great for always-on, wasteful for a 20-minute render). Always check the live catalog — provider prices shift."
      />
      <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="p-3">Dimension</th>
              <th className="p-3">RunPod</th>
              <th className="p-3">DigitalOcean</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-muted-foreground">
            <tr><td className="p-3 font-bold text-foreground">Billing unit</td><td className="p-3">Per-second GPU time (pods), per-execution (serverless)</td><td className="p-3">Hourly with a monthly cap (Droplets, volumes)</td></tr>
            <tr><td className="p-3 font-bold text-foreground">GPU access</td><td className="p-3">Yes — the reason to pick it; cheapest Secure GPU with live stock</td><td className="p-3">CPU-first; GPU droplets exist but are not the 4weird default path</td></tr>
            <tr><td className="p-3 font-bold text-foreground">Idle cost</td><td className="p-3">High — a running pod meters even when you&apos;re tabbed away (idle watchdog stops it)</td><td className="p-3">Flat — the Droplet costs the same idle or busy; snapshots/volumes add a little</td></tr>
            <tr><td className="p-3 font-bold text-foreground">Short burst (&lt; 24h)</td><td className="p-3">✅ Cheaper almost always</td><td className="p-3">❌ You pay the hour/month shape anyway</td></tr>
            <tr><td className="p-3 font-bold text-foreground">Always-on (weeks)</td><td className="p-3">❌ A pod left up for weeks is the most expensive option</td><td className="p-3">✅ Monthly cap wins; snapshots protect you</td></tr>
            <tr><td className="p-3 font-bold text-foreground">Vibe Coins cut</td><td className="p-3">Direct spend mirrored with no 25% cut (nothing to split)</td><td className="p-3">Same rule when mirrored — marketplace bookings always carry the 25% inside</td></tr>
          </tbody>
        </table>
      </div>
      <Callout tone="cyan" title="Rule of thumb: 24 hours.">
        Shorter than a day or needs a GPU → RunPod. Longer than a day and CPU-shaped → DigitalOcean.
        Unsure? Book short on RunPod first — per-second settlement keeps the experiment cheap — then move
        to a Droplet once the workload proves it wants to live forever.
      </Callout>

      <SectionHead
        index="3"
        kicker="Keys"
        title="Env keys table"
        body="Both keys are server-only: no NEXT_PUBLIC_ prefix, never imported in client components. Without a key, that provider reports unconfigured and the app says so honestly instead of faking."
      />
      <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="p-3">Key</th>
              <th className="p-3">Where to get it</th>
              <th className="p-3">What it unlocks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-muted-foreground">
            <tr>
              <td className="p-3 font-mono font-bold text-foreground">RUNPOD_API_KEY</td>
              <td className="p-3">RunPod console → Settings → API Keys</td>
              <td className="p-3">Provider “configured” badge, live key check, billing mirror, auto-provisioning of agent pods + desktops</td>
            </tr>
            <tr>
              <td className="p-3 font-mono font-bold text-foreground">RUNPOD_API_BASE</td>
              <td className="p-3">Optional override (default https://api.runpod.io/v2)</td>
              <td className="p-3">Point the RunPod client at a proxy or pinned API host</td>
            </tr>
            <tr>
              <td className="p-3 font-mono font-bold text-foreground">DIGITALOCEAN_TOKEN</td>
              <td className="p-3">DigitalOcean → API → Tokens (personal access token)</td>
              <td className="p-3">Provider “configured” badge; Droplet / volume / snapshot calls in lib/digitalocean.ts</td>
            </tr>
            <tr>
              <td className="p-3 font-mono font-bold text-foreground">DIGITALOCEAN_API_BASE</td>
              <td className="p-3">Optional override (default https://api.digitalocean.com/v2)</td>
              <td className="p-3">Point the DO client at a proxy; non-https values fall back to the default</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionHead
        index="4"
        kicker="Wires"
        title="API routes list"
        body="Every route below fails closed without its key: unconfigured means an honest unconfigured error, never invented data."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-black"><span aria-hidden="true" className="mr-2">🎮</span>RunPod routes</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li><code className="font-mono">GET /api/agents/providers</code> — configured flags for runpod / digitalocean / custom (booleans only, keys never leave the server).</li>
            <li><code className="font-mono">GET /api/agents/runpod-status</code> — signed-in liveness probe: read-only 24h pod-billing query proves the key without spending.</li>
            <li><code className="font-mono">POST /api/agents/runpod-sync</code> — mirrors real RunPod billing (pods + serverless + volumes, 1–31 days, default 7) into runpod_usage; 5 syncs/hour.</li>
            <li><code className="font-mono">POST /api/desktop/provision</code> — rents the box (<code className="font-mono">cpu</code> / <code className="font-mono">gpu</code>); <code className="font-mono">GET</code> on the same route is the public no-login catalog.</li>
            <li><code className="font-mono">GET /api/desktop/mine</code> + <code className="font-mono">/api/desktop/[id]/heartbeat|pod|policy</code> — track, keep-alive, inspect, and read the idle policy of your desktops.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-black"><span aria-hidden="true" className="mr-2">🌊</span>DigitalOcean routes &amp; client</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li><code className="font-mono">lib/digitalocean.ts</code> — droplets (get/create/action), volumes, snapshots, sizes, regions; every failure returns <code className="font-mono">{"{ ok: false, error }"}</code> with the upstream status.</li>
            <li><code className="font-mono">lib/compute.ts → digitaloceanProvider</code> — marketplace hook: a supplied <code className="font-mono">https://</code> endpoint is used as-is; blank auto-provision honestly reports “not wired yet — supply an endpoint or use RunPod”.</li>
            <li><code className="font-mono">POST /api/cloud/provision</code> — UnitUnite squad workspace provisioning (org wallet, <code className="font-mono">cloud.provision</code> permission).</li>
            <li><code className="font-mono">/api/agents/* (bookings)</code> — provider-agnostic escrow math: book → heartbeat (1–3600s per beat) → end with refund; works the same whatever the metal.</li>
          </ul>
        </div>
      </div>

      <SectionHead
        index="5"
        kicker="How to choose"
        title="Pick in 30 seconds"
      />
      <Steps
        items={[
          ["Needs a GPU, or lives under a day?", <>RunPod. Rent from <Link className="font-bold underline" href="/agents">/agents</Link> (<code className="font-mono">runpod:auto</code> picks the cheapest Secure GPU with live stock at or under the listing&apos;s max $/hr) or <Link className="font-bold underline" href="/desktop">/desktop</Link>. Set a max budget; end when done — closing the tab doesn&apos;t stop the meter.</>],
          ["Stays up for days/weeks, CPU-shaped?", <>DigitalOcean. Provision the Droplet, attach a volume for data that must survive, snapshot before risky changes. Bring its <code className="font-mono">https://</code> URL back as the listing endpoint.</>],
          ["Bursty inference with idle gaps?", <>RunPod serverless endpoints: scale-to-zero workers, billed per execution instead of per uptime-hour. Same billing mirror, same honesty.</>],
          ["Still unsure?", <>Start on RunPod for a short session, watch <Link className="font-bold underline" href="/my/usage/">/my/usage/</Link>, then graduate to a Droplet once the workload proves it&apos;s permanent. Estimates aren&apos;t guarantees — capacity and prices shift.</>],
        ]}
      />

      <SectionHead
        index="6"
        kicker="House rule"
        title="The never-fake honesty rule"
        body="This is the load-bearing rule of the whole cloud surface: the app never invents infrastructure. No stock, no key, no budget fit, quota hit — the page and the API say so in words, and you are not charged."
      />
      <Callout tone="cyan" title="What honesty looks like in practice.">
        <span className="mb-2 block">No key → provider badge reads unconfigured, provision refuses with <code className="font-mono">unconfigured</code> (nothing rented, nothing faked). No GPU stock → the booking exists but carries the honest error. Over budget → the message names the cheapest available card and its $/hr so you can decide. DigitalOcean blank endpoint → “auto-provision is not wired yet; supply an https endpoint or use RunPod.” Coin figures for direct provider spend are display equivalents only (100 coins = $1.00) — RunPod bills your card, 4weird only mirrors it.</span>
        <span>When a number surprises you, walk it backwards on <Link className="underline" href="/my/usage/">/my/usage/</Link> and compare the mirror against the provider console (RunPod console, DigitalOcean control panel) before assuming the worst. Details live in <Link className="font-bold underline" href="/docs/agents-compute">Agents &amp; cloud</Link>.</span>
      </Callout>

      <AgentBotNav current="/docs/runpod-vs-digitalocean" />

      <Pager current="/docs/runpod-vs-digitalocean" />
    </article>
  );
}
