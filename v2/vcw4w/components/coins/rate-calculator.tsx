"use client";

import { useMemo, useState } from "react";

const PRESETS = [
  { id: "rtx4090", label: "RTX 4090 · pinned render/agent worker", coinsPerHour: 99 },
  { id: "a100", label: "A100 80GB · heavy training", coinsPerHour: 150 },
  { id: "rtx3090", label: "RTX 3090 · budget GPU", coinsPerHour: 60 },
  { id: "cpu", label: "CPU desktop · light work", coinsPerHour: 10 },
  { id: "game", label: "Default game play rate", coinsPerHour: 1 },
] as const;

/**
 * Interactive rate calculator: pick a GPU preset (or type a custom
 * coins/hr rate), slide a duration, see exact Vibe Coins + USD.
 * 100 Vibe Coins = exactly $1.00; metering is per second.
 */
export function RateCalculator() {
  const [presetId, setPresetId] = useState<string>(PRESETS[0].id);
  const [customRate, setCustomRate] = useState("99");
  const [minutes, setMinutes] = useState(60);

  const rate = useMemo(() => {
    if (presetId === "custom") {
      const n = Number.parseFloat(customRate);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    }
    return PRESETS.find((p) => p.id === presetId)?.coinsPerHour ?? 0;
  }, [presetId, customRate]);

  const coins = (rate * minutes) / 60;
  const usd = coins / 100;

  return (
    <div className="rounded-2xl border border-cyan-300/30 bg-black/30 p-4">
      <h3 className="text-sm font-black uppercase tracking-widest text-cyan-200">
        Rate calculator <span className="normal-case tracking-normal text-slate-400">· per-second metering</span>
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-bold text-slate-300">
          GPU / workload
          <select
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 px-2 py-1.5 text-sm font-semibold text-white"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.coinsPerHour} 🪙/hr)
              </option>
            ))}
            <option value="custom">Custom rate…</option>
          </select>
        </label>
        {presetId === "custom" ? (
          <label className="block text-xs font-bold text-slate-300">
            Custom rate (coins/hr)
            <input
              value={customRate}
              onChange={(e) => setCustomRate(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 px-2 py-1.5 text-sm font-semibold text-white"
            />
          </label>
        ) : (
          <p className="self-end text-xs text-slate-400">
            Rate: <strong className="text-white">{rate} coins/hr</strong> (${(rate / 100).toFixed(2)}/hr)
          </p>
        )}
        <label className="block text-xs font-bold text-slate-300">
          Duration: {minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`}
          <input
            type="range"
            min={1}
            max={600}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="mt-1 w-full"
            aria-label="Duration in minutes"
          />
        </label>
      </div>
      <p className="mt-3 rounded-xl bg-cyan-300/10 px-3 py-2 text-sm text-slate-200" role="status">
        Cost: <strong className="text-white">{coins < 0.01 && coins > 0 ? "<0.01" : coins.toFixed(2)} 🪙</strong>{" "}
        = <strong className="text-white">${usd.toFixed(2)}</strong>{" "}
        <span className="text-slate-400">(25% cut already inside, never on top)</span>
      </p>
    </div>
  );
}
