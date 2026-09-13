"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export const GRAVE_PARTY_SLUGS = ["gravegain1d", "gravegain2d", "gravegain3d"] as const;

type GraveSlug = (typeof GRAVE_PARTY_SLUGS)[number];

const MODE_COPY: Record<GraveSlug, { mode: string; blurb: string }> = {
  gravegain1d: {
    mode: "Ley-Line Race",
    blurb: "First courier to fell the sector-5 boss wins.",
  },
  gravegain2d: {
    mode: "Dungeon Duel",
    blurb: "5-minute kill and gold race.",
  },
  gravegain3d: {
    mode: "Spire Siege",
    blurb: "Floor race plus boss DPS.",
  },
};

function isGraveSlug(slug: string): slug is GraveSlug {
  return (GRAVE_PARTY_SLUGS as readonly string[]).includes(slug);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(value);
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(String((data as { error?: unknown }).error ?? `Request failed (${response.status})`));
    (err as { status?: number }).status = response.status;
    throw err;
  }
  return data as T;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "include", cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(String((data as { error?: unknown }).error ?? `Request failed (${response.status})`));
    (err as { status?: number }).status = response.status;
    throw err;
  }
  return data as T;
}

type SideState = Record<string, string | number | boolean | null>;

type MatchRow = {
  id?: string;
  match_id?: string;
  status?: string;
  phone_state?: SideState | null;
  desktop_state?: SideState | null;
  created_at?: string;
} & Record<string, unknown>;

type MpEvent = {
  id: string;
  user_id: string;
  kind: string;
  text: string;
  created_at: string;
};

function matchIdOf(row: MatchRow | null | undefined): string {
  const raw = String(row?.match_id ?? row?.id ?? "");
  return isUuid(raw) ? raw : "";
}

function coarsePlatform(): "phone" | "desktop" {
  try {
    if (typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches) return "phone";
  } catch {
    /* media query unavailable; default to desktop */
  }
  return "desktop";
}

const SIDE_KEYS = ["hp", "gold", "kills", "floor", "progress", "score", "alive"] as const;

function SideCard({ label, state }: { label: string; state: SideState | null | undefined }) {
  const rows = SIDE_KEYS.filter((k) => state != null && state[k] !== undefined && state[k] !== null);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.03] p-3">
      <p className="text-xs font-black tracking-widest text-cyan-300">{label}</p>
      {rows.length === 0 ? (
        <p className="mt-1 text-xs text-slate-400">No reported stats yet.</p>
      ) : (
        <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {rows.map((k) => (
            <div key={k} className="flex items-center justify-between gap-2">
              <dt className="text-slate-400">{k}</dt>
              <dd className="font-bold text-white">{String(state?.[k])}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function GraveGainPartyInner({ slug }: { slug: string }) {
  const router = useRouter();
  const matchParam = useSearchParams().get("match");
  const matchId = isUuid(String(matchParam ?? "")) ? String(matchParam) : "";
  const [guest, setGuest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [feed, setFeed] = useState<string[]>([]);
  const [events, setEvents] = useState<MpEvent[]>([]);
  const [lobbyCode, setLobbyCode] = useState("");
  const [lobbyTitle, setLobbyTitle] = useState("");
  const [joinLobbyId, setJoinLobbyId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const lastStatus = useRef("");
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Presence: best-effort, signed-in only (401 just marks guest UI).
  useEffect(() => {
    if (!isGraveSlug(slug)) return;
    let live = true;
    (async () => {
      try {
        await fetch("/api/presence", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game_slug: slug }),
        }).then((res) => {
          if (live && res.status === 401) setGuest(true);
        });
      } catch {
        /* best-effort; lobby still renders */
      }
    })();
    return () => {
      live = false;
    };
  }, [slug]);

  const note = useCallback((line: string) => {
    setFeed((prev) => [`${new Date().toLocaleTimeString()} ${line}`, ...prev].slice(0, 20));
  }, []);

  // Live party card: poll the match every 3s.
  useEffect(() => {
    if (!matchId) return;
    let live = true;
    lastStatus.current = "";
    const load = async () => {
      try {
        const body = await getJson<{ match?: MatchRow }>(`/api/matches/${encodeURIComponent(matchId)}`);
        if (!live) return;
        const row = body.match ?? null;
        setMatch(row);
        const status = String(row?.status ?? "");
        if (status && status !== lastStatus.current) {
          lastStatus.current = status;
          note(`status: ${status}`);
        }
        if (live && row) setGuest(false);
        const ev = await getJson<{ events?: MpEvent[] }>(
          `/api/matches/${encodeURIComponent(matchId)}/events?limit=50`,
        ).catch(() => null);
        if (!live) return;
        if (Array.isArray(ev?.events)) setEvents(ev.events.slice(0, 50));
      } catch (error) {
        if (!live) return;
        if ((error as { status?: number }).status === 401) setGuest(true);
        else setMessage(error instanceof Error ? error.message : "Unable to load match.");
      }
    };
    void load();
    pollTimer.current = setInterval(() => void load(), 3000);
    return () => {
      live = false;
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [matchId, note]);

  if (!isGraveSlug(slug)) return null;
  const copy = MODE_COPY[slug];

  const requireOk = (error: unknown): boolean => {
    if ((error as { status?: number }).status === 401) {
      setGuest(true);
      return false;
    }
    setMessage(error instanceof Error ? error.message : "Request failed.");
    return false;
  };

  const quickMatch = async () => {
    setBusy(true);
    setMessage("");
    try {
      const row = await postJson<MatchRow>("/api/matches", {
        game_slug: slug,
        platform: coarsePlatform(),
      });
      let id = matchIdOf(row);
      if (!id) {
        setMessage("Match request accepted; waiting for a rival.");
      }
      // Waiting poll loop: ~24 tries at 3s while the lobby fills.
      for (let i = 0; i < 24 && !id; i += 1) {
        await new Promise((r) => setTimeout(r, 3000));
        const again = await postJson<MatchRow>("/api/matches", {
          game_slug: slug,
          platform: coarsePlatform(),
        }).catch(() => null);
        id = matchIdOf(again);
        if (id) break;
        const status = String(again?.status ?? "");
        if (status && !/wait|queue|pending|open/i.test(status)) break;
      }
      if (id) {
        router.push(`/games/${slug}/play?match=${encodeURIComponent(id)}`);
      } else if (!matchIdOf(row)) {
        setMessage("No rival found yet. Try again or create a party lobby below.");
      }
    } catch (error) {
      requireOk(error);
    } finally {
      setBusy(false);
    }
  };

  const createLobby = async () => {
    setBusy(true);
    setMessage("");
    try {
      const row = await postJson<{ id?: string; join_code?: string; title?: string } & Record<string, unknown>>(
        "/api/lobbies",
        {
          game_slug: slug,
          platform: coarsePlatform(),
          visibility: "private",
          title: lobbyTitle.trim() || `${copy.mode} party`,
        },
      );
      const code = String(row.join_code ?? "");
      setLobbyCode(code);
      setMessage(
        code
          ? `Party lobby open. Share this code: ${code}`
          : "Party lobby open. Share the lobby link with your rival.",
      );
      const lid = String(row.id ?? "");
      // Watch for the lobby to fill into a match, then enter it.
      if (isUuid(lid)) {
        for (let i = 0; i < 24; i += 1) {
          await new Promise((r) => setTimeout(r, 3000));
          const state = await getJson<{ match_id?: string }>(`/api/lobbies/${encodeURIComponent(lid)}`).catch(
            () => null,
          );
          const mid = String(state?.match_id ?? "");
          if (isUuid(mid)) {
            router.push(`/games/${slug}/play?match=${encodeURIComponent(mid)}`);
            return;
          }
        }
      }
    } catch (error) {
      requireOk(error);
    } finally {
      setBusy(false);
    }
  };

  const joinLobby = async () => {
    const lid = joinLobbyId.trim();
    if (!isUuid(lid)) {
      setMessage("Paste the party lobby id (uuid) to join.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const row = await postJson<MatchRow>(`/api/lobbies/${encodeURIComponent(lid)}/join`, {
        join_code: joinCode.trim().toUpperCase(),
      });
      const id = matchIdOf(row);
      const gameSlug = /^[a-z0-9-]{1,64}$/.test(String(row.game_slug ?? "")) ? String(row.game_slug) : slug;
      router.push(id ? `/games/${gameSlug}/play?match=${encodeURIComponent(id)}` : `/games/${gameSlug}/play`);
    } catch (error) {
      requireOk(error);
    } finally {
      setBusy(false);
    }
  };

  if (guest && !match) {
    return (
      <section
        aria-label={`${copy.mode} multiplayer`}
        className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6"
      >
        <h2 className="text-lg font-bold sm:text-xl">Multiplayer: {copy.mode}</h2>
        <p className="mt-2 text-sm text-slate-300">
          {copy.blurb} Multiplayer is signed-in only.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/auth/login?next=${encodeURIComponent(`/games/${slug}/play`)}`}
            className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200"
          >
            Log in
          </Link>
          <Link
            href={`/auth/sign-up?next=${encodeURIComponent(`/games/${slug}/play`)}`}
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10"
          >
            Sign up free
          </Link>
        </div>
      </section>
    );
  }

  // Dormant-in-match: live party card for ?match=<uuid>.
  if (matchId) {
    const short = matchId.slice(0, 8);
    return (
      <section
        aria-label={`${copy.mode} live party`}
        className="mt-4 rounded-2xl border border-cyan-300/30 bg-cyan-300/[.04] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold sm:text-xl">Multiplayer: {copy.mode} (live)</h2>
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300">
            match {short}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-300">{copy.blurb}</p>
        {message && (
          <p role="status" className="mt-2 text-sm text-amber-200">
            {message}
          </p>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <SideCard label="Phone side" state={match?.phone_state} />
          <SideCard label="Desktop side" state={match?.desktop_state} />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Status: {String(match?.status ?? "loading…")} · refreshing every 3s
        </p>
        {events.length > 0 ? (
          <ul aria-label="Match feed" className="mt-2 space-y-1 text-xs text-slate-300">
            {events.map((e) => (
              <li key={e.id || `${e.created_at}-${e.text}`} className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5">
                <span className="font-bold text-cyan-300">{e.kind || "event"}</span> · {e.text}{" "}
                <span className="text-slate-500">{e.created_at}</span>
              </li>
            ))}
          </ul>
        ) : (
          feed.length > 0 && (
            <ul aria-label="Match feed" className="mt-2 space-y-1 text-xs text-slate-300">
              {feed.map((line) => (
                <li key={line} className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5">
                  {line}
                </li>
              ))}
            </ul>
          )
        )}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => router.push(`/games/${slug}/play`)}
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10"
          >
            Leave match
          </button>
        </div>
      </section>
    );
  }

  // Lobby: quick match, create party, join by code.
  return (
    <section
      aria-label={`${copy.mode} multiplayer`}
      className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6"
    >
      <h2 className="text-lg font-bold sm:text-xl">Multiplayer: {copy.mode}</h2>
      <p className="mt-1 text-sm text-slate-300">{copy.blurb} Party races and duels with a live feed.</p>
      {message && (
        <p role="status" className="mt-2 text-sm text-slate-200">
          {message}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void quickMatch()}
          className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
        >
          {busy ? "Matchmaking…" : "Quick Match"}
        </button>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
        <h3 className="text-sm font-bold text-white">Create party lobby</h3>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={lobbyTitle}
            onChange={(e) => setLobbyTitle(e.target.value)}
            placeholder={`${copy.mode} party (optional title)`}
            maxLength={48}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void createLobby()}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
          >
            Create lobby
          </button>
        </div>
        {lobbyCode && (
          <p className="mt-2 text-sm text-slate-200">
            Join code: <b className="text-white">{lobbyCode}</b>
          </p>
        )}
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-4">
        <h3 className="text-sm font-bold text-white">Join with lobby id + code</h3>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={joinLobbyId}
            onChange={(e) => setJoinLobbyId(e.target.value)}
            placeholder="Lobby id (uuid)"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
          />
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Invite code (if private)"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void joinLobby()}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
          >
            Join
          </button>
        </div>
      </div>
    </section>
  );
}

export function GraveGainParty({ slug }: { slug: string }) {
  return (
    <Suspense>
      <GraveGainPartyInner slug={slug} />
    </Suspense>
  );
}
