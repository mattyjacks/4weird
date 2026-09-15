import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamWorkspace } from "@/components/teams/team-workspace";
import { PartyHub } from "@/components/parties/party-hub";
import { BusinessCrosslinks } from "@/components/business/business-crosslinks";
import { UNITUNITE_BLURB, UNITUNITE_NAME, UNITUNITE_TAGLINE } from "@/lib/unitunite";

export const metadata: Metadata = {
  alternates: { canonical: "/squads" },
  title: `${UNITUNITE_NAME} - workspaces, projects, messaging, cloud`,
  description: `${UNITUNITE_BLURB} Pay-as-you-go cloud settled in Vibe Coins, 25% workspace compute cut included.`,
};

export default function SquadsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl gap-3 px-4 py-3">
        {/* Compact inline title bar (<180px): back-nav + title + status inline */}
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
          <h1 className="text-lg font-black">{UNITUNITE_NAME}</h1>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
            {UNITUNITE_TAGLINE}
          </span>
          <p className="hidden min-w-0 flex-1 truncate text-xs text-slate-400 xl:block">
            Orgs hold billing and audit. Workspaces hold people, projects, messaging, cloud.
          </p>
          {/* 40px icon pill strip: 6 tall nav cards → horizontal strip in a drawer */}
          <details className="relative">
            <summary className="h-10 cursor-pointer list-none items-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-slate-200 hover:border-cyan-300/40 [&::-webkit-details-marker]:hidden">
              🏢 Suite
            </summary>
            <div className="absolute right-0 z-20 mt-1 w-72 rounded-xl border border-white/10 bg-slate-900 p-3.5 shadow-xl">
              <BusinessCrosslinks exclude={["/squads"]} />
            </div>
          </details>
        </header>

        {/* Step 1 + Step 2 side-by-side above the fold.
            TeamWorkspace owns both steps internally (untouched); grid wrapper
            keeps its output adjacent to the town square on wide screens. */}
        <div className="mt-3 grid gap-3 lg:grid-cols-[60%_40%]">
          <div className="min-w-0">
            <Suspense fallback={<p className="text-sm text-slate-400">Loading workspace…</p>}>
              <TeamWorkspace />
            </Suspense>
          </div>
          <div className="min-w-0">
            <Suspense fallback={<p className="text-sm text-slate-400">Loading town square…</p>}>
              <PartyHub />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
