"use client";

import { useCallback, useEffect, useState } from "react";
import { PERMISSION_CATALOG, GROUP_LABELS, type PermissionGroup } from "@/lib/permissions";
import { CLOUD_SERVICES, CHEAPEST_DEFAULTS, WORKSPACE_CUT_NOTE } from "@/lib/cloud-catalog";
import { UNITUNITE_NAME, UNITUNITE_TAGLINE } from "@/lib/unitunite";
import { BudgetControls } from "@/components/budget/budget-controls";
import { OrgRanks } from "@/components/teams/org-ranks";
import { OrgScale } from "@/components/teams/org-scale";

type Org = { id: string; slug: string; name: string; is_initialized?: boolean };
type Team = { id: string; org_id: string; slug: string; name: string };
type Room = {
  id: string;
  team_id: string;
  slug: string;
  name: string;
  topic: string;
  encrypted: boolean;
  message_count: number;
  bot_sends: number;
  created_at: string;
};
type ChatMessage = {
  id: string;
  sender_id: string | null;
  sender: string;
  is_bot: boolean;
  encoding: string;
  body: string;
  redacted: boolean;
  created_at: string;
};
type Invite = {
  id: string;
  token: string;
  role_key: string;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  revoked: boolean;
  label: string;
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

const groups: PermissionGroup[] = ["org", "team", "project", "cloud", "rooms", "security"];

export function TeamWorkspace() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [perms, setPerms] = useState<string[]>([]);
  const [services] = useState(CLOUD_SERVICES);
  const [message, setMessage] = useState("Create an org, open a workspace, invite your team.");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgName, setOrgName] = useState("");
  const [invites, setInvites] = useState<Record<string, Invite[]>>({});
  const [inviteOrg, setInviteOrg] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviteMax, setInviteMax] = useState("");
  const [inviteExpiry, setInviteExpiry] = useState("");
  const [inviteLabel, setInviteLabel] = useState("");
  const [redeemToken, setRedeemToken] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roomSlug, setRoomSlug] = useState("");
  const [roomName, setRoomName] = useState("");
  const [chatText, setChatText] = useState("");
  const [sendAsAgent, setSendAsAgent] = useState(true);

  const loadInvites = useCallback(async (orgId: string) => {
    try {
      const r = await request<{ invites: Invite[] }>(`/api/orgs/${orgId}/invites`);
      setInvites((prev) => ({ ...prev, [orgId]: r.invites ?? [] }));
    } catch {
      // Invite listing needs org.members.invite; non-inviters just see nothing.
    }
  }, []);

  const load = useCallback(async () => {
    // Orgs and teams load independently: one failing must not blank the other.
    const [orgsResult, teamsResult] = await Promise.allSettled([
      request<{ orgs: Org[] }>("/api/orgs"),
      request<{ teams: Team[] }>("/api/squads"),
    ]);
    const problems: string[] = [];
    if (orgsResult.status === "fulfilled") {
      setOrgs(orgsResult.value.orgs ?? []);
    } else {
      setOrgs([]);
      problems.push(orgsResult.reason instanceof Error ? orgsResult.reason.message : "Unable to load orgs.");
    }
    if (teamsResult.status === "fulfilled") {
      const list = teamsResult.value.teams ?? [];
      setTeams(list);
      if (!teamId && list.length) setTeamId(list[0].id);
    } else {
      setTeams([]);
      problems.push(teamsResult.reason instanceof Error ? teamsResult.reason.message : "Unable to load squads.");
    }
    setMessage(problems.length ? problems.join(" ") : "Create an org, open a workspace, invite your squad.");
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!teamId) return;
    request<{ permissions: string[] }>(`/api/squads/${teamId}/perms`)
      .then((r) => setPerms(r.permissions ?? []))
      .catch(() => setPerms([]));
  }, [teamId]);

  const canDo = (key: string) => perms.includes(key);

  const loadRooms = useCallback(async (team: string) => {
    if (!team) {
      setRooms([]);
      setRoomId("");
      setMessages([]);
      return;
    }
    try {
      const r = await request<{ rooms: Room[] }>(`/api/unitunite/rooms?team=${encodeURIComponent(team)}`);
      const list = r.rooms ?? [];
      setRooms(list);
      if (!list.some((x) => x.id === roomId)) {
        setRoomId(list[0]?.id ?? "");
      }
    } catch {
      setRooms([]);
    }
  }, [roomId]);

  const loadMessages = useCallback(async (room: string) => {
    if (!room) {
      setMessages([]);
      return;
    }
    try {
      const r = await request<{ messages: ChatMessage[] }>(`/api/unitunite/rooms/${room}/messages?limit=50`);
      setMessages(r.messages ?? []);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    void loadRooms(teamId);
  }, [teamId, loadRooms]);

  useEffect(() => {
    void loadMessages(roomId);
  }, [roomId, loadMessages]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">1 · Organization</h2>
        <p className="mt-2 text-sm text-slate-300">
          Orgs keep billing, wallets, and audit separate. Everyone starts with an uninitialized
          default org that costs 0 coins; the first thing you send it (workspace, funding,
          cloud service, or invite link) initializes it, still moving 0 coins by itself.
          Pay as you go after that: buy Vibe Coins (100 coins = $1.00), fund the org wallet,
          and every cloud service meters from it; never a surprise bill.
        </p>
        <form
          className="mt-4 flex flex-wrap gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await request("/api/orgs", { method: "POST", body: JSON.stringify({ slug: orgSlug, name: orgName }) });
              setOrgSlug("");
              setOrgName("");
              setMessage("Org created; you are its owner.");
              void load();
            } catch (e2) {
              setMessage(e2 instanceof Error ? e2.message : "Unable to create org.");
            }
          }}
        >
          <input value={orgSlug} maxLength={40} onChange={(e) => setOrgSlug(e.target.value)} placeholder="acme" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2" />
          <input value={orgName} maxLength={80} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Inc" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2" />
          <button className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950">New org</button>
        </form>
        <p className="mt-2 text-sm text-slate-400">
          {orgs.length
            ? `${orgs.length} org(s): ${orgs.map((o) => `${o.slug}${o.is_initialized === false ? " (uninitialized · 0 coins)" : ""}`).join(", ")}`
            : "No orgs yet; one is created for you on your first visit."}
        </p>
        {!!orgs.length && (
          <div className="mt-4 rounded-xl border border-white/10 p-4">
            <h3 className="font-semibold">Invite links; capped + expirable</h3>
            <p className="mt-1 text-xs text-slate-400">
              Share a link instead of per-email invites. Set a usage cap (blank = unlimited)
              and an expiry (blank = never). Redeeming moves 0 coins.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                value={inviteOrg || orgs[0].id}
                onChange={(e) => setInviteOrg(e.target.value)}
                className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.slug}</option>
                ))}
              </select>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
              >
                {["viewer", "developer", "maintainer", "admin", "billing", "security", "lord", "banker", "banker_readonly", "watcher"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input
                value={inviteMax}
                onChange={(e) => setInviteMax(e.target.value)}
                placeholder="Max uses (blank ∞)"
                inputMode="numeric"
                className="w-40 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={inviteExpiry}
                onChange={(e) => setInviteExpiry(e.target.value)}
                placeholder="Expires (YYYY-MM-DD)"
                className="w-48 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={inviteLabel}
                maxLength={60}
                onChange={(e) => setInviteLabel(e.target.value)}
                placeholder="Label (optional)"
                className="w-44 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950"
                onClick={async () => {
                  const orgId = inviteOrg || orgs[0].id;
                  try {
                    await request(`/api/orgs/${orgId}/invites`, {
                      method: "POST",
                      body: JSON.stringify({
                        role_key: inviteRole,
                        max_uses: inviteMax.trim() === "" ? null : Number(inviteMax),
                        expires_at: inviteExpiry.trim() === "" ? null : inviteExpiry.trim(),
                        label: inviteLabel,
                      }),
                    });
                    setInviteMax("");
                    setInviteExpiry("");
                    setInviteLabel("");
                    setMessage("Invite link created.");
                    void loadInvites(orgId);
                  } catch (e2) {
                    setMessage(e2 instanceof Error ? e2.message : "Unable to create invite.");
                  }
                }}
              >
                New link
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {orgs.map((o) => (
                <button
                  key={o.id}
                  className="rounded-lg border border-white/15 px-3 py-1 text-xs text-slate-300"
                  onClick={() => {
                    setInviteOrg(o.id);
                    void loadInvites(o.id);
                  }}
                >
                  Show {o.slug} links
                </button>
              ))}
            </div>
            {(invites[inviteOrg || orgs[0].id] ?? []).map((inv) => (
              <div key={inv.id} className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <code className="rounded bg-black/40 px-2 py-1">{inv.token}</code>
                <span>{inv.role_key}</span>
                <span>{inv.max_uses === null ? "∞" : `${inv.uses}/${inv.max_uses}`} uses</span>
                <span>{inv.expires_at ? `expires ${new Date(inv.expires_at).toLocaleDateString()}` : "never expires"}</span>
                <span className={inv.status === "active" ? "text-emerald-300" : "text-slate-500"}>{inv.status}</span>
                {inv.label ? <span className="text-slate-500">· {inv.label}</span> : null}
                {!inv.revoked && inv.status === "active" && (
                  <button
                    className="rounded border border-red-400/40 px-2 py-0.5 text-red-300"
                    onClick={async () => {
                      try {
                        await request(`/api/orgs/${inviteOrg || orgs[0].id}/invites`, {
                          method: "DELETE",
                          body: JSON.stringify({ invite_id: inv.id }),
                        });
                        setMessage("Invite revoked.");
                        void loadInvites(inviteOrg || orgs[0].id);
                      } catch (e2) {
                        setMessage(e2 instanceof Error ? e2.message : "Unable to revoke invite.");
                      }
                    }}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await request("/api/orgs/invites/redeem", {
                    method: "POST",
                    body: JSON.stringify({ token: redeemToken.trim() }),
                  });
                  setRedeemToken("");
                  setMessage("Joined the org - 0 coins moved.");
                  void load();
                } catch (e2) {
                  setMessage(e2 instanceof Error ? e2.message : "Unable to redeem invite.");
                }
              }}
            >
              <input
                value={redeemToken}
                onChange={(e) => setRedeemToken(e.target.value)}
                placeholder="Have a token? Paste it to join"
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
              />
              <button className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">Join</button>
            </form>
          </div>
        )}
      </section>

      {orgs.map((org) => <BudgetControls key={org.id} orgId={org.id} title={`${org.name} organization budget`} />)}

      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">2 · {UNITUNITE_NAME} workspace <span className="text-sm font-normal text-slate-400">- {UNITUNITE_TAGLINE}</span></h2>
        <p className="mt-2 text-sm text-slate-300">{UNITUNITE_NAME} workspaces are securely separate: UnitUnite projects, UnitUnite squad messaging (rooms), and keys never leak across squads.</p>
        {!!teams.length && (
          <label className="mt-4 block text-sm">
            Active workspace
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2">
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
              ))}
            </select>
          </label>
        )}
        <p className="mt-3 text-sm text-slate-400">
          {teamId ? `You hold ${perms.length} permission(s) here.` : "Create a workspace from an org to unlock projects, code, issues, rooms, and cloud."}
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">2b · Squad rooms; command humans through your agent</h2>
        <p className="mt-2 text-sm text-slate-300">
          Antisocial mode: flip on “Send as my agent”, type the order once, and your agent speaks to the
          room for you; every agent-driven message is clearly labeled <strong>[BOT]</strong> (in chat,
          in per-room bot counts, and in the org audit trail). You still see the whole chat. Human
          messages stay end-to-end encrypted; agent relays are server-stored plaintext by design.
          External agents (OpenClaw &amp; co.) can read + speak here with a <code>bot4weird_</code> key
          carrying <code>unitunite:read</code> / <code>unitunite:send</code>; always as [BOT], never as you.
        </p>
        {!teamId ? (
          <p className="mt-3 text-sm text-slate-400">Pick an active workspace above to open its rooms.</p>
        ) : (
          <>
            <form
              className="mt-4 flex flex-wrap gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const r = await request<{ room: Room }>("/api/unitunite/rooms", {
                    method: "POST",
                    body: JSON.stringify({ team_id: teamId, slug: roomSlug, name: roomName }),
                  });
                  setRoomSlug("");
                  setRoomName("");
                  setMessage(`Room ${r.room.slug} opened.`);
                  void loadRooms(teamId);
                  setRoomId(r.room.id);
                } catch (e2) {
                  setMessage(e2 instanceof Error ? e2.message : "Unable to create room.");
                }
              }}
            >
              <input value={roomSlug} maxLength={60} onChange={(e) => setRoomSlug(e.target.value)} placeholder="war-room" className="w-40 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" />
              <input value={roomName} maxLength={80} onChange={(e) => setRoomName(e.target.value)} placeholder="War Room" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" />
              <button className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">New room</button>
            </form>
            {!!rooms.length && (
              <label className="mt-4 block text-sm">
                Active room
                <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2">
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.slug}) · {r.message_count} msgs{r.bot_sends ? ` · ${r.bot_sends} [BOT]` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-4">
              {!roomId ? (
                <p className="text-sm text-slate-500">No room selected; open one above.</p>
              ) : !messages.length ? (
                <p className="text-sm text-slate-500">No messages yet. Give the order.</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="text-sm">
                    <span className="text-slate-500">{new Date(m.created_at).toLocaleTimeString()} </span>
                    {m.is_bot ? (
                      <span className="mr-1 rounded bg-amber-300 px-1.5 py-0.5 text-[11px] font-black text-slate-950">[BOT]</span>
                    ) : null}
                    <strong className={m.is_bot ? "text-amber-200" : "text-slate-200"}>
                      {m.is_bot ? `[BOT] ${m.sender}` : m.sender}
                    </strong>
                    <span className="text-slate-300">: {m.redacted ? "[redacted]" : m.body}</span>
                    {!m.is_bot && m.encoding === "cipher" ? <span className="ml-1 text-xs text-slate-500">🔒</span> : null}
                  </div>
                ))
              )}
            </div>
            {!!roomId && (
              <form
                className="mt-3 space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await request(`/api/unitunite/rooms/${roomId}/messages`, {
                      method: "POST",
                      body: JSON.stringify(
                        sendAsAgent
                          ? { text: chatText, as_bot: true }
                          : { ciphertext: chatText, device: "web" },
                      ),
                    });
                    setChatText("");
                    setMessage(sendAsAgent ? "Agent relayed your order ([BOT])." : "Message sent (encrypted).");
                    void loadMessages(roomId);
                    void loadRooms(teamId);
                  } catch (e2) {
                    setMessage(e2 instanceof Error ? e2.message : "Unable to send.");
                  }
                }}
              >
                <textarea
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder={sendAsAgent ? "Order your humans (sent as [BOT])…" : "Encrypted message to the room…"}
                  rows={2}
                  maxLength={4000}
                  className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={sendAsAgent} onChange={(e) => setSendAsAgent(e.target.checked)} />
                    Send as my agent ([BOT])
                  </label>
                  <button className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950">Send</button>
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-300"
                    onClick={() => {
                      void loadMessages(roomId);
                      void loadRooms(teamId);
                    }}
                  >
                    Refresh
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">3 · Permissions; defaults, custom encouraged</h2>
        <p className="mt-2 text-sm text-slate-300">
          Start with Owner / Admin / Maintainer / Developer / Viewer / Billing / Security; or the warlord
          ranks Lord / Captain / Infantry / Banker (write or read-only) / Watcher (sees everything, changes
          nothing); then copy one and tweak 1-2 keys into a custom role. Every action below only lights up when
          your workspace grants it.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {groups.map((g) => (
            <div key={g} className="rounded-xl border border-white/10 p-4">
              <h3 className="font-semibold">{GROUP_LABELS[g]}</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {PERMISSION_CATALOG.filter((p) => p.group === g).map((p) => (
                  <li key={p.key} className={canDo(p.key) ? "text-emerald-300" : "text-slate-500"}>
                    {canDo(p.key) ? "●" : "○"} {p.label} <small className="opacity-70">{p.key}</small>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">4 · Cloud services, pay as you go - 25% {UNITUNITE_NAME} cut per workspace</h2>
        <p className="mt-2 text-sm text-slate-300">GPU pods, serverless, storage, databases, queues, CDN, builds, vector DB, inference; all settled in Vibe Coins from the org wallet, metered per {UNITUNITE_NAME} workspace. {WORKSPACE_CUT_NOTE}</p>
        <p className="mt-2 text-sm text-slate-300">✨ Need game art, trailers, voices or music? <a className="font-bold text-fuchsia-300 underline" href="/fal">Open fal.ai Studio - 30 magical media tools</a>, same 25% cut included.</p>
        <p className="mt-2 text-xs text-slate-500">Cheapest viable tier preselected per category: {Object.entries(CHEAPEST_DEFAULTS).map(([c, k]) => `${c}: ${k}`).join(" · ")}. Newest viable runtimes, no extra dependencies.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <div key={s.key} className="rounded-xl border border-white/10 p-4 text-sm">
              <strong>{s.name}</strong> <span className="text-slate-500">· {s.category} · {s.tier}</span>
              <span className="block text-slate-300">{s.coinsPerUnit} coins / {s.unit} (incl. 25% cut)</span>
              <span className="text-slate-500">{s.blurb} · {s.runtime}</span>
            </div>
          ))}
        </div>
      </section>

      <p role="status" className="text-sm text-slate-400">{message}</p>

      <OrgRanks />

      <OrgScale />

      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">5 · Ghost timer; who owes whom</h2>
        <p className="mt-2 text-sm text-slate-300">
          Clock org work to the second and settle up in 👻 Ghost Cash; hypothetical IOUs with no value, just a
          ruler for debts. <a className="font-bold text-cyan-300 underline" href="/timer">Open the timer →</a>
        </p>
      </section>
    </div>
  );
}
