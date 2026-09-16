/**
 * Vocrehab schedule a11y helper (SJ 24h schedule UI).
 *
 * Usage:
 *   import {
 *     announceLive,
 *     ScheduleLiveRegion,
 *     dayAriaLabel,
 *     eventAriaLabel,
 *     TONE_AUDIT,
 *   } from "@/components/vocrehab/vocrehab-schedule-a11y";
 *   announceLive("Work shift added at 9:00 AM — nice steady planning.");
 *   <ScheduleLiveRegion message={liveMessage} />
 *
 * Standalone helper with no schedule-store imports: a polite live-region
 * announcer, accessible label builders for day columns and event blocks,
 * and a strengths-first tone audit checklist. Guidance copy stays
 * encouraging throughout and never relies on error-red styling alone.
 */

"use client";

import { useEffect, useState } from "react";

/** Custom event channel the live region listens on. */
export const VOCREHAB_SCHEDULE_ANNOUNCE_EVENT =
  "vocrehab-schedule-announce";

/**
 * Announce a message to every mounted <ScheduleLiveRegion />.
 * Safe to call from event handlers; no-op during server rendering.
 */
export function announceLive(message: string): void {
  if (typeof window === "undefined") return;
  const text = message.trim();
  if (text.length === 0) return;
  window.dispatchEvent(
    new CustomEvent<string>(VOCREHAB_SCHEDULE_ANNOUNCE_EVENT, {
      detail: text,
    }),
  );
}

export type ScheduleLiveRegionProps = {
  /** Current announcement; announceLive() events take over until the prop changes. */
  message: string;
};

/**
 * Screen-reader-only polite live region (role="status").
 * Renders the `message` prop directly and swaps to the latest
 * announceLive() event when one arrives (keyed back to the prop by
 * remounting or by the next prop change).
 */
export function ScheduleLiveRegion({ message }: ScheduleLiveRegionProps) {
  const [announced, setAnnounced] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim().length > 0) {
        setAnnounced(detail);
      }
    };
    window.addEventListener(VOCREHAB_SCHEDULE_ANNOUNCE_EVENT, onAnnounce);
    return () => {
      window.removeEventListener(VOCREHAB_SCHEDULE_ANNOUNCE_EVENT, onAnnounce);
    };
  }, []);

  return (
    <p
      key={message}
      role="status"
      aria-live="polite"
      className="sr-only"
    >
      {announced ?? message}
    </p>
  );
}

function vocrehabFormatClock(min: number): string {
  const clamped = Math.min(24 * 60, Math.max(0, Math.round(min)));
  const hour24 = Math.floor(clamped / 60) % 24;
  const minute = clamped % 60;
  const suffix = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const mm = minute.toString().padStart(2, "0");
  return `${hour12}:${mm} ${suffix}`;
}

/**
 * Accessible label for a day column, naming the day and how much of the
 * plan is already in place. Strengths-first: leads with what is planned.
 */
export function dayAriaLabel(
  dayId: string,
  eventCount: number,
  selectedActivityLabel?: string | null,
): string {
  const count = Number.isFinite(eventCount) ? Math.max(0, Math.floor(eventCount)) : 0;
  const noun = count === 1 ? "planned block" : "planned blocks";
  const base = `Day ${dayId}, ${count} ${noun} keeping the plan steady`;
  if (selectedActivityLabel && selectedActivityLabel.trim().length > 0) {
    return `${base}. Ready to place ${selectedActivityLabel.trim()}.`;
  }
  return `${base}.`;
}

/**
 * Accessible label for a scheduled event block, including its time range
 * and whether it is a locked anchor (travel) or adjustable.
 */
export function eventAriaLabel(
  title: string,
  startMin: number,
  endMin: number,
  locked?: boolean,
): string {
  const name = title.trim().length > 0 ? title.trim() : "Untitled block";
  const range = `${vocrehabFormatClock(startMin)} to ${vocrehabFormatClock(endMin)}`;
  if (locked) {
    return `${name}, ${range}, steady anchor that stays put.`;
  }
  return `${name}, ${range}, adjustable with Move and Resize controls.`;
}

/**
 * Strengths-first tone + a11y audit checklist for the schedule UI.
 * Reviewers check each item before shipping schedule copy or styling.
 */
export const TONE_AUDIT: string[] = [
  "Guidance copy leads with strengths and steady progress, never with red error styling.",
  "Status is never signaled by color alone: every red or green cue ships with text and an icon or pattern.",
  "No red-only error signals: notices use warm neutral styling plus words, so meaning survives without color.",
  "Every pointer action has a keyboard path: create, move, resize, and remove all work from buttons or list controls.",
  "Focus stays visible and order matches the visual layout: day columns first, then event controls in time order.",
  "Schedule changes announce through the polite live region via announceLive, not through alerts or auto-focus theft.",
  "Reduced motion is respected: hatched and animated cues stay still under prefers-reduced-motion.",
  "Time labels always pair clock times with plain words, e.g. 9:00 AM to 11:00 AM, never bare numbers.",
  "Locked anchors are described as steady supports, never as failures or restrictions.",
  "Empty states invite the next small step instead of warning about what is missing.",
];
