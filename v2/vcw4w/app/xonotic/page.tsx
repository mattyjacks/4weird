import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { VcwAutoplay } from "@/components/games/vcw-autoplay";
import { VCW_DESKTOP_PATH, XONOTIC_WEB_URL } from "@/lib/vcw-autoplay";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  alternates: { canonical: "/xonotic" },
  title: "Xonotic Autoplay (GPU Boosted, Off-Site) | 4weird Games",
  description:
    "VibeCodeWorker plays Xonotic for you on a GPU-boosted RunPod remote. Off-site mode needs the desktop VibeCodeWorker installed.",
};

export default function XonoticPage() {
  notFound();
}

/* Kept for future reactivation: the public Xonotic route is intentionally not viewable. */
function HiddenXonoticPage() {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-950 text-white">
      <section className="mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col px-3 py-2">
        <CachedXonoticIntro />
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          {/* Autoplay console (per-user session state, API-backed): dynamic
              island streaming behind the fallback; never cached. */}
          <Suspense fallback={<p className="text-sm text-slate-400">Loading autoplay console…</p>}>
            <VcwAutoplay gameSlug="xonotic" gameTitle="Xonotic" />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

// Static intro copy (constants only, no per-user data): cached hourly.
async function CachedXonoticIntro() {
  "use cache";
  cacheLife("hours");
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Link className="text-xs text-cyan-300 hover:underline" href="/agents">
        ← Servers
      </Link>
      <h1 className="text-lg font-black">Xonotic, played by VibeCodeWorker</h1>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-xs text-amber-200">
        <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-amber-300" />
        Desktop app: required ·{" "}
        <a href={VCW_DESKTOP_PATH} className="font-bold underline">
          Install
        </a>
      </span>
      <span className="rounded-full border border-white/10 bg-white/[.05] px-2 py-0.5 text-xs text-slate-300">
        GPU-boosted · off-site · self-terminates after 55 min
      </span>
      <details className="group relative">
        <summary className="cursor-pointer list-none rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 text-xs font-bold text-cyan-300 marker:hidden hover:bg-cyan-400/20">
          ⓘ Details
        </summary>
        <ul className="absolute left-0 z-20 mt-1 w-80 list-disc space-y-1 rounded-xl border border-slate-700 bg-slate-900 p-3 pl-7 text-xs leading-relaxed text-slate-300 shadow-xl">
          <li>
            GPU boosted only - the remote uses RunPod GPUs (fastest vision, Xonotic&apos;s native client is GPL-3.0+).
          </li>
          <li>
            Off-site target is fixed: <span className="break-all text-cyan-300">{XONOTIC_WEB_URL}</span> plus the
            native client on the pod. No other URL can be driven.
          </li>
          <li>4weird catalog games stay on-site only - this page never unlocks off-site for them.</li>
          <li>Self-terminates after 55 min. RunPod bills per second; coin quotes include the 25% cut.</li>
        </ul>
      </details>
      <Link
        href="/agents"
        className="ml-auto shrink-0 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 text-xs font-bold text-cyan-300 hover:bg-cyan-400/20"
      >
        Browse servers ↗
      </Link>
    </div>
  );
}
