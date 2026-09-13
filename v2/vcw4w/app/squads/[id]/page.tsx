import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SquadWorkspaceClient } from "./workspace-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Squad Workspace | 4weird Squads",
    description:
      "Private invite-only squad workspace: shared wallet, game projects, sprint kanban, and team time tracking.",
    alternates: { canonical: `/squads/${id}` },
  };
}


export default async function SquadWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Demo seed (fail-open): renders before Supabase squad_projects wiring lands.
  // Wiring request for the data lane goes through QUEUE.md — never fetched here.
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl space-y-8 px-5 py-10 sm:py-16">
        <Link className="text-sm text-cyan-300 hover:underline" href="/squads">
          ← All squads
        </Link>
        <Suspense fallback={<p className="text-sm text-slate-400">Loading squad workspace…</p>}>
          <SquadWorkspaceClient
           squadId={id}
          squadName="Neon Drifters"
          tagline="Building fast-paced cyberpunk arcade games and custom Three.js shaders. Invite-only studio — no public marketplace, just the crew."
          walletCoins={45000}
          projects={[
            {
              id: "proj-gg3d",
              name: "GraveGain 3D Arena",
              description: "Arena shooter slice — instanced props, raid-ready spawns.",
              targetGameSlug: "gravegain3d",
              contributorsCount: 4,
            },
            {
              id: "proj-cyber",
              name: "CyberRacer Physics Engine",
              description: "Arcade drift model + rollback netcode prototype.",
              contributorsCount: 2,
            },
          ]}
          currentSprintName="Sprint #4 — Neon Drift"
          sprintProgress={33}
          weekHours={42.5}
          />
        </Suspense>
      </section>
    </main>
  );
}
