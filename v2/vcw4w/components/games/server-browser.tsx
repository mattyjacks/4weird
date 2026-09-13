"use client";

import { useCallback, useEffect, useState } from "react";
import { ServerCard, normalizeAgeBand, toGameServers, type GameServer, type ServerAgeBand } from "./server-card";

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
 * and population filters over GET /api/mmorpg/servers, with live
 * per-minute quotes + free-play badges on every ServerCard.
 * SSR-safe (renders loading state on server) and fail-open offline: a
 * failed fetch shows OFFLINE_COPY instead of throwing. The dimension
 * facet only lists values the data actually declares; age-band filtering
 * is display-only here — join-time enforcement stays server-side
 * (DS-MMO-08 age-band entry + /api/mmorpg/gate).
 */
export function ServerBrowser() {
  const [dimension, setDimension] = useState<DimensionFilter>(initialDimension);
  const [band, setBand] = useState<BandFilter>(initialBand);
  const [population, setPopulation] = useState<PopulationFilter>("");
  const [rows, setRows] = useState<GameServer[] | null>(null);
  const [message, setMessage] = useState("Loading servers…");

  const load = useCallback(async () => {
    setMessage("Loading servers…");
    setRows(null);
    try {
      const response = await fetch("/api/mmorpg/servers", {
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

  const declaredDimensions = Array.from(
    new Set((rows ?? []).map((s) => String(s.dimension ?? "").toLowerCase()).filter((d) => d === "1d" || d === "2d" || d === "3d")),
  );

  const visible = (rows ?? []).filter((s) => {
    if (dimension) {
      const declared = String(s.dimension ?? "").toLowerCase();
      // Rows that declare no dimension only match the "All" facet.
      if (declared !== dimension) return false;
    }
    if (band && normalizeAgeBand(s.ageBand) !== band) return false;
    if (population === "open" && isFull(s)) return false;
    if (population === "full" && !isFull(s)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <span className="block">
            <label className="block text-sm text-slate-400" htmlFor="servers-dimension">
              Dimension
            </label>
            <select
              id="servers-dimension"
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
              value={dimension}
              onChange={(event) => setDimension(event.target.value as DimensionFilter)}
            >
              <option value="">All dimensions</option>
              {declaredDimensions.includes("1d") ? <option value="1d">1D games</option> : null}
              {declaredDimensions.includes("2d") ? <option value="2d">2D games</option> : null}
              {declaredDimensions.includes("3d") ? <option value="3d">3D games</option> : null}
              {declaredDimensions.length === 0 ? (
                <>
                  <option value="1d">1D games</option>
                  <option value="2d">2D games</option>
                  <option value="3d">3D games</option>
                </>
              ) : null}
            </select>
          </span>
          <span className="block">
            <label className="block text-sm text-slate-400" htmlFor="servers-band">
              Age band
            </label>
            <select
              id="servers-band"
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
              value={band}
              onChange={(event) => setBand(event.target.value as BandFilter)}
            >
              <option value="">All ages</option>
              <option value="kids">Kids (0-12)</option>
              <option value="teens">Teens (13-17)</option>
              <option value="adults">Adults (18+)</option>
            </select>
          </span>
          <span className="block">
            <label className="block text-sm text-slate-400" htmlFor="servers-population">
              Population
            </label>
            <select
              id="servers-population"
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
              value={population}
              onChange={(event) => setPopulation(event.target.value as PopulationFilter)}
            >
              <option value="">All servers</option>
              <option value="open">Open seats</option>
              <option value="full">Full</option>
            </select>
          </span>
        </div>
        <button
          type="button"
          className="mt-4 rounded-lg border border-white/20 px-4 py-2"
          onClick={() => load()}
        >
          Refresh
        </button>
      </div>
      <div role="status" className="text-sm text-slate-400">
        {message || `${visible.length} ${visible.length === 1 ? "server" : "servers"} online.`}
      </div>
      {!message && (
        <ul className="space-y-3">
          {visible.map((server) => (
            <ServerCard key={server.id} server={server} />
          ))}
        </ul>
      )}
    </div>
  );
}
