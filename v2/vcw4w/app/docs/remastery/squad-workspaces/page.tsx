import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/remastery/squad-workspaces" },
  title: "Squad workspaces guide (Wave 1)",
  description:
    "Plain-English guide to 4weird private squad workspaces (UnitUnite): what exists today at /squads and what is planned per the remastery blueprint.",
};

export default function SquadWorkspacesDocsPage() {
  return (
    <article>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">
        4weird.com/docs/remastery/squad-workspaces · Wave 1
      </p>
      <h1 className="mt-2 text-3xl font-black">Squad workspaces, in plain English</h1>
      <p className="mt-3 text-muted-foreground">
        Squads are <strong>private, invite-only team workspaces</strong> — no public freelancer
        directory, no labor marketplace (that was evaluated and rejected: too much legal and
        safety risk). Start at <Link className="font-bold underline" href="/squads">/squads</Link>.
        Money rule everywhere: <strong>100 Vibe Coins = exactly $1.00</strong>.
      </p>

      <h2 className="mt-8 text-xl font-black">What exists today</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>/squads today:</strong> the UnitUnite workspace hub — people, code projects (Code + Issues tabs), encrypted team messaging, and cloud services, each gated by org permissions.</li>
        <li><strong>Orgs hold billing and audit;</strong> squads hold the people and the work. New users get a zero-cost default org.</li>
        <li><strong>Shared squad wallet</strong> is shown in coins with its USD equivalent (coins ÷ 100) for cloud/compute spend.</li>
      </ul>

      <h2 className="mt-8 text-xl font-black">Planned: per-squad workspace pages</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The remastery blueprint adds a dedicated page per squad at{" "}
        <code className="font-mono text-xs font-bold">/squads/[id]</code> with a header banner
        (name, tagline, Private Squad badge), wallet card, sprint-progress card linking to the
        kanban board, time-tracker and invoices shortcuts, and a squad code-projects list
        (name, description, target game slug, contributor count).{" "}
        <strong>Status: planned</strong> — the workspace UI lane is building it now.
      </p>

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
              <td className="px-4 py-2 font-mono text-xs font-bold">squad_projects</td>
              <td className="px-4 py-2 text-muted-foreground">id, squad_id, name, description, repository_url, target_game_slug, timestamps.</td>
            </tr>
            <tr className="border-b-0">
              <td className="px-4 py-2 font-mono text-xs font-bold">squad_project_members</td>
              <td className="px-4 py-2 text-muted-foreground">project_id + user_id, role: lead | contributor | reviewer.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Access is squad-scoped: you only see projects for squads you belong to (planned RLS).
      </p>

      <h2 className="mt-8 text-xl font-black">Roles at a glance</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Every project member holds exactly one role. Pick the narrowest role that fits the person:
      </p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 font-black">Role</th>
              <th className="px-4 py-2 font-black">Can do</th>
              <th className="px-4 py-2 font-black">Cannot do</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">lead</td>
              <td className="px-4 py-2 text-muted-foreground">Manage roster and projects, approve invoices and pooled spend.</td>
              <td className="px-4 py-2 text-muted-foreground">Browse other squads; leadership stops at the roster edge.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">contributor</td>
              <td className="px-4 py-2 text-muted-foreground">Move kanban cards, clock time, attach evidence to work.</td>
              <td className="px-4 py-2 text-muted-foreground">Approve spend or edit the roster.</td>
            </tr>
            <tr className="border-b-0">
              <td className="px-4 py-2 font-mono text-xs font-bold">reviewer</td>
              <td className="px-4 py-2 text-muted-foreground">Read everything, approve diffs, sign off sprints.</td>
              <td className="px-4 py-2 text-muted-foreground">Spend coins or change membership.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        The technical reference, including pooled balances and the 75/25 receipt split, lives in{" "}
        <Link className="underline" href="/docs/remastery/squads">Remastery Squad Workspaces</Link>.
      </p>

      <h2 className="mt-8 text-xl font-black">Worked example: raid squad week</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-6 text-sm text-muted-foreground">
        <li><strong>Monday, the lead invites three collaborators</strong> at <Link className="font-bold underline" href="/squads">/squads</Link>: two contributors and one reviewer. The roster is the whole permission system.</li>
        <li><strong>Tuesday, the lead creates the GraveGain project</strong> with a description, repository URL, and target game slug so code, boards, and budgets share one home.</li>
        <li><strong>Wednesday, contributors fill the sprint</strong> on the <Link className="underline" href="/docs/remastery/kanban-sprints">kanban board</Link>: six cards, hour estimates, one owner each.</li>
        <li><strong>Friday, the reviewer signs off the demo</strong> while contributors clock 14.5 hours; unbilled time becomes a draft invoice and the pooled wallet shows the gross balance beside its USD equivalent.</li>
      </ol>

      <h2 className="mt-8 text-xl font-black">Troubleshooting</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Invited but see nothing?</strong> The invite may target a different login. Confirm the exact account with the lead; squads hide completely from non-members.</li>
        <li><strong>Project board missing?</strong> Squad membership shows the workspace, but each project has its own member list. Ask the lead to add you to the project, not just the squad.</li>
        <li><strong>Wallet math confusing?</strong> The card shows gross coins with USD beside it (coins divided by 100). Any 75/25 division happens on settlement receipts, never as a fee on the card.</li>
        <li><strong>Outgrew one project?</strong> Leads create a second project under the same roster. Boards, clocks, and budgets stay separate per project, so the raid team and the art team stop stepping on each other.</li>
      </ul>

      <h2 className="mt-8 text-xl font-black">FAQ</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Can anyone browse squads?</strong> No — squads are invite-only. There is no public directory.</li>
        <li><strong>Where does billing live?</strong> In the org, not the squad. Squads coordinate; orgs pay and audit.</li>
        <li><strong>Coins vs USD?</strong> 100 Vibe Coins = exactly $1.00, shown side by side on the wallet card.</li>
        <li><strong>How do I join a squad?</strong> A lead invites you directly. There is no join button, application form, or waitlist.</li>
        <li><strong>Can I belong to several squads?</strong> Yes. Each workspace is separate: its own roster, projects, boards, and wallet.</li>
        <li><strong>Who approves spending?</strong> Leads only. Contributors ship work and reviewers approve quality; neither touches pooled funds.</li>
      </ul>

      <p className="mt-8 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Next: <Link className="underline" href="/docs/remastery/kanban-sprints">Kanban sprints</Link> ·{" "}
        <Link className="underline" href="/docs/remastery/time-tracking">Time tracking</Link> ·{" "}
        <Link className="underline" href="/squads">Open /squads</Link> ·{" "}
        <Link className="underline" href="/docs">All docs</Link>
      </p>
    </article>
  );
}
