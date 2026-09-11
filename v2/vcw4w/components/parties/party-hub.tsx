"use client";

import { useCallback, useEffect, useState } from "react";
import { PARTY_KINDS, PARTY_KIND_LABELS, type PartyKind } from "@/lib/parties";

type PartyRef = { kind: PartyKind; id: string; slug?: string; name?: string };
type FeedPost = {
  id: string;
  actor_kind: string;
  actor_id: string;
  actor_name?: string;
  target_kind: string | null;
  target_id: string | null;
  target_name?: string | null;
  body: string;
  game_slug?: string;
  created_at: string;
};
type Invite = {
  id: string;
  from_kind: string;
  from_id: string;
  from_name?: string;
  to_kind: string;
  to_id: string;
  to_name?: string;
  message: string;
  status: string;
  created_at: string;
};
type Challenge = {
  id: string;
  challenger_kind: string;
  challenger_id: string;
  opponent_kind: string;
  opponent_id: string;
  game_slug: string;
  message: string;
  status: string;
  created_at: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: unknown } & T;
  if (!res.ok) throw new Error(String(body.error ?? `Request failed (${res.status})`));
  return body as T;
}

function partyLabel(p: { kind: string; name?: string; slug?: string; id: string }): string {
  return p.name || p.slug || `${p.kind}:${p.id.slice(0, 8)}`;
}

export function PartyHub() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Record<string, PartyRef[]>>({});
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [inbox, setInbox] = useState<Invite[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [actor, setActor] = useState("");
  const [target, setTarget] = useState("");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadFeed = useCallback(async () => {
    try {
      const data = await request<{ posts: FeedPost[] }>("/api/parties/feed?limit=25");
      setFeed(data.posts ?? []);
    } catch {
      // Public square stays empty offline; never a page failure.
    }
  }, []);

  const loadPrivate = useCallback(async () => {
    try {
      const data = await request<{ inbox: Invite[]; outbox: Invite[] }>("/api/parties/invites");
      setInbox(data.inbox ?? []);
    } catch {
      // Signed-out visitors simply have no inbox.
    }
    try {
      const data = await request<{ challenges: Challenge[] }>("/api/parties/challenges?status=open");
      setChallenges(data.challenges ?? []);
    } catch {
      // Same: challenges stay empty when unreadable.
    }
  }, []);

  useEffect(() => {
    void loadFeed();
    void loadPrivate();
  }, [loadFeed, loadPrivate]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (q.trim().length < 2) {
      setError("Type 2+ characters to search squads, clans, orgs, and individuals.");
      return;
    }
    try {
      const data = await request<{ results: Record<string, PartyRef[]> }>(
        `/api/parties/resolve?q=${encodeURIComponent(q.trim())}`,
      );
      setResults(data.results ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    }
  }

  // Actor/target fields accept "kind:id" (e.g. "squad:3fa…"). Resolve a party
  // with the search box above, then paste its kind + id here.
  function parseParty(raw: string): PartyRef | null {
    const m = raw.trim().split(":");
    if (m.length < 2) return null;
    const kind = m[0].trim().toLowerCase() as PartyKind;
    const id = m.slice(1).join(":").trim();
    if (!(PARTY_KINDS as readonly string[]).includes(kind)) return null;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    return { kind, id };
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    const a = parseParty(actor);
    if (!a) {
      setError("Actor must be kind:id (e.g. squad:<id>). You must belong to it.");
      return;
    }
    const t = target.trim() ? parseParty(target) : null;
    if (target.trim() && !t) {
      setError("Target must be kind:id or left empty for the whole square.");
      return;
    }
    if (!body.trim()) {
      setError("Write something first (1-2000 chars).");
      return;
    }
    try {
      await request("/api/parties/feed", {
        method: "POST",
        body: JSON.stringify({ actor: a, target: t, body: body.trim() }),
      });
      setBody("");
      setNotice("Posted to the square.");
      await loadFeed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Post failed.");
    }
  }

  async function decideInvite(id: string, accept: boolean) {
    setError("");
    try {
      await request(`/api/parties/invites/${id}`, {
        method: "POST",
        body: JSON.stringify({ accept }),
      });
      await loadPrivate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite decision failed.");
    }
  }

  return (
    <section aria-label="Party interop" className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-amber-300">Town square</p>
      <h2 className="mt-1 text-2xl font-black">Squads, clans, orgs, and individuals; one square</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-300">
        Search every party, follow anyone, invite anyone into your squad, clan, or org, challenge any
        party to a game, and post @ any party. Accepting an invite lands the real membership plus a
        public ally badge. Posting is free and coin-free; Valley Net screens every write.
      </p>

      <form onSubmit={search} className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search squads, clans, orgs, people…"
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950">
          Search
        </button>
      </form>

      {Object.keys(results).length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(PARTY_KINDS as readonly string[]).map((kind) => (
            <div key={kind} className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {PARTY_KIND_LABELS[kind as PartyKind]}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {((results[kind] as PartyRef[] | undefined) ?? []).length === 0 && (
                  <li className="text-slate-500">No matches.</li>
                )}
                {((results[kind] as PartyRef[] | undefined) ?? []).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{partyLabel(p)}</span>
                    <code className="shrink-0 rounded bg-white/10 px-1 font-mono text-[11px] text-slate-300">
                      {p.kind}:{p.id.slice(0, 8)}…
                    </code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <form onSubmit={post} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
          <p className="text-sm font-bold">Post to the square</p>
          <label className="mt-3 block text-xs text-slate-400">
            Act as (kind:id; you must belong to it)
            <input
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="individual:<your id> or squad:<id>"
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
            />
          </label>
          <label className="mt-2 block text-xs text-slate-400">
            @ target (optional kind:id; empty posts to everyone)
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="clan:rival-slug-id…"
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
            />
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Challenge the rivals, praise your allies…"
            className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <button type="submit" className="mt-2 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950">
            Post
          </button>
        </form>

        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
          <p className="text-sm font-bold">Invite inbox {inbox.length > 0 && `(${inbox.length})`}</p>
          {inbox.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No pending invites. Invite anyone from a squad, clan, or org page flow via the API.</p>
          ) : (
            <ul className="mt-2 max-h-56 space-y-2 overflow-auto text-sm">
              {inbox.map((inv) => (
                <li key={inv.id} className="rounded-lg border border-white/10 p-2">
                  <p>
                    <strong>{inv.from_name ?? `${inv.from_kind}`}</strong> →{" "}
                    <strong>{inv.to_name ?? `${inv.to_kind}`}</strong>
                  </p>
                  {inv.message && <p className="mt-1 text-slate-300">{inv.message}</p>}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void decideInvite(inv.id, true)}
                      className="rounded bg-emerald-300 px-3 py-1 text-xs font-bold text-slate-950"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => void decideInvite(inv.id, false)}
                      className="rounded border border-white/20 px-3 py-1 text-xs"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm font-bold">Open challenges ({challenges.length})</p>
          {challenges.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No open challenges right now.</p>
          ) : (
            <ul className="mt-2 max-h-56 space-y-2 overflow-auto text-sm">
              {challenges.slice(0, 20).map((c) => (
                <li key={c.id} className="rounded-lg border border-white/10 p-2">
                  <p>
                    <strong>
                      {c.challenger_kind}:{c.challenger_id.slice(0, 8)}
                    </strong>{" "}
                    vs{" "}
                    <strong>
                      {c.opponent_kind}:{c.opponent_id.slice(0, 8)}
                    </strong>
                    {c.game_slug && <span className="text-slate-400"> · {c.game_slug}</span>}
                  </p>
                  {c.message && <p className="mt-1 text-slate-300">{c.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <p className="text-sm font-bold">Live square</p>
        {feed.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nothing yet; be the first party to post.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {feed.map((p) => (
              <li key={p.id} className="rounded-lg border border-white/10 p-2">
                <p className="text-xs text-slate-400">
                  <strong className="text-slate-200">{p.actor_name ?? p.actor_kind}</strong>
                  {p.target_kind && (
                    <>
                      {" → "}<strong className="text-slate-200">{p.target_name ?? p.target_kind}</strong>
                    </>
                  )}
                  {p.game_slug && <span> · {p.game_slug}</span>}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{p.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(notice || error) && (
        <p role={error ? "alert" : "status"} className={`mt-3 text-sm ${error ? "text-rose-300" : "text-emerald-300"}`}>
          {error || notice}
        </p>
      )}
    </section>
  );
}
