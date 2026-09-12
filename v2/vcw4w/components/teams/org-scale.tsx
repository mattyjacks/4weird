"use client";

import { useCallback, useEffect, useState } from "react";

type ScalePrune = {
  auto_enabled: boolean;
  threshold: number;
  batch_size: number;
  strategy: string;
  last_run_at: string | null;
  last_pruned: number;
};

type ScaleStatus = {
  member_count: number;
  cap: number;
  seats: number | null;
  self_hosted: boolean;
  headroom_slots: number;
  prune: ScalePrune;
};

type Victim = {
  user_id: string;
  display_name: string;
  joined_at: string;
  last_active: string | null;
};

const STRATEGIES = [
  { key: "oldest_activity_first", label: "Oldest activity first (never-active go first)" },
  { key: "random_chance", label: "Random chance" },
  { key: "oldest_joined_first", label: "Oldest joins first" },
  { key: "never_contributed", label: "Never contributed anything" },
];

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String((body as { error?: unknown }).error ?? `Request failed (${response.status})`));
  return body as T;
}

/**
 * OrgScale - big-org controls: live cap meter (10,000 + headroom, or
 * purchased seats on self-hosted servers), Automated Member Pruning
 * (opt-in at 9,000), strategy dry-runs, manual prune, paid headroom.
 */
export function OrgScale() {
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [orgId, setOrgId] = useState("");
  const [scale, setScale] = useState<ScaleStatus | null>(null);
  const [auto, setAuto] = useState(false);
  const [threshold, setThreshold] = useState("9000");
  const [batch, setBatch] = useState("200");
  const [strategy, setStrategy] = useState("oldest_activity_first");
  const [preview, setPreview] = useState<Victim[]>([]);
  const [victimCount, setVictimCount] = useState(0);
  const [slots, setSlots] = useState("1000");
  const [message, setMessage] = useState("Pick an org to manage its scale.");

  const load = useCallback(async (org: string) => {
    if (!org) return;
    try {
      const r = await request<{ scale: ScaleStatus }>(`/api/orgs/${org}/scale`);
      setScale(r.scale);
      setAuto(r.scale.prune.auto_enabled);
      setThreshold(String(r.scale.prune.threshold));
      setBatch(String(r.scale.prune.batch_size));
      setStrategy(r.scale.prune.strategy);
      setMessage("");
    } catch (error) {
      setScale(null);
      setMessage(error instanceof Error ? error.message : "Unable to load scale status.");
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

  async function saveSettings() {
    try {
      const r = await request<{ settings: ScalePrune }>(`/api/orgs/${orgId}/scale`, {
        method: "POST",
        body: JSON.stringify({
          action: "prune-settings",
          auto_enabled: auto,
          threshold: Number(threshold) || 9000,
          batch_size: Number(batch) || 200,
          strategy,
        }),
      });
      setScale((s) => (s ? { ...s, prune: r.settings } : s));
      setMessage(auto ? "Automated pruning armed." : "Automated pruning off. Manual prune still available.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save settings.");
    }
  }

  async function dryRun() {
    try {
      const r = await request<{ prune: { victims: number; preview: Victim[] } }>(`/api/orgs/${orgId}/scale`, {
        method: "POST",
        body: JSON.stringify({ action: "prune", strategy, limit: 200, dry_run: true }),
      });
      setPreview(r.prune.preview ?? []);
      setVictimCount(r.prune.victims ?? 0);
      setMessage(r.prune.victims ? `${r.prune.victims} member(s) would be pruned by ${strategy}.` : "Nobody matches - nothing would be pruned.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dry run failed.");
    }
  }

  async function pruneNow() {
    if (!window.confirm("Prune these members for real? Owners are never removed.")) return;
    try {
      const r = await request<{ prune: { removed: number } }>(`/api/orgs/${orgId}/scale`, {
        method: "POST",
        body: JSON.stringify({ action: "prune", strategy, limit: 200 }),
      });
      setMessage(`Pruned ${r.prune.removed} member(s).`);
      setPreview([]);
      await load(orgId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Prune failed.");
    }
  }

  async function buyHeadroom() {
    try {
      const r = await request<{ headroom: { slots: number; gross_coins: number; cap: number } }>(`/api/orgs/${orgId}/scale`, {
        method: "POST",
        body: JSON.stringify({ action: "headroom", slots: Number(slots) || 0 }),
      });
      setMessage(`+${r.headroom.slots} slots for ${r.headroom.gross_coins} coins (25% cut included). Cap now ${r.headroom.cap}.`);
      await load(orgId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Headroom purchase failed.");
    }
  }

  const pct = scale && scale.cap > 0 ? Math.min(100, Math.round((scale.member_count / scale.cap) * 100)) : 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
      <h2 className="text-xl font-bold">📈 Scale - 10,000 seats, pruning, headroom</h2>
      <p className="mt-2 text-sm text-slate-300">
        Orgs hold up to <b>10,000 members</b> (+ prepaid headroom). Self-hosted servers are capped by{" "}
        <b>purchased seats</b> instead. Rosters page 100 at a time with search, so 8,000-member orgs
        still load instantly. Owners are never pruned; strategy sweeps spare joins younger than 7 days.
      </p>
      <label className="mt-4 block text-sm" htmlFor="scale-org">
        Org
        <select id="scale-org" name="org" value={orgId} onChange={(e) => setOrgId(e.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-black/30 px-3 py-2">
          <option value="">Pick an org…</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
      <p role="status" className="mt-2 text-sm text-slate-400">{message}</p>
      {scale && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm">
              <b>{scale.member_count.toLocaleString()}</b> / {scale.cap.toLocaleString()} members ({pct}%)
              {scale.self_hosted && <span className="ml-2 rounded-full bg-amber-300/15 px-2 py-0.5 text-xs text-amber-200">self-hosted · {scale.seats} seats</span>}
              {scale.headroom_slots > 0 && <span className="ml-2 text-xs text-slate-400">+{scale.headroom_slots} headroom</span>}
            </p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-cyan-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="font-semibold">🧹 Automated Member Pruning {scale.prune.auto_enabled ? "(armed)" : "(off)"}</p>
            <p className="mt-1 text-xs text-slate-400">
              When enabled, the daily sweep prunes down from {scale.prune.threshold.toLocaleString()} members.
              {scale.prune.last_run_at && ` Last run pruned ${scale.prune.last_pruned}.`}
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3 text-sm">
              <label>
                <span className="text-xs text-slate-400">Auto-prune</span>
                <select aria-label="Auto-prune" value={auto ? "on" : "off"} onChange={(e) => setAuto(e.target.value === "on")} className="ml-2 rounded-lg border border-white/15 bg-black/30 px-2 py-1">
                  <option value="off">Off</option>
                  <option value="on">On (arms at threshold)</option>
                </select>
              </label>
              <label>
                <span className="text-xs text-slate-400">Threshold</span>
                <input aria-label="Threshold" value={threshold} onChange={(e) => setThreshold(e.target.value)} inputMode="numeric" className="ml-2 w-24 rounded-lg border border-white/15 bg-black/30 px-2 py-1" />
              </label>
              <label>
                <span className="text-xs text-slate-400">Batch</span>
                <input aria-label="Batch" value={batch} onChange={(e) => setBatch(e.target.value)} inputMode="numeric" className="ml-2 w-20 rounded-lg border border-white/15 bg-black/30 px-2 py-1" />
              </label>
              <label>
                <span className="text-xs text-slate-400">Strategy</span>
                <select aria-label="Strategy" value={strategy} onChange={(e) => setStrategy(e.target.value)} className="ml-2 rounded-lg border border-white/15 bg-black/30 px-2 py-1">
                  {STRATEGIES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </label>
              <button onClick={saveSettings} className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950">Save</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={dryRun} className="rounded-full border border-white/20 px-3 py-1 text-xs">Preview victims</button>
              <button onClick={pruneNow} className="rounded-full border border-red-300/50 px-3 py-1 text-xs text-red-200">Prune now</button>
            </div>
            {preview.length > 0 && (
              <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-300">
                <li className="text-slate-500">Showing {preview.length} of {victimCount} (oldest-activity first):</li>
                {preview.map((v) => (
                  <li key={v.user_id}>{v.display_name} · joined {new Date(v.joined_at).toLocaleDateString()} · last active {v.last_active ? new Date(v.last_active).toLocaleDateString() : "never"}</li>
                ))}
              </ul>
            )}
          </div>
          {!scale.self_hosted && (
            <div className="rounded-xl border border-white/10 p-4">
              <p className="font-semibold">🎟️ Paid headroom - 10 coins per 100 slots (25% cut included)</p>
              <p className="mt-1 text-xs text-slate-400">Prepaid cloud compute that lifts the ceiling. Upkeep still meters per member afterwards.</p>
              <div className="mt-2 flex gap-2">
                <input aria-label="Headroom slots" value={slots} onChange={(e) => setSlots(e.target.value)} inputMode="numeric" className="w-32 rounded-lg border border-white/15 bg-black/30 px-3 py-1 text-sm" />
                <button onClick={buyHeadroom} className="rounded-full bg-emerald-300 px-3 py-1 text-xs font-bold text-slate-950">Buy slots</button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
