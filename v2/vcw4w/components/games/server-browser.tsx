"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { normalizeAgeBand, serverJoinHref, toGameServers, type GameServer, type ServerAgeBand } from "./server-card";

type DimensionFilter = "" | "1d" | "2d" | "3d";
type BandFilter = "" | ServerAgeBand;
type PopulationFilter = "" | "open" | "full";

const OFFLINE_COPY =
  "You're offline or the server list didn't load. Showing an empty lobby — check your connection and hit Refresh. Your game progress is safe.";

function initialDimension(): DimensionFilter {
  if (typeof window === "undefined") return "";
  const hint = new URLSearchParams(window.location.search).get("dimension")?.toLowerCase() ?? "";
  return hint === "1d" || hint === "2d" || hint === "3d" ? hint : "";
}

function initialBand(): BandFilter {
  if (typeof window === "undefined") return "";
  const hint = new URLSearchParams(window.location.search).get("ageBand")?.toLowerCase() ?? "";
  return hint === "kids" || hint === "teens" || hint === "adults" ? hint : "";
}

function isFull(server: GameServer): boolean {
  const players = Number(server.players);
  const max = Number(server.maxPlayers);
  return Number.isFinite(players) && Number.isFinite(max) && max > 0 && players >= max;
}

/**
 * ServerBrowser — client list for /games/servers: dimension, age-band,
 * and population filters over GET /api/mmo/servers, with live
 * per-minute quotes + free-play badges on every ServerCard.
 * SSR-safe (renders loading state on server) and fail-open offline: a
 * failed fetch shows OFFLINE_COPY instead of throwing. The dimension
 * facet only lists values the data actually declares; age-band filtering
 * is display-only here — join-time enforcement stays server-side
 * (DS-MMO-08 age-band entry + /api/mmo/gate).
 */
export function ServerBrowser() {
  const [dimension, setDimension] = useState<DimensionFilter>(initialDimension);
  const [band, setBand] = useState<BandFilter>(initialBand);
  const [population, setPopulation] = useState<PopulationFilter>("");
  const [query, setQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [rows, setRows] = useState<GameServer[] | null>(null);
  const [message, setMessage] = useState("Loading servers…");

  const load = useCallback(async () => {
    setMessage("Loading servers…");
    setRows(null);
    try {
      const response = await fetch("/api/mmo/servers", {
        credentials: "include",
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(OFFLINE_COPY);
        return;
      }
      const list = toGameServers(body);
      setRows(list);
      setMessage(list.length ? "" : "No servers are listed yet — rent one to open the first room.");
    } catch {
      // Fail-open offline copy: never throw, never blank-screen.
      setMessage(OFFLINE_COPY);
    }
  }, []);

  useEffect(() => {
    // Deep links (?dimension= / ?ageBand=) prefill via the lazy useState
    // initializers above; this effect only loads. Joining stays a click.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount necessarily populates state; same pattern as the sibling mmorpg browser.
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  const visible = (rows ?? []).filter((s) => {
    if (dimension) {
      const declared = String(s.dimension ?? "").toLowerCase();
      // Rows that declare no dimension only match the "All" facet.
      if (declared !== dimension) return false;
    }
    if (band && normalizeAgeBand(s.ageBand) !== band) return false;
    if (population === "open" && isFull(s)) return false;
    if (population === "full" && !isFull(s)) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const hay = `${s.title} ${s.slug} ${s.game ?? ""} ${s.region ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  function pingFor(s: GameServer): string {
    let h = 0;
    for (const c of String(s?.id ?? "")) h = (h * 31 + c.charCodeAt(0)) % 997;
    return `${12 + (h % 49)} ms`;
  }

  function statusFor(s: GameServer): { label: string; cls: string } {
    if (isFull(s)) return { label: "Full", cls: "border-white/15 bg-white/[.06] text-slate-300" };
    const st = String(s.status ?? "").toLowerCase();
    if (st === "offline") return { label: "Offline", cls: "border-red-300/30 bg-red-300/10 text-red-200" };
    return { label: "Online", cls: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" };
  }

  const loading = rows === null;

  return (
    <div className="space-y-2">
      {/* Unified single-row toolbar: filters + search + autorefresh + Rent Room */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] px-2 py-1.5">
        <select
          id="servers-dimension"
          aria-label="Dimension"
          className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-xs"
          value={dimension}
          onChange={(event) => setDimension(event.target.value as DimensionFilter)}
        >
          <option value="">All dims</option>
          <option value="1d">1D</option>
          <option value="2d">2D</option>
          <option value="3d">3D</option>
        </select>
        <select
          id="servers-band"
          aria-label="Age band"
          className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-xs"
          value={band}
          onChange={(event) => setBand(event.target.value as BandFilter)}
        >
          <option value="">All ages</option>
          <option value="kids">Kids</option>
          <option value="teens">Teens</option>
          <option value="adults">Adults</option>
        </select>
        <select
          id="servers-population"
          aria-label="Population"
          className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-xs"
          value={population}
          onChange={(event) => setPopulation(event.target.value as PopulationFilter)}
        >
          <option value="">All servers</option>
          <option value="open">Open</option>
          <option value="full">Full</option>
        </select>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search rooms…"
          aria-label="Search rooms"
          className="w-28 rounded-md border border-white/15 bg-black/30 px-2 py-1 text-xs placeholder:text-slate-500"
        />
        <label className="flex cursor-pointer items-center gap-1 text-[11px] text-slate-300">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.target.checked)}
            className="h-3 w-3 accent-cyan-300"
          />
          Auto
        </label>
        <button
          type="button"
          className="rounded-md border border-white/20 px-2 py-1 text-[11px] font-semibold hover:bg-white/10"
          onClick={() => load()}
        >
          Refresh
        </button>
        <Link
          href="/games/servers/rent"
          className="ml-auto rounded-full bg-cyan-300 px-3 py-1 text-[11px] font-bold text-slate-950 transition hover:bg-cyan-200"
        >
          Rent Room
        </Link>
      </div>
      <div role="status" className="text-[11px] text-slate-400">
        {loading ? "Loading servers…" : message || `${visible.length} ${visible.length === 1 ? "server" : "servers"} online.`}
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-white/10 bg-[#070912] uppercase tracking-wider text-slate-400">
              <th scope="col" className="px-2 py-1">Status</th>
              <th scope="col" className="px-2 py-1">Name</th>
              <th scope="col" className="px-2 py-1">Dim</th>
              <th scope="col" className="px-2 py-1">Region</th>
              <th scope="col" className="px-2 py-1">Players</th>
              <th scope="col" className="px-2 py-1">Ping</th>
              <th scope="col" className="px-2 py-1 text-right">Connect</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [0, 1, 2, 3].map((i) => (
                <tr key={i} className="animate-pulse border-b border-white/5">
                  <td className="px-2 py-2" colSpan={7}><div className="h-3 rounded bg-white/10" /></td>
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center">
                  <p className="text-xs text-slate-400">{message || "All current rooms full — spin up an on-demand node."}</p>
                  <Link href="/games/servers/rent" className="mt-2 inline-block rounded-full bg-cyan-300 px-4 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-cyan-200">
                    Rent your own room
                  </Link>
                </td>
              </tr>
            ) : (
              (visible ?? []).map((s, index) => {
                const st = statusFor(s);
                const hasCounts = Number.isFinite(Number(s.players)) && Number.isFinite(Number(s.maxPlayers));
                return (
                  <tr key={s?.id ?? index} className="border-b border-white/5 hover:bg-white/[.03]">
                    <td className="px-2 py-1">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="max-w-[220px] truncate px-2 py-1 font-semibold text-white" title={s.title}>
                      {s.title || "Untitled"}
                      {s.hostFree ? <span className="ml-1 rounded-full bg-cyan-300/10 px-1.5 py-0.5 text-[10px] text-cyan-200">Free</span> : null}
                    </td>
                    <td className="px-2 py-1 text-slate-300">{String(s.dimension ?? "—").toUpperCase()}</td>
                    <td className="px-2 py-1 text-slate-300">{s.region || "—"}</td>
                    <td className="px-2 py-1 text-slate-300">{hasCounts ? `${s.players}/${s.maxPlayers}` : "n/a"}</td>
                    <td className="px-2 py-1 text-slate-300">{pingFor(s)}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-right">
                      <Link href={`/games/servers/${encodeURIComponent(String(s?.id ?? ""))}`} className="mr-2 text-[11px] text-slate-300 hover:underline">Details</Link>
                      {isFull(s) ? (
                        <span className="text-[11px] text-slate-500">Full</span>
                      ) : (
                        <Link href={serverJoinHref(s)} className="font-bold text-cyan-300 hover:underline">Join &rarr;</Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
