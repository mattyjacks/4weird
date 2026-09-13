import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AgentBotNav } from "@/components/agents/agent-bot-nav";
import DevSwarmPanel from "@/components/swarm/devswarm-panel";

export const metadata: Metadata = {
  alternates: { canonical: "/swarm" },
  title: "Hire an Agent Swarm | 4weird Games",
  description:
    "Your OpenClaw-style agent on 4weird: a per-user internal brain with token-cheap memory, personal .txt file RAG, serverless chat or serverful RunPod runs, and auto-orchestrated child instances - metered per turn with the 25% cut included.",
};

// Static shell: no force-dynamic. The copy above paints from the CDN/RSC
// cache on first hit; the heavy interactive chat (787-line client widget +
// lib/swarm + lib/agent-market + lib/game-ai) hydrates lazily below, so
// time-to-first-paint never waits on the chat bundle.
const SwarmChat = dynamic(
  () => import("@/components/swarm/swarm-chat").then((m) => m.SwarmChat),
  {
    ssr: false,
    loading: () => (
      <div aria-busy="true" className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-800" />
        <div className="mt-3 h-24 animate-pulse rounded-lg bg-slate-800/60" />
        <div className="mt-3 flex gap-2">
          <div className="h-10 flex-1 animate-pulse rounded-md bg-slate-800/60" />
          <div className="h-10 w-20 animate-pulse rounded-md bg-slate-800/60" />
        </div>
      </div>
    ),
  },
);

export default function SwarmPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Link className="text-cyan-300 hover:underline" href="/agents">
          ← Rent an agent
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-violet-300">🌐 Rent tech / Swarm chat</p>
        <h1 className="mt-2 text-4xl font-black">Your agent, with a brain</h1>
        <AgentBotNav current="/swarm" />
        <p className="mt-4 max-w-3xl text-slate-300">
          One chat box, up to five agents behind it, and an internal brain that remembers you: say
          “remember that …” once and every future turn knows it for ~150 tokens. File personal .txt
          notes and matching chunks join the prompt automatically (~300 tokens max). Pick the
          orchestration (auto uses the built-in observe→reason→act loop to plan
          and delegate), run serverless right here or serverful on a real RunPod pod/desktop,
          and watch parallel work fan out into child instances of the swarm itself. Chat turns meter
          per agent in Vibe Coins with
          the 25% platform cut included, never on top; local-engine turns are free and labelled.
        </p>
        <div className="mt-8">
          <SwarmChat />
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <h2 className="text-2xl font-black">DevSwarm — repo swarm</h2>
        <p className="mt-2 max-w-3xl text-slate-300">
          The public build board behind 4weird: live counts and links into the repo swarm brain.
        </p>
        <div className="mt-6">
          <DevSwarmPanel />
        </div>
      </section>
    </main>
  );
}
