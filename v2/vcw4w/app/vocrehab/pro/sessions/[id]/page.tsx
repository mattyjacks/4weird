import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import VocrehabSessionReview, {
  type VocrehabReviewAuditEntry,
  type VocrehabReviewDraft,
} from "@/components/vocrehab/vocrehab-session-review";

export const metadata: Metadata = {
  title: "Session review — VocRehab Pro",
  description:
    "Review four ambient-drafted boxes for one consented session. Approve, edit, or discard each — nothing files or sends itself.",
  alternates: { canonical: "/vocrehab/pro/sessions" },
};

/** Minimal local shapes — never import @/types/vocrehab-* here. */
interface VocrehabSessionRow {
  id: string;
  client_ref: string;
  created_at: string;
}

interface VocrehabDraftRow {
  id: string;
  body: string;
  status: string;
  created_at: string;
  updated_at?: string | null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-2xl font-bold">Session review</h1>
        <p className="text-sm">Sign in as a counselor to review drafts.</p>
        <Link className="text-sm underline" href="/vocrehab/pro/sessions">
          Back to inbox
        </Link>
      </main>
    );
  }

  const { data: session } = await supabase
    .from("vocrehab_coaching_sessions")
    .select("id,client_ref,created_at")
    .eq("id", id)
    .eq("counselor_id", user.id)
    .maybeSingle();
  const sessionRow = session as VocrehabSessionRow | null;
  if (!sessionRow) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-2xl font-bold">Session review</h1>
        <p className="text-sm">
          Session not found or not yours. The inbox lists only your own
          sessions.
        </p>
        <Link className="text-sm underline" href="/vocrehab/pro/sessions">
          Back to inbox
        </Link>
      </main>
    );
  }

  const [notes, measures, rationales, outreach] = await Promise.all([
    supabase
      .from("vocrehab_case_notes")
      .select("id,body,status,created_at,updated_at")
      .eq("session_id", id)
      .eq("counselor_id", user.id)
      .order("created_at", { ascending: true })
      .limit(4),
    supabase
      .from("vocrehab_progress_measures")
      .select("id,body,status,created_at")
      .eq("session_id", id)
      .eq("counselor_id", user.id)
      .order("created_at", { ascending: true })
      .limit(4),
    supabase
      .from("vocrehab_rationalizations")
      .select("id,body,status,created_at")
      .eq("session_id", id)
      .eq("counselor_id", user.id)
      .order("created_at", { ascending: true })
      .limit(4),
    // Outreach drafts carry no session link by design (copy-only, no
    // contact store): show the one drafted nearest this session, if any.
    supabase
      .from("vocrehab_outreach_drafts")
      .select("id,body,status,created_at")
      .eq("counselor_id", user.id)
      .gte("created_at", sessionRow.created_at)
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  const drafts: VocrehabReviewDraft[] = [];
  for (const row of ((notes.data ?? []) as VocrehabDraftRow[])) {
    drafts.push({
      id: row.id,
      table: "vocrehab_case_notes",
      kind: "case-note",
      title: "Case note",
      body: row.body,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? row.created_at,
    });
  }
  for (const row of ((measures.data ?? []) as VocrehabDraftRow[])) {
    drafts.push({
      id: row.id,
      table: "vocrehab_progress_measures",
      kind: "measure",
      title: "Progress measure",
      body: row.body,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.created_at,
    });
  }
  for (const row of ((rationales.data ?? []) as VocrehabDraftRow[])) {
    drafts.push({
      id: row.id,
      table: "vocrehab_rationalizations",
      kind: "rationale",
      title: "Rationale",
      body: row.body,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.created_at,
    });
  }
  const outreachRows = (outreach.data ?? []) as VocrehabDraftRow[];
  if (outreachRows.length > 0 && outreachRows[0].body.length > 0) {
    drafts.push({
      id: outreachRows[0].id,
      table: "vocrehab_outreach_drafts",
      kind: "outreach",
      title: "Outreach",
      body: outreachRows[0].body,
      status: outreachRows[0].status,
      createdAt: outreachRows[0].created_at,
      updatedAt: outreachRows[0].created_at,
    });
  } else {
    drafts.push({
      id: "vocrehab-outreach-empty",
      table: "vocrehab_outreach_drafts",
      kind: "outreach",
      title: "Outreach (none triggered)",
      body: "No employer signal in this session's notes — nothing to draft. Use the outreach generator when a partnership idea comes up.",
      status: "discarded",
      createdAt: sessionRow.created_at,
      updatedAt: sessionRow.created_at,
    });
  }

  const audit: VocrehabReviewAuditEntry[] = [
    {
      label: `Session opened by owning counselor (client ${sessionRow.client_ref}). Four drafts generated from the redacted pass.`,
      at: sessionRow.created_at,
    },
    ...drafts
      .filter((d) => d.id !== "vocrehab-outreach-empty")
      .map((d) => ({
        label: `${d.title} drafted — status ${d.status}. Counselor review required before anything files or sends.`,
        at: d.createdAt,
      })),
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <Link
          className="text-sm underline"
          href="/vocrehab/pro/sessions"
        >
          Back to inbox
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          Review: {sessionRow.client_ref}
        </h1>
        <p className="text-sm text-muted-foreground">
          Four boxes, four decisions. Edit, approve, or discard each one —
          nothing leaves draft without your explicit tap.
        </p>
      </div>
      <VocrehabSessionReview
        sessionId={sessionRow.id}
        clientRef={sessionRow.client_ref}
        sessionCreatedAt={sessionRow.created_at}
        drafts={drafts}
        audit={audit}
      />
    </main>
  );
}
