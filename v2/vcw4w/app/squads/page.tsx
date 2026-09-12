import type { Metadata } from "next";
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
      
      <section className="mx-auto max-w-5xl px-5 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">{UNITUNITE_NAME} · {UNITUNITE_TAGLINE}</p>
        <h1 className="mt-2 text-4xl font-black">{UNITUNITE_NAME}</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Orgs hold billing and audit. {UNITUNITE_NAME} workspaces hold people, projects (Code + Issues tabs),
          encrypted team messaging, and cloud services - each gated by the full
          permission set. Defaults get you started; custom roles are one click away.
        </p>
        <div className="mt-10">
          <section aria-label="Business suite" className="mb-8 rounded-2xl border border-white/10 bg-white/[.04] p-5">
            <h2 className="text-lg font-bold">🏢 Business suite</h2>
            <p className="mt-1 text-sm text-slate-400">
              Squads hold the people; the business apps hold the money trail — clock time, bill it,
              file the paperwork.
            </p>
            <div className="mt-3">
              <BusinessCrosslinks exclude={["/squads"]} />
            </div>
          </section>
          <TeamWorkspace />
          <PartyHub />
        </div>
      </section>
    </main>
  );
}
