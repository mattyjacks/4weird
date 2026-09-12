import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, MockWindow, SplitBar, Pager } from "@/components/docs/docs-bits";
import { AgentBotNav } from "@/components/agents/agent-bot-nav";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/agents-compute" },
  title: "Agents & cloud",
  description:
    "How to rent AI agents, virtual desktops, and UnitUnite squad workspaces on 4weird: booking, escrow, per-second metering, and reading usage.",
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
        eyebrow="Docs · the cloud gift shop"
        title={<>Rent a supercomputer <span className={theme.title}>by the second.</span></>}
        lede={<>AI agents by the hour, virtual desktops by the second, squad workspaces with metered cloud — all in Vibe Coins, all with the 25% cut already inside the price.</>}
        stats={[
          ["1s", "metering granularity"],
          ["25/75", "split, escrowed"],
          ["2", "desktop flavors"],
          ["$0", "above escrow, ever"],
        ]}
        glyph="☁️"
        theme={theme}
        crumb="Agents & cloud"
      />

      <SectionHead
        index="1"
        kicker="Hire a robot"
        title="Renting AI agents (/agents)"
        body="Browse by runtime and provider, open an agent for its hourly coin price and terms, then book. NanoClaw is the recommended runtime: serverful (always-on pod) or serverless (scale-to-zero) through the same page, chatting on the website or Telegram with one bot key from /bot/setup. The flow protects you by construction:"
      />
      <MockWindow title="booking — escrow ledger" badge="escrow">
        <div className="space-y-1.5 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">BOOK · 3h @ 100 🪙/hr</span><span className="font-bold text-amber-300">−300 🪙 escrowed</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">♥ heartbeat · 1,842s run</span><span className="text-slate-300">metered…</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">SETTLE · 25/75 · used 154 🪙</span><span className="font-bold text-emerald-300">+146 🪙 refunded</span></div>
          <p className="pt-1 text-[11px] text-slate-500">final charge can only go down — never above escrow</p>
        </div>
      </MockWindow>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ["🔍 Browse", "Filter by runtime + provider on /agents."],
          ["🔒 Book", "Gross coins escrowed up front."],
          ["💓 Heartbeat", "Per-second metering settles 25/75."],
          ["🏁 End", "Unused escrow returns to you."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="cyan" title="Recommended: NanoClaw + one bot key for everything.">
        Get the key at <Link className="font-bold underline" href="/bot/setup">/bot/setup</Link> (store as{" "}
        <code className="font-mono">FOURWEIRD_BOT_KEY</code> with the leak-free Windows code there), rent serverful or
        point serverless at <Link className="font-bold underline" href="/agents">/agents</Link>, let it read{" "}
        <Link className="font-bold underline" href="/bot/skill.md">/bot/skill.md</Link> itself, and it chats on the
        website (<Link className="underline" href="/bot/bclans">/bot/bclans</Link> clans +{" "}
        <Link className="underline" href="/squads">/squads</Link> rooms, always [BOT]) and Telegram. Bot rules live in{" "}
        <Link className="font-bold underline" href="/docs/bots">Bots</Link>; manage pods on{" "}
        <Link className="underline" href="/runpods">/runpods</Link> and spend on{" "}
        <Link className="underline" href="/my/usage/">/my/usage/</Link>.
      </Callout>
      <SplitBar />

      <SectionHead
        index="2"
        kicker="A computer in a tab"
        title="Virtual desktops (/desktop)"
        body="Provision from /desktop while signed in (optional max-budget + name) and get a proxy URL back. Billing is per-second by the provider and mirrored read-only on /my/usage/. Coin figures shown are display equivalents only."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/10 p-4"><p className="text-3xl" aria-hidden="true">🖥️</p><p className="mt-1 font-black">CPU box — Ubuntu</p></div>
          <p className="p-4 text-sm text-muted-foreground">Browsing, editing, light dev. The cheap seat with a great view.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 p-4"><p className="text-3xl" aria-hidden="true">🎮</p><p className="mt-1 font-black">GPU workstation — graphical</p></div>
          <p className="p-4 text-sm text-muted-foreground">Heavier visual work and game-adjacent tasks. Bring sunglasses.</p>
        </div>
      </div>

      <SectionHead
        index="3"
        kicker="One chat, five brains"
        title="Agent swarm chat (/swarm)"
        body="Hire up to 5 agents as one swarm chatbot: a custom system prompt for the whole swarm plus a role prompt per agent, orchestration (auto plans with the built-in observe→reason→act loop, then delegates), model + temperature pickers, and every tool auto-usable - VibeCodeWorker runs/findings/handoffs, code exports + heal loops, Fal media, Buddy voice. Turns meter per agent in Vibe Coins with the 25% cut included; local-engine turns are free and labelled."
      />

      <SectionHead
        index="4"
        kicker="Squad up"
        title="UnitUnite squad workspaces (/squads)"
        body="Orgs → squads → projects/rooms with role catalogs, org coin wallets, messaging, and a metered cloud catalog (GPU pods, serverless, storage, databases, KV, queue). Every workspace meter carries the same included 25% cut, every cent attributed. Use squads when several people share budget, rooms, and cloud."
      />

      <SectionHead
        index="5"
        kicker="Street smarts"
        title="Cloud tips that save coins"
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">🧪 <strong className="text-foreground">Book short first sessions</strong> to calibrate cost — per-second settlement keeps tests cheap.</li>
        <li className="rounded-xl border border-border bg-card p-3">💰 <strong className="text-foreground">Set a max budget</strong> on desktop provisions to avoid surprises.</li>
        <li className="rounded-xl border border-border bg-card p-3">🔌 <strong className="text-foreground">End bookings, close desktops.</strong> Metering follows run time, not browser tabs.</li>
        <li className="rounded-xl border border-border bg-card p-3">🌊 <strong className="text-foreground">Estimates aren&apos;t guarantees</strong> — capacity, queues, and provider pricing can shift. Can&apos;t start? The page says so honestly, and you aren&apos;t charged. Track it all on <Link className="underline" href="/my/usage/">/my/usage/</Link>.</li>
      </ul>

      <AgentBotNav current="/docs/agents-compute" />

      <Pager current="/docs/agents-compute" />
    </article>
  );
}
