"use client";

export type MmoAgeBand = "kids" | "teens" | "adults";

const STYLES: Record<MmoAgeBand, string> = {
  kids: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  teens: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  adults: "border-rose-300/30 bg-rose-300/10 text-rose-200",
};

const LABELS: Record<MmoAgeBand, string> = {
  kids: "Kids",
  teens: "Teens 13+",
  adults: "Adults 18+",
};

function normalize(value: unknown): MmoAgeBand | null {
  if (value === "kids" || value === "teens" || value === "adults") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "kids" || v === "kid" || v === "everyone") return "kids";
    if (v === "teens" || v === "teen" || v === "13+") return "teens";
    if (v === "adults" || v === "adult" || v === "18+") return "adults";
  }
  return null;
}

/**
 * AgeBadge — SSR-safe presentational badge for an MMORPG server's age band.
 * Fail-open: unknown/missing bands render a neutral "All ages" badge so an
 * offline or schema-drifted API response never breaks the list.
 */
export function AgeBadge({ band }: { band: unknown }) {
  const normalized = normalize(band);
  if (!normalized) {
    return (
      <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[.06] px-2.5 py-0.5 text-xs font-semibold text-slate-300">
        All ages
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[normalized]}`}
    >
      {LABELS[normalized]}
    </span>
  );
}
