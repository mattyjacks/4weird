"use client";

import { useCallback, useEffect, useState } from "react";
import { InfoTip } from "@/components/ui/info-tip";
import { CompactDetails } from "@/components/ui/compact-details";

type Supporter = {
  user_id: string;
  handle: string;
  coins: number;
  tier: string;
  gifts: number;
  last_gift_at: string;
};

type Supporters = {
  total_support: number;
  donor_count: number;
  supporters: Supporter[];
  me: { coins: number; tier: string; gifts: number } | null;
};

type Tribute = {
  wallet: number;
  daily_upkeep: number;
  reserve_floor: number;
  total_support: number;
  tributed_all_time: number;
  lifetime_cap: number;
  eligible_now: number;
  next_daily_estimate: number;
  reserve_balance: number;
};

type ScalePrune = {
  auto_enabled: boolean;
  threshold: number;
  batch_size: number;
  strategy: string;
  last_run_at: string | null;
  last_pruned: number;
};

type Scale = {
  member_count: number;
  cap: number;
  headroom_slots: number;
  prune: ScalePrune;
};

type Victim = {
  user_id: string;
  display_name: string;
  joined_at: string;
  last_active: string | null;
  xp?: number;
};

const STRATEGIES = [
  { key: "oldest_activity_first", label: "Oldest activity first" },
  { key: "random_chance", label: "Random chance" },
  { key: "oldest_joined_first", label: "Oldest joins first" },
  { key: "never_contributed", label: "Never contributed" },
];

const TIER_BADGE: Record<string, string> = {
  Legend: "🌟",
  Patron: "💎",
  Beacon: "🔥",
  Spark: "✨",
  Ember: "🕯️",
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((body as { error?: unknown }).error ?? `Request failed (${res.status})`));
  return body as T;
}

/**
 * ClanSupport — Clan Supporter Status (exact lifetime totals + tiers),
 * Total Clan Support pile, the Tribute/commons engine status, and the
 * 100k-member scale controls (prune + headroom) for owners/mods.
 */
export function ClanSupport({ slug }: { slug: string }) {
  const [scale, setScale] = useState<Scale | null>(null);
  const [supporters, setSupporters] = useState<Supporters | null>(null);
  const [tribute, setTribute] = useState<Tribute | null>(null);
  const [strategy, setStrategy] = useState("oldest_activity_first");
  const [preview, setPreview] = useState<Victim[]>([]);
  const [victimCount, setVictimCount] = useState(0);
  const [slots, setSlots] = useState("10000");
  const [auto, setAuto] = useState(true);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await request<{ scale: Scale; supporters: Supporters; tribute: Tribute }>(`/api/clans/${slug}/scale`);
      setScale(r.scale);
      setSupporters(r.supporters);
      setTribute(r.tribute);
      setAuto(r.scale.prune.auto_enabled);
      setStrategy(r.scale.prune.strategy);
    } catch {
      // Pre-migration DBs have no scale surface; the upkeep panel above
      // still renders. This panel simply stays empty.
    }
  }, [slug]);

  useEffect(() => { void load(); }, [load]);

  async function prune(dry: boolean) {
    setNote("");
    try {
      const r = await request<{ prune: { victims?: number; removed?: number; preview: Victim[] } }>(`/api/clans/${slug}/scale`, {
        method: "POST",
        body: JSON.stringify({ action: "prune", strategy, limit: 500, dry_run: dry }),
      });
      setPreview(r.prune.preview ?? []);
      setVictimCount(r.prune.victims ?? r.prune.removed ?? 0);
      setNote(dry
        ? `${r.prune.victims ?? 0} member(s) would be pruned by ${strategy}.`
        : `Pruned ${r.prune.removed ?? 0} member(s).`);
      if (!dry) await load();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Prune failed (owner/mod only).");
    }
  }

  async function saveAuto() {
    setNote("");
    try {
      await request(`/api/clans/${slug}/scale`, {
        method: "POST",
        body: JSON.stringify({
          action: "prune-settings",
          auto_enabled: auto,
          threshold: scale?.prune.threshold ?? 90000,
          batch_size: scale?.prune.batch_size ?? 500,
          strategy,
        }),
      });
      setNote(auto ? "Automated pruning armed at 90k." : "Automated pruning off. Manual prune still available.");
      await load();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Settings failed (owner/mod only).");
    }
  }

  async function buyHeadroom() {
    setNote("");
    try {
      const r = await request<{ headroom: { slots: number; gross_coins: number; cap: number } }>(`/api/clans/${slug}/scale`, {
        method: "POST",
        body: JSON.stringify({ action: "headroom", slots: Number(slots) || 0 }),
      });
      setNote(`+${r.headroom.slots.toLocaleString()} slots for ${r.headroom.gross_coins} coins (25% cut included). Cap now ${r.headroom.cap.toLocaleString()}.`);
      await load();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Headroom purchase failed (owner only).");
    }
  }

  if (!scale && !supporters) return null;

  const pct = scale && scale.cap > 0 ? Math.min(100, Math.round((scale.member_count / scale.cap) * 100)) : 0;
  const tributePct = tribute && tribute.lifetime_cap > 0
    ? Math.min(100, Math.round((tribute.tributed_all_time / tribute.lifetime_cap) * 100))
    : 0;

  return (
    <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
      <h2 className="font-bold text-amber-300">💛 Clan Supporter Status + commons</h2>
      <p className="mt-1 text-xs text-slate-400">
        Every upkeep donation is receipted forever — this panel shows exactly how many coins each
        supporter has dumped into the clan, the Total Clan Support pile, and what the tribute
        commons does with the surplus. Posting is never required to support.
      </p>

      {supporters && (
        <div className="mt-3">
          <p className="text-sm text-slate-200">
            Total Clan Support: <b>{Number(supporters.total_support).toLocaleString()} coins</b>
            {" "}· {supporters.donor_count} giver(s)
            <InfoTip text="Lifetime gifts to this clan. Every coin is receipted here." label="About total support" />
            {supporters.me && (
              <span className="ml-2 rounded bg-black/40 px-2 py-1 text-xs">
                You: {supporters.me.coins} coins · {TIER_BADGE[supporters.me.tier] ?? ""}{supporters.me.tier}
              </span>
            )}
          </p>
          {supporters.supporters.length > 0 && (
            <ol className="mt-2 space-y-1 text-sm text-slate-300">
              {supporters.supporters.slice(0, 10).map((s) => (
                <li key={s.user_id} className="flex flex-wrap justify-between gap-2 border-t border-white/5 pt-1">
                  <span>{TIER_BADGE[s.tier] ?? ""} {s.handle} <span className="text-xs text-slate-500">· {s.tier} · {s.gifts} gift(s)</span></span>
                  <span className="font-bold text-white">{Number(s.coins).toLocaleString()}</span>
                </li>
              ))}
            </ol>
          )}
          <CompactDetails summary="Supporter tiers?">
            <p className="mt-2 text-xs text-slate-500">Tiers: 🕯️Ember 1+ · ✨Spark 25+ · 🔥Beacon 100+ · 💎Patron 500+ · 🌟Legend 2,500+. Tiers are thank-yous based on lifetime gifts. No perks, no payoffs.</p>
          </CompactDetails>
        </div>
      )}

      {tribute && (
        <CompactDetails summary="Tribute commons sweep">
          <div className="mt-4 rounded-lg bg-black/40 px-3 py-2 text-xs text-slate-300">
            <p className="font-bold text-white">🔄 Tribute commons (daily sweep)</p>
            <p className="mt-1">
              Donations older than 6 months past a full year of upkeep ({Number(tribute.reserve_floor).toLocaleString()} coins
              protected) become eligible, oldest-expiry first. At most half of all donated coins can ever leave
              ({Number(tribute.tributed_all_time).toLocaleString()} / {Number(tribute.lifetime_cap).toLocaleString()} so far — {tributePct}%),
              at ~1% of the eligible surplus per day (≈69-day half-life). Coins older than 12 months are{" "}
              <b>Globalized</b> into the central reserve (now {Number(tribute.reserve_balance).toLocaleString()} coins, which
              auto-rescues delinquent clans); 6–12-month coins are <b>Given as Tribute</b> — 70% to the poorest
              clans, 20% to the reserve, 10% to poor individuals. Expired lots never travel. Tribute is final.
            </p>
            {tribute.next_daily_estimate > 0 && (
              <p className="mt-1">Next sweep moves ≈ <b>{tribute.next_daily_estimate}</b> coins.</p>
            )}
          </div>
        </CompactDetails>
      )}

      {scale && (
        <div className="mt-4">
          <p className="text-sm text-slate-200">
            <b>{scale.member_count.toLocaleString()}</b> / {scale.cap.toLocaleString()} members ({pct}%)
            {scale.headroom_slots > 0 && <span className="ml-2 text-xs text-slate-400">+{scale.headroom_slots.toLocaleString()} headroom</span>}
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-amber-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2 text-sm">
            <label className="text-xs text-slate-400">
              Auto-prune at 90k <InfoTip text="Auto cleanup. When the clan nears 90k members, idle members are removed first." label="About auto-prune" />
              <select aria-label="Auto-prune" value={auto ? "on" : "off"} onChange={(e) => setAuto(e.target.value === "on")} className="ml-2 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-white">
                <option value="on">On (default)</option>
                <option value="off">Off</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Strategy <InfoTip text="Who goes first when pruning: oldest idle, random, oldest joined, or never active." label="About prune order" />
              <select aria-label="Strategy" value={strategy} onChange={(e) => setStrategy(e.target.value)} className="ml-2 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-white">
                {STRATEGIES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            <button onClick={saveAuto} className="rounded-lg bg-cyan-400 px-3 py-1 text-xs font-bold text-slate-950">Save</button>
            <button onClick={() => void prune(true)} className="rounded-lg border border-white/20 px-3 py-1 text-xs">Preview</button>
            <button onClick={() => { if (window.confirm("Prune these members for real? The owner is never removed.")) void prune(false); }} className="rounded-lg border border-red-300/50 px-3 py-1 text-xs text-red-200">Prune now</button>
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-2 text-sm">
            <label className="text-xs text-slate-400">
              Headroom (10 coins / 1,000 slots) <InfoTip text="Extra member space. Paid slots raise the clan cap." label="About headroom" />
              <input aria-label="Headroom slots" value={slots} onChange={(e) => setSlots(e.target.value)} inputMode="numeric" className="ml-2 w-28 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-white" />
            </label>
            <button onClick={buyHeadroom} className="rounded-lg bg-emerald-400 px-3 py-1 text-xs font-bold text-slate-950">Buy slots</button>
          </div>
          {preview.length > 0 && (
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-slate-400">
              <li>Showing {preview.length} of {victimCount}:</li>
              {preview.map((v) => (
                <li key={v.user_id}>{v.display_name} · joined {new Date(v.joined_at).toLocaleDateString()} · last active {v.last_active ? new Date(v.last_active).toLocaleDateString() : "never"}{v.xp != null ? ` · ${v.xp} XP` : ""}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {note && <p role="status" className="mt-2 text-sm text-slate-300">{note}</p>}
    </section>
  );
}
