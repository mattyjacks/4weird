"use client";

import { useCallback, useEffect, useState } from "react";

const QUALITY_DEFAULT = 5;
const BUDGET_DEFAULT = 100;
const BUDGET_MIN = 1;
const BUDGET_MAX = 10000;
const CONFIRM_ABOVE = 250;

type Org = { id: string; slug: string; name: string };
type BuildResult = {
  game: { slug: string; title: string; source: string; bytes: number };
  plan: { quality: number; budget: number; estimate: number; spend: number; cut: number; provider: number; strategy: string; note: string };
  test: { verdict: string; loops: number; steps: string[]; checks: { id: string; label: string; passed: boolean; detail: string }[]; findings: { severity: string; title: string; description: string }[] };
  draft: { scope: string; submission_id: string | null; project_id: string | null; draft_path: string; note: string };
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string } & T;
  if (!res.ok || data.success === false) {
    const err = new Error(String(data.error ?? `Request failed (${res.status})`));
    (err as { status?: number }).status = res.status;
    throw err;
  }
  return data as T;
}

export function NewGamePlusBuilder() {
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState(QUALITY_DEFAULT);
  const [budget, setBudget] = useState(BUDGET_DEFAULT);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [status, setStatus] = useState("Describe a game, tune Quality + Budget, then launch.");
  const [result, setResult] = useState<BuildResult | null>(null);

  const loadOrgs = useCallback(async () => {
    try {
      const body = await api<{ orgs: Org[] }>("/api/orgs");
      setOrgs(body.orgs ?? []);
    } catch {
      setOrgs([]);
    }
  }, []);

  useEffect(() => {
    void loadOrgs();
  }, [loadOrgs]);

  async function launch(confirmed: boolean) {
    if (!prompt.trim()) {
      setStatus("Type a game prompt first — e.g. “neon snake that eats falling stars”.");
      return;
    }
    if (budget > CONFIRM_ABOVE && !confirmed) {
      setConfirmOpen(true);
      return;
    }
    setBusy(true);
    setResult(null);
    setConfirmOpen(false);
    try {
      setPhase("generating");
      setStatus("Generating your original HTML/CSS/JS game (cheapest viable, fastest)…");
      // Let the phase paint before the build round-trip.
      await new Promise((r) => setTimeout(r, 30));
      setPhase("testing");
      const body = await api<BuildResult>("/api/newgameplus/build", {
        method: "POST",
        body: JSON.stringify({ prompt: prompt.trim(), quality, budget, org_id: orgId || undefined, confirmed }),
      });
      setPhase("done");
      setResult(body);
      setStatus(
        body.test.verdict === "pass"
          ? `Done — “${body.game.title}” passed VibeCodeWorker (${body.test.loops} loop${body.test.loops === 1 ? "" : "s"}). ${body.draft.note}`
          : `Built “${body.game.title}” — VCW verdict: ${body.test.verdict}. ${body.draft.note}`,
      );
    } catch (e) {
      setPhase("");
      setStatus(e instanceof Error ? e.message : "Build failed.");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!result) return;
    const blob = new Blob([result.game.source], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.game.slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5" aria-label="NewGamePlus setup">
        <h2 className="text-lg font-bold">Your game prompt</h2>
        <label className="mt-3 block text-sm">
          Game prompt
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
            rows={4}
            maxLength={500}
            placeholder="e.g. a cozy space shooter where you rescue lost robots"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <p className="mt-1 text-xs text-slate-500">{prompt.length}/500</p>

        <label className="mt-4 block text-sm">
          Quality: <b className="text-cyan-300">{quality}</b> <span className="text-slate-500">(0–10)</span>
          <input type="range" min={0} max={10} step={1} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full" aria-label="Quality 0 to 10" />
        </label>
        <label className="mt-3 block text-sm">
          Budget (coins)
          <input
            type="number" min={BUDGET_MIN} max={BUDGET_MAX} step={1} value={budget}
            onChange={(e) => setBudget(Math.round(Number(e.target.value) || 0))}
            onBlur={() => setBudget((b) => Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, Number.isFinite(b) ? b : BUDGET_DEFAULT)))}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            aria-label="Budget in coins"
          />
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Default 100 · min {BUDGET_MIN} · max {BUDGET_MAX.toLocaleString()}. Above {CONFIRM_ABOVE} needs Confirm the Amount.
        </p>

        <label className="mt-3 block text-sm">
          Org Draft folder (optional)
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-white">
            <option value="">Personal drafts only</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name} ({o.slug})</option>
            ))}
          </select>
        </label>
        {!orgs.length && (
          <p className="mt-1 text-xs text-slate-500">
            No orgs yet — <a className="text-cyan-300 underline" href="/teams">create one on /teams</a>, or launch now and save personally.
          </p>
        )}

        <button
          type="button" disabled={busy} onClick={() => void launch(false)}
          className="mt-4 w-full rounded-md bg-cyan-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {busy ? (phase === "testing" ? "VibeCodeWorker is testing…" : "Generating…") : "Launch NewGamePlus"}
        </button>
        <p className="mt-2 text-xs text-slate-500" role="status">{status}</p>
        <p className="mt-1 text-xs text-slate-500">Best quality at the lowest price and greatest speed — cheapest viable build, newest viable runtime, 25% cut included.</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5" aria-label="NewGamePlus result" aria-live="polite">
        {!result && !busy && <p className="text-sm text-slate-400">Your tested game lands here with a live preview, the Draft folder path, and the VCW evidence trail.</p>}
        {busy && (
          <div>
            <p className="text-sm text-cyan-200">{phase === "testing" ? "🕹️ VibeCodeWorker: observe → reason → act…" : "✨ Generating…"}</p>
            <div className="mt-2 h-2 overflow-hidden rounded bg-black/40"><div className="h-full w-1/2 animate-pulse bg-cyan-400" /></div>
          </div>
        )}
        {result && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black">{result.game.title}</h2>
              <p className="mt-1 text-xs text-slate-400">
                📁 Draft: <code className="text-cyan-200">{result.draft.draft_path}</code> ({result.draft.scope}) · {result.draft.note}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                💰 {result.plan.spend} coins ({result.plan.provider} provider + {result.plan.cut} cut — {result.plan.note}) · est. {result.plan.estimate} for q{result.plan.quality}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                🤖 VCW verdict: <b className={result.test.verdict === "pass" ? "text-emerald-300" : "text-amber-300"}>{result.test.verdict}</b> ({result.test.loops} loop{result.test.loops === 1 ? "" : "s"}) · {result.game.bytes.toLocaleString()} bytes
              </p>
            </div>
            <iframe title={`${result.game.title} preview`} srcDoc={result.game.source} sandbox="allow-scripts" className="h-[440px] w-full rounded-xl border border-white/15 bg-black" />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={download} className="rounded-md bg-emerald-400 px-3 py-1.5 text-sm font-bold text-slate-950">Download .html</button>
              <button type="button" onClick={() => { try { void navigator.clipboard.writeText(result.game.source); setStatus("Game source copied."); } catch { setStatus("Copy failed."); } }} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200">Copy source</button>
            </div>
            <details className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs">
              <summary className="cursor-pointer font-bold text-cyan-300">VCW evidence trail ({result.test.steps.length} steps, {result.test.checks.length} checks)</summary>
              <ol className="mt-2 list-decimal pl-5 text-slate-300">{result.test.steps.map((s, i) => (<li key={i}>{s}</li>))}</ol>
              <ul className="mt-2 space-y-1">
                {result.test.checks.map((c) => (
                  <li key={c.id} className={c.passed ? "text-emerald-300" : "text-red-300"}>{c.passed ? "✅" : "❌"} {c.label}{c.passed ? "" : ` — ${c.detail}`}</li>
                ))}
              </ul>
              {!!result.test.findings.length && (
                <ul className="mt-2 space-y-1 text-amber-200">
                  {result.test.findings.map((f, i) => (<li key={i}>🔧 [{f.severity}] {f.title} — {f.description}</li>))}
                </ul>
              )}
            </details>
          </div>
        )}
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Confirm the Amount">
          <div className="w-full max-w-md rounded-2xl border border-amber-400/40 bg-slate-950 p-6">
            <h2 className="text-lg font-black text-amber-300">⚠️ Confirm the Amount</h2>
            <p className="mt-2 text-sm text-slate-200">
              You are about to launch NewGamePlus with <b>{budget} coins</b> — that is above the {CONFIRM_ABOVE}-coin warning line.
              Estimated build cost is <b>lights-out cheap</b> (quality {quality}/10); you will only ever be quoted the capped spend, 25% cut included.
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="flex-1 rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-200">Cancel</button>
              <button type="button" disabled={busy} onClick={() => void launch(true)} className="flex-1 rounded-md bg-amber-400 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">
                Confirm {budget} coins
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
