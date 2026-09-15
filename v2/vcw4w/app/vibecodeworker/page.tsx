import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";

export const metadata: Metadata = {
  title: "VibeCodeWorker - Evidence-Driven Game QA",
  description:
    "VibeCodeWorker is evidence-driven QA for the things you build: run, observe, debug, and improve web experiences with playtest hubs, cloud GPU runs, autoplay, and a full manual. Local-first agentic workflow.",
  keywords: [
    "game QA automation",
    "automated playtesting",
    "VibeCodeWorker",
    "software testing agent",
    "game debugging tool",
    "cloud GPU testing",
  ],
  alternates: { canonical: "/vibecodeworker" },
  openGraph: {
    title: "VibeCodeWorker - Evidence-Driven Game QA | 4weird",
    description:
      "Run, observe, debug, and improve web experiences: playtest hubs, cloud GPU runs, autoplay, and a full manual.",
    images: [
      {
        url: "/og/og-vibecodeworker.png",
        width: 1200,
        height: 630,
        alt: "VibeCodeWorker - Evidence-Driven Game QA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeCodeWorker - Evidence-Driven Game QA | 4weird",
    description:
      "Run, observe, debug, and improve web experiences: playtest hubs, cloud GPU runs, autoplay, and a full manual.",
    images: ["/og/og-vibecodeworker.png"],
  },
};

const sections = [
  { slug: "overview", label: "👩🏻‍💻 Overview", blurb: "What VibeCodeWorker does and how the loop works." },
  { slug: "hub", label: "🛠️ Workspace", blurb: "Load a target, run a playtest, review evidence." },
  { slug: "run", label: "⚡ Cloud Run", blurb: "Rent a cloud GPU with your own RunPod key (BYOK)." },
  { slug: "full", label: "💻 Full Web", blurb: "Browse the complete workspace source in the browser." },
  { slug: "phone", label: "📱 Remote", blurb: "Control a worker from your phone with a control token." },
  { slug: "docs", label: "📖 Manual", blurb: "Operational guidance for playtesting and debugging." },
  { slug: "demo", label: "▶️ Demo", blurb: "A safe, non-operational interface preview." },
];

/**
 * Static section index grid — pure marketing copy, no request-time data.
 * Cached (`hours` + tag `vcw`) so it prerenders into the static shell.
 * Takes no props, so the cache key is a singleton per build.
 */
async function CachedSectionGrid() {
  "use cache";
  cacheLife("hours");
  cacheTag("vcw");
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sections.map((section) => (
        <div
          key={section.slug}
          className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 transition hover:border-cyan-300/40"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{section.label}</p>
            <p className="truncate text-xs text-slate-400">{section.blurb}</p>
          </div>
          <Link
            href={`/vibecodeworker/${section.slug}`}
            className="shrink-0 rounded-lg bg-cyan-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-cyan-500"
          >
            Launch →
          </Link>
        </div>
      ))}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="truncate font-mono font-semibold text-slate-200">{value}</span>
    </div>
  );
}

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex h-screen max-w-7xl flex-col gap-3 overflow-hidden px-4 py-3">
        {/* Compact cockpit header (<180px): title + status + actions inline */}
        <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
          <h1 className="text-lg font-black">VibeCodeWorker</h1>
          <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
            ● local-first
          </span>
          <p className="hidden min-w-0 flex-1 truncate text-xs text-slate-400 lg:block">
            Evidence-driven QA: run, observe, debug, improve.
          </p>
          <a className="text-xs text-cyan-300 hover:underline" href="/vcw/desktop/">
            Desktop
          </a>
          <a className="text-xs text-cyan-300 hover:underline" href="/vcw/agent/">
            Agent API
          </a>
        </header>

        {/* Cockpit: left 25% status, right 75% launch tiles */}
        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[25%_75%]">
          <aside className="min-h-0 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Workspace status
            </p>
            <div className="mt-1 divide-y divide-white/5">
              <StatusRow label="Branch" value="main" />
              <StatusRow label="RunPods" value="BYOK · connect in Run" />
              <StatusRow label="Balance" value="100 🪙 = $1" />
            </div>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Quick links
            </p>
            <div className="mt-1 flex flex-col gap-1 text-xs">
              <a className="text-cyan-300 hover:underline" href="/vcw/desktop/">
                /vcw/desktop/ — desktop builds
              </a>
              <a className="text-cyan-300 hover:underline" href="/vcw/agent/">
                /vcw/agent/ — agent API docs
              </a>
            </div>
          </aside>
          <section aria-label="Launch modes" className="min-h-0 overflow-y-auto">
            <CachedSectionGrid />
          </section>
        </div>
      </div>
    </main>
  );
}
