"use client";

import { useEffect } from "react";
import { A11Y_EVENT, loadA11y } from "@/lib/a11y";

/**
 * Single-switch auto-scan: when enabled, focus steps through visible
 * buttons/links/inputs on a timer. Press Space/Enter (or any switch mapped
 * to them) to activate the highlighted control; the scan pauses while you
 * decide and resumes after. Mount once in the root layout.
 */
export function SwitchScan() {
  useEffect(() => {
    let enabled = false;
    let intervalMs = 1400;
    let timer: ReturnType<typeof setInterval> | null = null;
    let index = 0;

    const candidates = () => {
      const all = Array.from(
        document.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [role="button"]',
        ),
      );
      return all.filter((el) => {
        if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return false;
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return false;
        if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
        return true;
      });
    };

    const step = () => {
      if (!enabled) return;
      const list = candidates();
      if (!list.length) return;
      index = (index + 1) % list.length;
      const el = list[index];
      try {
        el.focus({ preventScroll: false });
        el.classList.add("a11y-scan-hit");
        setTimeout(() => el.classList.remove("a11y-scan-hit"), Math.min(intervalMs - 100, 1200));
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } catch {
        /* focus unavailable */
      }
    };

    const restart = () => {
      if (timer) clearInterval(timer);
      timer = null;
      index = -1;
      if (enabled) timer = setInterval(step, intervalMs);
    };

    const sync = () => {
      try {
        const s = loadA11y();
        enabled = s.switchScan;
        intervalMs = s.scanMs;
      } catch {
        enabled = false;
      }
      restart();
    };

    const hold = () => {
      // Any activation pauses the scan briefly so double-presses don't skip.
      if (!enabled || !timer) return;
      if (timer) clearInterval(timer);
      timer = setTimeout(() => {
        if (enabled) timer = setInterval(step, intervalMs);
      }, intervalMs * 2) as unknown as ReturnType<typeof setInterval>;
    };

    sync();
    window.addEventListener(A11Y_EVENT, sync);
    document.addEventListener("click", hold, { passive: true });
    document.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") hold();
    }, { passive: true });
    return () => {
      window.removeEventListener(A11Y_EVENT, sync);
      if (timer) clearInterval(timer);
    };
  }, []);
  return null;
}
