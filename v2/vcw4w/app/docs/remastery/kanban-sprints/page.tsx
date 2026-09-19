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
        <li><strong>How is sprint progress computed?</strong> From finished cards against the cycle total: done estimates divided by planned estimates, shown as 0 to 100 percent.</li>
        <li><strong>What happens to unfinished cards?</strong> They roll into the next cycle with fresh positions; the closed cycle keeps its history.</li>
        <li><strong>Where do logged hours appear?</strong> Time entries linked by card id show beside the estimate; see the <Link className="underline" href="/docs/remastery/time-tracking">time tracking guide</Link>.</li>
      </ul>

      <h2 className="mt-8 text-xl font-black">Running your first sprint in five steps</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-6 text-sm text-muted-foreground">
        <li><strong>Name the sprint and fix the dates.</strong> One active cycle per board: a title plus a start and end date, for example &quot;Sprint 4, March 3 to March 16&quot;.</li>
        <li><strong>Write cards small.</strong> One card per shippable slice with a verb first: &quot;Wire raid lobby presence&quot;, not &quot;Lobby stuff&quot;. Small cards finish; vague cards linger.</li>
        <li><strong>Estimate in hours, then assign.</strong> Every card gets an hour number and exactly one owner. Unowned cards rot in todo; owned cards move.</li>
        <li><strong>Drag daily, review weekly.</strong> Move cards as work lands so the board mirrors reality. At review, demo done cards, roll leftovers forward, and retire blockers in the open.</li>
        <li><strong>Close honestly.</strong> Mark the cycle complete, keep its history readable, and open the next cycle from the rolled-over remainder. Velocity is what you finished, not what you planned.</li>
      </ol>

      <h2 className="mt-8 text-xl font-black">Worked example: Sprint 4</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The GraveGain raid squad plans 14 hours across six cards. Midweek the board looks like this:
      </p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 font-black">Card</th>
              <th className="px-4 py-2 font-black">Estimate</th>
              <th className="px-4 py-2 font-black">Stage</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-bold">Instanced mesh pass (urgent)</td>
              <td className="px-4 py-2 text-muted-foreground">4h</td>
              <td className="px-4 py-2 text-muted-foreground">Done</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-bold">Timer Web Worker (high)</td>
              <td className="px-4 py-2 text-muted-foreground">2.5h</td>
              <td className="px-4 py-2 text-muted-foreground">Done</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-bold">Remastery routes test (medium)</td>
              <td className="px-4 py-2 text-muted-foreground">1h</td>
              <td className="px-4 py-2 text-muted-foreground">Done</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-bold">Raid lobby presence (high)</td>
              <td className="px-4 py-2 text-muted-foreground">3h</td>
              <td className="px-4 py-2 text-muted-foreground">In progress</td>
            </tr>
            <tr className="border-b-0">
              <td className="px-4 py-2 font-bold">Boss theme hookup (low) + victory poster (medium)</td>
              <td className="px-4 py-2 text-muted-foreground">3.5h</td>
              <td className="px-4 py-2 text-muted-foreground">To do</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Done estimates total 7.5 of 14 planned hours, so progress reads 54 percent. The squad demo
        covers the three done cards, the owner of the lobby card names a landing date, and the two
        todo cards roll into Sprint 5. Logged time is reconciled per card in the{" "}
        <Link className="underline" href="/docs/remastery/time-tracking">time tracker</Link>; the
        full board reference lives in the{" "}
        <Link className="underline" href="/docs/remastery/kanban">squad kanban reference</Link>.
      </p>

      <h2 className="mt-8 text-xl font-black">Troubleshooting</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Progress bar frozen at zero?</strong> Done cards may be attached to a closed cycle. Reattach them to the active cycle and the bar will recalculate.</li>
        <li><strong>Card will not drag?</strong> Confirm you are a member of the board&apos;s squad, then retry. Rejected moves mean the permission check failed, not that the card is cursed.</li>
        <li><strong>Estimates always wrong?</strong> After two cycles, compare logged seconds per card against the guesses and re-estimate from actuals. Cards that miss twofold are usually three cards wearing a trench coat: split them.</li>
        <li><strong>Too many cards in progress?</strong> Cap doing at two per person. Park the excess back in todo with owners and dates instead of starting everything at once.</li>
      </ul>

      <p className="mt-8 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Next: <Link className="underline" href="/docs/remastery/squad-workspaces">Squad workspaces</Link> ·{" "}
        <Link className="underline" href="/docs/remastery/time-tracking">Time tracking</Link> ·{" "}
        <Link className="underline" href="/docs">All docs</Link>
      </p>
    </article>
  );
}
