"use client";

// RaidBossBar: one shared boss HP bar for the whole raid.
// Pure props, SSR-safe (no browser APIs), fail-open (missing or
// invalid numbers render an "unknown" bar, never throw). ASCII-only.

export interface RaidBossBarProps {
  name?: string | null;
  hp?: number | null;
  maxHp?: number | null;
  phase?: number | null;
  phases?: number | null;
  enraged?: boolean | null;
}

function toFiniteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function RaidBossBar({ name, hp, maxHp, phase, phases, enraged }: RaidBossBarProps) {
  const label = typeof name === "string" && name.length > 0 ? name : "Unknown Boss";
  const cur = toFiniteOrNull(hp);
  const max = toFiniteOrNull(maxHp);
  const known = cur !== null && max !== null && (max as number) > 0;
  const ratio = known
    ? Math.min(1, Math.max(0, (cur as number) / (max as number)))
    : 0;
  const pct = known ? Math.round(ratio * 100) : 0;
  const phaseNum = toFiniteOrNull(phase);
  const phaseTotal = toFiniteOrNull(phases);
  const phaseText =
    phaseNum !== null && phaseTotal !== null && (phaseTotal as number) > 0
      ? `Phase ${Math.max(1, Math.floor(phaseNum as number))}/${Math.max(1, Math.floor(phaseTotal as number))}`
      : phaseNum !== null
        ? `Phase ${Math.max(1, Math.floor(phaseNum as number))}`
        : null;
  const rage = enraged === true;

  return (
    <section aria-label={`Boss: ${label}`} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-black uppercase tracking-widest text-red-300">{label}</h2>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {phaseText ? <span>{phaseText}</span> : null}
          {rage ? <span className="font-bold text-red-400">ENRAGED</span> : null}
          <span className="tabular-nums">
            {known ? `${Math.max(0, Math.floor(cur as number))}/${Math.max(0, Math.floor(max as number))} (${pct}%)` : "HP unknown"}
          </span>
        </div>
      </div>
      <div
        className="mt-3 h-4 overflow-hidden rounded-full border border-red-400/20 bg-white/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} HP`}
      >
        <div
          className={rage ? "h-full rounded-full bg-red-500" : "h-full rounded-full bg-gradient-to-r from-red-500 to-amber-300"}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!known ? (
        <p className="mt-2 text-xs text-slate-500">Waiting for boss snapshot...</p>
      ) : null}
    </section>
  );
}
