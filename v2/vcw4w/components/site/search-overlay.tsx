"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";

/**
 * DS-SEARCH-04 (srch-4): full-screen search overlay opened from Menu 1.
 *
 * Self-contained on purpose: local ranking + index fetching live in this
 * file so the overlay works even when sibling search libs or the network
 * are unavailable. Fail-open everywhere: a missing /search/index.json or a
 * failing POST /api/search just falls back to local results (possibly empty).
 */

export interface SearchIndexEntry {
  href: string;
  title: string;
  description?: string;
  keywords?: string[];
  section?: string;
}

export interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const INDEX_URL = "/search/index.json";
const AI_URL = "/api/search";
const MAX_RESULTS = 12;

function isTypingTarget(target: EventTarget | null): boolean {
  if (target === null || typeof HTMLElement === "undefined") return false;
  const el = target as HTMLElement;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Global shortcut: Cmd/Ctrl+K anywhere, or "/" when the user is not already
 * typing in a form field. SSR-safe (no-ops without window).
 */
export function useSearchShortcut(onOpen: () => void): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onKeyDown(e: KeyboardEvent): void {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        onOpen();
        return;
      }
      if (e.key === "/" && !mod && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpen]);
}

/** Defensively coerce unknown JSON into index entries (fail-open: []). */
function normalizeIndex(raw: unknown): SearchIndexEntry[] {
  let arr: unknown = raw;
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    const rec = raw as { entries?: unknown; results?: unknown };
    if (Array.isArray(rec.entries)) arr = rec.entries;
    else if (Array.isArray(rec.results)) arr = rec.results;
    else arr = [];
  }
  if (!Array.isArray(arr)) return [];
  const out: SearchIndexEntry[] = [];
  for (const item of arr) {
    if (item === null || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.href !== "string" || typeof rec.title !== "string") continue;
    const entry: SearchIndexEntry = { href: rec.href, title: rec.title };
    if (typeof rec.description === "string") entry.description = rec.description;
    if (typeof rec.section === "string") entry.section = rec.section;
    if (Array.isArray(rec.keywords)) {
      entry.keywords = rec.keywords.filter(
        (k): k is string => typeof k === "string",
      );
    }
    out.push(entry);
  }
  return out;
}

function scoreEntry(entry: SearchIndexEntry, tokens: string[]): number {
  const title = entry.title.toLowerCase();
  const desc = (entry.description ?? "").toLowerCase();
  const href = entry.href.toLowerCase();
  const kws = (entry.keywords ?? []).map((k) => k.toLowerCase());
  let score = 0;
  for (const tok of tokens) {
    if (tok.length === 0) continue;
    if (title.startsWith(tok)) score += 5;
    else if (title.includes(tok)) score += 3;
    if (kws.some((k) => k.startsWith(tok))) score += 4;
    else if (kws.some((k) => k.includes(tok))) score += 2;
    if (desc.includes(tok)) score += 1;
    if (href.includes(tok)) score += 1;
  }
  return score;
}

function rankLocal(index: SearchIndexEntry[], query: string): SearchIndexEntry[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return index.slice(0, MAX_RESULTS);
  return index
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((hit) => hit.entry);
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps): ReactElement | null {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchIndexEntry[]>([]);
  const [aiOn, setAiOn] = useState(false);
  const [aiResults, setAiResults] = useState<SearchIndexEntry[] | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Fresh state every time the overlay opens. This is a render-phase reset
  // (the React-endorsed alternative to setState inside an effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setActive(0);
      setAiResults(null);
      setAiPending(false);
    }
  }

  // Big input gets focus on open (mobile keyboard up immediately).
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open ]);

  // Body scroll-lock while the full-screen overlay is open.
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open ]);

  // Esc closes (global while open).
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Load the static index on open; fail-open to an empty list.
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    let cancelled = false;
    fetch(INDEX_URL, { headers: { accept: "application/json" } })
      .then((res) => {
        if (!res.ok) throw new Error(`index ${res.status}`);
        return res.json() as Promise<unknown>;
      })
      .then((json) => {
        if (!cancelled) setIndex(normalizeIndex(json));
      })
      .catch(() => {
        if (!cancelled) setIndex([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open ]);

  // Optional AI rerank: debounced POST, fail-open back to local results.
  // State transitions (clearing stale AI results, pending flags, highlight)
  // live in event/async callbacks below — never synchronously in this body.
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    if (!aiOn) return;
    const q = query.trim();
    if (q.length === 0) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      fetch(AI_URL, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ q }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`ai ${res.status}`);
          return res.json() as Promise<unknown>;
        })
        .then((json) => {
          if (cancelled) return;
          setAiResults(normalizeIndex(json));
          setActive(0);
          setAiPending(false);
        })
        .catch(() => {
          if (cancelled) return;
          setAiResults(null); // fail-open: keep showing local results
          setAiPending(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, aiOn, query]);

  const local = useMemo(() => rankLocal(index, query), [index, query]);
  const shown = aiOn && aiResults !== null ? aiResults : local;

  function visit(href: string): void {
    onClose();
    if (typeof window !== "undefined") window.location.href = href;
  }

  function onQueryChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const v = e.target.value;
    setQuery(v);
    setActive(0);
    if (v.trim().length === 0) {
      setAiResults(null);
      setAiPending(false);
    } else if (aiOn) {
      setAiPending(true);
    }
  }

  function onAiToggle(e: React.ChangeEvent<HTMLInputElement>): void {
    const on = e.target.checked;
    setAiOn(on);
    setActive(0);
    if (!on) {
      setAiResults(null);
      setAiPending(false);
    } else if (query.trim().length > 0) {
      setAiPending(true);
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(shown.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      const hit = shown[active];
      if (hit) {
        e.preventDefault();
        visit(hit.href);
      }
    }
  }

  if (!open) return null;

  const trimmed = query.trim();
  const showingAi = aiOn && aiResults !== null;
  const activeId = shown.length > 0 ? `${listId}-option-${active}` : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Site search"
      className="fixed inset-0 z-[90] flex flex-col bg-black/80 backdrop-blur-sm"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-4 pt-4 sm:pt-10">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={onQueryChange}
            onKeyDown={onInputKeyDown}
            placeholder="Search games, docs, pages…"
            aria-label="Search query"
            aria-expanded={shown.length > 0}
            aria-controls={listId}
            aria-activedescendant={activeId}
            role="combobox"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="h-14 min-h-[44px] w-full rounded-xl border border-white/15 bg-zinc-900 px-4 text-lg text-white placeholder:text-zinc-400 focus:border-white/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="grid h-12 min-h-[44px] w-12 min-w-[44px] shrink-0 place-items-center rounded-xl border border-white/15 bg-zinc-900 text-xl text-white"
          >
            ✕
          </button>
        </div>

        <label className="mt-2 flex min-h-[44px] cursor-pointer items-center gap-2 px-1 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={aiOn}
            onChange={onAiToggle}
            className="h-5 w-5 shrink-0 accent-white"
          />
          <span>
            AI results
            {aiPending ? " (loading…)" : showingAi ? ` (${aiResults?.length ?? 0})` : ""}
          </span>
        </label>
        {aiOn && aiResults === null && trimmed.length > 0 && !aiPending ? (
          <p className="px-1 text-xs text-zinc-400">
            AI search unavailable — showing instant local results.
          </p>
        ) : null}

        <div className="mt-2 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950">
          {shown.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-400">
              {trimmed.length === 0
                ? "Type to search. Press Esc to close."
                : "No matches. Try different words."}
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Search results" className="py-1">
              {shown.map((hit, i) => (
                <li key={`${hit.href}-${i}`} id={`${listId}-option-${i}`} role="option" aria-selected={i === active}>
                  <a
                    href={hit.href}
                    onClick={(e) => {
                      e.preventDefault();
                      visit(hit.href);
                    }}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    className={`flex min-h-[44px] w-full flex-col justify-center gap-0.5 px-4 py-2.5 text-left ${
                      i === active ? "bg-white/10" : "bg-transparent"
                    }`}
                  >
                    <span className="text-base font-medium leading-snug text-white">
                      {hit.title}
                    </span>
                    <span className="truncate text-xs text-zinc-400">
                      {hit.section ? `${hit.section} · ` : ""}
                      {hit.description ?? hit.href}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-2 hidden px-1 text-xs text-zinc-500 sm:block">
          ↑↓ to move · Enter to open · Esc to close · Ctrl/⌘K or / to reopen
        </p>
      </div>
    </div>
  );
}
