"use client";

import { useCallback, useEffect, useState } from "react";
import { ServerCard, type MmoServer } from "./server-card";

type DimensionFilter = "" | "1d" | "2d" | "3d" | "4d" | "5d";

const OFFLINE_COPY =
  "You're offline or the server list didn't load. Showing an empty lobby — check your connection and hit Refresh. Your game progress is safe.";

function toServers(body: unknown): MmoServer[] {
  if (Array.isArray(body)) return body as MmoServer[];
  if (body && typeof body === "object") {
    const rec = body as Record<string, unknown>;
    if (Array.isArray(rec.servers)) return rec.servers as MmoServer[];
  }
  return [];
}

/**
 * ServerBrowser - client list: dimension filter (1d/2d/3d/4d/5d), age-band badges,
 * players/max, coin/min quote, host-free badge, join links.
 * SSR-safe (renders loading state on server) and fail-open offline: a failed
 * GET /api/mmorpg/servers shows OFFLINE_COPY instead of throwing.
 */
function initialDimension(): DimensionFilter {
  if (typeof window === "undefined") return "";
  const hint = new URLSearchParams(window.location.search).get("dimension")?.toLowerCase() ?? "";
  return hint === "1d" || hint === "2d" || hint === "3d" || hint === "4d" || hint === "5d" ? hint : "";
}

export function ServerBrowser() {
  const [dimension, setDimension] = useState<DimensionFilter>(initialDimension);
  const [rows, setRows] = useState<MmoServer[] | null>(null);
  const [message, setMessage] = useState("Loading servers…");

  const load = useCallback(async (dim: DimensionFilter) => {
    setMessage("Loading servers…");
    setRows(null);
    try {
      const qs = dim ? `?dimension=${encodeURIComponent(dim)}` : "";
      const response = await fetch(`/api/mmorpg/servers${qs}`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(OFFLINE_COPY);
        return;
      }
      const list = toServers(body).filter((s) => s && typeof s.id === "string" && typeof s.slug === "string");
      setRows(list);
      setMessage(list.length ? "" : "No servers match this filter yet.");
    } catch {
      // Fail-open offline copy: never throw, never blank-screen.
      setMessage(OFFLINE_COPY);
    }
  }, []);

  useEffect(() => {
    // Deep links prefill the filter via the lazy useState initializer above;
    // this effect only loads. Joining stays a button click (never auto-join).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount necessarily populates state; same pattern as lobbies-browser.
    void load(initialDimension());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = (rows ?? []).filter((s) =>
    dimension ? String(s.dimension ?? "").toLowerCase() === dimension : true,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <label className="block text-sm text-slate-400" htmlFor="mmo-dimension">
          Game filter
        </label>
        <div className="mt-2 flex gap-3">
          <select
            id="mmo-dimension"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2"
            value={dimension}
            onChange={(event) => {
              const next = event.target.value as DimensionFilter;
              setDimension(next);
              void load(next);
            }}
          >
            <option value="">All dimensions</option>
            <option value="1d">1D games</option>
            <option value="2d">2D games</option>
            <option value="3d">3D games</option>
            <option value="4d">4D games</option>
            <option value="5d">5D games</option>
          </select>
          <button
            type="button"
            className="rounded-lg border border-white/20 px-4 py-2"
            onClick={() => load(dimension)}
          >
            Refresh
          </button>
        </div>
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
