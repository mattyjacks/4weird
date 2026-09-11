"use client";

import { useEffect } from "react";
import { A11Y_EVENT, loadA11y } from "@/lib/a11y";

const SELECTOR = 'button, a[href], input, select, textarea, [role="button"], [data-dwell]';
const COOLDOWN_MS = 1500;

/**
 * Eye-tracker mode (dwell-to-click).
 *
 * Works with any eye tracker / head pointer that moves the system cursor:
 * resting the pointer (or keyboard focus) on a control for the configured
 * dwell time activates it, with a progress ring drawn via --dwell-progress.
 * Mount once in the root layout so it covers the whole site.
 */
export function EyeDwell() {
  useEffect(() => {
    let dwellMs = loadA11y().dwellMs;
    let enabled = loadA11y().dwell;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let raf = 0;
    let start = 0;
    let target: HTMLElement | null = null;
    let lastFired = 0;

    const onSettings = () => {
      const s = loadA11y();
      dwellMs = s.dwellMs;
      enabled = s.dwell;
      if (!enabled) clear();
    };
    window.addEventListener(A11Y_EVENT, onSettings);

    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      cancelAnimationFrame(raf);
      raf = 0;
      if (target) {
        target.classList.remove("a11y-dwelling");
        target.style.removeProperty("--dwell-progress");
      }
      target = null;
    };

    const paint = () => {
      if (!target || !enabled) return;
      const t = Math.min(1, (performance.now() - start) / dwellMs);
      target.style.setProperty("--dwell-progress", t.toFixed(3));
      if (t < 1) raf = requestAnimationFrame(paint);
    };

    const arm = (el: HTMLElement) => {
      if (!enabled) return;
      if (el === target) return;
      if (performance.now() - lastFired < COOLDOWN_MS) return;
      if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return;
      clear();
      target = el;
      el.classList.add("a11y-dwelling");
      start = performance.now();
      raf = requestAnimationFrame(paint);
      timer = setTimeout(() => {
        lastFired = performance.now();
        const fire = target;
        clear();
        try {
          fire?.click();
        } catch {
          /* inert control; ignore */
        }
      }, dwellMs);
    };

    const fromEvent = (event: Event) => {
      if (!enabled) return;
      const el = (event.target as HTMLElement | null)?.closest?.(SELECTOR) as HTMLElement | null;
      if (!el) {
        // Pointer drifted off every control — keep focus-dwell, drop hover-dwell.
        if (event.type === "pointerover" || event.type === "pointermove") clear();
        return;
      }
      arm(el);
    };

    const onFocus = (event: FocusEvent) => {
      if (!enabled) return;
      const el = (event.target as HTMLElement | null)?.closest?.(SELECTOR) as HTMLElement | null;
      if (el) arm(el);
    };
    const onBlur = () => clear();

    document.addEventListener("pointerover", fromEvent, { passive: true });
    document.addEventListener("focusin", onFocus, { passive: true });
    document.addEventListener("focusout", onBlur, { passive: true });
    document.addEventListener("pointerdown", clear, { passive: true });
    document.addEventListener("keydown", clear, { passive: true });
    document.addEventListener("wheel", clear, { passive: true });

    return () => {
      window.removeEventListener(A11Y_EVENT, onSettings);
      document.removeEventListener("pointerover", fromEvent);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
      document.removeEventListener("pointerdown", clear);
      document.removeEventListener("keydown", clear);
      document.removeEventListener("wheel", clear);
      clear();
    };
  }, []);

  return null;
}
