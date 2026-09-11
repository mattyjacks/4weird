import type { Metadata } from "next";
import Link from "next/link";
import { SwarmChat } from "@/components/swarm/swarm-chat";

export const metadata: Metadata = {
  alternates: { canonical: "/swarm" },
  title: "Hire an Agent Swarm | 4weird Games",
  description:
    "Hire a swarm of AI agents as one chatbot interface: custom system prompts, auto tool use including VibeCodeWorker runs, code exports, and the built-in reasoning loop, metered per turn with the 25% cut included.",
};

export const dynamic = "force-dynamic";

export default function SwarmPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Link className="text-cyan-300 hover:underline" href="/agents">
          ← Rent an agent
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Swarm chat</p>
        <h1 className="mt-2 text-4xl font-black">Hire an agent swarm</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          One chat box, up to five agents behind it. Set a custom system prompt for the whole swarm plus a role
          prompt per agent, pick the orchestration (auto uses the built-in observe→reason→act loop to plan
          and delegate), and every agent automatically uses all tools - VibeCodeWorker runs, findings, handoffs,
          code exports + heal loops, Fal media, Buddy voice. Chat turns meter per agent in Vibe Coins with
          the 25% platform cut included, never on top; local-engine turns are free and labelled.
        </p>
        <div className="mt-8">
          <SwarmChat />
        </div>
      </section>
    </main>
  );
}
