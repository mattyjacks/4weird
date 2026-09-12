"use client";

import { useCallback, useEffect, useState } from "react";

type Game = { slug: string; title: string; genre: string; play_url: string };
type Run = { id: string; game_slug: string; goal: string; status: string; verdict: string | null; summary: string | null; created_at: string };
type Step = { id: string; kind: string; text: string; created_at: string };
type Bug = { id: string; title: string; severity: string; description: string | null; created_at: string };

async function postJson(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data as { success?: boolean }).success === false)
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as Record<string, unknown>;
}

async function getJson(path: string) {
  const res = await fetch(path, { credentials: "include", cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("__signin__");
  if (!res.ok || (data as { success?: boolean }).success === false)
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as Record<string, unknown>;
}

/**
 * Native playtest hub (replaces the framed hub.html).
 *
 * The legacy surface is a local-desktop workspace that talks to a
 * localhost control plane — it cannot work from the hosted site. This
 * hub drives the same observe → reason → act loop through the hosted
 * /api/vcw/* endpoints instead: open runs, record steps, file bugs,
 * complete with a verdict. No iframe.
 */
export function VcwHub() {
  const [games, setGames] = useState<Game[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [auth, setAuth] = useState<"checking" | "in" | "out">("checking");
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [goal, setGoal] = useState("Menu flow, controls and visual glitches");
  const [busy, setBusy] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [kind, setKind] = useState("observation");
  const [text, setText] = useState("");
  const [bugTitle, setBugTitle] = useState("");
  const [bugSeverity, setBugSeverity] = useState("medium");
  const [summary, setSummary] = useState("");
  const [verdict, setVerdict] = useState("pass");

  const refreshLists = useCallback(async () => {
    const [g, r] = await Promise.all([getJson("/api/vcw/games"), getJson("/api/vcw/runs?limit=20")]);
    setGames(((g.games as Game[]) ?? []).map((x) => ({ slug: x.slug, title: x.title, genre: x.genre, play_url: x.play_url })));
    setRuns((r.runs as Run[]) ?? []);
    if (!slug && (g.games as Game[])?.length) setSlug((g.games as Game[])[0].slug);
  }, [slug]);

  useEffect(() => {
    (async () => {
      try {
        await refreshLists();
        setAuth("in");
      } catch (e) {
        setAuth(e instanceof Error && e.message === "__signin__" ? "out" : "in");
        if (!(e instanceof Error && e.message === "__signin__"))
          setError(e instanceof Error ? e.message : "Unable to load.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openRun = useCallback(async () => {
    if (!slug || !goal.trim()) {
      setError("Pick a game and describe the goal (1–500 chars).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await postJson("/api/vcw/runs", { game_slug: slug, goal: goal.trim() });
      const run = data.run as Run;
      setRuns((prev) => [run, ...prev]);
      setOpenId(run.id);
      setSteps([]);
      setBugs([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open run.");
    } finally {
      setBusy(false);
    }
  }, [slug, goal]);

  const loadRun = useCallback(async (id: string) => {
    setError(null);
    try {
      const data = await getJson(`/api/vcw/runs/${id}`);
      setOpenId(id);
      setSteps((data.steps as Step[]) ?? []);
      setBugs((data.bugs as Bug[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load run.");
    }
  }, []);

  const addStep = useCallback(async () => {
    if (!openId || !text.trim()) return;
    setBusy(true);
    try {
      await postJson(`/api/vcw/runs/${openId}/actions`, { kind, text: text.trim() });
      setText("");
      await loadRun(openId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to record step.");
    } finally {
      setBusy(false);
    }
  }, [openId, kind, text, loadRun]);

  const fileBug = useCallback(async () => {
    if (!openId || !bugTitle.trim()) return;
    setBusy(true);
    try {
      const run = runs.find((r) => r.id === openId);
      await postJson("/api/vcw/bugs", {
        title: bugTitle.trim(),
        description: `Filed from hub run ${openId}.`,
        severity: bugSeverity,
        game_slug: run?.game_slug,
        run_id: openId,
      });
      setBugTitle("");
      await loadRun(openId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to file bug.");
    } finally {
      setBusy(false);
    }
  }, [openId, bugTitle, bugSeverity, runs, loadRun]);

  const completeRun = useCallback(async () => {
    if (!openId || !summary.trim()) {
      setError("Write a summary before completing the run.");
      return;
    }
    setBusy(true);
    try {
      await postJson(`/api/vcw/runs/${openId}/actions`, { kind: "finding", text: summary.trim() });
      await postJson(`/api/vcw/runs/${openId}/complete`, { summary: summary.trim(), verdict });
      setSummary("");
      const r = await getJson("/api/vcw/runs?limit=20");
      setRuns((r.runs as Run[]) ?? []);
      setOpenId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete run.");
    } finally {
      setBusy(false);
    }
  }, [openId, summary, verdict]);

  if (auth === "checking") return <p className="text-sm text-slate-400">Loading workspace…</p>;
  if (auth === "out")
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[.02] p-6 text-sm text-slate-300">
        <p className="font-bold text-white">Sign in to run playtests.</p>
        <p className="mt-1">Runs, steps, and bugs are yours — the hub needs a login session.</p>
        <a href="/auth/login" className="mt-4 inline-block rounded-full bg-cyan-300 px-5 py-2 font-black text-slate-950">
          Login →
        </a>
      </div>
    );

  const openRunRow = runs.find((r) => r.id === openId) ?? null;
  const input =
    "w-full rounded-lg border border-white/15 bg-[#0a0d14] px-3 py-2 text-sm text-white";

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
        <h2 className="font-bold text-white">Quick run</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            Target
            <select value={slug} onChange={(e) => setSlug(e.target.value)} className={`${input} mt-1`}>
              {games.map((g) => (
                <option key={g.slug} value={g.slug}>{g.title} ({g.slug})</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Test focus
            <input value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={500} className={`${input} mt-1`} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void openRun()}
            disabled={busy}
            className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
          >
            {busy ? "Working…" : "Run playtest →"}
          </button>
          {slug && (
            <a href={`/games/${slug}/play`} target="_blank" rel="noopener" className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white transition hover:bg-white/10">
              Play target ↗
            </a>
          )}
        </div>
      </section>

      {openRunRow && (
        <section className="rounded-2xl border border-cyan-300/30 bg-cyan-300/[.04] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold text-white">Open run: {openRunRow.game_slug}</h2>
            <span className="text-xs text-slate-400">{openRunRow.status} · {new Date(openRunRow.created_at).toLocaleString()}</span>
          </div>
          <p className="mt-1 text-sm text-slate-300">Goal: {openRunRow.goal}</p>

          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold text-white">Trail ({steps.length})</h3>
              <div className="mt-1 max-h-64 space-y-1 overflow-y-auto">
                {steps.length === 0 && <p className="text-xs text-slate-500">No steps yet — record the first observation below.</p>}
                {steps.map((s) => (
                  <div key={s.id} className="rounded-lg bg-black/30 px-3 py-2 text-xs">
                    <span className="font-black uppercase tracking-wider text-cyan-300">{s.kind}</span>
                    <p className="mt-0.5 whitespace-pre-wrap text-slate-200">{s.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Step kind" className="rounded-lg border border-white/15 bg-[#0a0d14] px-2 py-2 text-sm text-white">
                  <option value="observation">observation</option>
                  <option value="action">action</option>
                  <option value="finding">finding</option>
                </select>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={5000}
                  placeholder="Observe → reason → act…"
                  aria-label="Step text"
                  className={`${input} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => void addStep()}
                  disabled={busy || !text.trim()}
                  className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Bugs ({bugs.length})</h3>
              <div className="mt-1 max-h-40 space-y-1 overflow-y-auto">
                {bugs.length === 0 && <p className="text-xs text-slate-500">No bugs filed on this run.</p>}
                {bugs.map((b) => (
                  <div key={b.id} className="rounded-lg bg-black/30 px-3 py-2 text-xs">
                    <span className="font-bold text-amber-300">[{b.severity}]</span>{" "}
                    <span className="text-slate-200">{b.title}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={bugTitle}
                  onChange={(e) => setBugTitle(e.target.value)}
                  placeholder="Bug title…"
                  aria-label="Bug title"
                  className={`${input} flex-1`}
                />
                <select value={bugSeverity} onChange={(e) => setBugSeverity(e.target.value)} aria-label="Severity" className="rounded-lg border border-white/15 bg-[#0a0d14] px-2 py-2 text-sm text-white">
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
                <button
                  type="button"
                  onClick={() => void fileBug()}
                  disabled={busy || !bugTitle.trim()}
                  className="rounded-lg border border-amber-300/50 px-4 py-2 text-sm font-bold text-amber-200 disabled:opacity-50"
                >
                  File
                </button>
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">Complete</h3>
              <div className="mt-1 flex gap-2">
                <input
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Summary…"
                  aria-label="Run summary"
                  className={`${input} flex-1`}
                />
                <select value={verdict} onChange={(e) => setVerdict(e.target.value)} aria-label="Verdict" className="rounded-lg border border-white/15 bg-[#0a0d14] px-2 py-2 text-sm text-white">
                  <option value="pass">pass</option>
                  <option value="fail">fail</option>
                  <option value="inconclusive">inconclusive</option>
                </select>
                <button
                  type="button"
                  onClick={() => void completeRun()}
                  disabled={busy}
                  className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white">Recent runs</h2>
          <button
            type="button"
            onClick={() => void refreshLists().catch((e: unknown) => setError(e instanceof Error ? e.message : "Refresh failed."))}
            className="rounded-lg border border-white/15 px-3 py-1 text-xs font-bold text-slate-300 hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
        <div className="mt-2 space-y-1">
          {runs.length === 0 && <p className="text-xs text-slate-500">No runs yet — open your first above.</p>}
          {runs.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => void loadRun(r.id)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-xs transition hover:bg-white/5 ${r.id === openId ? "bg-cyan-300/10" : "bg-black/20"}`}
            >
              <span className="font-bold text-white">{r.game_slug}</span>{" "}
              <span className="text-slate-400">· {r.status}{r.verdict ? ` · ${r.verdict}` : ""} · {r.goal.slice(0, 80)}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Exports, side-by-side compare, and portable handoff briefs live on the API — see{" "}
          <a href="/docs/vibecodeworker" className="text-cyan-300 hover:underline">/docs/vibecodeworker</a>.
        </p>
      </section>
    </div>
  );
}
