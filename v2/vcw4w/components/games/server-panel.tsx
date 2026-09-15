"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ServerAgeBadge,
  FreePlayBadge,
  serverJoinHref,
  toGameServer,
  type GameServer,
} from "./server-card";
import { ServerQuote } from "./server-quote";

/**
 * ServerPanel — presentational detail for one game server: title, game,
 * region, population, age band, free-play badge, live quote, join CTA.
 * Pure render: no fetch, no browser-only APIs, safe to render from cache.
 */
export function ServerPanel({ server }: { server: GameServer }) {
  const players = Number(server.players);
  const max = Number(server.maxPlayers);
  const hasCounts = Number.isFinite(players) && Number.isFinite(max) && max > 0;
  const full = hasCounts && players >= max;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <p className="text-sm text-slate-400">
          <Link href="/games/servers" className="font-semibold text-cyan-300 hover:underline">
            ← All servers
          </Link>
          {server.game ? (
            <>
              {" · "}
              <Link href={`/games/${encodeURIComponent(server.game)}`} className="hover:underline">
                {server.game}
              </Link>
            </>
          ) : null}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{server.title}</h1>
        <p className="mt-2 text-slate-300">
          {server.game || server.slug}
          {server.dimension ? ` · ${server.dimension}` : ""}
          {server.region ? ` · ${server.region}` : ""}
          {hasCounts ? ` · ${players}/${max} players` : " · players n/a"}
          {server.status ? ` · ${server.status}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ServerAgeBadge band={server.ageBand} />
          {server.hostFree ? <FreePlayBadge /> : null}
          {full ? (
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[.06] px-2.5 py-0.5 text-xs font-semibold text-slate-300">
              Full
            </span>
          ) : null}
        </div>
        <div className="mt-5">
          {full ? (
            <span className="inline-block cursor-not-allowed rounded-full border border-white/15 px-7 py-3 font-bold text-slate-400">
              Room is full
            </span>
          ) : (
            <Link
              href={serverJoinHref(server)}
              className="inline-block rounded-full bg-cyan-300 px-7 py-3 font-bold text-slate-950 hover:bg-cyan-200"
            >
              Join this room
            </Link>
          )}
        </div>
      </div>
      <ServerQuote
        serverId={server.id}
        coinPerMin={typeof server.coinPerMin === "number" ? server.coinPerMin : null}
        hostFree={server.hostFree}
      />
    </div>
  );
}

const OFFLINE_COPY =
  "This room didn't load — you're offline or the lobby API is down. Check your connection and hit Refresh. No coins moved.";

/**
 * ServerDetail — client loader for /games/servers/[id]: fetches the list
 * once, picks the matching row, and renders ServerPanel. Fail-open: an
 * unknown id or failed fetch shows OFFLINE_COPY instead of throwing.
 */
export function ServerDetail({ id }: { id: string }) {
  const [server, setServer] = useState<GameServer | null>(null);
  const [message, setMessage] = useState("Loading room…");

  async function load() {
    setMessage("Loading room…");
    setServer(null);
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
      const rec = (body as { servers?: unknown }).servers;
      const rows = Array.isArray(rec) ? rec : [];
      const match = (Array.isArray(rows) ? rows : []).map((row) => toGameServer(row)).find((s) => s && String(s?.id ?? "") === String(id ?? "")) ?? null;
      if (!match) {
        setMessage("No room with that id is listed right now. It may have closed — pick another from the browser.");
        return;
      }
      setServer(match);
      setMessage("");
    } catch {
      setMessage(OFFLINE_COPY);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount necessarily populates state.
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (message) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <p role="status" className="text-sm text-slate-300">{message}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => load()}
            className="rounded-lg border border-white/20 px-4 py-2 font-semibold"
          >
            Refresh
          </button>
          <Link
            href="/games/servers"
            className="rounded-lg border border-white/20 px-4 py-2 font-semibold text-slate-200 hover:bg-white/10"
          >
            All servers
          </Link>
        </div>
      </div>
    );
  }
  if (!server) return null;
  return <ServerPanel server={server} />;
}
