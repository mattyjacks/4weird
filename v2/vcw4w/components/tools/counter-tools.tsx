"use client";

import { useEffect, useMemo, useState } from "react";
import { copyText, emitToolEvent } from "@/components/tools/interop";

interface Snapshot {
  at: string;
  words: number;
  chars: number;
}

interface Stats {
  chars: number;
  charsNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  readingMinutes: number;
  speakingMinutes: number;
}

const HISTORY_KEY = "4weird_tools_counter_history";

function computeStats(text: string): Stats {
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, "").length;
  const words = (text.trim().match(/\S+/g) ?? []).length;
  const sentences = (text.match(/[^.!?…\n]+[.!?…]+["”'\)\]]*|\S[^\n]*$/g) ?? []).filter((s) =>
    /\w/.test(s),
  ).length;
  const paragraphs = text
    .split(/\n+/)
    .filter((p) => p.trim().length > 0).length;
  return {
    chars,
    charsNoSpaces,
    words,
    sentences: text.trim() ? sentences : 0,
    paragraphs,
    readingMinutes: words / 200,
    speakingMinutes: words / 130,
  };
}

function formatMinutes(min: number): string {
  if (min < 1 / 60) return "< 1 sec";
  const totalSeconds = Math.round(min * 60);
  if (totalSeconds < 60) return `~${totalSeconds} sec`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s === 0 ? `~${m} min` : `~${m} min ${s} sec`;
}

function readHistory(): Snapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is Snapshot =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as Snapshot).words === "number" &&
        typeof (s as Snapshot).chars === "number",
    );
  } catch {
    return [];
  }
}

// Counter tools: words, characters, sentences, paragraphs, reading &
// speaking time, plus a local snapshot history. Hydration-safe: state
// starts empty/static and localStorage is touched only inside useEffect
// (load) and event handlers (save) — never during render. Fail-open: a
// blocked or corrupt storage silently disables history, counts keep working.
// LAYOUT (UXPASS p54): top live metric badge ribbon + 2-col 65/35
// split (editor | sticky live metrics). No logic renames.
export function CounterTools() {
  const [text, setText] = useState("");
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [storageOk, setStorageOk] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem("__4weird_tools_probe", "1");
      window.localStorage.removeItem("__4weird_tools_probe");
      // Pre-existing hydration-safe client load (kept wired) — not a render cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistory(readHistory());
    } catch {
      setStorageOk(false);
    }
  }, []);

  const stats = useMemo(() => computeStats(text), [text]);

  const saveSnapshot = () => {
    if (!storageOk || stats.words === 0) return;
    try {
      const next = [
        {
          at: new Date().toISOString(),
          words: stats.words,
          chars: stats.chars,
        },
        ...history,
      ].slice(0, 10);
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setHistory(next);
      emitToolEvent({ tool: "counter", action: "snapshot", detail: `${stats.words} words` });
    } catch {
      setStorageOk(false);
    }
  };

  const ribbon: Array<[string, string]> = [
    ["Words", stats.words.toLocaleString()],
    ["Chars", stats.chars.toLocaleString()],
    ["Sentences", stats.sentences.toLocaleString()],
    ["Read", formatMinutes(stats.readingMinutes)],
  ];

  const metrics: Array<[string, string]> = [
    ["Words", stats.words.toLocaleString()],
    ["Characters", stats.chars.toLocaleString()],
    ["Characters (no spaces)", stats.charsNoSpaces.toLocaleString()],
    ["Sentences", stats.sentences.toLocaleString()],
    ["Paragraphs", stats.paragraphs.toLocaleString()],
    ["Reading time", formatMinutes(stats.readingMinutes)],
    ["Speaking time", formatMinutes(stats.speakingMinutes)],
  ];

  return (
    <div className="grid gap-3">
      {/* Top live metric badge ribbon — visible without scrolling. */}
      <div
        aria-live="polite"
        className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03] p-2"
      >
        {ribbon.map(([label, value]) => (
          <span
            key={label}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-cyan-300/20 bg-black/40 px-3 py-1.5 text-xs"
          >
            <span className="font-bold uppercase tracking-widest text-slate-400">{label}</span>
            <span className="text-sm font-black text-white">{value}</span>
          </span>
        ))}
        <span className="ml-auto hidden shrink-0 items-center px-2 text-[11px] text-slate-500 sm:inline-flex">
          Live — updates as you type
        </span>
      </div>

      {/* 2-col 65/35 split: editor | sticky live metrics. */}
      <div className="grid gap-3 lg:grid-cols-[65%_35%]">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-black">Your text</h2>
            <span className="text-[11px] text-slate-500">
              {stats.words.toLocaleString()} words · {stats.chars.toLocaleString()} chars
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder="Paste or type — counts update live, nothing leaves your browser."
            className="mt-3 min-h-[280px] w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-relaxed text-white outline-none focus:border-cyan-300/60 lg:min-h-[380px]"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setText("");
                emitToolEvent({ tool: "counter", action: "clear" });
              }}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() =>
                void copyText(
                  `Words: ${stats.words}, Characters: ${stats.chars}, Sentences: ${stats.sentences}, Paragraphs: ${stats.paragraphs}`,
                  "Counter stats",
                ).then((ok) => {
                  setCopied(ok);
                  window.setTimeout(() => setCopied(false), 2500);
                })
              }
              className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              Copy stats
            </button>
            <button
              type="button"
              onClick={saveSnapshot}
              disabled={!storageOk || stats.words === 0}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40"
            >
              Save snapshot
            </button>
            <button
              type="button"
              onClick={() => {
                setText(
                  "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs! How vexingly quick daft zebras jump.",
                );
                emitToolEvent({ tool: "counter", action: "sample" });
              }}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
            >
              Sample text
            </button>
          </div>
          {copied ? <p className="mt-2 text-sm text-cyan-300">Stats copied.</p> : null}
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:p-5">
            <h2 className="text-base font-black">Live metrics</h2>
            <dl className="mt-3 space-y-1.5">
              {metrics.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-3 rounded-lg bg-black/30 px-3 py-1.5"
                >
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    {label}
                  </dt>
                  <dd className="text-sm font-black text-white">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                History
              </p>
              {storageOk ? (
                history.length > 0 ? (
                  <ul className="mt-1.5 space-y-1 text-xs text-slate-300">
                    {history.map((s, i) => (
                      <li key={`${s.at}-${i}`}>
                        {s.words.toLocaleString()} words · {s.chars.toLocaleString()} chars
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-500">
                    No snapshots yet — counts update live either way.
                  </p>
                )
              ) : (
                <p className="mt-1.5 text-xs text-amber-300">
                  Local storage unavailable — history off, counts still live.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
