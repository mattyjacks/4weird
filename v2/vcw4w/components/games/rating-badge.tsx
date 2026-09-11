import { RATING_LABEL, type AgeRating } from "@/lib/age-gate";

const styles: Record<AgeRating, string> = {
  kids: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  teens: "border-amber-300/40 bg-amber-300/10 text-amber-200",
  adults: "border-red-400/40 bg-red-400/10 text-red-200",
};

const icons: Record<AgeRating, string> = { kids: "🟢", teens: "🟡", adults: "🔴" };

/** Small rating badge shown on catalog cards, detail pages, and the play shell. */
export function RatingBadge({ rating }: { rating: AgeRating }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${styles[rating]}`}
      title={
        rating === "kids"
          ? "Rated Kids: fine for ages 0–12"
          : rating === "teens"
            ? "Rated Teens: players 13–17 (Kids Mode asks for a 13+ age check)"
            : "Rated Adults: players 18+ only (age-checked every time; hidden in Kids Mode)"
      }
    >
      {icons[rating]} {RATING_LABEL[rating]}
    </span>
  );
}
