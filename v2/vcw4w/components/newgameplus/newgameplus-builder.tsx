"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const QUALITY_DEFAULT = 5;
const BUDGET_DEFAULT = 100;
const BUDGET_MIN = 1;
const BUDGET_MAX = 10000;
const CONFIRM_ABOVE = 250;

type Org = { id: string; slug: string; name: string };
type FalPick = { op: string; why: string; coins: number; fast: boolean };
type SwarmAgent = { name: string; role: string; task: string; tools: string[] };
type TimelineStage = { key: string; label: string; detail: string; targetSec: number };
type BuildResult = {
  game: { slug: string; title: string; source: string; bytes: number };
  plan: { quality: number; budget: number; estimate: number; spend: number; cut: number; provider: number; strategy: string; note: string; lane: string; target: string };
  charge?: { billed: boolean; gross: number; cut: number };
  test: { verdict: string; loops: number; steps: string[]; checks: { id: string; label: string; passed: boolean; detail: string }[]; findings: { severity: string; title: string; description: string }[] };
  mastery?: { mastered: boolean; iterations: { variant: number; slug: string; title: string; verdict: string; checks: number; passed: number; improvements: string[] }[] };
  vault?: { folder: string; instanceId: string; files: { path: string; bytes: number }[] };
  draft: { scope: string; submission_id: string | null; project_id: string | null; draft_path: string; note: string };
  swarm?: { lane: string; mode: string; agents: SwarmAgent[]; trace: string[]; target: string };
  fal?: { selected: FalPick[]; totalCoins: number; note: string; configured: boolean };
  timeline?: { stages: TimelineStage[]; totalTargetSec: number };
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

function laneOf(budget: number): "fast" | "deluxe" {
  return budget > CONFIRM_ABOVE ? "deluxe" : "fast";
}

function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function NewGamePlusBuilder() {
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState(QUALITY_DEFAULT);
  const [budget, setBudget] = useState(BUDGET_DEFAULT);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const [stageKey, setStageKey] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [status, setStatus] = useState("Describe a game, tune Quality + Budget, then launch.");
  const [result, setResult] = useState<BuildResult | null>(null);
  const [falMsg, setFalMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const startedAt = useRef(0);

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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadOrgs]);

  const lane = laneOf(budget);
  const targetSecs = lane === "fast" ? 300 : 720;

  function pushLive(line: string) {
    setLiveLog((prev) => [...prev.slice(-60), line]);
  }

  async function launch(confirmed: boolean) {
    if (!prompt.trim()) {
      setStatus("Type a game prompt first; e.g. “neon snake that eats falling stars”.");
      return;
    }
    if (budget > CONFIRM_ABOVE && !confirmed) {
      setConfirmOpen(true);
      return;
    }
    setBusy(true);
    setResult(null);
    setFalMsg("");
    setConfirmOpen(false);
    setLiveLog([]);
    setElapsedMs(0);
    startedAt.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 500);
    const bots = lane === "fast" ? "Scout → Forge → Sage" : "Scout → Forge → Pixel → Echo → Sage";
    try {
      setStageKey("queued");
      pushLive(`⚡ Queued - ${lane} lane (budget ${budget} coins, target ${lane === "fast" ? "≤5 min" : "≈5-12 min"}).`);
      setStatus(`Queued in the ${lane} lane; conducting the symphony (${bots})…`);
      await new Promise((r) => setTimeout(r, 30));
      setStageKey("symphony");
      pushLive(`🎼 Symphony tuning - ${bots} (auto orchestration, built-in reasoning).`);
      setStatus("Symphony tuning - Scout observes, Forge warms up…");
      await new Promise((r) => setTimeout(r, 30));
      setStageKey("forge");
      pushLive("🔨 Forge building; generating the original single-file HTML/CSS/JS game…");
      setStatus("Forge is building your original HTML/CSS/JS game (cheapest viable, fastest)…");
      await new Promise((r) => setTimeout(r, 30));
      setStageKey("fal");
      pushLive("✨ Fal assets; shortlisting the media this prompt actually needs (budget-capped)…");
      setStageKey("qa");
      const body = await api<BuildResult>("/api/newgameplus/build", {
        method: "POST",
        body: JSON.stringify({ prompt: prompt.trim(), quality, budget, org_id: orgId || undefined, confirmed }),
      });
      // Replay the server symphony as the live trail.
      for (const a of body.swarm?.agents ?? []) pushLive(`🤖 ${a.name} (${a.role}): ${a.task.slice(0, 140)}`);
      for (const t of body.swarm?.trace ?? []) pushLive(`📜 ${t}`);
      for (const f of body.fal?.selected ?? []) pushLive(`✨ fal pick: ${f.op} - ${f.why} (${f.coins} coins gross).`);
      for (const s of body.test.steps) pushLive(`🕹️ VCW ${s}`);
      setStageKey("done");
      pushLive(`✅ Done in ${fmtClock(Date.now() - startedAt.current)} - “${body.game.title}” (${body.game.bytes.toLocaleString()} bytes). ${body.draft.note}`);
      setResult(body);
      setStatus(
        body.test.verdict === "pass"
          ? `Done - “${body.game.title}” passed VibeCodeWorker (${body.test.loops} loop${body.test.loops === 1 ? "" : "s"}). ${body.draft.note}`
          : `Built “${body.game.title}” - VCW verdict: ${body.test.verdict}. ${body.draft.note}`,
      );
    } catch (e) {
      setStageKey("");
      // A 403 here is the automated-traffic check (BotID), not a broken GUI:
      // route real users to the bypass (sign in) instead of a dead end.
      const errStatus = e instanceof Error ? (e as { status?: number }).status : undefined;
      const raw = e instanceof Error ? e.message : "Build failed.";
      const msg =
        errStatus === 403
          ? `${raw} — signed-in builders bypass this check: log in, then launch again.`
          : raw;
      pushLive(`❌ ${msg}`);
      setStatus(msg);
    } finally {
      setBusy(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }

  async function queueFal(op: string) {
    if (!result) return;
    setFalMsg(`Queuing ${op}…`);
    try {
      const body = await api<{ started?: boolean; request_id?: string; quote?: { gross: number }; hint?: string; error?: string }>("/api/fal/generate", {
        method: "POST",
        body: JSON.stringify({ op, prompt: `${result.game.title}: ${prompt.trim()}`.slice(0, 500), game_slug: result.game.slug.slice(0, 64), source: "vcw" }),
      });
      setFalMsg(body.started ? `Queued ${op}! Request ${body.request_id} - ${body.quote?.gross ?? ""} coins gross. Poll it on /fal.` : String(body.hint ?? `Queued ${op} (not configured; nothing charged).`));
    } catch (e) {
      setFalMsg(e instanceof Error ? e.message : "Fal queue failed.");
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

  function togglePreviewFullscreen() {
    try {
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      } else {
        void previewRef.current?.requestFullscreen?.().catch(() => setStatus("Fullscreen was blocked by the browser; the preview still plays inline."));
      }
    } catch {
      setStatus("Fullscreen unavailable; the preview still plays inline.");
    }
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
          Quality: <b className="text-cyan-300">{quality}</b> <span className="text-slate-500">(0-10)</span>
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
        <p className="mt-1 rounded-md border border-cyan-400/20 bg-cyan-400/5 px-2 py-1 text-xs text-cyan-200">
          🎼 {lane === "fast" ? "Fast lane: ≤5 min, Scout → Forge → Sage, cheap fal only." : "Deluxe lane: longer but fast (≈5-12 min), full 5-bot symphony + video/3D."}
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
            No orgs yet - <a className="text-cyan-300 underline" href="/squads">create one on /squads</a>, or launch now and save personally.
          </p>
        )}

        <button
          type="button" disabled={busy} onClick={() => void launch(false)}
          className="mt-4 w-full rounded-md bg-cyan-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {busy ? "Symphony playing…" : "Launch NewGamePlus"}
        </button>
        <p className="mt-2 text-xs text-slate-500" role="status">{status}</p>
        <p className="mt-1 text-xs text-slate-500">Best quality at the lowest price and greatest speed; cheapest viable build, newest viable runtime, 25% cut included.</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5" aria-label="NewGamePlus result" aria-live="polite">
        {!result && !busy && !liveLog.length && <p className="text-sm text-slate-400">Your tested game lands here with a live preview, the Draft folder path, and the VCW evidence trail.</p>}
        {(busy || liveLog.length > 0) && (
          <div className="rounded-xl border border-cyan-400/20 bg-black/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-cyan-200">🎼 Symphony {busy ? "playing" : "finished"} - {lane} lane · ⏱ {fmtClock(elapsedMs)} / {lane === "fast" ? "5:00" : "12:00"} target</p>
              <p className="text-xs text-slate-400">{stageKey ? `stage: ${stageKey}` : "idle"}</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded bg-black/60" role="progressbar" aria-label="Build progress">
              <div className="h-full bg-cyan-400 transition-all" style={{ width: `${Math.min(100, Math.round((elapsedMs / (targetSecs * 1000)) * 100))}%` }} />
            </div>
            <ol className="mt-2 max-h-44 space-y-1 overflow-auto text-xs text-slate-300">
              {liveLog.map((line, i) => (<li key={i}>{line}</li>))}
            </ol>
          </div>
        )}
        {busy && !result && (
          <div className="mt-3">
            <p className="text-sm text-cyan-200">🕹️ VibeCodeWorker: observe → reason → act…</p>
            <div className="mt-2 h-2 overflow-hidden rounded bg-black/40"><div className="h-full w-1/2 animate-pulse bg-cyan-400" /></div>
          </div>
        )}
        {result && (
          <div className="mt-4 space-y-4">
            <div>
              <h2 className="text-xl font-black">{result.game.title}</h2>
              <p className="mt-1 text-xs text-slate-400">
                📁 Draft: <code className="text-cyan-200">{result.draft.draft_path}</code> ({result.draft.scope}) · {result.draft.note}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                💰 {result.plan.spend} coins ({result.plan.provider} provider + {result.plan.cut} cut - {result.plan.note}) · est. {result.plan.estimate} for q{result.plan.quality} · {result.plan.lane} lane ({result.plan.target})
              </p>
              <p className="mt-1 text-xs text-slate-400">
                🧾 {result.charge?.billed ? `Billed ${result.charge.gross} coins (incl. ${result.charge.cut} cut) - see coin history + /my/usage.` : "Free local build (sign in to save drafts + meter coins)."}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                🤖 VCW verdict: <b className={result.test.verdict === "pass" ? "text-emerald-300" : "text-amber-300"}>{result.test.verdict}</b> ({result.test.loops} loop{result.test.loops === 1 ? "" : "s"}) · {result.game.bytes.toLocaleString()} bytes
              </p>
            </div>
            {!!result.swarm && (
              <details className="rounded-lg border border-fuchsia-300/20 bg-black/30 p-3 text-xs" open>
                <summary className="cursor-pointer font-bold text-fuchsia-200">🎼 Symphony ({result.swarm.agents.length} bots, {result.swarm.mode}) - {result.swarm.target}</summary>
                <ul className="mt-2 space-y-1 text-slate-300">
                  {result.swarm.agents.map((a) => (
                    <li key={a.name}>🤖 <b>{a.name}</b> <span className="text-slate-500">({a.role})</span> - {a.task} <span className="text-slate-500">[{a.tools.join(", ")}]</span></li>
                  ))}
                </ul>
                {!!result.swarm.trace.length && (
                  <ul className="mt-2 space-y-1 text-slate-500">
                    {result.swarm.trace.map((t, i) => (<li key={i}>📜 {t}</li>))}
                  </ul>
                )}
              </details>
            )}
            {!!result.fal && (
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs">
                <p className="font-bold text-amber-200">✨ Fal media, picked for this prompt ({result.fal.totalCoins} coins gross){result.fal.configured ? "" : "; server key unset, prompts are one click away"}</p>
                <p className="mt-1 text-slate-400">{result.fal.note}</p>
                {!!result.fal.selected.length && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.fal.selected.map((f) => (
                      <button key={f.op} type="button" onClick={() => void queueFal(f.op)} className="rounded-md border border-amber-300/30 px-2 py-1 text-amber-100 hover:bg-amber-300/10" title={f.why}>
                        ✨ {f.op} · {f.coins}c{f.fast ? " · fast" : ""}
                      </button>
                    ))}
                  </div>
                )}
                {!!falMsg && <p className="mt-2 text-slate-300" role="status">{falMsg}</p>}
              </div>
            )}
            <div ref={previewRef} className="rounded-xl border border-white/15 bg-black">
              <iframe title={`${result.game.title} preview`} srcDoc={result.game.source} sandbox="allow-scripts" className="h-[440px] w-full rounded-xl bg-black" />
            </div>
            <p className="text-xs text-slate-500">Click the game once to focus keyboard (WASD/arrows, P pauses, R restarts) · Fullscreen for the full play window.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={download} className="rounded-md bg-emerald-400 px-3 py-1.5 text-sm font-bold text-slate-950">Download .html</button>
              <button type="button" onClick={togglePreviewFullscreen} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200">Fullscreen preview</button>
              <button type="button" onClick={() => { try { void navigator.clipboard.writeText(result.game.source); setStatus("Game source copied."); } catch { setStatus("Copy failed."); } }} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200">Copy source</button>
            </div>
            <details className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs">
              <summary className="cursor-pointer font-bold text-cyan-300">VCW evidence trail ({result.test.steps.length} steps, {result.test.checks.length} checks)</summary>
              <ol className="mt-2 list-decimal pl-5 text-slate-300">{result.test.steps.map((s, i) => (<li key={i}>{s}</li>))}</ol>
              <ul className="mt-2 space-y-1">
                {result.test.checks.map((c) => (
                  <li key={c.id} className={c.passed ? "text-emerald-300" : "text-red-300"}>{c.passed ? "✅" : "❌"} {c.label}{c.passed ? "" : ` - ${c.detail}`}</li>
                ))}
              </ul>
              {!!result.test.findings.length && (
                <ul className="mt-2 space-y-1 text-amber-200">
                  {result.test.findings.map((f, i) => (<li key={i}>🔧 [{f.severity}] {f.title} - {f.description}</li>))}
                </ul>
              )}
            </details>
            {!!result.mastery && (
              <details className="rounded-lg border border-emerald-300/20 bg-black/30 p-3 text-xs" open>
                <summary className="cursor-pointer font-bold text-emerald-200">
                  🏆 Mastery {result.mastery.mastered ? "reached" : "in progress"} — test → improve → retest ({result.mastery.iterations.length} iteration{result.mastery.iterations.length === 1 ? "" : "s"})
                </summary>
                <ol className="mt-2 space-y-1 text-slate-300">
                  {result.mastery.iterations.map((it, i) => (
                    <li key={i}>· <b>{it.title}</b> ({it.slug}) — VCW {it.verdict} {it.passed}/{it.checks} · next: {it.improvements.join("; ")}</li>
                  ))}
                </ol>
              </details>
            )}
            {!!result.vault && (
              <details className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs" open>
                <summary className="cursor-pointer font-bold text-slate-200">📁 Weird Vault — {result.vault.folder} (html + css + js + content)</summary>
                <ul className="mt-2 space-y-1 text-slate-300">
                  {result.vault.files.map((f) => (<li key={f.path}>· <code>{f.path}</code> ({f.bytes.toLocaleString()} bytes)</li>))}
                </ul>
              </details>
            )}
            {!!result.timeline && (
              <details className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs">
                <summary className="cursor-pointer font-bold text-slate-200">⏱ Build timeline (target {result.timeline.totalTargetSec}s wall clock)</summary>
                <ol className="mt-2 space-y-1 text-slate-300">
                  {result.timeline.stages.map((st) => (<li key={st.key}>· <b>{st.label}</b> - {st.detail} (~{st.targetSec}s)</li>))}
                </ol>
              </details>
            )}
          </div>
        )}
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Confirm the Amount">
          <div className="w-full max-w-md rounded-2xl border border-amber-400/40 bg-slate-950 p-6">
            <h2 className="text-lg font-black text-amber-300">⚠️ Confirm the Amount</h2>
            <p className="mt-2 text-sm text-slate-200">
              You are about to launch NewGamePlus with <b>{budget} coins</b>; that is above the {CONFIRM_ABOVE}-coin warning line.
              Estimated build cost is <b>lights-out cheap</b> (quality {quality}/10); you will only ever be quoted the capped spend, 25% cut included.
              Deluxe lane conducts the full 5-bot symphony with video/3D media; longer but still fast.
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
