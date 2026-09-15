import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MarketingPage } from "@/components/site/marketing-page";
import { ServiceStatus } from "@/components/vcw/service-status";

export const metadata: Metadata = {
  title: "Web Apps - Playtest and Debug What You Build",
  description:
    "Small useful web apps on the 4weird coin economy, plus VibeCodeWorker playtesting that inspects, plays, and improves the things you build. Every app metered, every coin funding the arcade.",
  alternates: { canonical: "/web-apps" },
};

// Spec p60 categories (presentational chips; wiring live filtering is follow-up).
const CATEGORIES = ["All", "Productivity", "Creative Tools", "Games", "Utilities"] as const;

export default async function Page() {
  "use cache";
  cacheLife("hours");
  cacheTag("studio");

  return (
    <MarketingPage title="Play and debug web apps" intro="VibeCodeWorker helps inspect, playtest, and improve the things you build.">
      {/* Compact worker status pill: header-positioned liveness probe (fetches
          /api/vcw/health client-side); streams outside the cached shell. */}
      <div className="flex flex-wrap items-center gap-2">
        <Suspense
          fallback={
            <p role="status" className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs text-slate-300">
              Checking worker service…
            </p>
          }
        >
          <ServiceStatus />
        </Suspense>
      </div>
      {/* Category filter chips (visual only until client filter state lands). */}
      <ul className="flex flex-wrap gap-1.5" aria-label="App categories">
        {CATEGORIES.map((cat, i) => (
          <li key={cat}>
            <span
              aria-current={i === 0 ? "true" : undefined}
              className={
                i === 0
                  ? "inline-block rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950"
                  : "inline-block rounded-full border border-white/20 px-3 py-1 text-xs text-slate-300"
              }
            >
              {cat}
            </span>
          </li>
        ))}
      </ul>
      {/* Dense 4-col launch grid (same launchers, same hrefs/text). */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Link href="/vibecodeworker/hub" className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950">Open playtest hub</Link>
        <Link href="/vibecodeworker/docs" className="rounded-xl border border-white/20 px-4 py-2 text-sm">Read documentation</Link>
      </div>
    </MarketingPage>
  );
}
