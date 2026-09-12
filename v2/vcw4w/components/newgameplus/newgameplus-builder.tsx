"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { InfoTip } from "@/components/ui/info-tip";
import { CompactDetails } from "@/components/ui/compact-details";

const QUALITY_DEFAULT = 5;
const BUDGET_DEFAULT = 100;
const BUDGET_MIN = 1;
const BUDGET_MAX = 10000;
const CONFIRM_ABOVE = 250;

type Org = { id: string; slug: string; name: string };
type FalPick = { op: string; why: string; coins: number; fast: boolean };
type SwarmAgent = { name: string; role: string; task: string; tools: string[] };
type TimelineStage = { key: string; label: string; detail: string; targetSec: number };
type BuildCheck = { id: string; label: string; passed: boolean; detail: string };
type BuildCommit = {
  n: number; variant: number; slug: string; title: string; source: string; bytes: number;
  improvements: string[]; spendSlice: number; spentCumulative?: number; polished?: boolean; vaultPath?: string;
  evidence: { verdict: string; loops: number; passed: number; total: number; checks: BuildCheck[]; steps: string[]; findings: { severity: string; title: string; description: string }[] };
};
type BuildResult = {
  game: { slug: string; title: string; source: string; bytes: number; archetype?: string };
  resolved?: { label: string; family: string; parents: string[]; blendNote: string; freeform: boolean };
  plan: { quality: number; budget: number; estimate: number; spend: number; cut: number; provider: number; strategy: string; note: string; lane: string; target: string };
  charge?: { billed: boolean; gross: number; cut: number };
  test: { verdict: string; loops: number; steps: string[]; checks: { id: string; label: string; passed: boolean; detail: string }[]; findings: { severity: string; title: string; description: string }[] };
  mastery?: { mastered: boolean; actualSpend?: number; iterations: { variant: number; slug: string; title: string; verdict: string; checks: number; passed: number; improvements: string[]; bytes?: number; spendSlice?: number; spentCumulative?: number; polished?: boolean }[] };
  commits?: BuildCommit[];
  vault?: { folder: string; instanceId: string; files: { path: string; bytes: number }[]; saved?: boolean; savedFiles?: number };
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
  const [archetype, setArchetype] = useState("custom");
  const [style, setStyle] = useState("");
  const [signedIn, setSignedIn] = useState<"unknown" | "in" | "out">("unknown");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const [stageKey, setStageKey] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [status, setStatus] = useState("Describe a game, tune Quality + Budget, then launch.");
  const [result, setResult] = useState<BuildResult | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [falMsg, setFalMsg] = useState("");
  const [vcw, setVcw] = useState<{ runId: string; verdict: string; steps: number; bugs: number } | null>(null);
  const [vcwMsg, setVcwMsg] = useState("");
  const [vcwBusy, setVcwBusy] = useState(false);
  const [remote, setRemote] = useState<{
    verdict: string; checks: { id: string; passed: boolean; detail: string }[];
    hud: string; frames: number; errors: string[]; screenshotPng: string | null; elapsedMs: number;
  } | null>(null);
  const [remoteMsg, setRemoteMsg] = useState("");
  const [remoteBusy, setRemoteBusy] = useState(false);
  // Browser-live telemetry: the preview iframe is a REAL browser playing the
  // game, so its ticks/errors are free executed evidence (no pods, no coins).
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const liveRef = useRef<{ ticks: { t: number; score: number; lives: number; level: number; frames: number }[]; errs: string[]; startedAt: number } | null>(null);
  const [liveCount, setLiveCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const startedAt = useRef(0);

  const loadOrgs = useCallback(async () => {
    try {
      const body = await api<{ orgs: Org[] }>("/api/orgs");
      setOrgs(body.orgs ?? []);
      setSignedIn("in");
      // ?org= deep link (id or slug): preselect when it names a real org.
      try {
        const q = new URLSearchParams(window.location.search).get("org");
        if (q && (body.orgs ?? []).some((o) => o.id === q || o.slug === q)) setOrgId(q);
      } catch {
        /* deep link is best-effort */
      }
    } catch (e) {
      setOrgs([]);
      // 401 = signed out; anything else = signed in but list failed.
      setSignedIn(e instanceof Error && (e as { status?: number }).status === 401 ? "out" : "in");
    }
  }, []);

  useEffect(() => {
    void loadOrgs();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadOrgs]);

  // New build → auto-load the final commit in the preview.
  useEffect(() => {
    setSel(null);
    setVcw(null);
    setVcwMsg("");
    setRemote(null);
    setRemoteMsg("");
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("commit");
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* URL cleanup is best-effort */
    }
  }, [result?.game.slug]);

  // ?commit= deep link: land directly on one internal commit.
  useEffect(() => {
    try {
      const n = Number(new URL(window.location.href).searchParams.get("commit"));
      if (result?.commits?.length && Number.isInteger(n) && n >= 1 && n <= result.commits.length) {
        setSel(n - 1);
      }
    } catch {
      /* deep link is best-effort */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.commits?.length]);

  // Live telemetry window: 20s of ticks/errors from the previewed commit's
  // iframe. Source-checked against our own iframe (srcDoc ⇒ origin "null"),
  // allowlisted message kinds, hard caps — never eval'd, never rendered HTML.
  useEffect(() => {
    if (!result) return;
    liveRef.current = { ticks: [], errs: [], startedAt: Date.now() };
    setLiveCount(0);
    const deadline = Date.now() + 20_000;
    const onMsg = (e: MessageEvent) => {
      try {
        if (Date.now() > deadline) return;
        if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
        const d = e.data as { ngp?: unknown; score?: unknown; lives?: unknown; level?: unknown; frames?: unknown; m?: unknown } | null;
        if (!d || typeof d !== "object") return;
        if (JSON.stringify(d).length > 1024) return;
        const cur = liveRef.current;
        if (!cur || cur.ticks.length + cur.errs.length >= 35) return;
        if (d.ngp === "ngp-tick") {
          const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
          cur.ticks.push({ t: Date.now() - cur.startedAt, score: num(d.score), lives: num(d.lives), level: num(d.level), frames: num(d.frames) });
          setLiveCount(cur.ticks.length + cur.errs.length);
        } else if (d.ngp === "ngp-err") {
          cur.errs.push(String(d.m ?? "error").slice(0, 200));
          setLiveCount(cur.ticks.length + cur.errs.length);
        }
      } catch {
        /* telemetry is best-effort */
      }
    };
    window.addEventListener("message", onMsg);
    const t = window.setTimeout(() => window.removeEventListener("message", onMsg), 20_500);
    return () => {
      window.removeEventListener("message", onMsg);
      window.clearTimeout(t);
    };
  }, [result?.game.slug, sel]);

  function selectCommit(i: number) {
    if (!result?.commits?.length) return;
    const idx = Math.max(0, Math.min(i, result.commits.length - 1));
    setSel(idx);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("commit", String(result.commits[idx].n));
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* URL sync is best-effort */
    }
  }

  const lane = laneOf(budget);
  const targetSecs = lane === "fast" ? 300 : 720;

  function pushLive(line: string) {
    setLiveLog((prev) => [...prev.slice(-60), line]);
  }

  async function launch(confirmed: boolean) {
    if (!prompt.trim()) {
      setStatus("Type a game prompt first; e.g. “neon snake that eats falling stars”.");
      promptRef.current?.focus();
      return;
    }
    if (busy) return;
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
        body: JSON.stringify({ prompt: prompt.trim(), quality, budget, org_id: orgId || undefined, confirmed, archetype, style: style.trim().slice(0, 120) || undefined }),
      });
      // Replay the server symphony as the live trail.
      for (const a of body.swarm?.agents ?? []) pushLive(`🤖 ${a.name} (${a.role}): ${a.task.slice(0, 140)}`);
      for (const t of body.swarm?.trace ?? []) pushLive(`📜 ${t}`);
      for (const f of body.fal?.selected ?? []) pushLive(`✨ fal pick: ${f.op} - ${f.why} (${f.coins} coins gross).`);
      for (const s of body.test.steps) pushLive(`🕹️ VCW ${s}`);
      setStageKey("done");
      pushLive(`✅ Done in ${fmtClock(Date.now() - startedAt.current)} - “${body.game.title}” (${body.game.bytes.toLocaleString()} bytes). ${body.draft.note}`);
      setElapsedMs(Date.now() - startedAt.current);
      setResult(body);
      setStatus(
        body.test.verdict === "pass"
          ? `Done - “${body.game.title}” passed the local headless playtest (${body.test.loops} loop${body.test.loops === 1 ? "" : "s"}; node:vm boot + real frames, not a remote agent). ${body.draft.note}`
          : `Built “${body.game.title}” - local verdict: ${body.test.verdict}. ${body.draft.note}`,
      );
    } catch (e) {
      setStageKey("");
      // A 403 here is the automated-traffic check (BotID), not a broken GUI:
      // route real users to the bypass (sign in) instead of a dead end.
      const errStatus = e instanceof Error ? (e as { status?: number }).status : undefined;
      const raw = e instanceof Error ? e.message : "Build failed.";
      const msg =
        errStatus === 403
          ? `${raw} - signed-in builders bypass this check: log in, then launch again.`
          : raw;
      pushLive(`❌ ${msg}`);
      setStatus(msg);
    } finally {
      setBusy(false);
      setElapsedMs(Date.now() - startedAt.current);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }

  /** VCW-rate quote for transcribing the active commit: run-open 10 + 1/step + 2/bug. */
  function vcwQuote(): number {
    const ev = activeCommit()?.evidence;
    const checks = ev?.checks ?? result?.test.checks ?? [];
    const steps = ev?.steps ?? result?.test.steps ?? [];
    const findings = ev?.findings ?? result?.test.findings ?? [];
    const live = liveRef.current;
    const nSteps = Math.min(checks.length, 20) + Math.min(steps.length, 12) + Math.min(findings.length, 5)
      + Math.min(live?.ticks.length ?? 0, 20) + Math.min(live?.errs.length ?? 0, 5);
    const nBugs = Math.min(checks.filter((c) => !c.passed).length, 8)
      + Math.min(findings.filter((f) => f.severity === "high" || f.severity === "critical").length, 4);
    return 10 + nSteps + 2 * nBugs;
  }

  async function verifyWithVcw() {
    const commit = activeCommit();
    if (!result?.draft.submission_id || vcwBusy) return;
    setVcwBusy(true);
    setVcwMsg("Opening VCW run…");
    try {
      const ev = commit?.evidence;
      const live = liveRef.current;
      const liveTicks = (live?.ticks ?? []).slice(0, 20);
      const liveErrs = (live?.errs ?? []).slice(0, 5);
      const body = await api<{ run_id: string; verdict: string; steps: number; bugs: number }>("/api/newgameplus/vcw-verify", {
        method: "POST",
        body: JSON.stringify({
          submission_id: result.draft.submission_id,
          commit_n: commit?.n ?? 1,
          slug: commit?.slug ?? result.game.slug,
          title: commit?.title ?? result.game.title,
          verdict: ev?.verdict ?? result.test.verdict,
          loops: result.test.loops,
          quality: result.plan.quality,
          commits_total: result.commits?.length ?? 1,
          checks: (ev?.checks ?? result.test.checks).slice(0, 30),
          steps: (ev?.steps ?? result.test.steps).slice(0, 12),
          findings: (ev?.findings ?? result.test.findings).slice(0, 8),
          provenance: liveTicks.length ? "browser-live" : "local-headless",
          live_ticks: liveTicks,
          live_errs: liveErrs,
        }),
      });
      setVcw({ runId: body.run_id, verdict: body.verdict, steps: body.steps, bugs: body.bugs });
      setVcwMsg(`VCW run recorded: ${body.verdict}, ${body.steps} steps, ${body.bugs} bugs (transcribed local evidence, metered at VCW rates).`);
    } catch (e) {
      setVcwMsg(e instanceof Error ? e.message : "VCW verify failed.");
    } finally {
      setVcwBusy(false);
    }
  }

  async function playtestRemote() {
    if (!result?.draft.submission_id || remoteBusy || vcwBusy || busy) return;
    setRemoteBusy(true);
    setRemoteMsg("Playing on serverless Chromium…");
    try {
      const body = await api<{
        verdict: string;
        checks: { id: string; passed: boolean; detail: string }[];
        hud: string; frames: number; errors: string[];
        screenshotPng: string | null; elapsedMs: number; meteredMinutes: number;
      }>("/api/newgameplus/playtest-remote", {
        method: "POST",
        body: JSON.stringify({ submission_id: result.draft.submission_id }),
      });
      setRemote({
        verdict: body.verdict, checks: body.checks, hud: body.hud,
        frames: body.frames, errors: body.errors, screenshotPng: body.screenshotPng,
        elapsedMs: body.elapsedMs,
      });
      const passed = body.checks.filter((c) => c.passed).length;
      setRemoteMsg(`Remote verdict: ${body.verdict} — ${passed}/${body.checks.length} checks in ${(body.elapsedMs / 1000).toFixed(1)}s (metered ${body.meteredMinutes} worker-min). Record it to the ledger via ledger verify to keep it.`);
    } catch (e) {
      setRemoteMsg(e instanceof Error ? e.message : "Remote playtest failed.");
    } finally {
      setRemoteBusy(false);
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

  function activeCommit() {
    if (!result?.commits?.length) return null;
    const idx = sel ?? result.commits.length - 1;
    return result.commits[Math.max(0, Math.min(idx, result.commits.length - 1))] ?? null;
  }

  function download() {
    if (!result) return;
    const commit = activeCommit();
    const blob = new Blob([commit?.source ?? result.game.source], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${commit?.slug ?? result.game.slug}.html`;
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
            ref={promptRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                void launch(false);
              }
            }}
            rows={4}
            maxLength={500}
            placeholder="e.g. a cozy space shooter where you rescue lost robots"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">{prompt.length}/500</p>

        <label className="mt-4 block text-sm">
          Quality: <b className="text-cyan-300">{quality}</b> <span className="text-slate-600 dark:text-slate-500">(0-10)</span>{" "}
          <InfoTip side="bottom" text="Higher quality spends more budget for a bigger build. Start at 5 and raise it only if you need more." label="About quality" />
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
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
          Default 100 · min {BUDGET_MIN} · max {BUDGET_MAX.toLocaleString()}. Above {CONFIRM_ABOVE} needs Confirm the Amount.{" "}
          <InfoTip side="bottom" text="Budgets above 250 coins ask for confirmation first. Gross price — 25% platform cut included, never added on top." label="About confirm amount" />
        </p>
        <p className="mt-1 rounded-md border border-cyan-400/20 bg-cyan-400/5 px-2 py-1 text-xs text-cyan-200">
          🎼 {lane === "fast" ? "Fast lane: ≤5 min, Scout → Forge → Sage, cheap fal only." : "Deluxe lane: longer but fast (≈5-12 min), full 5-bot symphony + video/3D."}
        </p>
        <CompactDetails summary="Fast vs deluxe?">
          <p className="text-xs text-slate-600 dark:text-slate-400">Fast lane builds in under 5 minutes with 3 bots and cheap media. Deluxe runs the full 5-bot symphony with video and 3D, in about 5 to 12 minutes.</p>
        </CompactDetails>

        <label className="mt-3 block text-sm">
          Org Draft folder (optional){" "}
          <InfoTip side="bottom" text="Personal drafts save to your account. Pick an org to save the draft to a shared folder." label="About org drafts" />
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-white">
            <option value="">Personal drafts only</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name} ({o.slug})</option>
            ))}
          </select>
        </label>
        {!orgs.length && (
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
            {signedIn === "out" ? (
              <><a className="text-cyan-300 underline" href="/auth/login">Sign in</a> to save drafts + meter coins, or launch now for a free local build.</>
            ) : (
              <>No orgs yet - <a className="text-cyan-300 underline" href="/squads">create one on /squads</a>, or launch now and save personally.</>
            )}
          </p>
        )}

        <label className="mt-3 block text-sm">
          Archetype{" "}
          <InfoTip side="bottom" text="Custom (default) invents the fit from your prompt, melding two families when it hears both. Pick a family to pin it, or Completely custom for a hash-derived one-off with no parent." label="About archetypes" />
          <select
            id="ngp-archetype"
            aria-label="Archetype"
            aria-describedby="arch-hint"
            value={archetype}
            onChange={(e) => setArchetype(e.target.value)}
            disabled={busy}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-white"
          >
            <option value="custom">Custom ✨ (auto-pick from prompt)</option>
            <option value="catcher">Catcher (catch falling things)</option>
            <option value="dodger">Dodger (weave hazards, survive)</option>
            <option value="breaker">Breaker (smash bursts, clear up)</option>
            <option value="shooter">Shooter (waves, rescue targets)</option>
            <option value="rpg">RPG (explore, talk, mini-quests)</option>
            <option value="free">Completely custom (no parent, pure prompt)</option>
          </select>
        </label>
        <p id="arch-hint" className="mt-1 text-xs text-slate-600 dark:text-slate-500">
          {archetype === "free"
            ? "Freeform: a one-off engine derived from the prompt hash."
            : archetype === "custom"
              ? "Auto: solo inspiration, or a meld when the prompt names two."
              : `Pinned: every commit builds the ${archetype} family.`}
        </p>
        <label className="mt-3 block text-sm">
          Style notes (optional)
          <input
            id="ngp-style"
            aria-label="Style notes"
            value={style}
            onChange={(e) => setStyle(e.target.value.slice(0, 120))}
            maxLength={120}
            placeholder="neon vampires, double jump…"
            disabled={busy}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>

        <button
          type="button" disabled={busy} onClick={() => void launch(false)}
          className="mt-4 w-full rounded-md bg-cyan-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {busy ? "Symphony playing…" : "Launch NewGamePlus"}
        </button>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-500" role="status">{status}</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">Best quality at the lowest price and greatest speed; cheapest viable build, newest viable runtime, 25% cut included.</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5" aria-label="NewGamePlus result" aria-live="polite">
        {!result && !busy && !liveLog.length && <p className="text-sm text-slate-600 dark:text-slate-400">Your tested game lands here with a live preview, the Draft folder path, and the local evidence trail (VibeCodeWorker ledger verify optional).</p>}
        {(busy || liveLog.length > 0) && (
          <div className="rounded-xl border border-cyan-400/20 bg-black/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-cyan-200">🎼 Symphony {busy ? "playing" : "finished"} - {lane} lane · ⏱ {fmtClock(elapsedMs)} / {lane === "fast" ? "5:00" : "12:00"} target</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{stageKey ? `stage: ${stageKey}` : "idle"}</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded bg-black/60" role="progressbar" aria-label="Build progress">
              <div className="h-full bg-cyan-400 transition-all" style={{ width: `${Math.min(100, Math.round((elapsedMs / (targetSecs * 1000)) * 100))}%` }} />
            </div>
            <ol className="mt-2 max-h-44 space-y-1 overflow-auto text-xs text-slate-600 dark:text-slate-300">
              {liveLog.map((line, i) => (<li key={i}>{line}</li>))}
            </ol>
          </div>
        )}
        {busy && !result && (
          <div className="mt-3">
            <p className="text-sm text-cyan-200">🕹️ VibeCodeWorker (local headless harness): observe → reason → act…</p>
            <div className="mt-2 h-2 overflow-hidden rounded bg-black/40"><div className="h-full w-1/2 animate-pulse bg-cyan-400" /></div>
          </div>
        )}
        {result && (
          <div className="mt-4 space-y-4">
            <div>
              <h2 className="text-xl font-black">{result.game.title}</h2>
              {!!result.resolved && (
                <p className="mt-1 text-xs font-bold text-fuchsia-300" title={result.resolved.blendNote || undefined}>
                  {result.resolved.freeform
                    ? "✨ Custom archetype (freeform — no parent)"
                    : result.resolved.parents.length > 1
                      ? `✨ Custom archetype (meld: ${result.resolved.parents.join(" × ")})`
                      : `Archetype: ${result.resolved.label}`}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                📁 Draft: <code className="text-cyan-200">{result.draft.draft_path}</code> ({result.draft.scope}) · {result.draft.note}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                💰 {result.plan.spend} coins ({result.plan.provider} provider + {result.plan.cut} cut - {result.plan.note}) · est. {result.plan.estimate} for q{result.plan.quality} · {result.plan.lane} lane ({result.plan.target})
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                🧾 {result.charge?.billed
                  ? `Billed ${result.charge.gross} coins (incl. ${result.charge.cut} cut) - see coin history + /my/usage.`
                  : signedIn === "out"
                    ? "Free local build (sign in to save drafts + meter coins)."
                    : "Not billed - the draft save failed, so no coins moved. Download the .html, then relaunch to retry the save."}
              </p>
              <div className="mt-1 rounded-lg border border-violet-300/20 bg-violet-300/5 p-2 text-xs text-slate-600 dark:text-slate-300">
                <p>
                  ☁️ VibeCodeWorker ledger verify{" "}
                  {(() => {
                    if (!result.draft.submission_id) {
                      return <span className="text-slate-600 dark:text-slate-500">needs a saved draft (this build is local-only).</span>;
                    }
                    const commits = result.commits?.length ? result.commits : null;
                    const idx = sel ?? (commits ? commits.length - 1 : 0);
                    const isFinal = !commits || idx === commits.length - 1;
                    const evVerdict = activeCommit()?.evidence.verdict ?? result.test.verdict;
                    if (result.plan.quality === 0 || evVerdict !== "pass") {
                      return <span className="text-slate-600 dark:text-slate-500">skipped: only a passing commit verifies (quality 0 is inconclusive by design).</span>;
                    }
                    if (!isFinal) {
                      return <span className="text-slate-600 dark:text-slate-500">skipped: select the final commit to verify (one verify per build — no double charge).</span>;
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => void verifyWithVcw()}
                        disabled={vcwBusy}
                        className="font-bold text-violet-200 underline disabled:opacity-50"
                      >
                        {vcwBusy ? "Recording…" : `Record final commit as VCW run (~${vcwQuote()} coins)`}
                      </button>
                    );
                  })()}
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-500">
                  Transcribes this commit&apos;s executed evidence into a real vcw_runs row (steps + bugs + verdict, metered at VCW rates, outside the build charge). No remote browser — local-headless provenance is stamped on every step.
                </p>
                {vcwMsg && <p className="mt-1 text-slate-600 dark:text-slate-300" role="status">{vcwMsg}</p>}
                {!!vcw && (
                  <p className="mt-1 font-mono">
                    ✅ run <code className="text-violet-200">{vcw.runId}</code>{" "}
                    <button
                      type="button"
                      onClick={() => { try { void navigator.clipboard.writeText(vcw.runId); setVcwMsg("Run id copied — paste it into /api/vcw/runs/[id], /export, or /handoff."); } catch { setVcwMsg("Copy failed."); } }}
                      className="font-bold text-violet-200 underline"
                    >
                      Copy
                    </button>{" "}
                    · {vcw.verdict} · {vcw.steps} steps · {vcw.bugs} bugs ·{" "}
                    <a className="font-bold text-violet-200 underline" href={`/api/vcw/runs/${vcw.runId}`}>run</a> ·{" "}
                    <a className="font-bold text-violet-200 underline" href={`/api/vcw/runs/${vcw.runId}/export`}>export</a>
                  </p>
                )}
              </div>
              <div className="mt-1 rounded-lg border border-sky-300/20 bg-sky-300/5 p-2 text-xs text-slate-300" aria-live="polite">
                <p>
                  🖥️ Serverless Chromium{" "}
                  {result.draft.submission_id ? (
                    <button
                      type="button"
                      onClick={() => void playtestRemote()}
                      disabled={remoteBusy || vcwBusy || busy}
                      aria-label="Playtest saved draft on serverless Chromium"
                      className="font-bold text-sky-200 underline disabled:opacity-50"
                    >
                      {remoteBusy ? "Playtesting…" : "Play saved draft on a real browser (~1 worker-min)"}
                    </button>
                  ) : (
                    <span className="text-slate-500">needs a saved draft (this build is local-only).</span>
                  )}
                </p>
                <p className="mt-1 text-slate-500">
                  CPU workers, scale-to-zero, ~10–30s a job — metered worker-min outside the build charge. Falls back to local evidence, never fails the build.
                </p>
                {remoteMsg && <p className="mt-1 text-slate-300" role="status">{remoteMsg}</p>}
                {!!remote && (
                  <div className="mt-2">
                    <p className="font-bold">
                      <b className={remote.verdict === "pass" ? "text-emerald-300" : "text-amber-300"}>{remote.verdict}</b>{" "}
                      <span className="rounded-full border border-sky-300/40 px-2 py-0.5 font-mono text-[11px] text-sky-200">serverless-chromium</span>{" "}
                      <span className="font-mono text-slate-400">{remote.hud} · {remote.frames} frames</span>
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {remote.checks.map((c) => (
                        <li key={c.id} className={c.passed ? "text-emerald-300" : "text-red-300"}>
                          {c.passed ? "✅" : "❌"} {c.id}{c.passed ? "" : ` - ${c.detail}`}
                        </li>
                      ))}
                    </ul>
                    {!!remote.errors.length && (
                      <ul className="mt-1 space-y-0.5 font-mono text-red-300">
                        {remote.errors.map((e, i) => (<li key={i}>⚠️ {e}</li>))}
                      </ul>
                    )}
                    {!!remote.screenshotPng && (
                      <img src={`data:image/png;base64,${remote.screenshotPng}`} alt="Remote playtest failure screenshot" className="mt-2 w-full max-w-md rounded-xl border border-white/15" />
                    )}
                  </div>
                )}
              </div>
              <CompactDetails summary="How to read this result">
                <p className="text-xs text-slate-600 dark:text-slate-400">Verdict pass means the game survived automated play. Gross price — 25% platform cut included, never added on top; the draft path is where your game saved.</p>
              </CompactDetails>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                🤖 Local playtest verdict: <b className={result.test.verdict === "pass" ? "text-emerald-300" : "text-amber-300"}>{result.test.verdict}</b> ({result.test.loops} loop{result.test.loops === 1 ? "" : "s"}) · {result.game.bytes.toLocaleString()} bytes · <span className="text-slate-600 dark:text-slate-500">local-headless</span>
              </p>
            </div>
            {!!result.swarm && (
              <details className="rounded-lg border border-fuchsia-300/20 bg-black/30 p-3 text-xs" open>
                <summary className="cursor-pointer font-bold text-fuchsia-200">🎼 Symphony ({result.swarm.agents.length} bots, {result.swarm.mode}) - {result.swarm.target}</summary>
                <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                  {result.swarm.agents.map((a) => (
                    <li key={a.name}>🤖 <b>{a.name}</b> <span className="text-slate-600 dark:text-slate-500">({a.role})</span> - {a.task} <span className="text-slate-600 dark:text-slate-500">[{a.tools.join(", ")}]</span></li>
                  ))}
                </ul>
                {!!result.swarm.trace.length && (
                  <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-500">
                    {result.swarm.trace.map((t, i) => (<li key={i}>📜 {t}</li>))}
                  </ul>
                )}
              </details>
            )}
            {!!result.fal && (
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs">
                <p className="font-bold text-amber-200">✨ Fal media, picked for this prompt ({result.fal.totalCoins} coins gross){result.fal.configured ? "" : "; server key unset, prompts are one click away"}</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{result.fal.note}</p>
                {!!result.fal.selected.length && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.fal.selected.map((f) => (
                      <button key={f.op} type="button" onClick={() => void queueFal(f.op)} className="rounded-md border border-amber-300/30 px-2 py-1 text-amber-100 hover:bg-amber-300/10" title={f.why}>
                        ✨ {f.op} · {f.coins}c{f.fast ? " · fast" : ""}
                      </button>
                    ))}
                  </div>
                )}
                {!!falMsg && <p className="mt-2 text-slate-600 dark:text-slate-300" role="status">{falMsg}</p>}
              </div>
            )}
            {!!result.commits?.length && (
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs">
                <p className="font-bold text-slate-700 dark:text-slate-200">
                  🔁 Test-per-commit ({result.commits.length} commit{result.commits.length === 1 ? "" : "s"} · {result.charge?.billed ? `billed ${result.charge.gross}` : "free"} · preview auto-loads the selected commit)
                </p>
                <div
                  className="mt-2 flex flex-wrap gap-1.5"
                  role="group"
                  aria-label="Commits"
                  onKeyDown={(e) => {
                    if (/^(TEXTAREA|INPUT|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? "")) return;
                    const cur = sel ?? result.commits!.length - 1;
                    if (e.key === "ArrowLeft") selectCommit(cur - 1);
                    else if (e.key === "ArrowRight") selectCommit(cur + 1);
                  }}
                >
                  <button
                    type="button"
                    onClick={() => selectCommit((sel ?? result.commits!.length - 1) - 1)}
                    disabled={(sel ?? result.commits!.length - 1) <= 0}
                    aria-label="Previous commit"
                    className="rounded-md border border-white/15 px-2 py-1 font-mono disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  {result.commits.map((c, i) => {
                    const active = (sel ?? result.commits!.length - 1) === i;
                    return (
                      <button
                        key={c.n}
                        type="button"
                        onClick={() => selectCommit(i)}
                        title={`${c.title} — ${c.evidence.passed}/${c.evidence.total} checks · ${(c.improvements ?? []).join("; ") || "hold"}`}
                        className={`rounded-md border px-2 py-1 font-mono ${active ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/15 text-slate-600 dark:text-slate-300 hover:bg-white/5"}`}
                      >
                        {c.evidence.verdict === "pass" ? "✅" : "❌"} #{c.n} {c.evidence.passed}/{c.evidence.total}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => selectCommit((sel ?? result.commits!.length - 1) + 1)}
                    disabled={(sel ?? result.commits!.length - 1) >= result.commits!.length - 1}
                    aria-label="Next commit"
                    className="rounded-md border border-white/15 px-2 py-1 font-mono disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
                <ol className="mt-2 space-y-1 text-slate-600 dark:text-slate-400">
                  {result.commits.map((c) => (
                    <li key={c.n} className="font-mono">
                      #{c.n} {c.slug} — {c.evidence.verdict} {c.evidence.passed}/{c.evidence.total} · next: {(c.improvements ?? []).join("; ") || "hold"} · {c.spendSlice}c{typeof c.spentCumulative === "number" ? ` (Σ${c.spentCumulative})` : ""} · {c.bytes.toLocaleString()} bytes
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {!!activeCommit() && (
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs">
                <p className="font-bold text-slate-700 dark:text-slate-200">
                  🧪 Commit {activeCommit()!.n} evidence:{" "}
                  <b className={activeCommit()!.evidence.verdict === "pass" ? "text-emerald-300" : "text-amber-300"}>
                    {activeCommit()!.evidence.verdict}
                  </b>{" "}
                  {activeCommit()!.evidence.passed}/{activeCommit()!.evidence.total} · {activeCommit()!.bytes.toLocaleString()} bytes
                  {typeof activeCommit()!.spentCumulative === "number" ? ` · Σ${activeCommit()!.spentCumulative}c` : ""}
                </p>
                <ul className="mt-2 space-y-1">
                  {activeCommit()!.evidence.checks.map((c) => (
                    <li key={c.id} className={c.passed ? "text-emerald-300" : "text-red-300"}>
                      {c.passed ? "✅" : "❌"} {c.label}{c.passed ? "" : ` - ${c.detail}`}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-slate-600 dark:text-slate-400">{activeCommit()!.evidence.steps.slice(0, 3).join(" · ")}</p>
                {activeCommit()!.evidence.steps.length > 3 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer font-bold text-cyan-300">All {activeCommit()!.evidence.steps.length} steps</summary>
                    <ol className="mt-1 list-decimal pl-5 text-slate-600 dark:text-slate-300">
                      {activeCommit()!.evidence.steps.map((s, i) => (<li key={i}>{s}</li>))}
                    </ol>
                  </details>
                )}
                {!!activeCommit()!.evidence.findings.length && (
                  <ul className="mt-2 space-y-1 text-amber-200">
                    {activeCommit()!.evidence.findings.map((f, i) => (<li key={i}>🔧 [{f.severity}] {f.title} - {f.description}</li>))}
                  </ul>
                )}
              </div>
            )}
            <div ref={previewRef} className="rounded-xl border border-white/15 bg-black">
              <iframe
                ref={iframeRef}
                key={(sel ?? (result.commits?.length ?? 1) - 1) + ":" + (activeCommit()?.slug ?? result.game.slug)}
                title={`${activeCommit()?.title ?? result.game.title} preview (commit ${activeCommit()?.n ?? result.commits?.length ?? 1})`}
                srcDoc={activeCommit()?.source ?? result.game.source}
                sandbox="allow-scripts"
                className="h-[440px] w-full rounded-xl bg-black"
              />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-500">Auto-loaded commit {activeCommit()?.n ?? result.commits?.length ?? 1}{result.commits?.length ? ` of ${result.commits.length}` : ""} — click the game once to focus keyboard (WASD/arrows, E talks, P pauses, R restarts) · Fullscreen for the full play window.{liveCount > 0 ? ` · 🟢 live: ${liveCount} in-browser play events captured (free).` : ""}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={download} className="rounded-md bg-emerald-400 px-3 py-1.5 text-sm font-bold text-slate-950">Download .html</button>
              <button type="button" onClick={togglePreviewFullscreen} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200">Fullscreen preview</button>
              <button type="button" onClick={() => { try { const src = activeCommit()?.source ?? result.game.source; if (src.length > 1_000_000) { setStatus(`Source ~${(src.length / 1e6).toFixed(1)}MB — too big for clipboard; use Download .html.`); return; } void navigator.clipboard.writeText(src); setStatus("Game source copied."); } catch { setStatus("Copy failed."); } }} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200">Copy source</button>
              <button type="button" onClick={() => { try { void navigator.clipboard.writeText(window.location.href); setStatus("Build link copied (includes commit)."); } catch { setStatus("Copy failed."); } }} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200">Copy link</button>
            </div>
            <details className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs">
              <summary className="cursor-pointer font-bold text-cyan-300">Local evidence trail ({result.test.steps.length} steps, {result.test.checks.length} checks) · local-headless</summary>
              <ol className="mt-2 list-decimal pl-5 text-slate-600 dark:text-slate-300">{result.test.steps.map((s, i) => (<li key={i}>{s}</li>))}</ol>
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
                  🏆 Mastery {result.mastery.mastered ? "reached" : "in progress"} - test → improve → retest ({result.mastery.iterations.length} iteration{result.mastery.iterations.length === 1 ? "" : "s"})
                </summary>
                <ol className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                  {result.mastery.iterations.map((it, i) => (
                    <li key={i}>· <b>{it.title}</b> ({it.slug}) - VCW {it.verdict} {it.passed}/{it.checks} · next: {it.improvements.join("; ")}</li>
                  ))}
                </ol>
              </details>
            )}
            {!!result.vault && (
              <details className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs" open>
                <summary className="cursor-pointer font-bold text-slate-700 dark:text-slate-200">📁 Weird Vault - {result.vault.folder} (html + css + js + content){result.vault.saved ? ` · saved ✓ (${result.vault.savedFiles ?? 0} files)` : ""}</summary>
                <p className="mt-1">
                  <a className="font-bold text-cyan-300 underline" href={`/vault?folder=${encodeURIComponent(result.vault.folder)}`}>
                    Open folder in Vault →
                  </a>
                </p>
                <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                  {result.vault.files.map((f) => (<li key={f.path}>· <code>{f.path}</code> ({f.bytes.toLocaleString()} bytes)</li>))}
                </ul>
              </details>
            )}
            {!!result.timeline && (
              <details className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs">
                <summary className="cursor-pointer font-bold text-slate-700 dark:text-slate-200">⏱ Build timeline (target {result.timeline.totalTargetSec}s wall clock)</summary>
                <ol className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
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
