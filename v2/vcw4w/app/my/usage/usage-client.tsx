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
  gameRent: {
    total: Spend;
    lastHour: Spend;
    last24h: Spend;
    byGame: { game_slug: string; sessions: number; gross: number; cut: number; provider: number }[];
    recent: { game_slug: string; gross_coins: number; cut_coins: number; source: string; created_at: string }[];
  };
  workspace: {
    gross: number;
    cut: number;
    provider: number;
    charges: number;
    functions: { gross: number; cut: number; charges: number };
    byService: { service: string; unit: string; qty: number; gross: number; cut: number; provider: number }[];
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
            placeholder="paste a buddy session uuid — or leave blank"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs"
          />
        </label>
        <button className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950">Refresh</button>
      </form>
      <p role="status" className="text-sm text-slate-400">{message}</p>

      {data && (
        <>
          <Card title="Gaming Buddy + game AI — the four windows you asked for">
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

          <Card title="Game rentals — loads + hourly play">
            <div className="grid gap-3 sm:grid-cols-3">
              <SpendGrid label="Total (all time)" spend={data.gameRent?.total ?? { gross: 0, cut: 0, provider: 0, turns: 0 }} usd={usd} />
              <SpendGrid label="Last 24 hours" spend={data.gameRent?.last24h ?? { gross: 0, cut: 0, provider: 0, turns: 0 }} usd={usd} />
              <SpendGrid label="Last hour" spend={data.gameRent?.lastHour ?? { gross: 0, cut: 0, provider: 0, turns: 0 }} usd={usd} />
            </div>
            <p className="text-xs text-slate-500">
              Each load costs the game&apos;s rate (default 1 coin, first hour included); extra hours bill the hourly
              rate (default 1 coin/hr). Cached loads (&lt;1&nbsp;MB new data) are free. “Turns” above counts play sessions.
            </p>
            {(data.gameRent?.byGame ?? []).length ? (
              <div className="space-y-2">
                {(data.gameRent?.byGame ?? []).map((g) => (
                  <div key={g.game_slug} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
                    <span className="font-semibold text-white">{g.game_slug}</span>
                    <span className="text-slate-400">{g.gross} gross · {g.cut} cut · {g.provider} provider · {g.sessions} sessions</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No rented play yet — every load and hour lands here.</p>
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
                        <td className="px-3 py-2">{r.source === "load" ? "load (first hour incl.)" : "hourly"}</td>
                        <td className="px-3 py-2">{r.gross_coins}</td>
                        <td className="px-3 py-2">{r.cut_coins}</td>
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
                <p className="mt-1 text-xs text-slate-400">game AI + game rentals + agent rentals + workspaces</p>
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
            </div>
          </Card>

          <Card title="Functions — serverless, cron, inference, queues, relays">
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
              <p className="text-slate-500">No game-AI spend yet — start a Buddy session or play an AI game.</p>
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
                        <td className="px-3 py-2 font-mono">{r.session_id ? String(r.session_id).slice(0, 8) + "…" : "—"}</td>
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
