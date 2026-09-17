import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Marketplace } from "@/components/agents/marketplace";
import { MyCompute } from "@/components/agents/my-compute";
import { NanoclawDeploy } from "@/components/agents/nanoclaw-deploy";
import { AgentBotNav } from "@/components/agents/agent-bot-nav";


export const metadata: Metadata = {
  alternates: { canonical: "/agents" },
  title: "Rent an Agent | 4weird Games",
  description:
    "Rent an AI agent or a Xonotic game server by the hour. Every price is a gross USD/hr maximum (25% platform cut included) and you are billed per second.",
  openGraph: {
    title: "Rent AI Agents & Cloud GPUs | 4weird",
    description:
      "Rent AI agents, cloud GPUs, and game servers by the second. Escrow locks max budget, unused coins return automatically.",
    images: [
      {
        url: "/og/og-agents.png",
        width: 1200,
        height: 630,
        alt: "4weird AI Agents & Cloud Compute",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rent AI Agents & Cloud GPUs | 4weird",
    description:
      "Rent AI agents, cloud GPUs, and game servers by the second. Escrow locks max budget, unused coins return automatically.",
    images: ["/og/og-agents.png"],
  },
};


export default function AgentsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <section className="mx-auto max-w-6xl px-4 pb-3 pt-2 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <Link className="text-xs text-cyan-300 hover:underline" href="/">
              ← Home
            </Link>
            <p className="text-xs font-bold tracking-widest text-cyan-300">🌐 RENT TECH</p>
            <h1 className="text-2xl font-black">Rent an agent</h1>
          </div>
          <nav className="flex gap-2" aria-label="Agent marketplace tabs">
            <a
              href="#browse"
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm font-bold text-cyan-300"
            >
              Rent an agent
            </a>
            <a
              href="#my-compute"
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm font-bold text-cyan-300"
            >
              List your compute
            </a>
          </nav>
        </div>
        <ol
          className="mt-2 flex h-9 items-center gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 px-2 text-xs font-bold [scrollbar-width:thin]"
          aria-label="Rent an agent in 4 steps"
        >
          <li className="flex shrink-0 items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-300 text-[11px] text-slate-950">1</span>
            Key
            <span aria-hidden="true" className="text-slate-600">→</span>
          </li>
          <li className="flex shrink-0 items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-300 text-[11px] text-slate-950">2</span>
            Fund
            <span aria-hidden="true" className="text-slate-600">→</span>
          </li>
          <li className="flex shrink-0 items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-300 text-[11px] text-slate-950">3</span>
            Rent
            <span aria-hidden="true" className="text-slate-600">→</span>
          </li>
          <li className="flex shrink-0 items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-300 text-[11px] text-slate-950">4</span>
            Connect
          </li>
        </ol>
        <details className="mt-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-1.5">
          <summary className="cursor-pointer text-sm font-bold text-cyan-300">
            Setup guide (?) — key, escrow, autoplay, desktops
          </summary>
          <p className="mt-2 text-sm text-slate-300">
            Rent an OpenClaw / NanoClaw / VibeCodeWorker agent - or a Xonotic
            game server where VibeCodeWorker plays for you or you play yourself.
            Pick a listing below to rent it, or list your own compute below to
            earn coins from other players. <strong>NanoClaw is the recommended default</strong>:
            serverful (always-on pod) or serverless (scale-to-zero) through this same page,
            chatting on the website or Telegram with one bot key.
          </p>
          <p className="mt-2 text-sm text-slate-400">
          Bot key first: claim a username + issue a <code>bot4weird_…</code> key at{" "}
          <Link href="/bot/setup" className="text-cyan-300 hover:underline">
            /bot/setup
          </Link>{" "}
          (shown once, never repeated), try it in the{" "}
          <Link href="/bot/bclans" className="text-cyan-300 hover:underline">
            /bot/bclans
          </Link>{" "}
          console, then give it to your rented agent as an env var - never paste it into posts or chat.
          Skill your agent reads itself:{" "}
          <a href="/skill.md" className="text-cyan-300 hover:underline">
            /skill.md
          </a>{" "}
          · Guides:{" "}
          <Link href="/docs/bots" className="text-cyan-300 hover:underline">
            /docs/bots
          </Link>{" "}
          +{" "}
          <Link href="/docs/agents-compute" className="text-cyan-300 hover:underline">
            /docs/agents-compute
          </Link>
          .
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Every price is a gross USD-per-hour <strong>maximum</strong> (25%
          platform cut included, never added on top). Metering bills{" "}
          <strong>per second</strong> from the first second, so a partial hour
          never costs the full hour. RunPod listings need no endpoint URL from
          you - booking auto-provisions a server and hands you the RunPod
          default endpoint.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Want a worker to play for you? Every game page has a{" "}
          only).
          only).
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Need a full computer instead of an agent?{" "}
          <Link href="/desktop" className="text-cyan-300 hover:underline">
            Rent a virtual desktop →
          </Link>{" "}
          CPU Ubuntu box or GPU Kasm graphical desktop, streamed in your browser per second.
          Prefer chat without a pod?{" "}
          <Link href="/swarm" className="text-cyan-300 hover:underline">
            /swarm
          </Link>{" "}
          is serverless agent chat ·{" "}
          <Link href="/runpods" className="text-cyan-300 hover:underline">
            /runpods
          </Link>{" "}
          manages every pod ·{" "}
          <Link href="/my/usage" className="text-cyan-300 hover:underline">
            /my/usage
          </Link>{" "}
          shows spend ·{" "}
          <Link href="/squads" className="text-cyan-300 hover:underline">
            /squads
          </Link>{" "}
          for team rooms your bot can join ([BOT]).
        </p>
        <Suspense fallback={<p className="mt-2 text-sm text-slate-400">Loading deploy guide…</p>}>
          <NanoclawDeploy />
        </Suspense>
        </details>
        <div className="mt-2 rounded-xl border border-slate-800 p-3">
          <section id="browse" className="scroll-mt-16" aria-label="Rent an agent">
            <Suspense fallback={<p className="text-sm text-slate-400">Loading marketplace…</p>}>
              <Marketplace />
            </Suspense>
          </section>
          <hr className="my-3 border-slate-800" />
          <section id="my-compute" className="scroll-mt-16" aria-label="List your compute">
            <Suspense fallback={<p className="text-sm text-slate-400">Loading your compute…</p>}>
              <MyCompute />
            </Suspense>
          </section>
        </div>
        <AgentBotNav current="/agents" />
      </section>
    </main>
  );
}
