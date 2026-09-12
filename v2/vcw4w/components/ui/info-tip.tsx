"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type InfoTipProps = {
  /** Full long text shown in the tooltip / dropdown. */
  text: React.ReactNode;
  /** Accessible label for the (?) button. */
  label?: string;
  className?: string;
  /** Where the bubble appears on desktop. Mobile always centers below. */
  side?: "top" | "bottom" | "left" | "right";
};

/**
 * (?) info tooltip that works on desktop AND mobile.
 * - Desktop: hover + keyboard focus opens it (CSS), click pins it.
 * - Mobile (coarse pointer / touch): tap toggles it (state), tap-outside or
 *   Escape closes it. No hover dependency, 44px touch target.
 */
export function InfoTip({ text, label = "More info", className, side = "top" }: InfoTipProps) {
  const [pinned, setPinned] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!pinned) return;
    const onPointer = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setPinned(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPinned(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  return (
    <span ref={wrapRef} className={cn("ui-infotip", `ui-infotip-${side}`, pinned && "is-pinned", className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={pinned}
        aria-describedby={tipId}
        data-infotip-trigger
        className="ui-infotip-btn"
        onClick={() => setPinned((v) => !v)}
        onBlur={(e) => {
          // Keyboard users tabbing away unpin; hover users unaffected.
          if (!e.currentTarget.parentElement?.matches(":hover")) setPinned(false);
        }}
      >
        <span aria-hidden="true">?</span>
      </button>
      <span id={tipId} role="tooltip" data-infotip-bubble className="ui-infotip-bubble">
        {text}
      </span>
    </span>
  );
}
