import type { Metadata } from "next";
import Link from "next/link";
import { SwarmChat } from "@/components/swarm/swarm-chat";
import { AgentBotNav } from "@/components/agents/agent-bot-nav";

export const metadata: Metadata = {
  alternates: { canonical: "/swarm" },
  title: "Hire an Agent Swarm | 4weird Games",
  description:
    "Your OpenClaw-style agent on 4weird: a per-user internal brain with token-cheap memory, personal .txt file RAG, serverless chat or serverful RunPod runs, and auto-orchestrated child instances - metered per turn with the 25% cut included.",
};

export const dynamic = "force-dynamic";

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
    </main>
  );
}
