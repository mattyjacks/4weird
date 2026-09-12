"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type InfoTipProps = {
  /** Full long text shown in the popover. Plain strings split on blank lines into paragraphs. */
  text: React.ReactNode;
  /** Accessible label for the (?) button. */
  label?: string;
  className?: string;
  /** Preferred side of the trigger. Auto-flips when there is no room. */
  side?: "top" | "bottom" | "left" | "right";
};

const GAP = 10;
const EDGE = 8;
const MAX_W = 320;

/**
 * (?) info popover that works on desktop AND mobile.
 * - Renders through a portal as position:fixed, so it always pops OVER
 *   scrollable ancestors (sidebar nav, sheets, drawers) instead of being
 *   clipped by their overflow - and clamps to the viewport so it never
 *   runs off-screen the way an absolutely-positioned bubble does.
 * - Desktop: hover or keyboard focus opens it, click pins it.
 * - Mobile (touch): tap toggles it; tap-outside or Escape closes it.
 * - Plain-string text with blank lines renders as real paragraphs.
 */
export function InfoTip({ text, label = "More info", className, side = "top" }: InfoTipProps) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; placed: boolean } | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const hoverTimer = useRef<number | null>(null);
  const tipId = useId();
  const open = pinned || hovered;

  useEffect(() => {
    setMounted(true);
    return () => {
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    };
  }, []);

  const openHover = () => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setHovered(true);
  };

  // Small grace period so moving the pointer toward the popover to read or
  // select text doesn't snap it shut the instant it leaves the (?) button.
  const closeHoverSoon = () => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      hoverTimer.current = null;
      setHovered(false);
    }, 180);
  };

  // Measure + place the bubble whenever it opens, and keep it glued to the
  // trigger across scrolls (capture catches sidebar/sheet inner scrolls),
  // resizes, and zooms while open. useEffect (not layout) so server
  // rendering stays warning-free; the bubble is hidden until placed.
  useEffect(() => {
    if (!open || !mounted) {
      setPos(null);
      return;
    }
    const place = () => {
      const btn = btnRef.current;
      const bubble = bubbleRef.current;
      if (!btn || !bubble) return;
      const r = btn.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(MAX_W, vw - EDGE * 2);
      const height = bubble.offsetHeight || 0;

      const fits = {
        top: r.top - GAP - height >= EDGE,
        bottom: r.bottom + GAP + height <= vh - EDGE,
        left: r.left - GAP - width >= EDGE,
        right: r.right + GAP + width <= vw - EDGE,
      };
      // Preferred side first, then first side with room, else bottom.
      const order: Array<"top" | "bottom" | "left" | "right"> = [side, "top", "bottom", "right", "left"];
      const chosen = order.find((s) => fits[s]) ?? "bottom";

      let top = 0;
      let left = 0;
      if (chosen === "top" || chosen === "bottom") {
        left = r.left + r.width / 2 - width / 2;
        left = Math.min(Math.max(left, EDGE), Math.max(EDGE, vw - width - EDGE));
        top = chosen === "top" ? r.top - GAP - height : r.bottom + GAP;
        if (chosen === "top" && top < EDGE) top = EDGE;
        if (chosen === "bottom" && top + height > vh - EDGE) top = Math.max(EDGE, vh - EDGE - height);
      } else {
        top = r.top + r.height / 2 - height / 2;
        top = Math.min(Math.max(top, EDGE), Math.max(EDGE, vh - height - EDGE));
        left = chosen === "left" ? r.left - GAP - width : r.right + GAP;
        if (chosen === "left" && left < EDGE) left = EDGE;
        if (chosen === "right" && left + width > vw - EDGE) left = Math.max(EDGE, vw - EDGE - width);
      }
      setPos({ top, left, width, placed: true });
    };

    // Two passes: first paint at an approximate spot (hidden), then measure
    // the real height and place it. requestAnimationFrame avoids a flash.
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, { capture: true } as EventListenerOptions);
    };
  }, [open, mounted, side, text]);

  // Tap-outside / Escape closes a pinned popover.
  useEffect(() => {
    if (!pinned) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      // The bubble lives in a portal: taps on its text count as inside.
      if (wrapRef.current?.contains(target)) return;
      if (bubbleRef.current?.contains(target)) return;
      setPinned(false);
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
    <span
      ref={wrapRef}
      className={cn("ui-infotip", className)}
      onMouseEnter={openHover}
      onMouseLeave={closeHoverSoon}
      onFocus={openHover}
      onBlur={(e) => {
        // Keyboard users tabbing out of the whole (?) control close it.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setHovered(false);
          setPinned(false);
        }
      }}
    >
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={tipId}
        data-infotip-trigger
        className="ui-infotip-btn"
        onClick={() => {
          // Clear hover too: on touch screens the tap also emulates
          // mouseenter, which would otherwise keep it stuck open.
          setHovered(false);
          setPinned((v) => !v);
        }}
      >
        <span aria-hidden="true">?</span>
      </button>
      {mounted &&
        open &&
        createPortal(
          <span
            ref={bubbleRef}
            id={tipId}
            role="tooltip"
            data-infotip-bubble
            onMouseEnter={openHover}
            onMouseLeave={closeHoverSoon}
            className="fixed z-[90] block max-h-[min(60vh,24rem)] overflow-y-auto overscroll-contain rounded-[0.625rem] border border-border bg-popover px-3 py-2.5 text-left text-[0.8125rem] font-normal leading-relaxed text-popover-foreground shadow-[0_12px_36px_rgb(0_0_0/0.28)] dark:border-white/15 dark:bg-slate-950 dark:shadow-black/60"
            style={{
              top: pos?.top ?? -1000,
              left: pos?.left ?? -1000,
              width: pos?.width ?? Math.min(MAX_W, 280),
              visibility: pos?.placed ? "visible" : "hidden",
            }}
          >
            {renderBody(text)}
          </span>,
          document.body,
        )}
    </span>
  );
}

/** Plain strings split on blank lines become real paragraphs; nodes pass through. */
function renderBody(text: React.ReactNode): React.ReactNode {
  if (typeof text !== "string") return text;
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paras.length <= 1) return <span className="block">{text}</span>;
  return (
    <span className="block space-y-2">
      {paras.map((p, i) => (
        <span key={i} className="block">
          {p}
        </span>
      ))}
    </span>
  );
}
