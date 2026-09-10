"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Lobby = {
  id: string;
  title?: string;
  game_slug?: string;
  host_handle?: string;
  visibility?: string;
  relay_ping_ms?: number;
  match_id?: string;
  lobby_id?: string;
  join_code?: string | null;
};

function esc(value: unknown): string {
  return String(value ?? "");
}

export function LobbiesBrowser() {
  const router = useRouter();
  const [game, setGame] = useState("");
  const [rows, setRows] = useState<Lobby[] | null>(null);
  const [message, setMessage] = useState("Loading open lobbies…");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (gameSlug: string) => {
    setMessage("Loading open lobbies…");
    setRows(null);
    try {
      const response = await fetch(`/api/lobbies?all=1${gameSlug ? `&game=${encodeURIComponent(gameSlug)}` : ""}`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setMessage("Sign in to browse and join lobbies.");
        return;
      }
      if (!response.ok || body.success === false) {
        setMessage(String(body.error ?? "Unable to load lobbies."));
        return;
      }
      const list = (Array.isArray(body.lobbies) ? body.lobbies : []) as Lobby[];
      list.sort((a, b) => (a.relay_ping_ms ?? 999) - (b.relay_ping_ms ?? 999));
      setRows(list);
      setMessage(list.length ? "" : "No open lobbies match this filter.");
    } catch {
      setMessage("Unable to load lobbies.");
    }
  }, []);

  const join = useCallback(
    async (id: string, code = "") => {
      setBusyId(id);
      try {
        const attempt = async (joinCode: string) => {
          const response = await fetch(`/api/lobbies/${id}/join`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ join_code: joinCode }),
          });
          return (await response.json().catch(() => ({}))) as Lobby & { success?: boolean; error?: string };
        };
        let result = await attempt(code);
        if (!result.success && /code|invite/i.test(String(result.error ?? ""))) {
          const retry = window.prompt("This room needs an invite code:", code);
          if (retry === null) return;
          result = await attempt(retry.trim().toUpperCase());
        }
        if (!result.success) {
          alert(String(result.error ?? "Unable to join."));
          return;
        }
        const slug = /^[a-z0-9-]{1,64}$/.test(String(result.game_slug ?? "")) ? String(result.game_slug) : "platform-wars";
        const match = esc(result.match_id);
        alert("Joined! Opening the game…");
        router.push(match ? `/games/${slug}/play?match=${encodeURIComponent(match)}` : `/games/${slug}/play`);
      } finally {
        setBusyId(null);
      }
    },
    [router],
  );

  useEffect(() => {
    // Never auto-join from ?join= on page load: a crafted link would force a
    // signed-in visitor into an attacker's lobby without a user gesture.
    // Deep links prefill the filter instead; joining stays a button click.
    const q = new URLSearchParams(window.location.search);
    const hint = q.get("game") ?? "";
    if (/^[a-z0-9-]{1,64}$/.test(hint)) setGame(hint);
    void load(/^[a-z0-9-]{1,64}$/.test(hint) ? hint : game);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <label className="block text-sm text-slate-400" htmlFor="lobby-game">
          Game
        </label>
        <div className="mt-2 flex gap-3">
          <select
            id="lobby-game"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2"
            value={game}
            onChange={(event) => {
              setGame(event.target.value);
              void load(event.target.value);
            }}
          >
            <option value="">All games</option>
            <option value="platform-wars">Platform Wars: Phone vs Desktop</option>
          </select>
          <button
            type="button"
            className="rounded-lg border border-white/20 px-4 py-2"
            onClick={() => load(game)}
          >
            Refresh
          </button>
        </div>
      </div>
      <div role="status" className="text-sm text-slate-400">
        {message || `${rows?.length ?? 0} open ${rows?.length === 1 ? "lobby" : "lobbies"} · sorted by relay ping, lowest first.`}
      </div>
      {!message && (
        <ul className="space-y-3">
          {(rows ?? []).map((lobby) => (
            <li
              key={lobby.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-4"
            >
              <span>
                <b>{esc(lobby.title) || "Lobby"}</b>
                <br />
                <small className="text-slate-400">
                  {esc(lobby.game_slug)} · @{esc(lobby.host_handle) || "player"} · {esc(lobby.visibility)}
                </small>
              </span>
              <span className="flex items-center gap-3">
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300">
                  {Number(lobby.relay_ping_ms) || 999} ms relay
                </span>
                <button
                  type="button"
                  disabled={busyId === lobby.id}
                  className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
                  onClick={() => join(lobby.id)}
                >
                  {busyId === lobby.id ? "Joining…" : "Join"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {message === "Sign in to browse and join lobbies." && (
        <a className="inline-block rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950" href="/auth/login?next=/lobbies">
          Sign in
        </a>
      )}
    </div>
  );
}
