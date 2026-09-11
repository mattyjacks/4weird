"use client";

import { useEffect, useState } from "react";
import { CodeViewer } from "@/components/code/code-viewer";

type Submission = {
  id: string;
  title: string;
  status: string;
  verdict: string;
  quarantined: boolean;
  game_root: string;
  zip_bytes: number;
  zip_sha256: string;
  audit_findings: { level: string; code: string; detail: string }[];
  preview_files?: { name: string; text: string }[];
  download: string | null;
};

/** Beautiful code view for one submission: verdict, findings, audit, files. */
export function CodeDetail({ id }: { id: string }) {
  const [sub, setSub] = useState<Submission | null>(null);
  const [error, setError] = useState("");
  const [auditing, setAuditing] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/code/${id}`, { credentials: "include" });
        const body = (await res.json()) as { success: boolean; submission?: Submission; error?: string };
        if (!body.success || !body.submission) {
          setError(body.error ?? "Not found.");
          return;
        }
        setSub(body.submission);
      } catch {
        setError("Load failed.");
      }
    })();
  }, [id]);

  async function audit(deep: boolean) {
    if (!sub) return;
    setAuditing(true);
    setAiNote(null);
    try {
      const res = await fetch(`/api/code/${sub.id}/audit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deep }),
      });
      const body = (await res.json()) as {
        success: boolean;
        findings?: Submission["audit_findings"];
        aiNote?: string | null;
        error?: string;
      };
      if (!body.success) {
        setError(body.error ?? "Audit failed.");
        return;
      }
      setSub({ ...sub, audit_findings: body.findings ?? sub.audit_findings });
      setAiNote(body.aiNote ?? null);
    } catch {
      setError("Audit failed.");
    } finally {
      setAuditing(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="rounded-xl border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-200">{error}</p>
      </main>
    );
  }
  if (!sub) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl space-y-6 px-5 py-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
            {sub.status} · {sub.verdict}
            {sub.quarantined ? " · quarantined" : ""}
          </p>
          <h1 className="mt-2 text-4xl font-black">🎮 {sub.title}</h1>
          <p className="mt-2 font-mono text-xs text-slate-400">
            game root: {sub.game_root || "(zip root)"} · {(sub.zip_bytes / 1024).toFixed(1)} KB ·
            sha256 {sub.zip_sha256.slice(0, 16)}…
          </p>
        </div>
        {sub.audit_findings.length > 0 && (
          <ul className="list-disc space-y-1 rounded-2xl border border-border bg-card p-5 pl-9 text-sm">
            {sub.audit_findings.map((f, i) => (
              <li key={i}>
                <span className="font-mono font-bold">[{f.code}]</span> {f.detail}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void audit(false)}
            disabled={auditing}
            className="rounded-full border border-border px-5 py-2 text-sm font-bold disabled:opacity-50"
          >
            Re-run audit
          </button>
          <button
            type="button"
            onClick={() => void audit(true)}
            disabled={auditing}
            className="rounded-full bg-cyan-600 px-5 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            {auditing ? "Auditing…" : "Deep AI audit (coins)"}
          </button>
          {sub.download && (
            <a
              href={sub.download}
              className="rounded-full border border-cyan-500 px-5 py-2 text-sm font-bold text-cyan-300"
            >
              Download .zip ↓
            </a>
          )}
        </div>
        {aiNote && (
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-5 text-sm">
            <p className="font-black">🤖 Deep review</p>
            <p className="mt-2 whitespace-pre-wrap">{aiNote}</p>
          </div>
        )}
        <CodeViewer
          files={sub.preview_files ?? []}
          verdict={sub.verdict}
          quarantined={sub.quarantined}
          title={sub.title}
        />
        <p className="text-xs text-slate-500">
          File contents preview from inside the stored .zip is computed at submit time and
          shown here for safe packages; held packages never display files.
        </p>
      </section>
    </main>
  );
}
