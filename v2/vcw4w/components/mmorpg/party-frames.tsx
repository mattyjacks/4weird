"use client";

// PartyFrames: 32-slot HP bar grid fed by peer snapshots.
// Pure props, SSR-safe (no browser APIs), fail-open (bad rows render
// as empty slots, never throw). ASCII-only.

export interface PartyPeerSnapshot {
  id: string;
  name?: string;
  hp?: number;
  maxHp?: number;
  alive?: boolean;
}

export interface PartyFramesProps {
  peers?: PartyPeerSnapshot[] | null;
  localId?: string | null;
  title?: string | null;
}

export const PARTY_MAX_SLOTS = 32;

function toFinite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampRatio(hp: number, maxHp: number): number {
  if (!(maxHp > 0)) return 0;
  if (!(hp > 0)) return 0;
  const ratio = hp / maxHp;
  if (!(ratio > 0)) return 0;
  return ratio > 1 ? 1 : ratio;
}

function barColor(ratio: number, dead: boolean): string {
  if (dead) return "bg-slate-600";
  if (ratio > 0.5) return "bg-emerald-400";
  if (ratio > 0.25) return "bg-amber-300";
  return "bg-red-400";
}

export function PartyFrames({ peers, localId, title }: PartyFramesProps) {
  const list: PartyPeerSnapshot[] = Array.isArray(peers) ? peers : [];
  const slots: Array<PartyPeerSnapshot | null> = [];
  for (let i = 0; i < PARTY_MAX_SLOTS; i += 1) {
    const raw = list[i];
    if (raw && typeof raw === "object" && typeof raw.id === "string" && raw.id.length > 0) {
      slots.push(raw);
    } else {
      slots.push(null);
    }
  }
  const aliveCount = slots.filter((s) => {
    if (!s) return false;
    if (s.alive === false) return false;
    return toFinite(s.hp, 0) > 0;
  }).length;
  const heading = typeof title === "string" && title.length > 0 ? title : "Party";
  const you = typeof localId === "string" ? localId : "";

  return (
    <section aria-label={heading} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">{heading}</h2>
        <p className="text-xs text-slate-500">
          {aliveCount}/{PARTY_MAX_SLOTS} up
        </p>
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {slots.map((peer, index) => {
          if (!peer) {
            return (
              <li
                key={`empty-${index}`}
                className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-xs text-slate-600"
              >
                -- empty --
              </li>
            );
          }
          const name =
            typeof peer.name === "string" && peer.name.length > 0 ? peer.name : peer.id;
          const hp = toFinite(peer.hp, 0);
          const maxHp = toFinite(peer.maxHp, 0);
          const dead = peer.alive === false || hp <= 0;
          const ratio = dead ? 0 : clampRatio(hp, maxHp);
          const pct = Math.round(ratio * 100);
          const isYou = you.length > 0 && peer.id === you;
          return (
            <li
              key={peer.id}
              className={
                isYou
                  ? "rounded-xl border border-cyan-300/50 bg-cyan-300/[.06] px-3 py-2"
                  : "rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              }
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-xs font-bold text-white">
                  {name}
                  {isYou ? " (you)" : ""}
                </p>
                <p className="shrink-0 text-[11px] tabular-nums text-slate-400">
                  {dead ? "DOWN" : `${Math.max(0, Math.floor(hp))}/${Math.max(0, Math.floor(maxHp))}`}
                </p>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${name} HP`}
              >
                <div className={`h-full rounded-full ${barColor(ratio, dead)}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
