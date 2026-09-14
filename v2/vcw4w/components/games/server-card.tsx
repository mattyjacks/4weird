"use client";

import Link from "next/link";

export type ServerDimension = "1d" | "2d" | "3d";

/** Server age bands mirror lib/mmo-age.ts + the sibling mmorpg AgeBadge. */
export type ServerAgeBand = "kids" | "teens" | "adults";

/**
 * GameServer — one rentable/joinable multiplayer server row.
 *
 * Core fields are intentionally identical to the sibling
 * `components/mmorpg/server-card.tsx` MmoServer shape (id, slug, title,
 * game, dimension, ageBand, players, maxPlayers, coinPerMin, hostFree) so
 * either tree can render the other's rows; the extras below (region,
 * status, size) only ever add optional detail.
 */
export type GameServer = {
  id: string;
  slug: string;
  title: string;
  game?: string;
  dimension?: ServerDimension | string;
  ageBand?: unknown;
  players?: number;
  maxPlayers?: number;
  coinPerMin?: number;
  hostFree?: boolean;
  region?: string;
  status?: string;
};

/** Raw row shape served by GET /api/mmo/servers (live lobby rows). */
export type ServersApiRow = {
  id?: unknown;
  game?: unknown;
  name?: unknown;
  slug?: unknown;
  title?: unknown;
  dimension?: unknown;
  ageBand?: unknown;
  age_band?: unknown;
  players?: unknown;
  maxPlayers?: unknown;
  max_players?: unknown;
  costPerMin?: unknown;
  coinPerMin?: unknown;
  hostFree?: unknown;
  host_free?: unknown;
  region?: unknown;
  status?: unknown;
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Normalize one API row into a GameServer. Fail-open: rows without a
 * usable id are dropped (null); every other field degrades to undefined
 * instead of throwing, so schema drift never breaks the list.
 */
export function toGameServer(row: unknown): GameServer | null {
  if (!row || typeof row !== "object") return null;
  const r = row as ServersApiRow;
  const id = text(r.id).trim();
  if (!id) return null;
  const game = text(r.game).trim() || text(r.slug).trim();
  const slug = text(r.slug).trim() || game || "platform-wars";
  const title = text(r.title).trim() || text(r.name).trim() || slug;
  const players = num(r.players);
  const maxPlayers = num(r.maxPlayers) ?? num(r.max_players);
  const coinPerMin = num(r.coinPerMin) ?? num(r.costPerMin);
  return {
    id,
    slug,
    title,
    game: game || undefined,
    dimension: text(r.dimension).trim() || undefined,
    ageBand: r.ageBand ?? r.age_band ?? undefined,
    players,
    maxPlayers,
    coinPerMin,
    hostFree: r.hostFree === true || r.host_free === true || undefined,
    region: text(r.region).trim() || undefined,
    status: text(r.status).trim() || undefined,
  };
}

/** Normalize a list body ({servers: [...]} or bare array) into rows. */
export function toGameServers(body: unknown): GameServer[] {
  const raw: unknown[] = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { servers?: unknown }).servers)
      ? ((body as { servers: unknown[] }).servers as unknown[])
      : [];
  const out: GameServer[] = [];
  for (const row of raw) {
    const server = toGameServer(row);
    if (server) out.push(server);
  }
  return out;
}

export function normalizeAgeBand(value: unknown): ServerAgeBand | null {
  if (value === "kids" || value === "teens" || value === "adults") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "kids" || v === "kid" || v === "everyone") return "kids";
    if (v === "teens" || v === "teen" || v === "13+") return "teens";
    if (v === "adults" || v === "adult" || v === "18+") return "adults";
  }
  return null;
}

const AGE_STYLES: Record<ServerAgeBand, string> = {
  kids: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  teens: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  adults: "border-rose-300/30 bg-rose-300/10 text-rose-200",
};

const AGE_LABELS: Record<ServerAgeBand, string> = {
  kids: "Kids",
  teens: "Teens 13+",
  adults: "Adults 18+",
};

/** ServerAgeBadge — same contract as the sibling mmorpg AgeBadge. */
export function ServerAgeBadge({ band }: { band: unknown }) {
  const normalized = normalizeAgeBand(band);
  if (!normalized) {
    return (
      <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[.06] px-2.5 py-0.5 text-xs font-semibold text-slate-300">
        All ages
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${AGE_STYLES[normalized]}`}
    >
      {AGE_LABELS[normalized]}
    </span>
  );
}

/** Free-play badge — shown when the host covers the room (hostFree). */
export function FreePlayBadge() {
  return (
    <span
      title="The host covers this room — guests play free while the host meter runs."
      className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-200"
    >
      Free play
    </span>
  );
}

const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;

/** Join link — same shape as the sibling tree: /games/<slug>?server=<id>&mmo=1 */
export function serverJoinHref(server: Pick<GameServer, "id" | "slug">): string {
  const slug = SLUG_PATTERN.test(server.slug) ? server.slug : "platform-wars";
  return `/games/${slug}?server=${encodeURIComponent(server.id)}&mmo=1`;
}

/**
 * ServerCard — SSR-safe presentational row for one game server.
 * Pure render: no fetch, no browser-only APIs, safe to render from cache.
 */
export function ServerCard({ server }: { server: GameServer }) {
  const players = Number(server.players);
  const max = Number(server.maxPlayers);
  const hasCounts = Number.isFinite(players) && Number.isFinite(max) && max > 0;
  const full = hasCounts && players >= max;
  const coin = Number(server.coinPerMin);
  const hasQuote = Number.isFinite(coin) && coin >= 0;

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <span className="w-full min-w-0 sm:w-auto sm:min-w-0 sm:flex-1">
        <b className="block truncate">{server.title || "Untitled server"}</b>
        <small className="text-slate-400">
          {server.game || server.slug}
          {server.dimension ? ` · ${server.dimension}` : ""}
          {server.region ? ` · ${server.region}` : ""}
          {hasCounts ? ` · ${players}/${max} players` : " · players n/a"}
          {hasQuote ? ` · ${coin} coin/min` : ""}
        </small>
        <span className="mt-2 flex flex-wrap gap-2">
          <ServerAgeBadge band={server.ageBand} />
          {server.hostFree ? <FreePlayBadge /> : null}
          {full ? (
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[.06] px-2.5 py-0.5 text-xs font-semibold text-slate-300">
              Full
            </span>
          ) : null}
        </span>
      </span>
      <span className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <Link
          href={`/games/servers/${encodeURIComponent(server.id)}`}
          className="flex min-h-[44px] w-full items-center justify-center whitespace-nowrap rounded-lg border border-white/20 px-4 py-3 text-base font-semibold text-slate-200 hover:bg-white/10 sm:w-auto"
        >
          Details
        </Link>
        {full ? (
          <span className="flex min-h-[44px] w-full cursor-not-allowed items-center justify-center whitespace-nowrap rounded-lg border border-white/15 px-4 py-3 text-base font-semibold text-slate-400 sm:w-auto">
            Full
          </span>
        ) : (
          <Link
            href={serverJoinHref(server)}
            className="flex min-h-[44px] w-full items-center justify-center whitespace-nowrap rounded-lg bg-cyan-300 px-4 py-3 text-base font-semibold text-slate-950 hover:bg-cyan-200 sm:w-auto"
          >
            Join
          </Link>
        )}
      </span>
    </li>
  );
}
