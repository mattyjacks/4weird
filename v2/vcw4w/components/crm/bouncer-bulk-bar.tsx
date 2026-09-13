"use client";

import { useState } from "react";
import { BouncerStatusBadge } from "./bouncer-status-badge";

interface BouncerBulkBarProps {
  orgId: string;
  selectedIds?: string[];
  onDone?: () => void;
}

interface VerifySummary {
  checked: number;
  deliverable: number;
  risky: number;
  undeliverable: number;
  unknown: number;
  trapRisks: number;
}

type GroupFilter = "" | "lead" | "active" | "inactive";

// One-click single-contact verify for per-row use (no workspace edits:
// rows import this helper directly). Returns the route summary.
export async function verifyBouncerContact(
  orgId: string,
  contactId: string,
): Promise<VerifySummary> {
  const res = await fetch("/api/crm/contacts/verify-bouncer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ org_id: orgId, contact_id: contactId }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || !data.success) {
    throw new Error(String(data.error ?? `Verify failed (${res.status}).`));
  }
  return {
    checked: Number(data.checked ?? 0),
    deliverable: Number(data.deliverable ?? 0),
    risky: Number(data.risky ?? 0),
    undeliverable: Number(data.undeliverable ?? 0),
    unknown: Number(data.unknown ?? 0),
    trapRisks: Number(data.trapRisks ?? 0),
  };
}

// One-click per-row button. Import it in the contacts table —
// crm-workspace.tsx itself is never edited by this lane.
export function BouncerVerifyButton({
  orgId,
  contactId,
  onDone,
}: {
  orgId: string;
  contactId: string;
  onDone?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setBusy(true);
    setError("");
    try {
      await verifyBouncerContact(orgId, contactId);
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verify failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        title="Verify this email with Bouncer"
        className="rounded-md border border-cyan-700/60 bg-cyan-950/60 px-2 py-0.5 text-xs font-medium text-cyan-300 hover:bg-cyan-900/60 disabled:opacity-50"
      >
        {busy ? "Verifying…" : "✉️ Verify"}
      </button>
      {error ? (
        <span className="text-xs text-red-400" title={error}>
          failed
        </span>
      ) : null}
    </span>
  );
}

export function BouncerBulkBar({
  orgId,
  selectedIds = [],
  onDone,
}: BouncerBulkBarProps) {
  const [group, setGroup] = useState<GroupFilter>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [summary, setSummary] = useState<VerifySummary | null>(null);
  const [error, setError] = useState("");

  async function run(mode: "selected" | "group" | "all") {
    setBusy(mode);
    setError("");
    setSummary(null);
    try {
      const payload: Record<string, unknown> = { org_id: orgId };
      if (mode === "selected") {
        // A single selection takes the single-contact path (contact_id);
        // multi-selections go through contact_ids.
        if (selectedIds.length === 1) payload.contact_id = selectedIds[0];
        else payload.contact_ids = selectedIds;
      } else if (mode === "group") {
        if (group) payload.status = group;
      } else {
        payload.verify_all_unverified = true;
      }
      const res = await fetch("/api/crm/contacts/verify-bouncer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || !data.success) {
        throw new Error(String(data.error ?? `Verify failed (${res.status}).`));
      }
      setSummary({
        checked: Number(data.checked ?? 0),
        deliverable: Number(data.deliverable ?? 0),
        risky: Number(data.risky ?? 0),
        undeliverable: Number(data.undeliverable ?? 0),
        unknown: Number(data.unknown ?? 0),
        trapRisks: Number(data.trapRisks ?? 0),
      });
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verify failed.");
    } finally {
      setBusy(null);
    }
  }

  const working = busy !== null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-2 text-sm">
      <span className="font-semibold text-cyan-200">✉️ Bouncer</span>

      <button
        type="button"
        onClick={() => run("selected")}
        disabled={working || selectedIds.length === 0}
        title={
          selectedIds.length === 1
            ? "Verify the selected contact (single-contact path)"
            : "Verify all selected contacts"
        }
        className="rounded-md border border-cyan-700/60 bg-cyan-950/60 px-2 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-900/60 disabled:opacity-40"
      >
        {busy === "selected"
          ? "Verifying…"
          : selectedIds.length === 1
            ? "Verify selected (1)"
            : `Verify selected (${selectedIds.length})`}
      </button>

      <select
        value={group}
        onChange={(e) => setGroup(e.target.value as GroupFilter)}
        disabled={working}
        title="Group filter for group verify"
        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 disabled:opacity-40"
      >
        <option value="">Group: all statuses</option>
        <option value="lead">Group: leads</option>
        <option value="active">Group: active</option>
        <option value="inactive">Group: inactive</option>
      </select>
      <button
        type="button"
        onClick={() => run("group")}
        disabled={working}
        title="Verify the current group filter (status)"
        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40"
      >
        {busy === "group" ? "Verifying…" : "Verify group"}
      </button>

      <button
        type="button"
        onClick={() => run("all")}
        disabled={working}
        title="Verify all unverified contacts (200 per batch)"
        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40"
      >
        {busy === "all" ? "Verifying…" : "Verify all unverified"}
      </button>

      {summary ? (
        <span className="inline-flex flex-wrap items-center gap-1 text-xs text-slate-300">
          <span>
            {summary.checked} checked · {summary.deliverable} ok · {summary.risky} risky ·{" "}
            {summary.undeliverable} bounce · {summary.unknown} unknown
            {summary.trapRisks > 0 ? ` · ⚠️ ${summary.trapRisks} trap risk` : ""}
          </span>
          <BouncerStatusBadge status="deliverable" compact />
          <BouncerStatusBadge status="risky" compact />
          <BouncerStatusBadge status="undeliverable" compact />
          <BouncerStatusBadge status="unknown" compact />
        </span>
      ) : null}

      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  );
}
