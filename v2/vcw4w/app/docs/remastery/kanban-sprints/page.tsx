import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/remastery/kanban-sprints" },
  title: "Kanban sprints guide (Wave 1)",
  description:
    "Plain-English guide to squad Kanban boards with sprints: columns, cards, priorities, estimates, and sprint progress — truthful against the remastery blueprint.",
};

export default function KanbanSprintsDocsPage() {
  return (
    <article>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">
        4weird.com/docs/remastery/kanban-sprints · Wave 1
      </p>
      <h1 className="mt-2 text-3xl font-black">Kanban sprints, in plain English</h1>
      <p className="mt-3 text-muted-foreground">
        Each squad gets a visual board at{" "}
        <code className="font-mono text-xs font-bold">/squads/[id]/kanban</code>: columns of cards
        you drag between stages, grouped into time-boxed sprints (cycles) with a progress bar.{" "}
        <strong>Status: planned</strong> — the board UI lane is building it now; nothing to click
        yet outside this guide.
      </p>

      <h2 className="mt-8 text-xl font-black">How the planned board works</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Columns:</strong> stages like To do → In progress → Done. Drag a card from one column to another to change its stage.</li>
        <li><strong>Cards:</strong> one unit of work — title, description, priority, hour estimate, due date, labels, assignee.</li>
        <li><strong>Priorities:</strong> low, medium, high, urgent — urgent cards get the loudest badge.</li>
        <li><strong>Estimates:</strong> each card carries an hour estimate (e.g. 2.5h) that feeds sprint progress and the time tracker.</li>
        <li><strong>Sprints (cycles):</strong> a named window with start and end dates (e.g. “Sprint #4, ends in 3 days”) plus a 0–100% progress bar computed from finished cards.</li>
        <li><strong>Keyboard + pointer:</strong> cards are draggable by mouse/touch and movable by keyboard.</li>
      </ul>

      <h2 className="mt-8 text-xl font-black">Data shapes (planned schema)</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 font-black">Table</th>
              <th className="px-4 py-2 font-black">What it holds</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">kanban_boards</td>
              <td className="px-4 py-2 text-muted-foreground">id, squad_id, project_id, owner_user_id, title, description, timestamps.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">kanban_cycles</td>
              <td className="px-4 py-2 text-muted-foreground">board_id, title, start_date, end_date, progress_percentage (0–100), is_active.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">kanban_columns</td>
              <td className="px-4 py-2 text-muted-foreground">board_id, title, position (left-to-right order).</td>
            </tr>
            <tr className="border-b-0">
              <td className="px-4 py-2 font-mono text-xs font-bold">kanban_cards</td>
              <td className="px-4 py-2 text-muted-foreground">column_id, board_id, cycle_id, title, description, priority, estimate_hours, due_date, labels, assigned_user_id, position.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Access is squad-scoped: board owners and squad members only (planned RLS). Cards can link
        to time entries, so logged hours roll up against the card&apos;s estimate.
      </p>

      <h2 className="mt-8 text-xl font-black">FAQ</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Is there a board I can open today?</strong> Not yet — /squads/[id]/kanban is planned. Squad project lists live at /squads.</li>
        <li><strong>Do estimates move coins?</strong> No. Estimates are planning numbers; only the guarded checkout moves coins.</li>
        <li><strong>Who can move cards?</strong> Squad members on that board (planned permission rule).</li>
      </ul>

      <p className="mt-8 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Next: <Link className="underline" href="/docs/remastery/squad-workspaces">Squad workspaces</Link> ·{" "}
        <Link className="underline" href="/docs/remastery/time-tracking">Time tracking</Link> ·{" "}
        <Link className="underline" href="/docs">All docs</Link>
      </p>
    </article>
  );
}
