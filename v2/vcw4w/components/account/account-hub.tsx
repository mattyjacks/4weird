"use client";

import { useCallback, useEffect, useState } from "react";

import { ParentDashboard } from "@/components/family/parent-dashboard";

type Friendship = { id: string; display_name?: string | null; public_handle?: string | null; status?: string; direction?: string };
type ChatMessage = { body: string; created_at?: string };
type Save = { game_slug: string; slot: number; data?: { cheat_mode?: boolean } | null; updated_at?: string };
type Submission = { id: string; title: string; status: string; monetization_status?: string };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String((body as { error?: unknown }).error ?? `Request failed (${response.status})`));
  return body as T;
}

const tabs = ["friends", "messages", "saves", "stats", "cheats", "studio", "admin", "family", "settings"] as const;
type Tab = (typeof tabs)[number];

function normalizeTab(value: string | null): Tab {
  if (value === "code") return "studio";
  return (tabs as readonly string[]).includes(value ?? "") ? (value as Tab) : "friends";
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-4 space-y-4 text-sm text-slate-300">{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">{children}</div>
  );
}

export function AccountHub() {
  const [tab, setTab] = useState<Tab>("friends");
  useEffect(() => {
    setTab(normalizeTab(new URLSearchParams(window.location.search).get("tab")));
  }, []);
  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap gap-2" aria-label="Account sections">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? "bg-cyan-300 text-slate-950" : "border border-white/20 text-slate-300"}`}
          >
            {t === "studio" ? "Creator Studio" : t === "family" ? "Family" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>
      {tab === "friends" && <FriendsTab />}
      {tab === "messages" && <MessagesTab />}
      {tab === "saves" && <SavesTab />}
      {tab === "stats" && <StatsTab />}
      {tab === "cheats" && <CheatsTab />}
      {tab === "studio" && <StudioTab />}
      {tab === "admin" && <AdminTab />}
      {tab === "family" && <ParentDashboard />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}

function FriendsTab() {
  const [handle, setHandle] = useState("");
  const [list, setList] = useState<Friendship[]>([]);
  const [message, setMessage] = useState("Loading friends…");
  const load = useCallback(async () => {
    try {
      const r = await request<{ friendships: Friendship[] }>("/api/social/friends");
      setList(r.friendships ?? []);
      setMessage(r.friendships?.length ? "" : "No friend requests yet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load friends.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <Card title="Friends">
      <p>Find a player by their public handle and send a request. Messaging unlocks only after they accept.</p>
      <form
        className="flex gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await request("/api/social/friends", { method: "POST", body: JSON.stringify({ handle }) });
            setHandle("");
            setMessage("Request sent.");
            void load();
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to send request.");
          }
        }}
      >
        <input
          id="friend-handle-input"
          name="handle"
          aria-label="Player handle"
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2"
          placeholder="Player handle"
          value={handle}
          maxLength={40}
          onChange={(e) => setHandle(e.target.value)}
        />
        <button className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950">Send request</button>
      </form>
      <p role="status" className="text-slate-400">{message}</p>
      {list.map((f) => (
        <Row key={f.id}>
          <span>
            {f.display_name || f.public_handle || "Player"} <small className="text-slate-500">@{f.public_handle || "private"}</small> · {f.status}
          </span>
          {f.direction === "incoming" && f.status === "pending" ? (
            <button
              className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950"
              onClick={async () => {
                await request("/api/social/friends", { method: "PATCH", body: JSON.stringify({ id: f.id, accept: true }) });
                void load();
              }}
            >
              Accept
            </button>
          ) : f.status === "accepted" ? (
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs">Friends</span>
          ) : null}
        </Row>
      ))}
    </Card>
  );
}

function MessagesTab() {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [peer, setPeer] = useState("");
  const [thread, setThread] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("Loading friends…");
  useEffect(() => {
    request<{ friendships: Friendship[] }>("/api/social/friends")
      .then((r) => {
        const accepted = (r.friendships ?? []).filter((f) => f.status === "accepted");
        setFriends(accepted);
        setPeer(accepted[0]?.id ?? "");
        setMessage(accepted.length ? "" : "Become friends with someone first.");
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Unable to load friends."));
  }, []);
  const loadThread = useCallback(async (peerId: string) => {
    if (!peerId) return;
    try {
      const m = await request<{ messages: ChatMessage[] }>(`/api/messages?with=${encodeURIComponent(peerId)}`);
      setThread(m.messages ?? []);
    } catch {
      setThread([]);
    }
  }, []);
  useEffect(() => {
    void loadThread(peer);
  }, [loadThread, peer]);
  return (
    <Card title="Direct messages">
      <p>Direct messages are end-to-end between friends. You must both accept before chatting.</p>
      <p role="status" className="text-slate-400">{message}</p>
      {friends.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {friends.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`rounded-full px-3 py-1 text-xs ${peer === f.id ? "bg-cyan-300 font-bold text-slate-950" : "border border-white/15"}`}
                onClick={() => setPeer(f.id)}
              >
                {f.display_name || f.public_handle || "Friend"}
              </button>
            ))}
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-4">
            {thread.length ? (
              thread.map((m, i) => (
                <div key={i} className="text-xs">
                  <span className="text-slate-500">[{new Date(m.created_at ?? "").toLocaleTimeString()}]</span> {m.body}
                </div>
              ))
            ) : (
              <p className="text-slate-500">No messages yet.</p>
            )}
          </div>
          <form
            className="flex gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await request("/api/messages", { method: "POST", body: JSON.stringify({ recipient_id: peer, body: draft }) });
                setDraft("");
                void loadThread(peer);
              } catch (error) {
                alert(error instanceof Error ? error.message : "Unable to send");
              }
            }}
          >
            <input
              id="message-draft-input"
              name="messageDraft"
              aria-label="Message"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2"
              placeholder="Message"
              value={draft}
              maxLength={2000}
              required
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950">Send</button>
          </form>
        </>
      )}
    </Card>
  );
}

function SavesTab() {
  const [saves, setSaves] = useState<Save[]>([]);
  const [message, setMessage] = useState("Loading saves…");
  useEffect(() => {
    request<{ saves: Save[] }>("/api/saves")
      .then((r) => {
        setSaves(r.saves ?? []);
        setMessage(r.saves?.length ? "" : "No cloud saves yet.");
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Unable to load saves."));
  }, []);
  const games = ["platform-wars", ...new Set(saves.map((s) => s.game_slug))].filter((g, i, a) => a.indexOf(g) === i);
  return (
    <Card title="Cloud saves">
      <p>Every game includes three independent save slots. Cheated status is permanent per slot after its first cheat.</p>
      <p role="status" className="text-slate-400">{message}</p>
      {games.map((game) => (
        <div key={game}>
          <h3 className="font-semibold">{game === "platform-wars" ? "Platform Wars: Phone vs Desktop" : game}</h3>
          {[1, 2, 3].map((slot) => {
            const s = saves.find((x) => x.game_slug === game && x.slot === slot);
            return (
              <Row key={slot}>
                <span>
                  Save {slot}{" "}
                  {s?.data?.cheat_mode && (
                    <b className="rounded-full border border-red-400/40 px-2 py-0.5 text-xs text-red-300">CHEAT MODE</b>
                  )}
                </span>
                <span className="text-slate-400">{s ? `Last synced ${new Date(s.updated_at ?? "").toLocaleDateString()}` : "Empty"}</span>
              </Row>
            );
          })}
        </div>
      ))}
    </Card>
  );
}

function StatsTab() {
  const [stats, setStats] = useState<Record<string, string | number>>({});
  const [average, setAverage] = useState<Record<string, number>>({});
  const [games, setGames] = useState<{ game_slug: string; current_humans: number; current_vibecodeworker: number; current_bots: number; active_24h: number }[]>([]);
  useEffect(() => {
    request<{ stats: Record<string, string | number>; average: Record<string, number> }>("/api/stats")
      .then((r) => {
        setStats(r.stats ?? {});
        setAverage((r.average as Record<string, number>) ?? {});
      })
      .catch(() => undefined);
    request<{ games: { game_slug: string; current_humans: number; current_vibecodeworker: number; current_bots: number; active_24h: number }[] }>("/api/analytics")
      .then((r) => setGames(r.games ?? []))
      .catch(() => undefined);
  }, []);
  return (
    <Card title="Stats">
      <p>We count active game time only while a game has focus and actions are happening — not time sitting on a page.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.entries({ playtime: "Active playtime", kills: "Kills", deaths: "Deaths", actions_per_minute: "Actions / minute" }) as [string, string][]).map(([k, label]) => (
          <div key={k} className="rounded-xl border border-white/10 p-4">
            {label}
            <strong className="block text-2xl">{String(stats[k] ?? "—")}</strong>
          </div>
        ))}
      </div>
      <p className="text-slate-500">
        Community average: {Number(average.actions_per_minute || 0).toFixed(1)} actions/min, {Number(average.kills_per_minute || 0).toFixed(2)} kills/min,{" "}
        {Number(average.deaths_per_minute || 0).toFixed(2)} deaths/min. Aggregated from all players without exposing individual histories.
      </p>
      <h3 className="font-semibold">4weird live player counts</h3>
      <p className="text-slate-500">Realtime counts use a 90-second activity window. Worker and bot actors are separated from authenticated humans.</p>
      {games.length ? (
        games.map((g) => (
          <Row key={g.game_slug}>
            <span>{g.game_slug}</span>
            <span className="text-slate-400">
              {g.current_humans} human · {g.current_vibecodeworker} VCW · {g.current_bots} bot · {g.active_24h} active today
            </span>
          </Row>
        ))
      ) : (
        <p className="text-slate-400">No game presence yet.</p>
      )}
    </Card>
  );
}

function CheatsTab() {
  const [game, setGame] = useState("platform-wars");
  const [slot, setSlot] = useState("1");
  const [enabled, setEnabled] = useState(false);
  const [global, setGlobal] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    request<{ enabled: boolean }>("/api/cheats?scope=all")
      .then((r) => setGlobal(!!r.enabled))
      .catch(() => undefined);
  }, []);
  return (
    <Card title="Cheat controls">
      <p>
        Cheats are deliberately separated by game and save slot. The first enabled cheat permanently marks that save <b>Cheat Mode</b>,
        including in captured gameplay output.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const r = await request<{ cheat_mode: boolean }>("/api/cheats", {
              method: "PUT",
              body: JSON.stringify({ game_slug: game, slot: Number(slot), enabled }),
            });
            setMessage(r.cheat_mode ? "Cheat Mode is now permanently marked on this save." : "Cheats disabled.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not update");
          }
        }}
      >
        <label htmlFor="cheat-game-select">
          Game
          <select id="cheat-game-select" name="game" className="mt-1 block rounded-lg border border-white/15 bg-black/30 px-3 py-2" value={game} onChange={(e) => setGame(e.target.value)}>
            <option value="platform-wars">Platform Wars</option>
          </select>
        </label>
        <label htmlFor="cheat-slot-select">
          Save slot
          <select id="cheat-slot-select" name="slot" className="mt-1 block rounded-lg border border-white/15 bg-black/30 px-3 py-2" value={slot} onChange={(e) => setSlot(e.target.value)}>
            <option value="1">Save 1</option>
            <option value="2">Save 2</option>
            <option value="3">Save 3</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input id="cheat-enabled-checkbox" name="enabled" type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enable cheats
        </label>
        <button className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950">Save</button>
      </form>
      <form
        className="space-y-3 border-t border-white/10 pt-4"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await request("/api/cheats", { method: "PUT", body: JSON.stringify({ scope: "all", enabled: global }) });
            setMessage("All-game testing permission saved.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not update");
          }
        }}
      >
        <label className="flex items-center gap-2">
          <input id="cheat-global-checkbox" name="globalCheats" type="checkbox" checked={global} onChange={(e) => setGlobal(e.target.checked)} /> Allow AI testing cheats in all games
        </label>
        <p className="text-slate-500">This grants testing access globally. A save is still permanently marked only when cheats are enabled for that game and save.</p>
        <button className="rounded-lg border border-white/20 px-4 py-2">Save all-game permission</button>
      </form>
      <p role="status" className="text-slate-400">{message}</p>
    </Card>
  );
}

function StudioTab() {
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Submission[]>([]);
  const [message, setMessage] = useState("");
  const refresh = useCallback(async () => {
    try {
      const r = await request<{ submissions: Submission[] }>("/api/code");
      setProjects(r.submissions ?? []);
    } catch {
      setProjects([]);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <Card title="Creator Studio">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const r = await request<{ submission: { id: string } }>("/api/code", {
              method: "POST",
              body: JSON.stringify({ title, source, submit: false }),
            });
            setDraftId(r.submission?.id ?? null);
            setMessage("Private draft saved.");
            void refresh();
          } catch {
            setMessage("Unable to save draft.");
          }
        }}
      >
        <label className="block" htmlFor="studio-title-input">
          Title
          <input
            id="studio-title-input"
            name="title"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
            value={title}
            maxLength={80}
            required
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block" htmlFor="studio-source-textarea">
          Source (HTML)
          <textarea
            id="studio-source-textarea"
            name="source"
            className="mt-1 h-40 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono text-xs"
            value={source}
            required
            onChange={(e) => setSource(e.target.value)}
          />
        </label>
        <div className="flex gap-3">
          <button className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950">Save draft</button>
          <button
            type="button"
            className="rounded-lg border border-white/20 px-4 py-2"
            onClick={() => {
              const frame = document.createElement("iframe");
              frame.sandbox.add("allow-scripts");
              frame.style.cssText = "width:100%;height:360px;border:1px solid #435080;border-radius:10px;margin-top:16px";
              frame.srcdoc = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'"><base target="_blank">${source}`;
              document.querySelector("#studio-preview")?.replaceChildren(frame);
            }}
          >
            Preview
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/20 px-4 py-2"
            disabled={!draftId}
            onClick={async () => {
              if (!draftId) return;
              try {
                await request(`/api/code/${draftId}`, { method: "PATCH", body: JSON.stringify({ submit: true }) });
                setMessage("Submitted for review.");
                void refresh();
              } catch {
                setMessage("Unable to submit.");
              }
            }}
          >
            Submit for review
          </button>
        </div>
      </form>
      <div id="studio-preview" />
      <p role="status" className="text-slate-400">{message}</p>
      <h3 className="font-semibold">Your projects</h3>
      {projects.length ? (
        projects.map((s) => (
          <Row key={s.id}>
            <span>
              <b>{s.title}</b>
              <br />
              <small className="text-slate-500">{s.status} · monetization: {s.monetization_status}</small>
            </span>
            {s.status === "approved" && (
              <button
                className="rounded-lg border border-white/20 px-4 py-2"
                onClick={async () => {
                  try {
                    await request(`/api/code/${s.id}/monetization`, {
                      method: "PUT",
                      body: JSON.stringify({ enabled: s.monetization_status !== "ready" }),
                    });
                    setMessage("Monetization status updated.");
                    void refresh();
                  } catch {
                    setMessage("Unable to update.");
                  }
                }}
              >
                {s.monetization_status === "ready" ? "Disable monetization setup" : "Enable monetization setup"}
              </button>
            )}
          </Row>
        ))
      ) : (
        <p className="text-slate-400">No projects yet.</p>
      )}
    </Card>
  );
}

function AdminTab() {
  const [queue, setQueue] = useState<Submission[] | null>(null);
  const [message, setMessage] = useState("Loading review queue…");
  const load = useCallback(async () => {
    try {
      // Non-admins would just eat a 403 (and a red console line): check the
      // session role first and skip the round-trip entirely.
      const session = await request<{ user?: { app_metadata?: { role?: string } } }>("/api/auth/session").catch(
        () => null,
      );
      if (session?.user?.app_metadata?.role !== "admin") {
        setQueue(null);
        setMessage("Admin access required.");
        return;
      }
      const r = await request<{ submissions: Submission[] }>("/api/admin/submissions");
      setQueue(r.submissions ?? []);
      setMessage((r.submissions ?? []).length ? "" : "Nothing awaiting review.");
    } catch (error) {
      setQueue(null);
      setMessage(error instanceof Error ? error.message : "Admin access required.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <Card title="Admin review">
      <p role="status" className="text-slate-400">
        {message || `${queue?.length ?? 0} submission(s) awaiting review.`}
      </p>
      {(queue ?? []).map((s) => (
        <Row key={s.id}>
          <span>{s.title}</span>
          <span className="flex gap-2">
            {(["approved", "rejected"] as const).map((status) => (
              <button
                key={status}
                className="rounded-lg border border-white/20 px-4 py-2"
                onClick={async () => {
                  try {
                    await request(`/api/admin/submissions/${s.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
                    void load();
                  } catch (error) {
                    alert(error instanceof Error ? error.message : "Unable to review");
                  }
                }}
              >
                {status === "approved" ? "Approve" : "Reject"}
              </button>
            ))}
          </span>
        </Row>
      ))}
    </Card>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState({ allow_friend_requests: true, show_playtime: true, marketing_email: false, kids_mode: false });
  const [message, setMessage] = useState("");
  useEffect(() => {
    request<{ settings: { allow_friend_requests: boolean; show_playtime: boolean; marketing_email: boolean; kids_mode?: boolean } }>("/api/settings")
      .then((r) => {
        if (r.settings) {
          setSettings({ kids_mode: false, ...r.settings });
          try {
            // Mirror Kids Mode onto this device so the catalog + play shell
            // enforce it without an extra round-trip (the flag is a
            // preference, not age data).
            if (r.settings.kids_mode) window.localStorage.setItem("4weird-kids-mode", "1");
            else window.localStorage.removeItem("4weird-kids-mode");
          } catch { /* private mode */ }
        }
      })
      .catch(() => undefined);
  }, []);
  const labels: Record<keyof typeof settings, string> = {
    allow_friend_requests: "Allow friend requests",
    show_playtime: "Show playtime on my public profile",
    marketing_email: "Marketing email",
    kids_mode: "🔒 Kids Mode — hide Adults (18+) games; Teens games ask a 13+ age check",
  };
  return (
    <Card title="Settings">
      <p>Control how other players can find you and how 4weird communicates with you.</p>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await request("/api/settings", { method: "PUT", body: JSON.stringify(settings) });
            try {
              if (settings.kids_mode) window.localStorage.setItem("4weird-kids-mode", "1");
              else window.localStorage.removeItem("4weird-kids-mode");
              window.dispatchEvent(new Event("kids-mode-changed"));
            } catch { /* private mode */ }
            setMessage("Settings saved.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to save settings.");
          }
        }}
      >
        {(Object.keys(settings) as (keyof typeof settings)[]).map((k) => (
          <label key={k} className="flex items-center gap-2" htmlFor={`setting-${k}`}>
            <input id={`setting-${k}`} name={k} type="checkbox" checked={settings[k]} onChange={(e) => setSettings({ ...settings, [k]: e.target.checked })} />{" "}
            {labels[k]}
          </label>
        ))}
        <button className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950">Save settings</button>
      </form>
      <p role="status" className="text-slate-400">{message}</p>
    </Card>
  );
}
