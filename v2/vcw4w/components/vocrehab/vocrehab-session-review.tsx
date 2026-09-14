"use client";

import { useMemo, useState } from "react";
import { vocrehabRedactPii } from "@/lib/vocrehab-privacy";

/** Minimal local shapes — never import @/types/vocrehab-* here. */
export interface VocrehabReviewDraft {
  id: string;
  table:
    | "vocrehab_case_notes"
    | "vocrehab_progress_measures"
    | "vocrehab_rationalizations"
    | "vocrehab_outreach_drafts";
  kind: "case-note" | "measure" | "rationale" | "outreach";
  title: string;
  body: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface VocrehabReviewAuditEntry {
  label: string;
  at: string;
}

interface VocrehabSessionReviewProps {
  sessionId: string;
  clientRef: string;
  sessionCreatedAt: string;
  drafts: VocrehabReviewDraft[];
  audit: VocrehabReviewAuditEntry[];
}

type VocrehabApproveDecision = "approved" | "edited" | "discarded";

const VOCREHAB_KIND_HEADING: Record<VocrehabReviewDraft["kind"], string> = {
  "case-note": "Case note draft",
  measure: "IPE progress-measure draft",
  rationale: "JCTS / SE / CE rationale draft",
  outreach: "Outreach draft (copy-only)",
};

async function vocrehabPostApproval(input: {
  table: VocrehabReviewDraft["table"];
  id: string;
  body?: string;
  decision: VocrehabApproveDecision;
}): Promise<{ status: string; audit: string }> {
  const res = await fetch("/api/vocrehab/pro/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as {
    success?: boolean;
    error?: string;
    status?: string;
    audit?: string;
  };
  if (!res.ok || data.success !== true) {
    throw new Error(data.error ?? "Approval request failed.");
  }
  return { status: String(data.status ?? ""), audit: String(data.audit ?? "") };
}

function VocrehabDraftBox({
  draft,
  onStatus,
}: {
  draft: VocrehabReviewDraft;
  onStatus: (id: string, status: string, body: string, note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(draft.body);
  const [confirming, setConfirming] = useState<"approve" | "discard" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = editBody !== draft.body;
  const decided = draft.status !== "draft";

  async function run(decision: VocrehabApproveDecision) {
    setBusy(true);
    setError(null);
    try {
      const result = await vocrehabPostApproval({
        table: draft.table,
        id: draft.id,
        body: decision === "edited" ? editBody : undefined,
        decision,
      });
      onStatus(
        draft.id,
        result.status,
        decision === "edited" ? editBody : draft.body,
        result.audit,
      );
      setEditing(false);
      setConfirming(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  const boxId = `vocrehab-draft-${draft.id}`;
  return (
    <section
      aria-labelledby={`${boxId}-heading`}
      className="rounded-xl border border-white/15 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${boxId}-heading`} className="font-bold">
          {VOCREHAB_KIND_HEADING[draft.kind]}
        </h3>
        <span
          className="rounded-full border border-white/20 px-2 py-0.5 text-xs"
          aria-label={`Status: ${draft.status}`}
        >
          {draft.status}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {draft.title} · drafted {draft.createdAt}
        {draft.updatedAt !== draft.createdAt
          ? ` · updated ${draft.updatedAt}`
          : ""}
      </p>
      {draft.kind === "rationale" ? (
        <p className="mt-2 rounded-md border border-amber-300/40 bg-amber-300/10 p-2 text-xs">
          Template starting point — counselor determines need and writes the
          final determination.
        </p>
      ) : null}
      {draft.kind === "outreach" ? (
        <p className="mt-2 rounded-md border border-white/20 p-2 text-xs">
          Copy-only. Nothing auto-sends; send from your own email client.
        </p>
      ) : null}
      {editing ? (
        <label
          className="mt-3 block text-sm font-medium"
          htmlFor={`${boxId}-edit`}
        >
          Edit draft (your edit is saved on approve)
          <textarea
            id={`${boxId}-edit`}
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={8}
            maxLength={20000}
            className="mt-1 block w-full rounded-md border border-white/20 bg-background p-2 text-sm"
          />
        </label>
      ) : (
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-white/5 p-3 text-sm">
          {draft.body}
        </pre>
      )}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {!decided && !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-white/25 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            Edit
          </button>
        ) : null}
        {!decided && editing ? (
          <>
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={() => run("edited")}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save edit"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditBody(draft.body);
                setEditing(false);
              }}
              className="rounded-md border border-white/25 px-3 py-1.5 text-sm hover:bg-white/10"
            >
              Cancel edit
            </button>
          </>
        ) : null}
        {!decided ? (
          confirming === "approve" ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(dirty ? "edited" : "approved")}
                className="rounded-md bg-green-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {busy ? "Approving…" : "Confirm approve"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(null)}
                className="rounded-md border border-white/25 px-3 py-1.5 text-sm hover:bg-white/10"
              >
                Back
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming("approve")}
              className="rounded-md bg-green-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Approve
            </button>
          )
        ) : null}
        {!decided ? (
          confirming === "discard" ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => run("discarded")}
                className="rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground disabled:opacity-50"
              >
                {busy ? "Discarding…" : "Confirm discard"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(null)}
                className="rounded-md border border-white/25 px-3 py-1.5 text-sm hover:bg-white/10"
              >
                Back
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming("discard")}
              className="rounded-md border border-red-400/60 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950/40"
            >
              Discard
            </button>
          )
        ) : null}
      </div>
    </section>
  );
}

export default function VocrehabSessionReview(props: VocrehabSessionReviewProps) {
  const [drafts, setDrafts] = useState<VocrehabReviewDraft[]>(props.drafts);
  const [audit, setAudit] = useState<VocrehabReviewAuditEntry[]>(props.audit);
  const [notice, setNotice] = useState<string | null>(null);
  const [batchConfirm, setBatchConfirm] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [preview, setPreview] = useState("");

  const previewRedacted = useMemo(() => vocrehabRedactPii(preview), [preview]);
  const pending = drafts.filter((d) => d.status === "draft");

  function handleStatus(id: string, status: string, body: string, note: string) {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status, body, updatedAt: new Date().toISOString() }
          : d,
      ),
    );
    setAudit((prev) => [
      ...prev,
      { label: note, at: new Date().toISOString() },
    ]);
    setNotice(note);
  }

  async function approveAll() {
    setBatchBusy(true);
    setNotice(null);
    try {
      for (const draft of drafts.filter((d) => d.status === "draft")) {
        const result = await vocrehabPostApproval({
          table: draft.table,
          id: draft.id,
          decision: "approved",
        });
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draft.id
              ? { ...d, status: result.status, updatedAt: new Date().toISOString() }
              : d,
          ),
        );
        setAudit((prev) => [
          ...prev,
          { label: `${draft.title}: ${result.audit}`, at: new Date().toISOString() },
        ]);
      }
      setNotice("All pending drafts approved. Nothing filed or sent itself.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Batch approve failed.");
    } finally {
      setBatchBusy(false);
      setBatchConfirm(false);
    }
  }

  return (
    <div className="space-y-6">
      <div aria-live="polite">
        {notice ? (
          <p className="rounded-md border border-white/20 bg-white/5 p-3 text-sm">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          aria-labelledby="vocrehab-transcript-heading"
          className="rounded-xl border border-white/15 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="vocrehab-transcript-heading" className="text-lg font-bold">
              Session transcript (redacted view)
            </h2>
            <button
              type="button"
              onClick={() => setShowRaw((v) => !v)}
              aria-pressed={showRaw}
              className="rounded-md border border-white/25 px-3 py-1.5 text-sm hover:bg-white/10"
            >
              {showRaw ? "Hide raw" : "Show raw"}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Raw transcript text is never stored on the server — only the
            redacted pass was kept. Paste below to re-preview redaction
            locally; nothing uploads.
          </p>
          <label
            className="mt-3 block text-sm font-medium"
            htmlFor="vocrehab-transcript-preview"
          >
            Local re-preview (stays in your browser)
            <textarea
              id="vocrehab-transcript-preview"
              value={preview}
              onChange={(e) => setPreview(e.target.value)}
              rows={8}
              placeholder="Paste transcript here to preview the redaction pass locally."
              className="mt-1 block w-full rounded-md border border-white/20 bg-background p-2 text-sm"
            />
          </label>
          <div className="mt-2 rounded-md bg-white/5 p-3 text-sm" aria-live="polite">
            <p className="text-xs text-muted-foreground">
              {showRaw ? "Raw (your browser only)" : "Redacted preview"} ·{" "}
              {previewRedacted.redactions_applied.length} redaction
              {previewRedacted.redactions_applied.length === 1 ? "" : "s"} applied
              {previewRedacted.redactions_applied.length > 0
                ? ` (${previewRedacted.redactions_applied.join(", ")})`
                : ""}
            </p>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap">
              {preview.length === 0
                ? "Nothing to preview yet."
                : showRaw
                  ? preview
                  : previewRedacted.text}
            </pre>
          </div>
        </section>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/15 p-4">
            <p className="text-sm">
              {pending.length} of {drafts.length} drafts pending review.
            </p>
            {batchConfirm ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={batchBusy || pending.length === 0}
                  onClick={approveAll}
                  className="rounded-md bg-green-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  {batchBusy ? "Approving…" : "Confirm approve all"}
                </button>
                <button
                  type="button"
                  disabled={batchBusy}
                  onClick={() => setBatchConfirm(false)}
                  className="rounded-md border border-white/25 px-3 py-1.5 text-sm hover:bg-white/10"
                >
                  Back
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={pending.length === 0}
                onClick={() => setBatchConfirm(true)}
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                Approve all
              </button>
            )}
          </div>
          {drafts.map((draft) => (
            <VocrehabDraftBox
              key={draft.id}
              draft={draft}
              onStatus={handleStatus}
            />
          ))}
        </div>
      </div>

      <section
        aria-labelledby="vocrehab-audit-heading"
        className="rounded-xl border border-white/15 p-4"
      >
        <h2 id="vocrehab-audit-heading" className="text-lg font-bold">
          Audit strip
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Session {props.sessionId} · client {props.clientRef} · opened{" "}
          {props.sessionCreatedAt}. Own-counselor rows only.
        </p>
        <ol className="mt-2 space-y-1 text-sm">
          {audit.map((entry, i) => (
            <li key={`${entry.at}-${i}`}>
              <span className="text-muted-foreground">{entry.at}</span> —{" "}
              {entry.label}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
