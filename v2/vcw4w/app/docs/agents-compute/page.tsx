import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, MockWindow, SplitBar, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/agents-compute" },
  title: "Agents & cloud",
  description:
    "How to rent AI agents, virtual desktops, and UnitUnite team workspaces on 4weird: booking, escrow, per-second metering, and reading usage.",
};

const theme = {
  bg: "bg-gradient-to-br from-sky-950 via-slate-950 to-indigo-950",
  border: "border-sky-400/20",
  chip: "border-sky-300/40 bg-sky-300/10 text-sky-200",
  title: "bg-gradient-to-r from-sky-300 via-blue-200 to-indigo-300 bg-clip-text text-transparent",
};

export default function AgentsComputePage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs Â· the cloud gift shop"
        title={<>Rent a supercomputer <span className={theme.title}>by the second.</span></>}
        lede={<>AI agents by the hour, virtual desktops by the second, team workspaces with metered cloud â€” all in Vibe Coins, all with the 25% cut already inside the price.</>}
        stats={[
          ["1s", "metering granularity"],
          ["25/75", "split, escrowed"],
          ["2", "desktop flavors"],
          ["$0", "above escrow, ever"],
        ]}
        glyph="â˜ï¸"
        theme={theme}
        crumb="Agents & cloud"
      />

      <SectionHead
        index="1"
        kicker="Hire a robot"
        title="Renting AI agents (/agents)"
        body="Browse by runtime and provider, open an agent for its hourly coin price and terms, then book. The flow protects you by construction:"
      />
      <MockWindow title="booking â€” escrow ledger" badge="escrow">
        <div className="space-y-1.5 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">BOOK Â· 3h @ 100 ðŸª™/hr</span><span className="font-bold text-amber-300">âˆ’300 ðŸª™ escrowed</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">â™¥ heartbeat Â· 1,842s run</span><span className="text-slate-300">meteredâ€¦</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">SETTLE Â· 25/75 Â· used 154 ðŸª™</span><span className="font-bold text-emerald-300">+146 ðŸª™ refunded</span></div>
          <p className="pt-1 text-[11px] text-slate-500">final charge can only go down â€” never above escrow</p>
        </div>
      </MockWindow>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ["ðŸ” Browse", "Filter by runtime + provider on /agents."],
          ["ðŸ”’ Book", "Gross coins escrowed up front."],
          ["ðŸ’“ Heartbeat", "Per-second metering settles 25/75."],
          ["ðŸ End", "Unused escrow returns to you."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <SplitBar />

      <SectionHead
        index="2"
        kicker="A computer in a tab"
        title="Virtual desktops (/desktop)"
        body="Provision from /desktop while signed in (optional max-budget + name) and get a proxy URL back. Billing is per-second by the provider and mirrored read-only on /my/usage/. Coin figures shown are display equivalents only."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/10 p-4"><p className="text-3xl" aria-hidden="true">ðŸ–¥ï¸</p><p className="mt-1 font-black">CPU box â€” Ubuntu</p></div>
          <p className="p-4 text-sm text-muted-foreground">Browsing, editing, light dev. The cheap seat with a great view.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 p-4"><p className="text-3xl" aria-hidden="true">ðŸŽ®</p><p className="mt-1 font-black">GPU workstation â€” graphical</p></div>
          <p className="p-4 text-sm text-muted-foreground">Heavier visual work and game-adjacent tasks. Bring sunglasses.</p>
        </div>
      </div>

      <SectionHead
        index="3"
        kicker="One chat, five brains"
        title="Agent swarm chat (/swarm)"
        body="Hire up to 5 agents as one Gemini-Spark-style chatbot: a custom system prompt for the whole swarm plus a role prompt per agent, orchestration (auto plans with the DeepSeek harness observe→reason→act loop, then delegates), model + temperature pickers, and every tool auto-usable — VibeCodeWorker runs/findings/handoffs, OpenCode.ai exports + heal loops, Fal media, Buddy voice. Turns meter per agent in Vibe Coins with the 25% cut included; local-engine turns are free and labelled."
      />

      <SectionHead
        index="4"
        kicker="Squad up"
        title="UnitUnite team workspaces (/teams)"
        body="Orgs â†’ teams â†’ projects/rooms with role catalogs, org coin wallets, messaging, and a metered cloud catalog (GPU pods, serverless, storage, databases, KV, queue). Every workspace meter carries the same included 25% cut, every cent attributed. Use teams when several people share budget, rooms, and cloud."
      />

      <SectionHead
        index="5"
        kicker="Street smarts"
        title="Cloud tips that save coins"
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">ðŸ§ª <strong className="text-foreground">Book short first sessions</strong> to calibrate cost â€” per-second settlement keeps tests cheap.</li>
        <li className="rounded-xl border border-border bg-card p-3">ðŸ’° <strong className="text-foreground">Set a max budget</strong> on desktop provisions to avoid surprises.</li>
        <li className="rounded-xl border border-border bg-card p-3">ðŸ”Œ <strong className="text-foreground">End bookings, close desktops.</strong> Metering follows run time, not browser tabs.</li>
        <li className="rounded-xl border border-border bg-card p-3">ðŸŒŠ <strong className="text-foreground">Estimates aren&apos;t guarantees</strong> â€” capacity, queues, and provider pricing can shift. Can&apos;t start? The page says so honestly, and you aren&apos;t charged. Track it all on <Link className="underline" href="/my/usage/">/my/usage/</Link>.</li>
      </ul>

      <Pager current="/docs/agents-compute" />
    </article>
  );
}
