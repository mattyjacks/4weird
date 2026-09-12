"use client";

import { cn } from "@/lib/utils";
import { normalizeFavHref } from "@/lib/favorites";

type FavoriteToggleProps = {
  href: string;
  label: string;
  favorited: boolean;
  onToggle: (href: string) => void;
  className?: string;
};

/**
 * Star button to favorite/unfavorite a page.
 * Controlled — pair with `useFavorites()` from "@/lib/favorites".
 */
export function FavoriteToggle({ href, label, favorited, onToggle, className }: FavoriteToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={favorited}
      aria-label={favorited ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
      title={favorited ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
      onClick={() => onToggle(normalizeFavHref(href))}
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-transparent text-base leading-none transition hover:border-border hover:bg-accent",
        favorited ? "text-amber-500" : "text-muted-foreground/50 hover:text-amber-500",
        className,
      )}
    >
      <span aria-hidden="true">{favorited ? "★" : "☆"}</span>
    </button>
  );
}
