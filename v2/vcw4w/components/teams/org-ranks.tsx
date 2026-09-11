"use client";

import { useCallback, useEffect, useState } from "react";

type RosterMember = { id: string; display_name: string; roles: string[] };
type Scope = { watcher_id: string; targets: string[] };
type Role = { key: string; scope: string; label: string };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String((body as { error?: unknown }).error ?? `Request failed (${response.status})`));
  return body as T;
}

const PRESETS = ["lord", "captain", "infantry", "banker", "banker_readonly", "watcher"];

/**
 * OrgRanks; assign rank presets (Lord/Captain/Infantry/Banker/Watcher and
 * the classics) as multi-role bundles per member, different per org, plus
 * Watcher scoping. Power is always the union; enforced server-side.
 */
export function OrgRanks() {
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [orgId, setOrgId] = useState("");
  const [members, setMembers] = useState<RosterMember[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [catalog, setCatalog] = useState<Role[]>([]);
  const [message, setMessage] = useState("Pick an org to manage its ranks.");

  const load = useCallback(async (org: string) => {
    if (!org) return;
    try {
      const [roster, roles] = await Promise.all([
        request<{ members: RosterMember[]; scopes: Scope[] }>(`/api/orgs/${org}/members`),
        request<{ roles: Role[] }>("/api/orgs/roles").catch(() => ({ roles: [] as Role[] })),
      ]);
      setMembers(roster.members ?? []);
      setScopes(roster.scopes ?? []);
      setCatalog(roles.roles ?? []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load roster.");
    }
  }, []);

  useEffect(() => {
    request<{ orgs: Array<{ id: string; name: string }> }>("/api/orgs")
      .then((r) => {
        setOrgs(r.orgs ?? []);
        if (r.orgs?.length === 1) setOrgId(r.orgs[0].id);
      })
      .catch(() => setMessage("Unable to load orgs."));
  }, []);
  useEffect(() => { void load(orgId); }, [orgId, load]);

  const labelOf = (key: string) => catalog.find((r) => r.key === key)?.label ?? key;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.display_name ?? `${id.slice(0, 8)}…`;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
      <h2 className="text-xl font-bold">👑 Ranks - Lords, Captains, Infantry, Bankers, Watchers</h2>
      <p className="mt-2 text-sm text-slate-300">
        One member can hold several presets at once (e.g. Banker + Watcher), different in every org; power is always
        the union. <b>Watcher</b> sees everything and changes nothing; scope a watcher to certain members or leave them
        org-wide. Everyone may join up to 100 orgs, each with its own bosses.
      </p>
      <label className="mt-4 block text-sm" htmlFor="ranks-org">
        Org
        <select id="ranks-org" name="org" value={orgId} onChange={(e) => setOrgId(e.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-black/30 px-3 py-2">
          <option value="">Pick an org…</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
      <p role="status" className="mt-2 text-sm text-slate-400">{message}</p>
      <div className="mt-4 space-y-3">
        {members.map((m) => (
          <MemberRanks
            key={m.id}
            orgId={orgId}
            member={m}
            scopes={scopes.find((s) => s.watcher_id === m.id)?.targets ?? null}
            members={members}
            labelOf={labelOf}
            nameOf={nameOf}
            refresh={() => load(orgId)}
          />
        ))}
      </div>
    </section>
  );
}

function MemberRanks({ orgId, member, scopes, members, labelOf, nameOf, refresh }: {
  orgId: string;
  member: RosterMember;
  scopes: string[] | null;
  members: RosterMember[];
  labelOf: (k: string) => string;
  nameOf: (id: string) => string;
  refresh: () => void;
}) {
  const [picked, setPicked] = useState<string[]>(member.roles);
  const [targets, setTargets] = useState<string[]>(scopes ?? []);
  const [message, setMessage] = useState("");
  const scopesKey = (scopes ?? []).join(",");
  useEffect(() => { setPicked(member.roles); }, [member.roles]);
  useEffect(() => { setTargets(scopes ?? []); }, [scopesKey]);

  function toggle(list: string[], v: string, set: (n: string[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function saveRoles() {
    try {
      const r = await request<{ roles: string[] }>(`/api/orgs/${orgId}/members/roles`, {
        method: "PUT",
        body: JSON.stringify({ user_id: member.id, roles: picked.length ? picked : ["viewer"] }),
      });
      setMessage(`Ranks now: ${(r.roles ?? []).join(", ")}.`);
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to assign ranks.");
    }
  }

  async function saveScope() {
    try {
      const r = await request<{ targets: number }>(`/api/orgs/${orgId}/watch`, {
        method: "PUT",
        body: JSON.stringify({ watcher_id: member.id, targets }),
      });
      setMessage(r.targets ? `Watching ${r.targets} member(s).` : "Watching the whole org.");
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to set scope.");
    }
  }

  const isWatcher = picked.includes("watcher") || member.roles.includes("watcher");

  return (
    <div className="rounded-xl border border-white/10 p-4">
      <p className="font-semibold">{member.display_name} <small className="text-slate-500">{member.roles.join(", ") || "viewer"}</small></p>
      <div className="mt-2 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <label key={p} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${picked.includes(p) ? "border-cyan-300 bg-cyan-300/15 text-cyan-200" : "border-white/15 text-slate-400"}`}>
            <input type="checkbox" className="mr-1" checked={picked.includes(p)} onChange={() => toggle(picked, p, setPicked)} />
            {labelOf(p)}
          </label>
        ))}
        <button onClick={saveRoles} className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950">Save ranks</button>
      </div>
      {isWatcher && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="text-xs text-slate-400">👁️ Watch scope (none checked = whole org):</p>
          <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
            {members.filter((m) => m.id !== member.id).map((m) => (
              <label key={m.id} className="cursor-pointer rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300">
                <input type="checkbox" className="mr-1" checked={targets.includes(m.id)} onChange={() => toggle(targets, m.id, setTargets)} />
                {m.display_name}
              </label>
            ))}
          </div>
          <button onClick={saveScope} className="mt-2 rounded-full border border-white/20 px-3 py-1 text-xs">Save scope ({targets.length ? `${targets.length} member(s): ${targets.map(nameOf).join(", ")}` : "whole org"})</button>
        </div>
      )}
      {message && <p role="status" className="mt-2 text-xs text-slate-400">{message}</p>}
    </div>
  );
}
