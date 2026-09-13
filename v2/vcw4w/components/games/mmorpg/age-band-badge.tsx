"use client";

import type { MmorpgAgeBand } from "./mmorpg-age";

const BAND_STYLE: Record<MmorpgAgeBand, { label: string; className: string; emoji: string }> = {
  kids: {
    label: "Kids",
    emoji: "🧒",
    className: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
  },
  teens: {
    label: "Teens 13+",
    emoji: "🧑",
    className: "border-amber-300/30 bg-amber-400/10 text-amber-200",
  },
  adults: {
    label: "Adults 18+",
    emoji: "🔞",
    className: "border-rose-300/30 bg-rose-400/10 text-rose-200",
  },
};

/**
 * AgeBandBadge; tiny fail-open badge for a server's age band.
 * SSR-safe: pure render, no browser APIs. Unknown bands render "All ages".
 */
export function AgeBandBadge({ band }: { band: MmorpgAgeBand | string | null | undefined }) {
  const key: MmorpgAgeBand = band === "teens" || band === "adults" || band === "kids" ? band : "kids";
  const style = BAND_STYLE[key];
  const unknown = band !== "kids" && band !== "teens" && band !== "adults";
  return (
    <span
      data-testid="age-band-badge"
      data-band={key}
      title={unknown ? "Unknown band treated as kids (most restrictive display)" : `${style.label} server`}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.className}`}
    >
      <span aria-hidden="true">{style.emoji}</span>
      {unknown ? "All ages" : style.label}
    </span>
  );
}
