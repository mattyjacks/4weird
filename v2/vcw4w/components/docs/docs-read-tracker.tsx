"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { DOCS_DATA } from "./docs-data";
import { DOCS_REQUIRED_SECONDS, useDocsProgress } from "@/lib/docs-progress";

/** Fraction of the page that must be viewable/reached to satisfy scroll. */
const BOTTOM_PX_TOLERANCE = 120;

/**
 * Accredits reading time + full-scroll for the current guide and renders the
 * timer/scroll progress card. Time accrues only while the tab is visible,
 * persists every tick (resumable), and completion is append-only.
 */
export function DocsReadTracker() {
  const pathname = usePathname();
  const entry = DOCS_DATA.find((d) => d.href === pathname);
  const { isRead, markRead, savePartial, getPartial, hydrated, cloud } = useDocsProgress();

  const [seconds, setSeconds] = useState(0);
  const [scrollPct, setScrollPct] = useState(0);
  const [reachedBottom, setReachedBottom] = useState(false);
  const secondsRef = useRef(0);
  const bottomRef = useRef(false);
  const hrefRef = useRef<string | null>(null);

  // (Re)seed resumable progress whenever the guide changes or hydration lands.
  useEffect(() => {
    if (!entry || !hydrated) return;
    hrefRef.current = entry.href;
    const prev = getPartial(entry.href);
    secondsRef.current = prev?.seconds ?? 0;
    bottomRef.current = prev?.bottom ?? false;
    setSeconds(secondsRef.current);
    setReachedBottom(bottomRef.current);
    // Short pages with no scrollbar satisfy scroll immediately.
    requestAnimationFrame(() => {
      if (hrefRef.current !== entry.href) return;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 8) {
        bottomRef.current = true;
        setReachedBottom(true);
        setScrollPct(100);
        if (!isRead(entry.href)) savePartial(entry.href, secondsRef.current, true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.href, hydrated]);

  // Scroll depth tracking.
  useEffect(() => {
    if (!entry) return;
    const measure = () => {
      if (hrefRef.current !== entry.href) return;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 8) {
        bottomRef.current = true;
        setReachedBottom(true);
        setScrollPct(100);
        return;
      }
      const pos = window.scrollY + window.innerHeight;
      const pct = Math.max(0, Math.min(100, Math.round((pos / doc.scrollHeight) * 100)));
      setScrollPct(pct);
      if (!bottomRef.current && doc.scrollHeight - pos <= BOTTOM_PX_TOLERANCE) {
        bottomRef.current = true;
        setReachedBottom(true);
        if (!isRead(entry.href)) savePartial(entry.href, secondsRef.current, true);
      }
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.href]);

  // Visible-time accreditation, 1s ticks, persisted for resume.
  useEffect(() => {
    if (!entry) return;
    const id = window.setInterval(() => {
      if (hrefRef.current !== entry.href) return;
      if (document.hidden) return;
      if (isRead(entry.href)) return;
      if (secondsRef.current >= DOCS_REQUIRED_SECONDS) return;
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
      savePartial(entry.href, secondsRef.current, bottomRef.current);
    }, 1000);
    return () => {
      window.clearInterval(id);
      // Flush on unmount/navigation so partial progress is never lost.
      if (hrefRef.current === entry.href && !isRead(entry.href)) {
        savePartial(entry.href, secondsRef.current, bottomRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.href, hydrated]);

  // Completion: both gates, append-only.
  useEffect(() => {
    if (!entry || !hydrated) return;
    if (!isRead(entry.href) && seconds >= DOCS_REQUIRED_SECONDS && reachedBottom) {
      markRead(entry.href);
    }
  }, [entry, hydrated, isRead, markRead, seconds, reachedBottom]);

  if (!entry) return null;
  const done = isRead(entry.href);
  const remaining = Math.max(0, DOCS_REQUIRED_SECONDS - seconds);
  const timePct = Math.min(100, Math.round((seconds / DOCS_REQUIRED_SECONDS) * 100));

  return (
    <div
      aria-label="Reading progress"
      className="mt-4 rounded-3xl border border-border bg-card p-4"
    >
      <p className="text-sm font-black">
        {done ? (
          <>✅ Guide completed{cloud === "cloud" ? " · saved" : ""}</>
        ) : (
          <>📖 Reading progress</>
        )}
      </p>
      {!done && hydrated && seconds > 0 && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Resumed at {seconds}s of {DOCS_REQUIRED_SECONDS}s — keep going.
        </p>
      )}
      <div className="mt-3 space-y-3">
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
            <span>{done ? "Time on guide" : remaining > 0 ? `${remaining}s left to read` : "Time done ✓"}</span>
            <span aria-hidden="true">
              {seconds}/{DOCS_REQUIRED_SECONDS}s
            </span>
          </div>
          <div
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
            role="progressbar"
            aria-label="Reading time"
            aria-valuenow={Math.min(seconds, DOCS_REQUIRED_SECONDS)}
            aria-valuemin={0}
            aria-valuemax={DOCS_REQUIRED_SECONDS}
          >
            <div
              className={`h-full rounded-full transition-all ${done ? "bg-emerald-400" : "bg-gradient-to-r from-cyan-400 to-violet-400"}`}
              style={{ width: `${done ? 100 : timePct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
            <span>{reachedBottom || done ? "Full scroll ✓" : "Scroll to the bottom"}</span>
            <span aria-hidden="true">{done ? 100 : scrollPct}%</span>
          </div>
          <div
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
            role="progressbar"
            aria-label="Scroll progress"
            aria-valuenow={done ? 100 : scrollPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full transition-all ${reachedBottom || done ? "bg-emerald-400" : "bg-gradient-to-r from-violet-400 to-fuchsia-400"}`}
              style={{ width: `${done ? 100 : scrollPct}%` }}
            />
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {done ? (
          <>Counted toward your {DOCS_DATA.length}-guide total. It stays counted.</>
        ) : (
          <>
            Stay on this guide for {DOCS_REQUIRED_SECONDS}s and scroll through the whole thing to
            count it as read. Progress resumes if you leave
            {cloud === "signed-out" ? " (saved on this device; sign in to sync it)" : " — even on other devices when signed in"}.
          </>
        )}
      </p>
    </div>
  );
}
