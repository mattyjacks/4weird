"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  return <div className="space-y-3"><div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[.02] px-2 py-1"><label className="text-sm text-slate-300">Game <select value={game} onChange={(e) => setGame(e.target.value)} className="ml-2 rounded-lg border border-white/15 bg-black/30 px-3 py-2">{games.map((g) => <option key={g.slug} value={g.slug}>{g.title}</option>)}</select></label><label className="text-sm text-slate-300">Ranked by <select value={metric} onChange={(e) => setMetric(e.target.value)} className="ml-2 rounded-lg border border-white/15 bg-black/30 px-3 py-2">{METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label></div>{message ? <p role="status" className="text-sm text-slate-400">{message}</p> : rows.length === 0 ? <div className="rounded-lg border border-white/10 bg-white/[.02] p-3.5 text-center"><p className="text-sm text-slate-400">No scores yet; be the first to play.</p><Link href="/games" className="mt-2 inline-block rounded-lg bg-cyan-300 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-200">Launch Game &amp; Set Score</Link></div> : <ol className="perf-list space-y-1">{rows.map((row) => <li key={row.rank} className="perf-card flex min-h-[36px] items-center justify-between rounded-lg border border-white/10 bg-white/[.03] px-3 py-1.5 odd:bg-white/[.05]"><span className="text-sm"><strong className="text-cyan-300">#{row.rank}</strong> {row.player}</span><span className="font-mono text-sm">{row.value.toLocaleString()}</span></li>)}</ol>}<p className="text-xs text-slate-500">Only public handles and totals are shown; never accounts or emails.</p></div>;
}
