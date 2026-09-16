import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { AgentBotNav } from "@/components/agents/agent-bot-nav";
import DevSwarmPanel from "@/components/swarm/devswarm-panel";
import { SwarmChatLazy } from "./swarm-chat-lazy";

export const metadata: Metadata = {
  alternates: { canonical: "/swarm" },
  title: "Hire an Agent Swarm | 4weird Games",
  description:
    "Your OpenClaw-style agent on 4weird: a per-user internal brain with token-cheap memory, personal .txt file RAG, serverless chat or serverful RunPod runs, and auto-orchestrated child instances - metered per turn with the 25% cut included.",
};

// Static shell: no force-dynamic. The copy above paints from the CDN/RSC
// cache on first hit; the heavy interactive chat (787-line client widget +
// lib/swarm + lib/agent-market + lib/game-ai) hydrates lazily via a client
// wrapper (ssr:false must live in a Client Component on Next 16), so
// time-to-first-paint never waits on the chat bundle.

/**
 * Static marketing shell — one-line intro. Pure markup, no request-time
 * data. Cached (`hours` + tag `swarm`).
 *
 * NOTE: 'use client' widgets (AgentBotNav, SwarmChatLazy, DevSwarmPanel)
 * stay outside cached scopes in the page below — cached output must not
 * close over client-component state.
 *
 * Live data (SwarmChatLazy chat widget, DevSwarmPanel build-board counts)
 * stays dynamic in <Suspense> below and is never cached.
 */
async function CachedSwarmShell() {
  "use cache";
  cacheLife("hours");
  cacheTag("swarm");
  return (
    <p className="mt-1 max-w-4xl text-xs text-slate-400">
      One chat box, up to five agents behind it, and an internal brain that remembers you (“remember that …” ≈150 tokens/turn).
      Personal .txt RAG (~300 tokens max), auto observe→reason→act orchestration, serverless here or serverful on RunPod.
      Per-agent Vibe Coin metering, 25% cut included; local-engine turns are free and labelled.
    </p>
  );
}

/**
 * Static DevSwarm section intro. Cached alongside the shell.
 */
async function CachedDevSwarmIntro() {
  "use cache";
  cacheLife("hours");
  cacheTag("swarm");
  return (
    <p className="mt-1 max-w-4xl text-xs text-slate-400">
      The public build board behind 4weird: live counts and links into the repo swarm brain.
    </p>
  );
}

export default function SwarmPage() {
  return (
    <main className="bg-slate-950 text-white lg:h-screen lg:overflow-hidden">
      {/* 36px command header: title + API key badge, no banner */}
      <header className="mx-auto flex h-9 max-w-[1600px] items-center gap-2 px-4">
        <Link className="text-xs text-cyan-300 hover:underline" href="/agents">
          ← Agents
        </Link>
        <h1 className="truncate text-base font-black">Your agent, with a brain</h1>
        <span className="hidden rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-200 sm:inline">● serverless · metered/turn</span>
        <Link href="/agents" className="hidden rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-slate-300 hover:bg-white/10 md:inline">
          🔑 API keys
        </Link>
        <details className="relative ml-auto shrink-0">
          <summary className="cursor-pointer list-none rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-slate-300 hover:bg-white/10 [&::-webkit-details-marker]:hidden">
            ☰ Swarm sections ▾
          </summary>
          <div className="absolute right-0 z-30 mt-1 w-64 rounded-xl border border-white/15 bg-slate-900 p-2 shadow-2xl">
            <AgentBotNav current="/swarm" />
          </div>
        </details>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 pb-4">
        <CachedSwarmShell />
        {/* 2-pane cockpit: 20% agent rail | 80% chat stage; telemetry docked to a 32px status bar */}
        <div className="mt-2 grid gap-2 lg:h-[calc(100vh-110px)] lg:grid-cols-[20%_80%]">
          {/* Left rail: agent roster + orchestration shortcuts (chat selectors live in the center widget) */}
          <nav aria-label="Agent rail" className="min-h-0 rounded-xl border border-white/10 bg-white/[.02] p-2 lg:overflow-y-auto">
            <p className="px-1 text-[10px] font-bold tracking-widest text-violet-300">AGENTS</p>
            <ul className="mt-1 space-y-1 text-xs">
              {["Agent 1", "Agent 2", "Agent 3"].map((a, i) => (
                <li key={a}>
                  <a href="#swarm-chat" className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 hover:border-white/25">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${i === 0 ? "bg-emerald-400" : "bg-slate-500"}`} aria-hidden="true" />
                    <span className="font-bold text-white">{a}</span>
                    <span className="ml-auto text-[10px] text-slate-500">{i === 0 ? "active" : "idle"}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 px-1 text-[10px] font-bold tracking-widest text-violet-300">ORCHESTRATION</p>
            <ul className="mt-1 space-y-1 text-xs text-slate-300">
              <li className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5"><b className="text-white">auto</b> <span className="text-slate-500">built-in observe→reason→act</span></li>
              <li className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5"><b className="text-white">serverless</b> <span className="text-slate-500">chat right here</span></li>
              <li className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5"><b className="text-white">serverful</b> <span className="text-slate-500">RunPod pod/desktop</span></li>
            </ul>
            <p className="mt-2 px-1 text-[10px] text-slate-500">Model + temperature dials live in the chat widget →</p>
            <details className="mt-2 rounded-lg border border-white/10 bg-black/30">
              <summary className="cursor-pointer list-none px-2 py-1.5 text-xs font-bold text-white [&::-webkit-details-marker]:hidden">
                DevSwarm — repo swarm ▾
              </summary>
              <div className="px-2 pb-2">
                <CachedDevSwarmIntro />
                <div className="mt-1">
                  <Suspense fallback={<p className="text-xs text-slate-500">Loading build board…</p>}>
                    <DevSwarmPanel />
                  </Suspense>
                </div>
              </div>
            </details>
          </nav>

          {/* Center stage: sticky Hire bar + agent tabs + live chat + advanced accordion + 32px telemetry bar */}
          <div id="swarm-chat" className="flex min-h-0 scroll-mt-12 flex-col rounded-xl border border-white/10 bg-white/[.02] lg:overflow-hidden">
            {/* Sticky Hire action bar: 1-click launch, no scroll to CTA */}
            <div className="sticky top-0 z-20 flex h-10 shrink-0 items-center gap-2 border-b border-white/10 bg-slate-950/95 px-2 backdrop-blur">
              <a href="#swarm-chat" className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-slate-950 hover:bg-emerald-300">
                🚀 Hire Swarm &amp; Connect
              </a>
              <span className="hidden text-[11px] text-slate-500 sm:inline">1-click launch · per-agent coins, 25% incl.</span>
              <Link href="/agents" className="ml-auto rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-slate-300 hover:bg-white/10">
                ⚡ Rent compute
              </Link>
            </div>
            {/* Horizontal agent config tabs (layout-only anchors into the chat widget) */}
            <div role="tablist" aria-label="Agent configs" className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 px-2 py-1.5">
              {["Agent 1: Architect", "Agent 2: Coder", "Agent 3: QA"].map((a, i) => (
                <a
                  key={a}
                  role="tab"
                  aria-selected={i === 0}
                  aria-current={i === 0 ? "true" : undefined}
                  href="#swarm-chat"
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${i === 0 ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-100" : "border-white/10 bg-black/30 text-slate-300 hover:border-white/25"}`}
                >
                  {a}
                </a>
              ))}
            </div>
            <div className="min-h-0 flex-1 p-2 lg:overflow-y-auto">
              <Suspense fallback={<p className="text-xs text-slate-500">Loading swarm chat…</p>}>
                <SwarmChatLazy />
              </Suspense>
              {/* Collapsible advanced options (layout-only; live dials render in the chat widget) */}
              <details className="mt-2 rounded-lg border border-white/10 bg-black/30">
                <summary className="cursor-pointer list-none px-2 py-1.5 text-xs font-bold text-white [&::-webkit-details-marker]:hidden">
                  Advanced Settings ⚙ ▾
                </summary>
                <ul className="space-y-1 px-2 pb-2 text-xs text-slate-500">
                  <li className="rounded-lg border border-white/10 px-2 py-1.5">🌡️ temperature slider <span className="text-slate-600">— dial lives in the chat widget</span></li>
                  <li className="rounded-lg border border-white/10 px-2 py-1.5">🛠️ tool checkboxes (7) <span className="text-slate-600">— toggles live in the chat widget</span></li>
                  <li className="rounded-lg border border-white/10 px-2 py-1.5">📝 custom system prompt <span className="text-slate-600">— editor lives in the chat widget</span></li>
                </ul>
              </details>
            </div>
            {/* Telemetry as a 32px horizontal status bar */}
            <div aria-label="Telemetry status" className="flex h-8 shrink-0 items-center gap-3 overflow-x-auto whitespace-nowrap border-t border-white/10 px-2 text-[11px] text-slate-400">
              <span><b className="text-white">⚡ tokens/sec</b> <span className="text-slate-500">live per turn</span></span>
              <span><b className="text-white">🛠️ tool calls</b> <span className="text-slate-500">trace per message</span></span>
              <span><b className="text-white">🧠 context</b> <span className="text-slate-500">~150 tok + .txt RAG ~300 max</span></span>
              <span><b className="text-white">💰 metering</b> <Link href="/my/usage/" className="text-cyan-300 hover:underline">ledger /my/usage/</Link></span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
