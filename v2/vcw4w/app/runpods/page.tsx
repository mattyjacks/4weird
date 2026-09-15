import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { RunpodDashboard } from "@/components/runpod/runpod-dashboard";
import { AgentBotNav } from "@/components/agents/agent-bot-nav";

export const metadata: Metadata = {
  title: "My RunPods; stop, start, restart, delete your servers",
  description:
    "Every RunPod you created in one place: Virtual Desktops, agent-rental servers, and Blender render workers. Clickable links, live status, and power controls.",
  alternates: { canonical: "/runpods" },
  robots: { index: false, follow: false },
};

/**
 * Static intro copy — product explainer + cross-links. Pure markup, no
 * request-time data. Cached (`hours` + tag `desktop`).
 *
 * Live data (RunpodDashboard pod list, power controls) stays dynamic in
 * <Suspense> below and is never cached.
 */
async function CachedRunpodsIntro() {
  "use cache";
  cacheLife("hours");
  cacheTag("desktop");
  return (
    <>
      <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-300">🌐 Rent tech / Your servers</p>
      <h1 className="mt-1 text-2xl font-black">My RunPods</h1>
      <details className="mt-1 max-w-3xl text-xs text-slate-400">
        <summary className="cursor-pointer text-slate-300 hover:text-white">
          Every pod you created — link, live status, power controls
        </summary>
        <p className="mt-1">
          Desktops, rental servers, render workers; with a clickable link, live status, and{" "}
          <strong>Stop / Start / Restart / Terminate / Delete</strong>. Only you can touch your pods. RunPod
          bills per second while a pod runs; stopping ends compute billing (disk storage still bills until
          terminate/delete).
        </p>
        <p className="mt-1 text-slate-500">
          Need a new one? <Link href="/desktop" className="text-cyan-300 hover:underline">Rent a Virtual Desktop</Link>{" "}
          · <Link href="/agents" className="text-cyan-300 hover:underline">Rent an AI agent</Link> ·{" "}
          <Link href="/blender" className="text-cyan-300 hover:underline">Render on RTX 4090</Link> · Track spend on{" "}
          <Link href="/my/usage" className="text-cyan-300 hover:underline">/my/usage</Link>
        </p>
      </details>
    </>
  );
}

export default function RunpodsPage() {
  return (
    <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
      <CachedRunpodsIntro />
      <div className="sticky top-0 z-10 mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-950/90 px-2 py-1.5 text-xs backdrop-blur">
        <span className="font-bold text-slate-200">Pods</span>
        <span className="text-slate-600">·</span>
        <a href="/runpods" className="rounded-full border border-white/15 px-2 py-0.5 font-semibold text-slate-200 hover:bg-white/10">
          Refresh
        </a>
        <Link href="/desktop" className="rounded-full bg-cyan-300 px-2 py-0.5 font-bold text-slate-950 hover:bg-cyan-200">
          Deploy desktop
        </Link>
        <Link href="/agents" className="rounded-full border border-white/15 px-2 py-0.5 font-semibold text-slate-200 hover:bg-white/10">
          Rent agent
        </Link>
        <Link href="/my/usage" className="ml-auto text-slate-400 hover:text-white hover:underline">
          /my/usage →
        </Link>
      </div>
      <AgentBotNav current="/runpods" />
      <div className="mt-3">
        <Suspense fallback={<p className="text-xs text-slate-500">Loading your pods…</p>}>
          <RunpodDashboard />
        </Suspense>
      </div>
    </main>
  );
}
