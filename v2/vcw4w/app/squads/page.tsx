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
    <main className="flex min-h-screen flex-col bg-slate-950 text-white lg:h-[calc(100vh-64px)] lg:overflow-hidden">
      <section className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col gap-3 px-4 py-3">
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

        {/* 40px horizontal setup stepper: stacked setup cards → single row */}
        <nav
          aria-label="Squad setup steps"
          className="mt-3 flex h-10 items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] px-2 text-xs font-bold"
        >
          <span className="rounded-full bg-cyan-400/15 px-2.5 py-1 text-cyan-200">1. Org</span>
          <span aria-hidden="true" className="text-slate-600">→</span>
          <span className="rounded-full px-2.5 py-1 text-slate-300">2. Workspace</span>
          <span aria-hidden="true" className="text-slate-600">→</span>
          <span className="rounded-full px-2.5 py-1 text-slate-300">3. Squad Rooms</span>
          <span className="ml-auto hidden shrink-0 text-[11px] font-semibold text-slate-500 sm:block">
            Setup lives in the left rail — no scrolling
          </span>
        </nav>

        {/* Zero-scroll 2-column split workspace (45/55).
            TeamWorkspace + PartyHub own their internals (untouched); this grid
            only docks them side-by-side with an internal scroll on the right. */}
        <div className="mt-3 grid min-h-0 flex-1 gap-3 lg:grid-cols-[45%_55%]">
          <div className="min-w-0 lg:overflow-y-auto lg:pr-0.5">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Org / Squad Creator
              </h2>
              {/* Permission scopes in compact popover: saves >500px of bullet lists */}
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:border-cyan-300/40 [&::-webkit-details-marker]:hidden">
                  View Permission Matrix ⓘ
                </summary>
                <div className="absolute left-0 z-20 mt-1 w-64 rounded-xl border border-white/10 bg-slate-900 p-3 shadow-xl">
                  <dl className="space-y-1.5 text-[11px] leading-snug text-slate-300">
                    <div><dt className="font-bold text-white">Owner</dt><dd>billing, audit, roles, delete</dd></div>
                    <div><dt className="font-bold text-white">Admin</dt><dd>invite, rooms, projects, cloud</dd></div>
                    <div><dt className="font-bold text-white">Member</dt><dd>post, join rooms, launch</dd></div>
                    <div><dt className="font-bold text-white">Guest</dt><dd>read-only town square</dd></div>
                  </dl>
                </div>
              </details>
            </div>
            <Suspense fallback={<p className="text-sm text-slate-400">Loading workspace…</p>}>
              <TeamWorkspace />
            </Suspense>
          </div>
          <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              Town Square
            </h2>
            <Suspense fallback={<p className="text-sm text-slate-400">Loading town square…</p>}>
              <PartyHub />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
