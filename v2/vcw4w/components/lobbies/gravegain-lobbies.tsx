"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const GAMES = [
  { slug: "gravegain1d", label: "Ley-Line Race" },
  { slug: "gravegain2d", label: "Dungeon Duel" },
  { slug: "gravegain3d", label: "Spire Siege" },
] as const;

type OpenLobby = {
  id: string;
  game_slug?: string;
  title?: string;
  host_handle?: string;
  host_platform?: string;
  visibility?: string;
  created_at?: string;
};

type HostedLobby = {
  id: string;
  slug: string;
  joinCode: string | null;
  matchId: string | null;
};

function esc(value: unknown): string {
  return String(value ?? "");
}

function detectDevice(): "phone" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  return /mobi|android|iphone|ipad|phone/i.test(navigator.userAgent) ? "phone" : "desktop";
}

async function readBody(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function GraveGainLobbies() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [open, setOpen] = useState<Record<string, OpenLobby[]>>({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [creating, setCreating] = useState<string | null>(null);
  const [hosted, setHosted] = useState<HostedLobby | null>(null);
  const [joinId, setJoinId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinBusy, setJoinBusy] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotice("");
    try {
      const lists = await Promise.all(
        GAMES.map(async (game) => {
          const response = await fetch(`/api/lobbies?all=1&game=${encodeURIComponent(game.slug)}`, {
            credentials: "include",
            cache: "no-store",
          });
          if (response.status === 401) return { slug: game.slug, unauth: true as const, rows: [] as OpenLobby[] };
          const body = await readBody(response);
          if (!response.ok || body.success === false) {
            throw new Error(String(body.error ?? "Unable to load lobbies."));
          }
          const rows = (Array.isArray(body.lobbies) ? body.lobbies : []) as OpenLobby[];
          return { slug: game.slug, unauth: false as const, rows };
        }),
      );
      if (lists.some((l) => l.unauth)) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      setAuthed(true);
      const next: Record<string, OpenLobby[]> = {};
      for (const l of lists) next[l.slug] = l.rows;
      setOpen(next);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load lobbies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Host handoff: poll GET /api/lobbies/[id] until match_id appears, then
  // both sides open /games/<slug>/play?match=<uuid>.
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const pollHosted = useCallback(
    (lobbyId: string) => {
      stopPolling();
      const tick = async () => {
        const response = await fetch(`/api/lobbies/${encodeURIComponent(lobbyId)}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;
        const body = await readBody(response);
        const matchId = body.match_id;
        if (typeof matchId === "string" && matchId) {
          setHosted((prev) => (prev && prev.id === lobbyId ? { ...prev, matchId } : prev));
          stopPolling();
          void load();
        }
      };
      pollRef.current = setInterval(() => void tick(), 2500);
      void tick();
    },
    [load, stopPolling],
  );

  const create = useCallback(
    async (slug: string) => {
      setCreating(slug);
      setNotice("");
      try {
        const response = await fetch("/api/lobbies", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_slug: slug,
            platform: detectDevice(),
            visibility,
            title: "",
          }),
        });
        const body = await readBody(response);
        if (response.status === 401) {
          setAuthed(false);
          return;
        }
        if (!response.ok || body.success === false) {
          setNotice(String(body.error ?? "Unable to create lobby."));
          return;
        }
        const id = String(body.lobby_id ?? "");
        if (!/^[0-9a-f-]{36}$/i.test(id)) {
          setNotice("Lobby created but the response was unreadable. Refresh the list.");
          return;
        }
        setHosted({ id, slug, joinCode: typeof body.join_code === "string" ? body.join_code : null, matchId: null });
        pollHosted(id);
        void load();
      } catch {
        setNotice("Unable to create lobby.");
      } finally {
        setCreating(null);
      }
    },
    [load, pollHosted, visibility],
  );

  const join = useCallback(async (id: string, code = "") => {
    setJoinBusy(id || "code");
    try {
      const response = await fetch(`/api/lobbies/${encodeURIComponent(id)}/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ join_code: code.trim().toUpperCase() }),
      });
      const body = await readBody(response);
      if (!response.ok || body.success === false) {
        alert(String(body.error ?? "Unable to join."));
        return;
      }
      const slug = /^[a-z0-9-]{1,64}$/.test(String(body.game_slug ?? "")) ? String(body.game_slug) : "gravegain2d";
      const match = String(body.match_id ?? "");
      window.location.href = match ? `/games/${slug}/play?match=${encodeURIComponent(match)}` : `/games/${slug}/play`;
    } finally {
      setJoinBusy(null);
      void load();
    }
  }, [load]);

  if (authed === false) {
    return (
      <section aria-label="GraveGain party" className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-2xl font-black">GraveGain party</h2>
        <p className="mt-2 text-sm text-slate-300">Sign in to create or join a GraveGain duel lobby.</p>
        <Link
          className="mt-4 inline-block rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950"
          href="/auth/login?next=/lobbies"
        >
          Sign in
        </Link>
      </section>
    );
  }

  const total = GAMES.reduce((n, game) => n + (open[game.slug]?.length ?? 0), 0);

  return (
    <section aria-label="GraveGain party" className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-2xl font-black">GraveGain party</h2>
        <p className="mt-2 text-sm text-slate-300">
          Create a duel lobby, share the code, and play when your guest joins. Host polls until the match is ready,
          then both sides open the game with the same match link.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          {GAMES.map((game) => (
            <button
              key={game.slug}
              type="button"
              disabled={creating !== null || authed !== true}
              className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
              onClick={() => void create(game.slug)}
            >
              {creating === game.slug ? "Creating..." : `Create ${game.label}`}
            </button>
          ))}
          <label className="ml-auto block text-xs text-slate-400">
            Room visibility
            <select
              className="mt-1 block rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
            >
              <option value="public">Public</option>
              <option value="friends">Friends</option>
              <option value="private">Private (code only)</option>
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-400">gravegain1d Ley-Line Race · gravegain2d Dungeon Duel · gravegain3d Spire Siege</p>
      </div>

      {hosted && (
        <div className="rounded-2xl border border-cyan-300/30 bg-cyan-300/[.06] p-6" role="status">
          <p className="font-bold text-white">Your lobby is open ({esc(hosted.slug)})</p>
          {hosted.joinCode && (
            <p className="mt-1 text-sm text-slate-200">
              Invite code: <b className="text-white">{esc(hosted.joinCode)}</b>
            </p>
          )}
          {hosted.matchId ? (
            <Link
              className="mt-3 inline-block rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950"
              href={`/games/${hosted.slug}/play?match=${encodeURIComponent(hosted.matchId)}`}
            >
              Play now
            </Link>
          ) : (
            <p className="mt-2 text-sm text-slate-300">Waiting for a guest... this refreshes automatically.</p>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h3 className="font-bold text-white">Join with a lobby ID</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            placeholder="Lobby ID (uuid)"
            value={joinId}
            onChange={(event) => setJoinId(event.target.value)}
          />
          <input
            className="w-36 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            placeholder="Code (if asked)"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
          />
          <button
            type="button"
            disabled={!/^[0-9a-f-]{36}$/i.test(joinId.trim()) || joinBusy !== null}
            className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            onClick={() => void join(joinId.trim(), joinCode)}
          >
            {joinBusy ? "Joining..." : "Join"}
          </button>
        </div>
      </div>

      <div role="status" className="text-sm text-slate-400">
        {loading ? "Loading GraveGain lobbies..." : notice || `${total} open GraveGain ${total === 1 ? "lobby" : "lobbies"}.`}
      </div>

      {!loading &&
        !notice &&
        GAMES.map((game) => (
          <div key={game.slug} className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
            <h3 className="font-bold text-white">
              {game.label} <span className="font-normal text-slate-400">({game.slug})</span>
            </h3>
            {(open[game.slug] ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No open lobbies. Create one above.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {(open[game.slug] ?? []).map((lobby) => (
                  <li
                    key={lobby.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
                  >
                    <span>
                      <b>{esc(lobby.title) || "Lobby"}</b>
                      <br />
                      <small className="text-slate-400">
                        @{esc(lobby.host_handle) || "player"} · {esc(lobby.visibility)}
                      </small>
                    </span>
                    <button
                      type="button"
                      disabled={joinBusy === lobby.id}
                      className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                      onClick={() => void join(lobby.id)}
                    >
                      {joinBusy === lobby.id ? "Joining..." : "Join"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

      <button
        type="button"
        className="rounded-lg border border-white/20 px-4 py-2 text-sm"
        onClick={() => void load()}
      >
        Refresh
      </button>
    </section>
  );
}
