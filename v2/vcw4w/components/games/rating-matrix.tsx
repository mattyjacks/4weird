import { RATING_LABEL, RATING_MIN_AGE, type AgeRating } from "@/lib/age-gate";

const BANDS: Array<{ band: AgeRating; ages: string; minAge: number }> = [
  { band: "kids", ages: "0–12", minAge: 0 },
  { band: "teens", ages: "13–17", minAge: 13 },
  { band: "adults", ages: "18+", minAge: 18 },
];

const DOT: Record<AgeRating, string> = { kids: "🟢", teens: "🟡", adults: "🔴" };
const SHORT: Record<AgeRating, string> = { kids: "Kids", teens: "Teens", adults: "Adults" };

/**
 * RatingMatrix — shows ALL THREE age bands (kids / teens / adults) with
 * Playable vs Locked state derived from the game's catalog rating:
 * kids → all playable; teens → teens + adults; adults → adults only.
 * Server component, catalog-data only (no cookies/headers), safe in "use cache".
 */
export function RatingMatrix({ rating, compact = false }: { rating: AgeRating; compact?: boolean }) {
  const minAge = RATING_MIN_AGE[rating];
  return (
    <div className={compact ? "" : "mt-1"}>
      <ul aria-label={`Age suitability, rated ${RATING_LABEL[rating]}`} className="flex flex-wrap gap-1.5">
        {BANDS.map((b) => {
          const supported = minAge <= b.minAge;
          return (
            <li key={b.band}>
              <span
                aria-disabled={supported ? undefined : "true"}
                title={supported ? `${SHORT[b.band]} (${b.ages}): playable` : `${SHORT[b.band]} (${b.ages}): needs ${RATING_LABEL[rating]}`}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                  supported
                    ? b.band === "kids"
                      ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
                      : b.band === "teens"
                        ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
                        : "border-red-400/40 bg-red-400/10 text-red-200"
                    : "border-white/10 bg-white/[.03] text-slate-500 opacity-70"
                }`}
              >
                <span aria-hidden="true">{supported ? DOT[b.band] : "🔒"}</span> {SHORT[b.band]} ({b.ages})
                <span className="sr-only">{supported ? "Playable" : "Locked"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
