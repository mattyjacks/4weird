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
  "h-full min-h-[220px] w-full flex-1 resize-none rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";
const btnCls =
  "min-h-[32px] rounded-md bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-950 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";
const ghostBtnCls =
  "min-h-[32px] rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

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

  async function pasteFromClipboard() {
    setError("");
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setError("Clipboard is empty.");
        return;
      }
      setDraft((prev) => (prev ? `${prev}\n${text}` : text).slice(0, 20000));
    } catch {
      setError("Clipboard read blocked — paste with Ctrl/⌘+V instead.");
    }
  }

  function chipFor(r: BouncerResult): { label: string; cls: string } {
    const s = `${r.status} ${r.risk} ${r.trap}`.toLowerCase();
    if (/trap|toxic|spam/.test(s)) return { label: "Trap", cls: "border-red-300/30 bg-red-300/10 text-red-200" };
    if (/invalid|fail|bad|bounce|undeliver/.test(s)) return { label: "Invalid", cls: "border-amber-300/30 bg-amber-300/10 text-amber-200" };
    if (/risk|unknown|catch|maybe/.test(s)) return { label: "Risky", cls: "border-amber-300/30 bg-amber-300/10 text-amber-200" };
    return { label: "Deliverable", cls: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" };
  }

  const counts = useMemo(() => {
    let good = 0, risky = 0, invalid = 0, trap = 0;
    for (const r of results) {
      const c = chipFor(r).label;
      if (c === "Deliverable") good++;
      else if (c === "Risky") risky++;
      else if (c === "Invalid") invalid++;
      else trap++;
    }
    return { good, risky, invalid, trap, total: results.length };
  }, [results]);

  const score = counts.total ? Math.round((counts.good / counts.total) * 100) : 0;
  const R = 34;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="grid gap-2 lg:h-[calc(100vh-110px)] lg:grid-cols-[45%_55%] lg:overflow-hidden">
      {/* Left 45%: input + bottom action bar */}
      <div className="flex min-h-[300px] flex-col rounded-xl border border-white/10 bg-white/[.04] p-2.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="bouncer-emails" className="text-[11px] font-semibold text-white">
            Emails (one per line, or , / ;)
          </label>
          <p id="bouncer-count" className={overLimit ? "text-[11px] font-semibold text-amber-300" : "text-[11px] text-slate-400"}>
            {parsed.length}/{MAX_EMAILS}
            {overLimit ? ` — ${rawCount - MAX_EMAILS} trimmed` : ""}
          </p>
        </div>
        <textarea
          id="bouncer-emails"
          className={inputCls}
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 20000))}
          placeholder={"you@example.com\nfriend@weird.mail\nboss@studio.gg"}
          rows={12}
          aria-describedby="bouncer-count"
        />
        {error && (
          <p role="alert" className="mt-1.5 rounded-md border border-red-400/30 bg-red-500/10 p-1.5 text-[11px] text-red-200">
            {error}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2">
          <button type="button" onClick={() => void checkAll()} disabled={busy || !parsed.length} className={btnCls}>
            {busy ? "Checking…" : `Check all (${parsed.length})`}
          </button>
          <button type="button" onClick={() => void pasteFromClipboard()} disabled={busy} className={ghostBtnCls}>
            Paste
          </button>
          <button type="button" onClick={exportCsv} disabled={!results.length || busy} className={ghostBtnCls}>
            Export CSV
          </button>
          <button type="button" onClick={clearAll} disabled={busy && !results.length} className={ghostBtnCls}>
            Clear
          </button>
        </div>
      </div>

      {/* Right 55%: SVG gauge + dense risk table */}
      <div className="flex min-h-0 flex-col rounded-xl border border-white/10 bg-white/[.04] p-2.5 lg:overflow-hidden">
        <div className="flex shrink-0 items-center gap-3">
          <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label={`Spam score ${score} of 100`}>
            <circle cx="42" cy="42" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8" />
            <circle
              cx="42" cy="42" r={R} fill="none"
              stroke={score >= 80 ? "#6ee7b7" : score >= 50 ? "#fcd34d" : "#fca5a5"}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={CIRC - (CIRC * score) / 100}
              transform="rotate(-90 42 42)"
            />
            <text x="42" y="40" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="800">{results.length ? score : "—"}</text>
            <text x="42" y="54" textAnchor="middle" fill="#94a3b8" fontSize="8">SPAM SCORE</text>
          </svg>
          <div className="flex flex-wrap gap-1 text-[10px] font-semibold">
            <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2 py-0.5 text-emerald-200">✓ {counts.good}</span>
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-amber-200">! {counts.risky}</span>
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-amber-200">✕ {counts.invalid}</span>
            <span className="rounded-full border border-red-300/30 bg-red-300/10 px-2 py-0.5 text-red-200">Trap {counts.trap}</span>
          </div>
          <p className="ml-auto text-[10px] text-slate-500">
            {checkedAt ? `Checked ${checkedAt.slice(0, 19).replace("T", " ")} UTC` : busy ? `Checking ${parsed.length}…` : results.length ? `${results.length} results` : "No results yet"}
          </p>
        </div>

        <div className="mt-2 min-h-0 flex-1 overflow-auto">
          {results.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 bg-black/20 p-4 text-center">
              <p className="text-xs font-semibold text-white">No results yet</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Paste a list left and hit “Check all”. Rows come back with status, score, risk, trap, toxicity, reason.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[560px] border-collapse text-left text-[11px]">
              <thead className="sticky top-0 bg-slate-950">
                <tr className="border-b border-white/10 uppercase tracking-wider text-slate-400">
                  <th scope="col" className="px-1.5 py-1">email</th>
                  <th scope="col" className="px-1.5 py-1">verdict</th>
                  <th scope="col" className="px-1.5 py-1">score</th>
                  <th scope="col" className="px-1.5 py-1">risk</th>
                  <th scope="col" className="px-1.5 py-1">trap</th>
                  <th scope="col" className="px-1.5 py-1">toxic</th>
                  <th scope="col" className="px-1.5 py-1">reason</th>
                  <th scope="col" className="px-1.5 py-1"><span className="sr-only">retry</span></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const chip = chipFor(r);
                  return (
                    <tr key={r.email.toLowerCase()} className="border-b border-white/5 text-slate-200">
                      <td className="max-w-[180px] truncate px-1.5 py-1 font-medium text-white">{r.email}</td>
                      <td className="px-1.5 py-1">
                        <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${chip.cls}`}>{chip.label}</span>
                      </td>
                      <td className="px-1.5 py-1">{r.score}</td>
                      <td className="max-w-[90px] truncate px-1.5 py-1" title={r.risk}>{r.risk}</td>
                      <td className="max-w-[70px] truncate px-1.5 py-1" title={r.trap}>{r.trap}</td>
                      <td className="max-w-[70px] truncate px-1.5 py-1" title={r.toxicity}>{r.toxicity}</td>
                      <td className="max-w-[160px] truncate px-1.5 py-1 text-slate-300" title={r.reason}>{r.reason || "—"}</td>
                      <td className="px-1.5 py-1">
                        <button
                          type="button"
                          onClick={() => void retryOne(r.email)}
                          disabled={busy || retryEmail === r.email}
                          className={ghostBtnCls}
                          aria-label={`Retry ${r.email}`}
                        >
                          {retryEmail === r.email ? "…" : "Retry"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
