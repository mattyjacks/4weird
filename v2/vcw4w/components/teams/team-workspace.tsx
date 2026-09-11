"use client";

import { useCallback, useEffect, useState } from "react";
import { PERMISSION_CATALOG, GROUP_LABELS, type PermissionGroup } from "@/lib/permissions";
import { CLOUD_SERVICES, CHEAPEST_DEFAULTS, WORKSPACE_CUT_NOTE } from "@/lib/cloud-catalog";
import { UNITUNITE_NAME, UNITUNITE_TAGLINE } from "@/lib/unitunite";

type Org = { id: string; slug: string; name: string };
type Team = { id: string; org_id: string; slug: string; name: string };

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

  const load = useCallback(async () => {
    // Orgs and teams load independently: one failing must not blank the other.
    const [orgsResult, teamsResult] = await Promise.allSettled([
      request<{ orgs: Org[] }>("/api/orgs"),
      request<{ teams: Team[] }>("/api/teams"),
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
      problems.push(teamsResult.reason instanceof Error ? teamsResult.reason.message : "Unable to load teams.");
    }
    setMessage(problems.length ? problems.join(" ") : "Create an org, open a workspace, invite your team.");
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!teamId) return;
    request<{ permissions: string[] }>(`/api/teams/${teamId}/perms`)
      .then((r) => setPerms(r.permissions ?? []))
      .catch(() => setPerms([]));
  }, [teamId]);

  const canDo = (key: string) => perms.includes(key);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">1 · Organization</h2>
        <p className="mt-2 text-sm text-slate-300">
          Orgs keep billing, wallets, and audit separate. Pay as you go: buy Vibe Coins (100 coins = $1.00),
          fund the org wallet, and every cloud service meters from it — never a surprise bill.
        </p>
        <form
          className="mt-4 flex flex-wrap gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await request("/api/orgs", { method: "POST", body: JSON.stringify({ slug: orgSlug, name: orgName }) });
              setOrgSlug("");
              setOrgName("");
              setMessage("Org created — you are its owner.");
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
        <p className="mt-2 text-sm text-slate-400">{orgs.length ? `${orgs.length} org(s): ${orgs.map((o) => o.slug).join(", ")}` : "No orgs yet."}</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="text-xl font-bold">2 · {UNITUNITE_NAME} workspace <span className="text-sm font-normal text-slate-400">— {UNITUNITE_TAGLINE}</span></h2>
        <p className="mt-2 text-sm text-slate-300">{UNITUNITE_NAME} workspaces are securely separate: UnitUnite projects, UnitUnite team messaging (rooms), and keys never leak across teams.</p>
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
        <h2 className="text-xl font-bold">3 · Permissions — defaults, custom encouraged</h2>
        <p className="mt-2 text-sm text-slate-300">
          Start with Owner / Admin / Maintainer / Developer / Viewer / Billing / Security, then copy one and tweak
          1–2 keys into a custom role. Every action below only lights up when your workspace grants it.
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
        <h2 className="text-xl font-bold">4 · Cloud services, pay as you go — 25% {UNITUNITE_NAME} cut per workspace</h2>
        <p className="mt-2 text-sm text-slate-300">GPU pods, serverless, storage, databases, queues, CDN, builds, vector DB, inference — all settled in Vibe Coins from the org wallet, metered per {UNITUNITE_NAME} workspace. {WORKSPACE_CUT_NOTE}</p>
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
    </div>
  );
}
