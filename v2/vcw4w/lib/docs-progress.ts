"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DOCS_DATA } from "@/components/docs/docs-data";

/**
 * Docs reading progress ("4weird Docs … % explored").
 *
 * A guide counts as READ only after BOTH gates pass:
 *   1. accumulated open time on that guide >= DOCS_REQUIRED_SECONDS (20s),
 *      paused while the tab is hidden, resumable across visits, and
 *   2. the reader scrolled to the bottom of the page at least once.
 *
 * The read set is append-only: guides are never un-marked, so the header
 * counter only ever goes up. State lives in localStorage for signed-out
 * readers and merges with the `docs` cloud save (game_saves slot 0) when
 * signed in — whichever side knows more wins per guide.
 */

export const DOCS_REQUIRED_SECONDS = 20;
export const DOCS_PROGRESS_KEY = "4weird-docs-progress-v1";
export const DOCS_PROGRESS_EVENT = "4weird-docs-progress-changed";

const CLOUD_GAME = "docs";
const CLOUD_SLOT = 0;

export type DocPartial = {
  /** accredited open seconds (0..DOCS_REQUIRED_SECONDS, resumable) */
  seconds: number;
  /** whether the bottom of the page was ever reached */
  bottom: boolean;
  updatedAt: number;
};

export type DocsProgressState = {
  /** hrefs of completed guides — append-only, never shrinks */
  read: string[];
  /** in-flight per-guide progress (resumable) */
  partial: Record<string, DocPartial>;
};

const VALID_HREFS = new Set(DOCS_DATA.map((d) => d.href));

function cleanRead(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    if (typeof v === "string" && VALID_HREFS.has(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

function cleanPartial(value: unknown): Record<string, DocPartial> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, DocPartial> = {};
  for (const [href, p] of Object.entries(value as Record<string, unknown>)) {
    if (!VALID_HREFS.has(href) || !p || typeof p !== "object" || Array.isArray(p)) continue;
    const rec = p as Record<string, unknown>;
    const seconds = Math.max(0, Math.min(DOCS_REQUIRED_SECONDS, Math.floor(Number(rec.seconds) || 0)));
    out[href] = {
      seconds,
      bottom: rec.bottom === true,
      updatedAt: Number(rec.updatedAt) > 0 ? Math.floor(Number(rec.updatedAt)) : 0,
    };
  }
  return out;
}

function cleanState(value: unknown): DocsProgressState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { read: [], partial: {} };
  const rec = value as Record<string, unknown>;
  return { read: cleanRead(rec.read), partial: cleanPartial(rec.partial) };
}

const EMPTY: DocsProgressState = { read: [], partial: {} };

function readLocal(): DocsProgressState {
  try {
    const raw = localStorage.getItem(DOCS_PROGRESS_KEY);
    if (!raw) return { read: [], partial: {} };
    return cleanState(JSON.parse(raw));
  } catch {
    return { read: [], partial: {} };
  }
}

function writeLocal(state: DocsProgressState) {
  try {
    localStorage.setItem(DOCS_PROGRESS_KEY, JSON.stringify(state));
  } catch {
    /* private mode — progress just doesn't persist */
  }
}

function broadcast() {
  try {
    window.dispatchEvent(new CustomEvent(DOCS_PROGRESS_EVENT));
  } catch {
    /* non-DOM — nothing to notify */
  }
}

/** Union merge: read sets unite, partials take max seconds / OR bottom. */
function mergeStates(a: DocsProgressState, b: DocsProgressState): DocsProgressState {
  const read = [...a.read];
  for (const href of b.read) if (!read.includes(href)) read.push(href);
  const partial: Record<string, DocPartial> = {};
  const keys = new Set([...Object.keys(a.partial), ...Object.keys(b.partial)]);
  for (const k of keys) {
    const pa = a.partial[k];
    const pb = b.partial[k];
    partial[k] = {
      seconds: Math.max(pa?.seconds ?? 0, pb?.seconds ?? 0),
      bottom: (pa?.bottom ?? false) || (pb?.bottom ?? false),
      updatedAt: Math.max(pa?.updatedAt ?? 0, pb?.updatedAt ?? 0),
    };
  }
  return { read, partial };
}

function sameState(a: DocsProgressState, b: DocsProgressState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function fetchCloud(): Promise<DocsProgressState | null> {
  const res = await fetch(`/api/saves?game=${CLOUD_GAME}&slot=${CLOUD_SLOT}`, {
    credentials: "same-origin",
  });
  if (res.status === 401) return null; // signed out — local only
  if (!res.ok) throw new Error(`saves GET ${res.status}`);
  const body = (await res.json()) as { saves?: { data?: unknown }[] };
  const data = body?.saves?.[0]?.data;
  if (!data) return { read: [], partial: {} };
  return cleanState(data);
}

async function pushCloud(state: DocsProgressState): Promise<"ok" | "signed-out" | "error"> {
  try {
    const res = await fetch("/api/saves", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        game_slug: CLOUD_GAME,
        slot: CLOUD_SLOT,
        schema_version: 1,
        data: { read: state.read, partial: state.partial },
      }),
    });
    if (res.status === 401) return "signed-out";
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

export type DocsCloudStatus = "local" | "cloud" | "signed-out";

/**
 * Shared docs-progress store. Works signed-out (device-local); when signed
 * in it merges with the cloud save once on mount and debounces writes back.
 */
export function useDocsProgress() {
  const [state, setState] = useState<DocsProgressState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [cloud, setCloud] = useState<DocsCloudStatus>("local");
  const stateRef = useRef(state);
  stateRef.current = state;
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudKnown = useRef(false);

  const schedulePush = useCallback((next: DocsProgressState) => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      // Only push when a session exists; fetchCloud already proved one.
      if (!cloudKnown.current) return;
      const status = await pushCloud(next);
      setCloud(status === "ok" ? "cloud" : status === "signed-out" ? "signed-out" : "cloud");
    }, 1500);
  }, []);

  // Initial load: local first (instant), then merge cloud (if signed in).
  useEffect(() => {
    const local = readLocal();
    stateRef.current = local;
    setState(local);
    setHydrated(true);
    let cancelled = false;
    fetchCloud()
      .then((cloudState) => {
        if (cancelled) return;
        if (cloudState === null) {
          setCloud("signed-out");
          return;
        }
        cloudKnown.current = true;
        setCloud("cloud");
        const merged = mergeStates(local, cloudState);
        // Promote any read completed locally while signed out.
        for (const href of merged.read) {
          const p = merged.partial[href];
          if (p) {
            p.seconds = DOCS_REQUIRED_SECONDS;
            p.bottom = true;
          }
        }
        stateRef.current = merged;
        setState(merged);
        writeLocal(merged);
        if (!sameState(merged, cloudState)) void pushCloud(merged);
      })
      .catch(() => {
        if (!cancelled) setCloud("local");
      });
    const resync = () => {
      const next = readLocal();
      stateRef.current = next;
      setState(next);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === DOCS_PROGRESS_KEY) resync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(DOCS_PROGRESS_EVENT, resync);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(DOCS_PROGRESS_EVENT, resync);
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, []);

  const commit = useCallback(
    (next: DocsProgressState) => {
      stateRef.current = next;
      setState(next);
      writeLocal(next);
      broadcast();
      schedulePush(next);
    },
    [schedulePush],
  );

  /** Append-only completion — never removes, so counters only go up. */
  const markRead = useCallback(
    (href: string) => {
      if (!VALID_HREFS.has(href)) return;
      const cur = stateRef.current;
      if (cur.read.includes(href)) return;
      const partial: Record<string, DocPartial> = { ...cur.partial };
      const prev = partial[href];
      partial[href] = {
        seconds: DOCS_REQUIRED_SECONDS,
        bottom: true,
        updatedAt: Date.now(),
      };
      if (prev && prev.updatedAt > 0) partial[href].updatedAt = Date.now();
      commit({ read: [...cur.read, href], partial });
    },
    [commit],
  );

  /** Resumable in-flight progress — clamps and max-merges, never regresses. */
  const savePartial = useCallback(
    (href: string, seconds: number, bottom: boolean) => {
      if (!VALID_HREFS.has(href)) return;
      const cur = stateRef.current;
      if (cur.read.includes(href)) return; // already done — nothing to resume
      const prev = cur.partial[href];
      const nextSeconds = Math.max(
        prev?.seconds ?? 0,
        Math.max(0, Math.min(DOCS_REQUIRED_SECONDS, Math.floor(seconds))),
      );
      const nextBottom = (prev?.bottom ?? false) || bottom;
      if (prev && prev.seconds === nextSeconds && prev.bottom === nextBottom) return;
      commit({
        read: cur.read,
        partial: {
          ...cur.partial,
          [href]: { seconds: nextSeconds, bottom: nextBottom, updatedAt: Date.now() },
        },
      });
    },
    [commit],
  );

  const getPartial = useCallback(
    (href: string): DocPartial | null => state.partial[href] ?? null,
    [state.partial],
  );

  const isRead = useCallback((href: string) => state.read.includes(href), [state.read]);

  const readSet = useMemo(() => new Set(state.read), [state.read]);

  return { read: state.read, readSet, isRead, markRead, savePartial, getPartial, hydrated, cloud };
}
