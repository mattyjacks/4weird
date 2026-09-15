"use client";

import { useState } from "react";
import {
  PEXELS_COLORS,
  PEXELS_CREDIT_NOTE,
  PEXELS_PRESETS,
  pexelsCreditHtml,
  pexelsCreditLine,
  rollPexelsDice,
  type PexelsItem,
  type PexelsKind,
  type PexelsPreset,
} from "@/lib/pexels";
import { CompactDetails } from "@/components/ui/compact-details";

type StockResponse = {
  configured?: boolean;
  kind?: string;
  query?: string;
  items?: PexelsItem[];
  total?: number;
  page?: number;
  perPage?: number;
  costCoins?: number;
  error?: string;
  note?: string;
  hint?: string;
};

type RunSpec = {
  mode: "search" | "curated";
  query: string;
  kind: PexelsKind;
  color: string;
  orientation: string;
  page: number;
};

const RECENT_KEY = "4weird-stock-recents";
const MAX_RECENTS = 6;

function loadRecents(): string[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string").slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

const DICE_LINES = [
  "🎲 Rolling the dice…",
  "🎲 Consulting the stock goblins…",
  "🎲 Shaking the magic 8-ball…",
  "🎲 Asking the dungeon dice…",
];

export function StockStudio() {
  const [kind, setKind] = useState<PexelsKind>("image");
  const [query, setQuery] = useState("neon arcade");
  const [orientation, setOrientation] = useState("");
  const [color, setColor] = useState("");
  // Unknown until the first call reports it: no mount fetch, so the badge
  // learns from search/curated responses instead (lint-clean, honest).
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [items, setItems] = useState<PexelsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [lastRun, setLastRun] = useState<RunSpec | null>(null);
  const [recents, setRecents] = useState<string[]>(loadRecents);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Tap a vibe, roll the dice, or type your own quest. Every result carries its required credit.");

  function rememberRecent(entry: string) {
    setRecents((prev) => {
      const next = [entry, ...prev.filter((r) => r !== entry)].slice(0, MAX_RECENTS);
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // Private-mode browsers: recents just don't persist. No drama.
      }
      return next;
    });
  }

  async function run(spec: RunSpec) {
    setBusy(true);
    setMessage(spec.mode === "search" ? `🔍 Hunting "${spec.query}"…` : "✨ Raiding the curated shelf…");
    try {
      const params = new URLSearchParams({
        type: spec.kind,
        page: String(spec.page),
        per_page: "12",
      });
      const endpoint = spec.mode === "search" ? "/api/pexels/search" : "/api/pexels/curated";
      if (spec.mode === "search") {
        params.set("query", spec.query);
        if (spec.orientation) params.set("orientation", spec.orientation);
        if (spec.color) params.set("color", spec.color);
      }
      const res = await fetch(`${endpoint}?${params.toString()}`, { credentials: "include" });
      const body = (await res.json()) as StockResponse;
      if (!res.ok) {
        setMessage(String(body.error ?? `The hunt failed (${res.status}). Try again shortly.`));
        return;
      }
      setConfigured(body.configured ?? true);
      setItems(body.items ?? []);
      setTotal(body.total ?? 0);
      setLastRun(spec);
      if (!(body.configured ?? true)) {
        setMessage(body.hint ?? "Pexels is not configured on this deployment; nothing charged, nothing faked.");
      } else if ((body.items ?? []).length === 0) {
        setMessage("🦗 Nothing in this corner of the stock dungeon. Try a wilder query, or roll the dice.");
      } else {
        setMessage(
          `🎉 Bagged ${(body.items ?? []).length} treasure${(body.items ?? []).length === 1 ? "" : "s"}${body.total ? ` of ${body.total}` : ""} - free, 0 coins. Credit the artist wherever you stash them.`,
        );
        if (spec.mode === "search") rememberRecent(`${spec.kind}:${spec.query}`);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to reach stock search.");
    } finally {
      setBusy(false);
    }
  }

  function runSearch(nextPage = 1) {
    const q = query.trim();
    if (q.length < 2) {
      setMessage("Type at least 2 characters - even goblins need a real clue. 🔍");
      return;
    }
    void run({ mode: "search", query: q, kind, color, orientation, page: nextPage });
  }

  function runPreset(preset: PexelsPreset) {
    setQuery(preset.query);
    setKind(preset.kind);
    setMessage(`${preset.emoji} Summoning ${preset.label}… ${preset.blurb}`);
    void run({ mode: "search", query: preset.query, kind: preset.kind, color: "", orientation: "", page: 1 });
  }

  function runDice() {
    const { preset, page } = rollPexelsDice();
    setQuery(preset.query);
    setKind(preset.kind);
    setColor("");
    setOrientation("");
    setMessage(DICE_LINES[Math.floor(Math.random() * DICE_LINES.length)]);
    void run({ mode: "search", query: preset.query, kind: preset.kind, color: "", orientation: "", page });
  }

  function runRecent(entry: string) {
    const sep = entry.indexOf(":");
    const entryKind = (sep > 0 ? entry.slice(0, sep) : "image") as PexelsKind;
    const entryQuery = sep > 0 ? entry.slice(sep + 1) : entry;
    setQuery(entryQuery);
    setKind(entryKind === "video" ? "video" : "image");
    void run({ mode: "search", query: entryQuery, kind: entryKind === "video" ? "video" : "image", color: "", orientation: "", page: 1 });
  }

  function copyText(text: string, label: string) {
    const done = () => setMessage(`📋 ${label} copied - spend it wisely.`);
    try {
      const clip = navigator.clipboard;
      if (!clip) {
        setMessage("Copy blocked by the browser; long-press the link instead.");
        return;
      }
      void clip.writeText(text).then(done).catch(() => {
        setMessage("Copy blocked by the browser; long-press the link instead.");
      });
    } catch {
      setMessage("Copy blocked by the browser; long-press the link instead.");
    }
  }

  const page = lastRun?.page ?? 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${configured === false ? "bg-amber-400/15 text-amber-200" : "bg-emerald-400/15 text-emerald-200"}`}>
          {configured === null ? "○ Pexels status unknown - search to check" : configured ? "● Pexels live · 0 coins" : "● Pexels not configured; sign in + set key"}
        </span>
        <span className="text-xs text-slate-400">{PEXELS_CREDIT_NOTE}</span>
      </div>
      <CompactDetails summary="What does attribution mean?">
        <p className="text-xs text-slate-400">
          Pexels photos and videos are free to use, even commercially, but you must credit the creator and link back to
          Pexels. Every card below shows the credit line - hit <strong>Copy credit</strong> for plain text or{" "}
          <strong>Copy HTML</strong> for a paste-ready snippet for your game&apos;s credits page.
        </p>
      </CompactDetails>

      <section aria-label="Vibe presets" className="flex gap-1.5 overflow-x-auto pb-1">
        {PEXELS_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => runPreset(preset)}
            disabled={busy}
            title={`${preset.label} — ${preset.blurb}`}
            className="h-8 shrink-0 rounded-full border border-white/10 bg-white/[.03] px-3 text-xs font-bold transition hover:border-emerald-300/50 hover:bg-emerald-300/10 disabled:opacity-50"
          >
            {preset.emoji} {preset.label}
          </button>
        ))}
      </section>

      <section className="sticky top-0 z-10 rounded-xl border border-white/10 bg-slate-950/95 p-3.5 backdrop-blur">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Stock type">
          {(["image", "video"] as PexelsKind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold ${kind === k ? "bg-emerald-300 text-slate-950" : "border border-white/15 text-slate-300 hover:border-white/30"}`}
            >
              {k === "image" ? "🖼️ Images" : "🎬 Videos"}
            </button>
          ))}
          <button
            type="button"
            onClick={runDice}
            disabled={busy}
            title="Random vibe, random page. Live dangerously."
            className="rounded-full border border-dashed border-emerald-300/50 px-4 py-1.5 text-sm font-bold text-emerald-200 hover:bg-emerald-300/10 disabled:opacity-50"
          >
            🎲 Surprise me
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block text-sm">
            Search royalty-free stock
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runSearch(1); }}
              maxLength={100}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
              placeholder={kind === "image" ? "dungeon background, pixel hero…" : "boss fight backdrop, crowd cheer…"}
            />
          </label>
          <div className="flex items-end gap-2">
            <button onClick={() => runSearch(1)} disabled={busy} className="rounded-lg bg-emerald-300 px-5 py-2 font-bold text-slate-950 disabled:opacity-50">
              {busy ? "Hunting…" : "🔍 Search - free"}
            </button>
            <button onClick={() => void run({ mode: "curated", query: "", kind, color: "", orientation: "", page: 1 })} disabled={busy} className="rounded-lg border border-white/15 px-4 py-2 font-semibold disabled:opacity-50">
              Curated
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <fieldset>
            <legend className="text-xs font-semibold text-slate-400">Color mood</legend>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setColor("")}
                aria-pressed={color === ""}
                title="Any color"
                className={`rounded-full border px-2.5 py-1 text-xs font-bold ${color === "" ? "border-emerald-300 bg-emerald-300/20 text-emerald-100" : "border-white/15 text-slate-400 hover:border-white/30"}`}
              >
                🌈 Any
              </button>
              {PEXELS_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(color === c.name ? "" : c.name)}
                  aria-pressed={color === c.name}
                  title={c.name}
                  className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${color === c.name ? "border-emerald-300 bg-emerald-300/20" : "border-white/15 hover:border-white/30"}`}
                >
                  <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full border border-white/30" style={{ backgroundColor: c.hex }} />
                  <span className="capitalize text-slate-300">{c.name}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm">
            Orientation
            <select value={orientation} onChange={(e) => setOrientation(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2">
              <option value="">Any shape</option>
              <option value="landscape">🖥️ Landscape (backdrops)</option>
              <option value="portrait">📱 Portrait (cards)</option>
              <option value="square">🟧 Square (icons)</option>
            </select>
          </label>
        </div>
        {recents.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500">🕘 Recent hunts:</span>
            {recents.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => runRecent(entry)}
                disabled={busy}
                className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-slate-300 hover:border-emerald-300/50 disabled:opacity-50"
              >
                {entry.startsWith("video:") ? "🎬" : "🖼️"} {entry.slice(entry.indexOf(":") + 1)}
              </button>
            ))}
          </div>
        )}
        <p role="status" className="mt-3 text-sm text-slate-400">{message}</p>
      </section>

      {items.length === 0 && !lastRun && (
        <p className="rounded-xl border border-dashed border-white/15 p-3.5 text-center text-sm text-slate-500">
          🗺️ The treasure map is blank. Tap a vibe above, roll the 🎲, or type your own quest to fill it with loot.
        </p>
      )}

      {items.length > 0 && (
        <section aria-label="Stock results" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
              <article key={`${item.kind}-${item.id}`} className="group overflow-hidden rounded-xl border border-white/10 bg-white/[.03] transition hover:border-emerald-300/40">
              {item.kind === "video" ? (
                <video src={item.url} poster={item.previewUrl || undefined} controls preload="metadata" className="aspect-video w-full bg-black object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt={item.alt} loading="lazy" className="aspect-video w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
              )}
              <div className="space-y-2 p-3">
                <p className="text-xs text-slate-400">
                  {item.credit} ·{" "}
                  <a href={item.creditUrl} target="_blank" rel="noreferrer" className="underline">creator</a> ·{" "}
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="underline">Pexels page</a>
                </p>
                <div className="flex flex-wrap gap-2">
                  <a href={item.url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-3 py-1 text-xs font-semibold">
                    Open file
                  </a>
                  <button onClick={() => copyText(item.url, "File URL")} className="rounded-lg border border-white/15 px-3 py-1 text-xs font-semibold">
                    Copy URL
                  </button>
                  <button onClick={() => copyText(pexelsCreditLine(item), "Credit line")} className="rounded-lg border border-white/15 px-3 py-1 text-xs font-semibold">
                    Copy credit
                  </button>
                  <button onClick={() => copyText(pexelsCreditHtml(item), "HTML credit")} className="rounded-lg border border-emerald-300/40 px-3 py-1 text-xs font-semibold text-emerald-200">
                    Copy HTML
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {items.length > 0 && lastRun && (
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => void run({ ...lastRun, page: Math.max(1, lastRun.page - 1) })} disabled={busy || lastRun.page <= 1} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-50">
            ← Prev loot
          </button>
          <span className="text-sm text-slate-400">Page {page}{total > 0 ? ` · ${total} total treasures` : ""}</span>
          <button onClick={() => void run({ ...lastRun, page: lastRun.page + 1 })} disabled={busy} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-50">
            More loot →
          </button>
        </div>
      )}
    </div>
  );
}
