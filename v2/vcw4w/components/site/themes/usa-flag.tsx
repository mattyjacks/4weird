import { cn } from "@/lib/utils";

export const USA_FLAG_SRC = "/flags/usa-flag.svg";

/**
 * Shared USA flag (single source: `public/flags/usa-flag.svg`, hand-drawn
 * Old Glory — 13 stripes, navy canton, 50 stars). Rendered everywhere the
 * USA USA theme needs an actual flag instead of a gradient dot: the theme
 * switcher, the settings picker, and the header badge.
 */
export function UsaFlag({
  className,
  decorative = true,
  label = "United States flag",
}: {
  className?: string;
  /** Decorative uses (next to a text label) hide the image from AT. */
  decorative?: boolean;
  label?: string;
}) {
  return (
    <img
      src={USA_FLAG_SRC}
      alt={decorative ? "" : label}
      aria-hidden={decorative ? true : undefined}
      draggable={false}
      className={cn(
        "h-4 w-[2.53rem] shrink-0 rounded-[3px] border border-black/25 object-cover dark:border-white/30",
        className,
      )}
    />
  );
}
