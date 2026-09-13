import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SquadKanbanBoard } from "@/components/kanban/squad-kanban-board";
import { demoBoard } from "@/components/kanban/kanban-types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Squad Kanban | 4weird Squads",
    description:
      "Squad sprint Kanban board: drag-and-drop columns and cards, cycle deadlines, hourly estimates linked to the time tracker.",
    alternates: { canonical: `/squads/${id}/kanban` },
  };
}

export const dynamic = "force-dynamic";

export default async function SquadKanbanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const board = demoBoard(id);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl space-y-6 px-5 py-10 sm:py-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link className="text-sm text-cyan-300 hover:underline" href={`/squads/${id}`}>
            ← Squad workspace
          </Link>
          <Link
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
            href="/timer/pro"
          >
            ⏱ Open Time Tracker
          </Link>
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">
            4weird // squad tooling
          </p>
          <h1 className="mt-2 text-4xl font-black">{board.title}</h1>
          <p className="mt-3 max-w-3xl text-slate-300">{board.description}</p>
          <p className="mt-2 text-xs text-slate-500">
            Drag cards between columns to move them. Order and moves persist in this
            browser; Supabase sync wires in via QUEUE (data lane).
          </p>
        </div>
        <Suspense fallback={<p className="text-sm text-slate-400">Loading board…</p>}>
          <SquadKanbanBoard board={board} />
        </Suspense>
      </section>
    </main>
  );
}
