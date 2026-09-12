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
 * The visible glyph is 28px but an invisible expander stretches the hit
 * area to 44px (same trick as `.ui-infotip-btn::before`).
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
        "relative grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-transparent text-base leading-none transition hover:border-border hover:bg-accent",
        "before:absolute before:-inset-2 before:content-['']",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500",
        favorited ? "text-amber-500" : "text-muted-foreground hover:text-amber-500",
        className,
      )}
    >
      <span aria-hidden="true">{favorited ? "★" : "☆"}</span>
    </button>
  );
}
