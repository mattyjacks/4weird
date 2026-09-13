"use client";

import Link from "next/link";
import { AgeBandBadge } from "./age-band-badge";
import {
  ageGateHint,
  canEnterServer,
  formatCostPerMin,
  perPlayerCostPerMin,
  serverJoinHref,
  type MmorpgAgeBand,
  type MmorpgServer,
} from "./mmorpg-age";

const GAME_LABEL: Record<MmorpgServer["game"], string> = {
  "1d": "1D",
  "2d": "2D",
  "3d": "3D",
  "4d": "Dream Golf 4D",
  "5d": "Multiverse 5D",
};

/**
 * ServerCard; one MMORPG server row: population, per-player cost, age gate, Join.
 * SSR-safe (pure render, no browser APIs) and fail-open (bad numbers render 0/Free).
 * No secrets, no fetches — all data arrives via props.
 */
export function ServerCard({
  server,
  userBand,
}: {
  server: MmorpgServer;
  userBand?: MmorpgAgeBand | null;
}) {
  const players = Number.isFinite(Number(server?.players)) ? Math.max(0, Math.floor(Number(server.players))) : 0;
  const maxPlayers =
    Number.isFinite(Number(server?.maxPlayers)) && Number(server.maxPlayers) > 0
      ? Math.floor(Number(server.maxPlayers))
      : 0;
  const full = maxPlayers > 0 && players >= maxPlayers;
  const perPlayer = perPlayerCostPerMin(server);
  const allowed = userBand ? canEnterServer(userBand, server?.ageBand) : true;
  const joinable = allowed && !full;
  const hint = ageGateHint(server?.ageBand);
  const gameLabel = server && (server.game === "1d" || server.game === "2d" || server.game === "3d" || server.game === "4d" || server.game === "5d")
    ? GAME_LABEL[server.game]
    : "2D";

  return (
    <article
      data-testid="mmorpg-server-card"
      data-server-id={server?.id ?? ""}
      className="rounded-2xl border border-white/10 bg-white/[.03] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-white">{server?.name || "Untitled server"}</h3>
        <AgeBandBadge band={server?.ageBand} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500">Game</dt>
          <dd className="font-semibold text-slate-200">{gameLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Players</dt>
          <dd className="font-semibold text-slate-200">
            {players}
            {maxPlayers > 0 ? ` / ${maxPlayers}` : ""}
            {full ? " (full)" : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Per player</dt>
          <dd className="font-semibold text-slate-200">{formatCostPerMin(perPlayer, perPlayer <= 0)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Host rental</dt>
          <dd className="font-semibold text-slate-200">
            {server?.hostFree
              ? "Host free"
              : `${Number(server?.rentalFeePerHour) > 0 ? Number(server.rentalFeePerHour) : 0} coins/hr`}
          </dd>
        </div>
      </dl>

      <p className="mt-2 text-xs text-slate-500" data-testid="age-gate-hint">
        {hint}
      </p>
      {!allowed && userBand ? (
        <p role="note" className="mt-1 text-xs text-amber-200">
          Your {userBand} account cannot enter this {server?.ageBand} server.
        </p>
      ) : null}

      {joinable ? (
        <Link
          href={serverJoinHref(server)}
          className="mt-3 inline-block rounded-full bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200"
        >
          Join
        </Link>
      ) : (
        <span
          aria-disabled="true"
          title={full ? "Server is full" : "Blocked by the adults > teens > kids entry rule"}
          className="mt-3 inline-block cursor-not-allowed rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-slate-500"
        >
          {full ? "Full" : "Locked"}
        </span>
      )}
    </article>
  );
}
