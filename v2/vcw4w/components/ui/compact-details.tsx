"use client";

import { cn } from "@/lib/utils";
import { InfoTip } from "./info-tip";

type CompactDetailsProps = {
  /** Tight one-line summary row. */
  summary: React.ReactNode;
  /** Long version revealed by the dropdown. */
  children: React.ReactNode;
  /** Extra (?) tooltip text for the summary row (optional). */
  hint?: React.ReactNode;
  /** Start open (e.g. first footer column on desktop). */
  defaultOpen?: boolean;
  className?: string;
};

/**
 * Compact dropdown for the long version of any text block.
 * Native <details> = free mobile/desktop/keyboard support, no JS needed,
 * screen-reader announced, deep-linkable. Styled tight globally.
 */
export function CompactDetails({ summary, children, hint, defaultOpen, className }: CompactDetailsProps) {
  return (
    <details open={defaultOpen} className={cn("ui-details", className)}>
      <summary className="ui-details-summary">
        <span aria-hidden="true" className="ui-details-caret">
          ▾
        </span>
        <span className="ui-details-label">{summary}</span>
        {hint ? <InfoTip text={hint} label="About this section" /> : null}
      </summary>
      <div className="ui-details-body">{children}</div>
    </details>
  );
}
