import Image from "next/image";
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
  // next/image: local SVG is served as-is (auto-unoptimized for ".svg" per
  // the Image docs — no remotePatterns/config needed). Explicit width/height
  // match the 190x100 viewBox so the badge never shifts layout (CLS); CSS
  // still controls display size. No `priority`: this 2KB conditional badge is
  // never the LCP element, and prioritizing it would steal bandwidth from it.
  return (
    <Image
      src={USA_FLAG_SRC}
      alt={decorative ? "" : label}
      aria-hidden={decorative ? true : undefined}
      draggable={false}
      width={190}
      height={100}
      sizes="80px"
      className={cn(
        "h-4 w-[2.53rem] shrink-0 rounded-[3px] border border-black/25 object-cover dark:border-white/30",
        className,
      )}
    />
  );
}
