import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/remastery/migration" },
  title: "Remastery SQL Migration Runbook",
  description:
    "Run the Wave 1 Supabase migration step by step: squad, kanban, time, invoice, notification, and chat tables with RLS policies and performance indexes — then verify.",
};

const theme = {
  bg: "bg-gradient-to-br from-slate-950 via-slate-950 to-cyan-950",
  border: "border-slate-300/20",
  chip: "border-slate-300/40 bg-slate-300/10 text-slate-200",
  title: "bg-gradient-to-r from-slate-200 via-cyan-200 to-violet-300 bg-clip-text text-transparent",
};

export default function RemasteryMigrationPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · remastery runbook"
        title={<>Migrate once. <span className={theme.title}>Verify twice.</span></>}
        lede={<>The Wave 1 Supabase migration creates the squad, kanban, time-tracking, invoicing, notification, and chat tables from remastery spec section 2 — with Row Level Security and indexes. Run it in the Supabase SQL editor, in order, then prove it worked.</>}
        stats={[
          ["6", "table groups"],
          ["19", "tables + join tables"],
          ["RLS", "on, everywhere"],
          ["6", "verify queries"],
        ]}
        glyph="🗄️"
        theme={theme}
        crumb="Migration"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[60, 44, 72, 52, 80, 58, 68].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-slate-200/50 bg-gradient-to-t from-cyan-500 to-slate-200 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Before you run"
        title="Preflight checklist"
        body="The full DDL lives in the remastery spec (public/swarm/remastery/README.md, section 2). This page is the run order and the proof — run each block in the Supabase SQL editor for the project that hosts the app, top to bottom."
      />
      <Steps
        items={[
          ["Back up first", <>Snapshot the database (Supabase dashboard → Database → Backups) before running anything. A migration you can roll back is a migration you can run calmly.</>],
          ["Confirm the squads table exists", <>The migration references public.squads(id) and public.squad_members(squad_id, user_id). If your project predates squads, create those base tables first — every foreign key below hangs off them.</>],
          ["Run as a service-role SQL editor session", <>RLS policies reference auth.uid(). Run the DDL in the SQL editor (bypasses RLS) and test the policies afterward as an authenticated app user, not as the editor.</>],
        ]}
      />
      <Callout tone="gold" title="Never paste secrets into these docs or logs.">
        The migration needs no API keys. If any step asks for a service-role key, stop — run it in the dashboard SQL
        editor instead, and keep keys in server-only environment variables.
      </Callout>

      <SectionHead
        index="2"
        kicker="Block A"
        title="Squad projects and members"
        body="Creates squad_projects (name, description, repository_url, target_game_slug) and the squad_project_members join table with lead / contributor / reviewer roles. Depends on public.squads and auth.users."
      />
      <MockWindow title="block A — tables" badge="2 tables">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>squad_projects</span><span className="font-black text-cyan-300">squad_id → squads</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>squad_project_members</span><span className="font-black text-cyan-300">PK (project_id, user_id)</span></div>
        </div>
      </MockWindow>

      <SectionHead
        index="3"
        kicker="Block B"
        title="Kanban boards, cycles, columns, cards"
        body="Creates kanban_boards, kanban_cycles (sprint windows with 0–100 progress), kanban_columns (positioned lists), and kanban_cards (priority, estimate_hours, due_date, labels, assignee, position). Cards link to boards, cycles, columns, and optionally to time entries."
      />
      <MockWindow title="block B — tables" badge="4 tables">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>kanban_boards</span><span className="font-black text-cyan-300">owner + squad</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>kanban_cycles</span><span className="font-black text-cyan-300">start/end_date</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>kanban_columns</span><span className="font-black text-cyan-300">position</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>kanban_cards</span><span className="font-black text-cyan-300">column + cycle + assignee</span></div>
        </div>
      </MockWindow>

      <SectionHead
        index="4"
        kicker="Block C"
        title="Time tracking and invoicing"
        body="Creates time_projects (rates, budgets, billable flags), time_entries (start/end, duration_seconds, invoiced flag, optional card link), invoice_clients, invoices (draft → sent → paid, with deleted_at for the 30-day trash), and invoice_line_items. Money-adjacent tables are owner-scoped: every policy keys off auth.uid() = user_id."
      />
      <MockWindow title="block C — tables" badge="5 tables">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>time_projects / time_entries</span><span className="font-black text-cyan-300">owner-scoped</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>invoice_clients</span><span className="font-black text-cyan-300">owner-scoped</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>invoices</span><span className="font-black text-cyan-300">deleted_at = trash</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>invoice_line_items</span><span className="font-black text-cyan-300">via parent invoice</span></div>
        </div>
      </MockWindow>

      <SectionHead
        index="5"
        kicker="Block D"
        title="Notifications and chat"
        body="Creates notifications (category, title, message, action_url, is_read) plus chat_threads, chat_participants, and chat_messages. Chat reads require thread membership; message inserts require the sender to be a participant."
      />

      <SectionHead
        index="6"
        kicker="Block E"
        title="Enable RLS and create policies"
        body="Enable Row Level Security on every new table, then create the policies in spec order: squad/kanban membership checks, owner-only time and invoice policies, own-notifications read/update, and chat membership-gated read/insert. Run the whole RLS block as one transaction so a halfway policy set never ships."
      />
      <Callout tone="emerald" title="Test RLS as the app user.">
        After applying, sign in as a non-owner test user and confirm: squad boards you belong to are visible, other
        squads&apos; boards are not, invoices list only your own, and chat threads you never joined return zero rows.
      </Callout>

      <SectionHead
        index="7"
        kicker="Block F"
        title="Performance indexes"
        body="Create the six indexes last: invoices by (user_id, deleted_at) for the trash tab, time_entries by (user_id, project_id, start_time), kanban_cards by (column_id, position), notifications by (user_id, is_read, created_at), chat_messages by (thread_id, created_at), and dps_nodes by (status, last_heartbeat)."
      />

      <SectionHead
        index="8"
        kicker="Proof"
        title="Verify queries — all six must return clean"
      />
      <Steps
        items={[
          ["Tables exist", <>Query information_schema.tables for the 19 names. Every block-A–D table must appear exactly once.</>],
          ["RLS is on", <>Query pg_tables where rowsecurity is true for each new table. Any false row means block E did not finish — re-run it.</>],
          ["Policies exist", <>Query pg_policies for squad_projects_read, kanban_boards_access, kanban_cards_access, time/invoice owner policies, notifications read/update, and the three chat policies.</>],
          ["Indexes exist", <>Query pg_indexes for idx_invoices_user_deleted, idx_time_entries_user_proj, idx_kanban_cards_pos, idx_notifications_unread, idx_chat_messages_time, and idx_dps_nodes_active.</>],
          ["Trash lifecycle works", <>Insert a draft invoice, set deleted_at, confirm it disappears from the active list query (deleted_at IS NULL) and appears in the trash query.</>],
          ["Membership gating works", <>As two test users, confirm cross-squad board reads and non-member chat reads return zero rows.</>],
        ]}
      />
      <p className="mt-4 text-sm text-muted-foreground">
        Green on all six? Continue to <Link className="underline" href="/docs/remastery/squads">squad workspaces</Link>.
        Anything red is a migration problem, not an app problem — fix it here before opening the app pages.
      </p>

      <Pager current="/docs/remastery/migration" />
    </article>
  );
}
