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
      <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">🌐 Rent tech / Your servers</p>
      <h1 className="mt-2 text-4xl font-black">My RunPods</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-300">
        Every RunPod you created; desktops, rental servers, render workers; with a clickable link, live status,
        and <strong>Stop / Start / Restart / Terminate / Delete</strong>. Only you can touch your pods. RunPod bills
        per second while a pod runs; stopping ends compute billing (disk storage still bills until terminate/delete).
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Need a new one? <Link href="/desktop" className="text-cyan-300 hover:underline">Rent a Virtual Desktop</Link>{" "}
        · <Link href="/agents" className="text-cyan-300 hover:underline">Rent an AI agent</Link> ·{" "}
        <Link href="/blender" className="text-cyan-300 hover:underline">Render on RTX 4090</Link> · Track spend on{" "}
        <Link href="/my/usage" className="text-cyan-300 hover:underline">/my/usage</Link>
      </p>
    </>
  );
}

export default function RunpodsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-5">
      <CachedRunpodsIntro />
      <AgentBotNav current="/runpods" />
      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-slate-500">Loading your pods…</p>}>
          <RunpodDashboard />
        </Suspense>
      </div>
    </main>
  );
}
