"use client";

import { useEffect, useState } from "react";
import { games } from "@/content/games";

const METRICS = [{ key: "kills", label: "Kills" }, { key: "actions", label: "Actions" }, { key: "active_seconds", label: "Play time" }];

type Row = { rank: number; player: string; value: number };

export function LeaderboardBrowser() {
  const [game, setGame] = useState(games[0]?.slug ?? "");
  const [metric, setMetric] = useState("kills");
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!game) return;
    setMessage("Loading…");
    fetch(`/api/leaderboard?game=${encodeURIComponent(game)}&metric=${encodeURIComponent(metric)}`).then((r) => r.json()).then((body) => {
      if (body.success === false) throw new Error(body.error || "Unable to load.");
      setRows(Array.isArray(body.rows) ? body.rows : []);
      setMessage("");
    }).catch((error) => {
      setRows([]);
      setMessage(error instanceof Error ? error.message : "Unable to load.");
    });
  }, [game, metric]);

  return <div className="space-y-6"><div className="flex flex-wrap gap-3"><label className="text-sm text-slate-300">Game <select value={game} onChange={(e) => setGame(e.target.value)} className="ml-2 rounded-lg border border-white/15 bg-black/30 px-3 py-2">{games.map((g) => <option key={g.slug} value={g.slug}>{g.title}</option>)}</select></label><label className="text-sm text-slate-300">Ranked by <select value={metric} onChange={(e) => setMetric(e.target.value)} className="ml-2 rounded-lg border border-white/15 bg-black/30 px-3 py-2">{METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label></div>{message ? <p role="status" className="text-sm text-slate-400">{message}</p> : rows.length === 0 ? <p className="text-sm text-slate-400">No scores yet — be the first to play.</p> : <ol className="perf-list space-y-2">{rows.map((row) => <li key={row.rank} className="perf-card flex items-center justify-between rounded-xl border border-white/10 bg-white/[.03] px-4 py-2"><span className="text-sm"><strong className="text-cyan-300">#{row.rank}</strong> {row.player}</span><span className="font-mono text-sm">{row.value.toLocaleString()}</span></li>)}</ol>}<p className="text-xs text-slate-500">Only public handles and totals are shown — never accounts or emails.</p></div>;
}
