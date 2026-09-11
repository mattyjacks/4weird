"use client";

import { useCallback, useEffect, useState } from "react";

type Spend = { gross: number; cut: number; provider: number; turns: number };
type UsageResponse = {
  session: Spend & { id?: string };
  total: Spend;
  lastHour: Spend;
  last24h: Spend;
  byKind: { kind: string; turns: number; gross: number; cut: number; provider: number }[];
  byGame: { game_slug: string; turns: number; gross: number; cut: number; provider: number }[];
  coins: { delta: number; reason: string; created_at: string }[];
  recentGameAi: {
    game_slug: string;
    kind: string;
    mode: string;
    session_id: string | null;
    qty: number;
    gross_coins: number;
    cut_coins: number;
    provider_coins: number;
    source: string;
    created_at: string;
  }[];
  agentCompute: { gross: number; cut: number; provider: number; slices: number };
  clan: {
    total: { gross: number; cut: number; charges: number };
    lastHour: { gross: number; cut: number; charges: number };
    last24h: { gross: number; cut: number; charges: number };
    byReason: { label: string; charges: number; gross: number }[];
    recent: { delta: number; reason: string; created_at: string }[];
  };
  gameRent: {
    total: Spend;
    lastHour: Spend;
    last24h: Spend;
    byGame: { game_slug: string; sessions: number; gross: number; cut: number; provider: number; seconds?: number }[];
    recent: { game_slug: string; gross_coins: number; cut_coins: number; source: string; created_at: string }[];
    secondsTotal?: number;
    secondsHour?: number;
    secondsDay?: number;
  };
  workspace: {
    gross: number;
    cut: number;
    provider: number;
    charges: number;
    functions: { gross: number; cut: number; charges: number };
    byService: { service: string; unit: string; qty: number; gross: number; cut: number; provider: number }[];
  };
  runpod: {
    totalUsd: number;
    coinsEquivalent: number;
    buckets: number;
    byKind: { kind: string; usd: number }[];
    recent: { kind: string; remote_id: string; time_bucket: string; amount_usd: number; time_billed_ms: number }[];
    lastSync: string | null;
  };
  newgameplus?: { gross: number; cut: number; provider: number; turns: number };
  submissions?: { gross: number; cut: number; provider: number; turns: number };
  meshy?: { gross: number; cut: number; provider: number; turns: number };
  vault?: { gross: number; cut: number; provider: number; turns: number };
  fal?: {
    total: { gross: number; cut: number; provider: number; charges: number };
    byOp: { op: string; charges: number; gross: number; cut: number; provider: number }[];
    byGame: { game_slug: string; charges: number; gross: number; cut: number; provider: number }[];
    recent: { game_slug: string; op: string; qty: number; gross_coins: number; cut_coins: number; source: string; created_at: string }[];
  };
  combined: { gross: number; cut: number; provider: number };
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-4 space-y-3 text-sm text-slate-300">{children}</div>
    </section>
  );
}

function SpendGrid({ label, spend, usd }: { label: string; spend: Spend; usd: (c: number) => string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-black text-white">
        {spend.gross} <span className="text-sm font-semibold text-slate-400">coins ({usd(spend.gross)})</span>
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {spend.cut} cut (25%) · {spend.provider} provider (75%) · {spend.turns} turns
      </p>
    </div>
  );
}

const KIND_BLURB: Record<string, string> = {
  "buddy-chat": "Gaming Buddy conversation (screen-aware chat)",
  "buddy-tts": "Gaming Buddy voice (9 OpenAI voices)",
  dialogue: "In-game OpenAI dialogue bots (NPC chat)",
  director: "AI game directing (pacing, spawns, difficulty)",
  tts: "In-game voice lines (9 OpenAI voices)",
  "runpod-gpu": "Rented RunPod GPUs backing game AI",
  inference: "Hosted inference endpoints for game AI",
};

export function UsageClient() {
  const [sessionFilter, setSessionFilter] = useState("");
  const [data, setData] = useState<UsageResponse | null>(null);
  const [message, setMessage] = useState("Loading your compute ledger…");
  const [runpodMsg, setRunpodMsg] = useState("");
  const [syncing, setSyncing] = useState(false);

  const usd = useCallback((coins: number) => `$${(coins / 100).toFixed(2)}`, []);

  const load = useCallback(async (session: string) => {
    setMessage("Loading your compute ledger…");
    try {
      const params = new URLSearchParams({ limit: "25" });
      const fromUrl = new URLSearchParams(window.location.search).get("session");
      const sid = (session || fromUrl || "").trim();
      if (/^[0-9a-f-]{36}$/i.test(sid)) params.set("session", sid);
      const res = await fetch(`/api/my/usage?${params.toString()}`, { credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(body.error ?? `Request failed (${res.status})`));
      setData(body as UsageResponse);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load usage.");
    }
  }, []);

  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get("session") ?? "";
    setSessionFilter(/^[0-9a-f-]{36}$/i.test(sid) ? sid : "");
    void load(sid);
  }, [load]);

  async function syncRunpod() {
    setSyncing(true);
    setRunpodMsg("Pulling real RunPod billing…");
    try {
      const res = await fetch("/api/agents/runpod-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });
      const body = (await res.json()) as { success?: boolean; synced?: number; totalUsd?: number; error?: string };
      if (!body.success) throw new Error(body.error ?? "Sync failed.");
      setRunpodMsg(`Synced ${body.synced ?? 0} buckets ($${body.totalUsd ?? 0}).`);
      await load(sessionFilter);
    } catch (error) {
      setRunpodMsg(error instanceof Error ? error.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const sid = sessionFilter.trim();
          const url = sid ? `/my/usage/?session=${encodeURIComponent(sid)}` : "/my/usage/";
          window.history.replaceState(null, "", url);
          void load(sid);
        }}
      >
        <label className="min-w-0 flex-1 text-sm">
          Buddy session id (shows that session&apos;s spend above everything else)
          <input
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            placeholder="paste a buddy session uuid; or leave blank"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs"
          />
        </label>
        <button className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950">Refresh</button>
      </form>
      <p role="status" className="text-sm text-slate-400">{message}</p>

      {data && (
        <>
          <Card title="Gaming Buddy + game AI; the four windows you asked for">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SpendGrid label={data.session?.id ? "Current session" : "Session (none selected)"} spend={data.session} usd={usd} />
              <SpendGrid label="Total (all time)" spend={data.total} usd={usd} />
              <SpendGrid label="Last 24 hours" spend={data.last24h} usd={usd} />
              <SpendGrid label="Last hour" spend={data.lastHour} usd={usd} />
            </div>
            {data.session?.id && <p className="font-mono text-xs text-slate-500">session {data.session.id}</p>}
            <p className="text-xs text-slate-500">
              Buddy turns meter as buddy-chat (tokens) + buddy-tts (chars). In-game AI meters as
              dialogue / director / tts / runpod-gpu / inference. All four windows split the same 25% cut.
            </p>
          </Card>

          <Card title="Game rentals; loads + per-second play">
            <div className="grid gap-3 sm:grid-cols-3">
              <SpendGrid label="Total (all time)" spend={data.gameRent?.total ?? { gross: 0, cut: 0, provider: 0, turns: 0 }} usd={usd} />
              <SpendGrid label="Last 24 hours" spend={data.gameRent?.last24h ?? { gross: 0, cut: 0, provider: 0, turns: 0 }} usd={usd} />
              <SpendGrid label="Last hour" spend={data.gameRent?.lastHour ?? { gross: 0, cut: 0, provider: 0, turns: 0 }} usd={usd} />
            </div>
            <p className="text-xs text-slate-500">
              Each first load costs the game&apos;s load rate for 1 MiB of fresh bytes, proportional to the exact
              bytes (default 1 coin, min 1 centicentcoin); running play bills the hourly
              rate (default 1 coin/hr) per second from the first second. Same-version replays within 24h are free.
              &ldquo;Turns&rdquo; above counts play sessions.
            </p>
            <p className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm">
              ⏱ Hours played: <b className="text-white">{((data.gameRent?.secondsTotal ?? 0) / 3600).toFixed(1)}h</b> all time
              {" "}· {((data.gameRent?.secondsDay ?? 0) / 3600).toFixed(1)}h last 24h
              {" "}· {((data.gameRent?.secondsHour ?? 0) / 3600).toFixed(1)}h last hour
              {" "}<span className="text-slate-500">(every load counts, free replays included)</span>
            </p>
            {(data.gameRent?.byGame ?? []).length ? (
              <div className="space-y-2">
                {(data.gameRent?.byGame ?? []).map((g) => (
                  <div key={g.game_slug} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
                    <span className="font-semibold text-white">{g.game_slug}</span>
                    <span className="text-slate-400">{g.gross} gross · {g.cut} cut · {g.provider} provider · {g.sessions} sessions{typeof g.seconds === "number" ? ` · ${((g.seconds ?? 0) / 3600).toFixed(1)}h played` : ""}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No rented play yet; every load and hour lands here.</p>
            )}
            {(data.gameRent?.recent ?? []).length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 uppercase tracking-widest text-slate-500">
                      <th className="px-3 py-2">When</th><th className="px-3 py-2">Game</th><th className="px-3 py-2">What</th><th className="px-3 py-2">Gross</th><th className="px-3 py-2">Cut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.gameRent?.recent ?? []).map((r, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="px-3 py-2">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2">{r.game_slug}</td>
                        <td className="px-3 py-2">{r.source === "load" ? "load (exact bytes)" : "per-second play"}</td>
                        <td className="px-3 py-2">{r.gross_coins}</td>
                        <td className="px-3 py-2">{r.cut_coins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="NewGamePlus; prompt-to-game builds">
            <p>
              One prompt in, one tested Draft game out:{" "}
              <b>{data.newgameplus?.gross ?? 0}</b> coins, <b>{data.newgameplus?.cut ?? 0}</b> cut,{" "}
              <b>{data.newgameplus?.turns ?? 0}</b> builds. Every build debits its capped spend (25% cut included)
              and lands in coin history as <span className="font-mono">NewGamePlus &lt;slug&gt; (qX)</span>.{" "}
              <a className="underline" href="/newgameplus">Build a game →</a>
            </p>
            {(data.newgameplus?.turns ?? 0) === 0 && (
              <p className="text-slate-500">No builds yet; launch one on /newgameplus.</p>
            )}
          </Card>

          <Card title="Game submissions; .zip uploads + audits">
            <p>
              Ship a game as a .zip:{" "}
              <b>{data.submissions?.gross ?? 0}</b> coins, <b>{data.submissions?.cut ?? 0}</b> cut,{" "}
              <b>{data.submissions?.turns ?? 0}</b> charges (25% cut included).{" "}
              <a className="underline" href="/submit">Submit a game →</a>
            </p>
            {(data.submissions?.turns ?? 0) === 0 && (
              <p className="text-slate-500">No submissions yet; ship one on /submit.</p>
            )}
          </Card>

          <Card title="Meshy.ai; text/image to 3D + textures">
            <p>
              3D models and textures for your games:{" "}
              <b>{data.meshy?.gross ?? 0}</b> coins, <b>{data.meshy?.cut ?? 0}</b> cut,{" "}
              <b>{data.meshy?.turns ?? 0}</b> runs (25% cut included).{" "}
              <a className="underline" href="/meshy">Open the studio →</a>
            </p>
            {(data.meshy?.turns ?? 0) === 0 && (
              <p className="text-slate-500">No Meshy runs yet; make something on /meshy.</p>
            )}
          </Card>

          <Card title="Weird Vault; game file storage">
            <p>
              Blob storage for game files:{" "}
              <b>{data.vault?.gross ?? 0}</b> coins, <b>{data.vault?.cut ?? 0}</b> cut,{" "}
              <b>{data.vault?.turns ?? 0}</b> charges (25% cut included).{" "}
              <a className="underline" href="/vault">Open the vault →</a>
            </p>
            {(data.vault?.turns ?? 0) === 0 && (
              <p className="text-slate-500">No vault storage yet; stash files on /vault.</p>
            )}
          </Card>

          <Card title="RunPod; real spend, mirrored">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/[.06] p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">RunPod total (USD)</p>
                <p className="mt-1 text-3xl font-black">${data.runpod.totalUsd.toFixed(4)}</p>
                <p className="mt-1 text-xs text-slate-400">≈ {data.runpod.coinsEquivalent} coins display-equiv (100 coins = $1.00)</p>
              </div>
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Buckets</p>
                <p className="mt-1 text-3xl font-black">{data.runpod.buckets}</p>
              </div>
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Last sync</p>
                <p className="mt-1 text-sm font-bold">{data.runpod.lastSync ? new Date(data.runpod.lastSync).toLocaleString() : "never"}</p>
                <button
                  onClick={() => void syncRunpod()}
                  disabled={syncing}
                  className="mt-2 rounded-lg bg-cyan-300 px-3 py-1.5 text-xs font-bold text-slate-950 disabled:opacity-50"
                >
                  {syncing ? "Syncing…" : "Sync from RunPod"}
                </button>
                {runpodMsg && <p className="mt-1 text-xs text-slate-400">{runpodMsg}</p>}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Pulled live from RunPod billing (pods + serverless + volumes) with the server&apos;s RUNPOD_API_KEY.
              RunPod bills your card directly; mirrored rows carry no Vibe cut and sit outside the combined coin totals.
            </p>
            {data.runpod.byKind.length ? (
              <div className="space-y-2">
                {data.runpod.byKind.map((k) => (
                  <div key={k.kind} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
                    <span className="font-semibold text-white">{k.kind === "pod" ? "Pods" : k.kind === "serverless" ? "Serverless endpoints" : "Network volumes"}</span>
                    <span className="text-slate-400">${k.usd.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No RunPod spend mirrored yet; hit “Sync from RunPod”.</p>
            )}
            {data.runpod.recent.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 uppercase tracking-widest text-slate-500">
                      <th className="px-3 py-2">Bucket</th><th className="px-3 py-2">Kind</th><th className="px-3 py-2">Resource</th><th className="px-3 py-2">USD</th><th className="px-3 py-2">Billed time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.runpod.recent.map((r, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="px-3 py-2">{new Date(r.time_bucket).toLocaleDateString()}</td>
                        <td className="px-3 py-2">{r.kind}</td>
                        <td className="px-3 py-2 font-mono">{r.remote_id || "-"}</td>
                        <td className="px-3 py-2">${Number(r.amount_usd).toFixed(4)}</td>
                        <td className="px-3 py-2">{r.time_billed_ms ? `${Math.round(r.time_billed_ms / 3_600_000 * 100) / 100}h` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="All compute, combined">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/[.06] p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Combined gross</p>
                <p className="mt-1 text-3xl font-black">{data.combined.gross} <span className="text-sm text-slate-400">({usd(data.combined.gross)})</span></p>
                <p className="mt-1 text-xs text-slate-400">game AI + fal.ai + game rentals + newgameplus + submissions + meshy + vault + agent rentals + workspaces + clan fees</p>
              </div>
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Platform 25%</p>
                <p className="mt-1 text-3xl font-black">{data.combined.cut}</p>
              </div>
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Providers 75%</p>
                <p className="mt-1 text-3xl font-black">{data.combined.provider}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 p-4">Game AI: <b>{data.total.gross}</b> coins ({data.total.turns} turns)</div>
              <div className="rounded-xl border border-white/10 p-4">Game rentals: <b>{data.gameRent?.total.gross ?? 0}</b> coins ({data.gameRent?.total.turns ?? 0} sessions)</div>
              <div className="rounded-xl border border-white/10 p-4">Agent rentals: <b>{data.agentCompute.gross}</b> coins ({data.agentCompute.slices} slices)</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 p-4">Workspaces: <b>{data.workspace.gross}</b> coins ({data.workspace.charges} charges)</div>
              <div className="rounded-xl border border-white/10 p-4">Clans: <b>{data.clan?.total.gross ?? 0}</b> coins ({data.clan?.total.charges ?? 0} charges)</div>
              <div className="rounded-xl border border-white/10 p-4">NewGamePlus: <b>{data.newgameplus?.gross ?? 0}</b> coins ({data.newgameplus?.turns ?? 0} builds)</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 p-4">Submissions: <b>{data.submissions?.gross ?? 0}</b> coins ({data.submissions?.turns ?? 0} charges)</div>
              <div className="rounded-xl border border-white/10 p-4">Meshy.ai: <b>{data.meshy?.gross ?? 0}</b> coins ({data.meshy?.turns ?? 0} runs)</div>
              <div className="rounded-xl border border-white/10 p-4">Vault: <b>{data.vault?.gross ?? 0}</b> coins ({data.vault?.turns ?? 0} charges)</div>
            </div>
          </Card>

          <Card title="Clans; posting fees + funding + donations">
            <p>
              Every post/comment/message pays a server-cost fee (25% platform / 75% clan wallet, min 0.01 coins);
              owner funding + member donations move 1:1 with no cut. Total: <b>{data.clan?.total.gross ?? 0}</b> coins,{" "}
              <b>{data.clan?.total.cut ?? 0}</b> cut, <b>{data.clan?.total.charges ?? 0}</b> charges.
            </p>
            {(data.clan?.byReason ?? []).length ? (
              <div className="space-y-2">
                {(data.clan?.byReason ?? []).map((r) => (
                  <div key={r.label} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
                    <span className="font-semibold text-white">{r.label}</span>
                    <span className="text-slate-400">{r.gross} gross · {r.charges} charges</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No clan spend yet; every Clan fee, funding, and donation lands here.</p>
            )}
          </Card>

          <Card title="Functions; serverless, cron, inference, queues, relays">
            <p>
              Function runs are workspace provisions, not a hidden bucket: <b>{data.workspace.functions.charges}</b> charges,{" "}
              <b>{data.workspace.functions.gross}</b> coins ({usd(data.workspace.functions.gross)}),{" "}
              <b>{data.workspace.functions.cut}</b> cut. Keys counted as functions: serverless-worker,
              serverless-cron, inference-api, buddy-chat, realtime-relay, job-queue.
            </p>
            {data.workspace.byService.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 uppercase tracking-widest text-slate-500">
                      <th className="px-3 py-2">Service</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Gross</th><th className="px-3 py-2">Cut</th><th className="px-3 py-2">Provider</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.workspace.byService.map((s) => (
                      <tr key={s.service} className="border-b border-white/5">
                        <td className="px-3 py-2 font-semibold text-white">{s.service}</td>
                        <td className="px-3 py-2">{s.qty}</td>
                        <td className="px-3 py-2">{s.gross}</td>
                        <td className="px-3 py-2">{s.cut}</td>
                        <td className="px-3 py-2">{s.provider}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500">No workspace cloud spend visible to this account yet.</p>
            )}
          </Card>

          <Card title="Game AI by feature kind">
            {data.byKind.length ? (
              <div className="space-y-2">
                {data.byKind.map((k) => (
                  <div key={k.kind} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
                    <span><b className="text-white">{k.kind}</b> <small className="text-slate-500">{KIND_BLURB[k.kind] ?? ""}</small></span>
                    <span className="text-slate-400">{k.gross} gross · {k.cut} cut · {k.provider} provider · {k.turns} turns</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No game-AI spend yet; start a Buddy session or play an AI game.</p>
            )}
          </Card>

          <Card title="Game AI by game">
            {data.byGame.length ? (
              <div className="space-y-2">
                {data.byGame.map((g) => (
                  <div key={g.game_slug} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
                    <span className="font-semibold text-white">{g.game_slug}</span>
                    <span className="text-slate-400">{g.gross} gross · {g.cut} cut · {g.provider} provider · {g.turns} turns</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No per-game spend yet.</p>
            )}
          </Card>

          <Card title="fal.ai Studio - 15 media tools">
            <p>
              Concept art, sprites, 3D, trailers, voices, music + promo kits:{" "}
              <b>{data.fal?.total.gross ?? 0}</b> coins, <b>{data.fal?.total.cut ?? 0}</b> cut,{" "}
              <b>{data.fal?.total.charges ?? 0}</b> runs. Every price includes the 25% cut.{" "}
              <a className="underline" href="/fal">Open the studio →</a>
            </p>
            {(data.fal?.byOp ?? []).length ? (
              <div className="space-y-2">
                {(data.fal?.byOp ?? []).map((k) => (
                  <div key={k.op} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
                    <span className="font-semibold text-white">{k.op}</span>
                    <span className="text-slate-400">{k.gross} gross · {k.cut} cut · {k.provider} provider · {k.charges} runs</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No fal.ai runs yet; make something magical on /fal.</p>
            )}
          </Card>

          <Card title="Recent game-AI turns (per-turn detail)">
            {data.recentGameAi.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 uppercase tracking-widest text-slate-500">
                      <th className="px-3 py-2">When</th><th className="px-3 py-2">Game</th><th className="px-3 py-2">Kind</th><th className="px-3 py-2">Mode</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Gross</th><th className="px-3 py-2">Cut</th><th className="px-3 py-2">Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentGameAi.map((r, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="px-3 py-2">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2">{r.game_slug}</td>
                        <td className="px-3 py-2">{r.kind}</td>
                        <td className="px-3 py-2">{r.mode}</td>
                        <td className="px-3 py-2">{r.source}</td>
                        <td className="px-3 py-2">{r.gross_coins}</td>
                        <td className="px-3 py-2">{r.cut_coins}</td>
                        <td className="px-3 py-2 font-mono">{r.session_id ? String(r.session_id).slice(0, 8) + "…" : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500">No turns yet.</p>
            )}
          </Card>

          <Card title="Vibe Coin movements (all spend + grants)">
            {data.coins.length ? (
              <div className="space-y-2">
                {data.coins.map((c, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
                    <span>{c.reason} <small className="text-slate-500">{new Date(c.created_at).toLocaleString()}</small></span>
                    <b className={c.delta < 0 ? "text-amber-200" : "text-emerald-200"}>{c.delta > 0 ? "+" : ""}{c.delta}</b>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No coin movements yet.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
