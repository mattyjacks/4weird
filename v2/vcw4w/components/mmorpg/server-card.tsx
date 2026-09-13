"use client";

import Link from "next/link";
import { AgeBadge } from "./age-badge";

export type MmoServer = {
  id: string;
  slug: string;
  title: string;
  game?: string;
  dimension?: "1d" | "2d" | "3d" | string;
  ageBand?: unknown;
  players?: number;
  maxPlayers?: number;
  coinPerMin?: number;
  hostFree?: boolean;
};

function esc(value: unknown): string {
  return String(value ?? "");
}

function joinHref(server: MmoServer): string {
  const slug = /^[a-z0-9-]{1,64}$/.test(server.slug) ? server.slug : "platform-wars";
  return `/games/${slug}?server=${encodeURIComponent(server.id)}&mmo=1`;
}

/**
 * ServerCard — SSR-safe presentational row for one MMORPG server.
 * Pure render: no fetch, no browser-only APIs, safe to render from cache.
 */
export function ServerCard({ server }: { server: MmoServer }) {
  const players = Number(server.players);
  const max = Number(server.maxPlayers);
  const hasCounts = Number.isFinite(players) && Number.isFinite(max) && max > 0;
  const full = hasCounts && players >= max;
  const coin = Number(server.coinPerMin);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-4">
      <span className="min-w-0">
        <b className="block truncate">{esc(server.title) || "Untitled server"}</b>
        <small className="text-slate-400">
          {esc(server.game) || esc(server.slug)}
          {server.dimension ? ` · ${esc(server.dimension)}` : ""}
          {hasCounts ? ` · ${players}/${max} players` : " · players n/a"}
          {Number.isFinite(coin) ? ` · ${coin} coin/min` : ""}
        </small>
        <span className="mt-2 flex flex-wrap gap-2">
          <AgeBadge band={server.ageBand} />
          {server.hostFree ? (
            <span className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-200">
              Host-free
            </span>
          ) : null}
          {full ? (
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[.06] px-2.5 py-0.5 text-xs font-semibold text-slate-300">
              Full
            </span>
          ) : null}
        </span>
      </span>
      <span>
        {full ? (
          <span className="inline-block cursor-not-allowed rounded-lg border border-white/15 px-4 py-2 font-semibold text-slate-400">
            Full
          </span>
        ) : (
          <Link
            href={joinHref(server)}
            className="inline-block rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-200"
          >
            Join
          </Link>
        )}
      </span>
    </li>
  );
}
