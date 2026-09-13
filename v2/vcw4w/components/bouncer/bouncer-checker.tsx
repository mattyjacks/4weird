"use client";

import { useMemo, useState } from "react";

const MAX_EMAILS = 50;

type BouncerResult = {
  email: string;
  status: string;
  score: string | number;
  risk: string;
  trap: string;
  toxicity: string;
  reason: string;
};

type BatchResponse = {
  success?: boolean;
  error?: unknown;
  results?: unknown;
  checks?: unknown;
  items?: unknown;
};

type SingleResponse = {
  success?: boolean;
  error?: unknown;
  result?: unknown;
} & Partial<Record<keyof BouncerResult, unknown>>;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: unknown } & T;
  if (!res.ok || body.success === false) {
    throw new Error(String(body.error ?? `Request failed (${res.status})`));
  }
  return body as T;
}

function parseEmailList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of String(raw ?? "").split(/[\n,;]+/)) {
    const email = piece.trim().slice(0, 254);
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(email);
    if (out.length >= MAX_EMAILS) break;
  }
  return out;
}

function countRawEntries(raw: string): number {
  return String(raw ?? "")
    .split(/[\n,;]+/)
    .filter((p) => p.trim() !== "").length;
}

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

function normalizeResult(email: string, v: unknown): BouncerResult {
  const r = asRecord(v);
  return {
    email: String(r.email ?? email ?? ""),
    status: String(r.status ?? r.verdict ?? r.result ?? "unknown"),
    score: typeof r.score === "number" || typeof r.score === "string" ? r.score : "—",
    risk: String(r.risk ?? r.riskLevel ?? r.risk_level ?? "—"),
    trap: String(r.trap ?? r.spamTrap ?? r.spam_trap ?? r.spamtrap ?? "—"),
    toxicity: String(r.toxicity ?? r.toxic ?? "—"),
    reason: String(r.reason ?? r.detail ?? r.message ?? ""),
  };
}

function normalizeBatch(body: BatchResponse, sent: string[]): BouncerResult[] {
  const rawList = body.results ?? body.checks ?? body.items;
  if (Array.isArray(rawList)) {
    return rawList.map((row, i) => normalizeResult(sent[i] ?? "", row));
  }
  return sent.map((email) => normalizeResult(email, {}));
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Request failed.";
  if (/\(404\)/.test(msg))
    return "Bouncer API not found (404) — /api/bouncer/* may not be deployed yet. Your list is kept; try again later.";
  if (/\(429\)/.test(msg)) return "Rate limited (429) — wait a moment and retry.";
  if (/\(503\)/.test(msg)) return "Bouncer backend unavailable (503) — try again shortly.";
  return msg;
}

// Spreadsheet formula-injection guard (OWASP CSV guidance): prefix any cell
// whose first char is = + - @ with a single quote so Excel/Sheets treats it
// as text. Applied before RFC-4180 quoting.
function csvCell(v: unknown): string {
  const raw = String(v ?? "");
  const defused = raw.length > 0 && ["=", "+", "-", "@"].includes(raw.charAt(0)) ? `'${raw}` : raw;
  return /[",\n\r]/.test(defused) ? `"${defused.replaceAll('"', '""')}"` : defused;
}

function toCsv(rows: BouncerResult[]): string {
  const header = ["email", "status", "score", "risk", "trap", "toxicity", "reason"];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [r.email, r.status, r.score, r.risk, r.trap, r.toxicity, r.reason].map(csvCell).join(","),
    );
  }
  return lines.join("\n");
}

const inputCls =
  "min-h-[160px] w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";
const btnCls =
  "min-h-[44px] rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";
const ghostBtnCls =
  "min-h-[36px] rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export function BouncerChecker() {
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState<BouncerResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [retryEmail, setRetryEmail] = useState("");
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState("");

  const parsed = useMemo(() => parseEmailList(draft), [draft]);
  const rawCount = useMemo(() => countRawEntries(draft), [draft]);
  const overLimit = rawCount > MAX_EMAILS;

  async function checkAll() {
    setError("");
    if (!parsed.length) {
      setError("Paste at least one email to check.");
      return;
    }
    setBusy(true);
    try {
      const body = await request<BatchResponse>("/api/bouncer/batch", {
        method: "POST",
        body: JSON.stringify({ emails: parsed }),
      });
      setResults(normalizeBatch(body, parsed));
      setCheckedAt(new Date().toISOString());
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function retryOne(email: string) {
    setError("");
    setRetryEmail(email);
    try {
      const body = await request<SingleResponse>("/api/bouncer/check", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const single = body.result !== undefined ? body.result : body;
      const next = normalizeResult(email, single);
      setResults((prev) => {
        const idx = prev.findIndex((r) => r.email.toLowerCase() === email.toLowerCase());
        if (idx === -1) return [...prev, next];
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      });
    } catch (err) {
      setError(`Retry for ${email}: ${friendlyError(err)}`);
    } finally {
      setRetryEmail("");
    }
  }

  function exportCsv() {
    if (!results.length) return;
    // Blob + anchor download only inside the click handler: SSR-safe, no
    // window/document access at module scope or during render.
    const blob = new Blob([toCsv(results)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bouncer-results.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    setDraft("");
    setResults([]);
    setError("");
    setCheckedAt("");
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
      <label htmlFor="bouncer-emails" className="text-sm font-semibold text-white">
        Paste up to {MAX_EMAILS} emails (one per line, or comma/semicolon separated)
      </label>
      <textarea
        id="bouncer-emails"
        className={inputCls}
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, 20000))}
        placeholder={"you@example.com\nfriend@weird.mail\nboss@studio.gg"}
        rows={7}
        aria-describedby="bouncer-count"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <p id="bouncer-count" className={overLimit ? "text-sm font-semibold text-amber-300" : "text-sm text-slate-400"}>
          {parsed.length} of {MAX_EMAILS} will be checked
          {overLimit ? ` — ${rawCount - MAX_EMAILS} extra entr${rawCount - MAX_EMAILS === 1 ? "y" : "ies"} trimmed` : ""}
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" onClick={() => void checkAll()} disabled={busy || !parsed.length} className={btnCls}>
            {busy ? "Checking…" : `Check all (${parsed.length})`}
          </button>
          <button type="button" onClick={exportCsv} disabled={!results.length || busy} className={ghostBtnCls}>
            Export CSV
          </button>
          <button type="button" onClick={clearAll} disabled={busy && !results.length} className={ghostBtnCls}>
            Clear
          </button>
        </div>
      </div>

      {busy && (
        <p role="status" className="mt-4 rounded-xl border border-white/10 bg-white/[.03] p-3 text-sm text-slate-300">
          Checking {parsed.length} email{parsed.length === 1 ? "" : "s"}…
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {!busy && !error && results.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
          <p className="font-semibold text-white">No results yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Paste a list above and hit “Check all”. Each row comes back with status, score, risk, trap, toxicity,
            and reason.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          {checkedAt && (
            <p className="mb-2 text-xs text-slate-400">
              Last checked: {checkedAt.slice(0, 19).replace("T", " ")} UTC · {results.length} result
              {results.length === 1 ? "" : "s"}
            </p>
          )}
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                <th scope="col" className="px-2 py-2">email</th>
                <th scope="col" className="px-2 py-2">status</th>
                <th scope="col" className="px-2 py-2">score</th>
                <th scope="col" className="px-2 py-2">risk</th>
                <th scope="col" className="px-2 py-2">trap</th>
                <th scope="col" className="px-2 py-2">toxicity</th>
                <th scope="col" className="px-2 py-2">reason</th>
                <th scope="col" className="px-2 py-2">
                  <span className="sr-only">actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.email.toLowerCase()} className="border-b border-white/5 text-slate-200">
                  <td className="max-w-[220px] truncate px-2 py-2 font-medium text-white">{r.email}</td>
                  <td className="px-2 py-2">{r.status}</td>
                  <td className="px-2 py-2">{r.score}</td>
                  <td className="px-2 py-2">{r.risk}</td>
                  <td className="px-2 py-2">{r.trap}</td>
                  <td className="px-2 py-2">{r.toxicity}</td>
                  <td className="max-w-[260px] truncate px-2 py-2 text-slate-300" title={r.reason}>
                    {r.reason || "—"}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => void retryOne(r.email)}
                      disabled={busy || retryEmail === r.email}
                      className={ghostBtnCls}
                      aria-label={`Retry ${r.email}`}
                    >
                      {retryEmail === r.email ? "Retrying…" : "Retry"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
