"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { InfoTip } from "./info-tip";

type ClampTextProps = {
  /** One-line teaser shown inline. */
  short: string;
  /** Long version: tooltip content + dropdown body. Defaults to `short`. */
  full?: React.ReactNode;
  /** Label for the tooltip + dropdown toggle (a11y). */
  label?: string;
  /** Visible "More" affordance next to the (?) — the dropdown for the long text. */
  expandLabel?: string;
  /** Clamp the teaser to N lines before ellipsis (default 2). */
  lines?: 1 | 2 | 3;
  className?: string;
};

/**
 * Shorten multi-line text to a tight teaser + (?) tooltip, with a dropdown
 * (<details>) carrying the long version. Works with mouse, touch, keyboard.
 *
 * Usage:
 *   <ClampText short="75% to creators…" full="Creators keep 75% as on-site…" />
 */
export function ClampText({
  short,
  full,
  label = "Show full text",
  expandLabel = "More",
  lines = 2,
  className,
}: ClampTextProps) {
  const detailsId = useId();
  const body = full ?? short;
  return (
    <span className={cn("ui-clamp", className)}>
      <span className={cn("ui-clamp-short", lines === 1 && "ui-clamp-1", lines === 3 && "ui-clamp-3")}>{short}</span>
      <InfoTip text={body} label={label} />
      <details className="ui-clamp-more">
        <summary aria-label={label} aria-describedby={detailsId}>
          {expandLabel}
          <span aria-hidden="true" className="ui-clamp-caret">
            ▾
          </span>
        </summary>
        <span id={detailsId} className="ui-clamp-body">
          {body}
        </span>
      </details>
    </span>
  );
}
