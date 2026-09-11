"use client";

import { useState } from "react";

type Verdict = "safe" | "warning" | "unsafe" | "denied";

type SubmitResult = {
  submission?: { id?: string };
  verdict: Verdict;
  quarantined: boolean;
  status: string;
  findings: { level: string; code: string; detail: string }[];
  storage?: { gross: number; cut: number };
  audit?: { gross: number; cut: number };
  error?: string;
};

const VERDICT_STYLE: Record<Verdict, string> = {
  safe: "border-emerald-500/40 bg-emerald-950/30 text-emerald-200",
  warning: "border-amber-500/40 bg-amber-950/30 text-amber-200",
  unsafe: "border-orange-500/50 bg-orange-950/30 text-orange-200",
  denied: "border-red-500/50 bg-red-950/30 text-red-200",
};

/**
 * Game .zip submit flow: file + title + Vercel-style game root, 50 MB cap,
 * instant verdict display with findings + coin split. Denied/unsafe uploads
 * are quarantined (never served) and queued for HUMAN review; authority
 * referrals happen by a human, never automatically with an IP.
 */
export function ZipSubmitForm() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [gameRoot, setGameRoot] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setResult(null);
    if (!file) {
      setError("Pick a .zip first.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("That .zip is over the 50 MB cap. Trim it down so your game loads fast for everyone.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title || file.name.replace(/\.zip$/i, ""));
      form.append("game_root", gameRoot);
      const res = await fetch("/api/code/zip", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const body = (await res.json()) as SubmitResult & { success: boolean; error?: string };
      if (!res.ok || !body.success) {
        setError(body.error ?? "Upload failed.");
        return;
      }
      setResult(body);
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <label className="text-sm font-bold" htmlFor="zip-file">Game .zip (max 50 MB — keeps every game loading fast ⚡)</label>
        <input
          id="zip-file"
          type="file"
          accept=".zip,application/zip"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="zip-title">Title</label>
        <input
          id="zip-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Weird Game"
          maxLength={80}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="zip-root">
          Game root inside the .zip <span className="font-normal text-muted-foreground">(like Vercel; where index.html lives; blank = zip root)</span>
        </label>
        <input
          id="zip-root"
          value={gameRoot}
          onChange={(e) => setGameRoot(e.target.value)}
          placeholder="dist / public / games/my-game"
          maxLength={256}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
        />
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="rounded-full bg-cyan-600 px-6 py-2 text-sm font-black text-white transition hover:bg-cyan-500 disabled:opacity-50"
      >
        {busy ? "Scanning…" : "Upload + scan"}
      </button>
      <p className="text-xs text-muted-foreground">
        Storage + audit are metered in coins (25% cut included). Malware, keyloggers,
        cybercrime tools, and sexual content are hard-denied, quarantined, and queued for
        human moderators.
      </p>
      {error && <p className="rounded-xl border border-red-500/40 bg-red-950/20 p-3 text-sm text-red-200">{error}</p>}
      {result && (
        <div className={`rounded-xl border p-4 text-sm ${VERDICT_STYLE[result.verdict]}`}>
          <p className="font-black">
            Verdict: {result.verdict}
            {result.quarantined ? "; quarantined, never served, human review queued" : ""}
          </p>
          <p className="mt-1 text-xs opacity-80">
            Status {result.status} · Storage {result.storage?.gross ?? "?"} coins · Audit{" "}
            {result.audit?.gross ?? "?"} coins (25% cut included)
          </p>
          {result.submission?.id && (
            <p className="mt-2">
              <a className="font-bold underline" href={`/code/${result.submission.id}`}>
                Open the beautiful code view →
              </a>
            </p>
          )}
          {result.findings.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
              {result.findings.map((f, i) => (
                <li key={i}>
                  <span className="font-mono font-bold">[{f.code}]</span> {f.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
