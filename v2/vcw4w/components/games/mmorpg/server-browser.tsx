"use client";

import { useMemo, useState } from "react";
import { ServerCard } from "./server-card";
import { toSafeServerList, type MmorpgAgeBand, type MmorpgGameKind, type MmorpgServer } from "./mmorpg-age";

export type MmorpgGameFilter = MmorpgGameKind | "all";
export type MmorpgAgeFilter = MmorpgAgeBand | "all";

/**
 * ServerBrowser; filterable MMORPG server list.
 * - Filters: game kind (1d | 2d | 3d) + age band (kids | teens | adults).
 * - Fail-open: non-array `servers` renders the empty state, never throws.
 * - SSR-safe: `useState`/`useMemo` only; no window/document/fetch at render.
 * - No secrets: Join links are plain /games/<slug>?mmorpg=<id> anchors.
 */
export function ServerBrowser({
  servers,
  initialGame = "all",
  initialAgeBand = "all",
  userBand = null,
}: {
  servers?: MmorpgServer[] | null;
  initialGame?: MmorpgGameFilter;
  initialAgeBand?: MmorpgAgeFilter;
  userBand?: MmorpgAgeBand | null;
}) {
  const [game, setGame] = useState<MmorpgGameFilter>(initialGame);
  const [ageBand, setAgeBand] = useState<MmorpgAgeFilter>(initialAgeBand);

  const safeServers = useMemo(() => toSafeServerList(servers), [servers]);

  const visible = useMemo(
    () =>
      safeServers.filter((s) => {
        if (!s || typeof s !== "object") return false;
        if (game !== "all" && s.game !== game) return false;
        if (ageBand !== "all" && s.ageBand !== ageBand) return false;
        return true;
      }),
    [safeServers, game, ageBand],
  );

  return (
    <section data-testid="mmorpg-server-browser" className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <label className="text-sm text-slate-300">
          Game{" "}
          <select
            value={game}
            onChange={(e) => setGame(e.target.value as MmorpgGameFilter)}
            className="ml-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2"
            aria-label="Filter by game"
          >
            <option value="all">All games</option>
            <option value="1d">1D</option>
            <option value="2d">2D</option>
            <option value="3d">3D</option>
          </select>
        </label>
        <label className="text-sm text-slate-300">
          Age band{" "}
          <select
            value={ageBand}
            onChange={(e) => setAgeBand(e.target.value as MmorpgAgeFilter)}
            className="ml-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2"
            aria-label="Filter by age band"
          >
            <option value="all">All ages</option>
            <option value="kids">Kids</option>
            <option value="teens">Teens 13+</option>
            <option value="adults">Adults 18+</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-slate-500">
        Entry rule: adults &gt; teens &gt; kids — adults may enter any server, teens may enter teens and kids
        servers, kids may enter kids servers only.
      </p>

      {visible.length === 0 ? (
        <p role="status" className="text-sm text-slate-400">
          No servers match these filters yet — try All games / All ages.
        </p>
      ) : (
        <div className="grid gap-3">
          {visible.map((server, index) => (
            <ServerCard key={server?.id ?? `mmorpg-${index}`} server={server} userBand={userBand} />
          ))}
        </div>
      )}
    </section>
  );
}
