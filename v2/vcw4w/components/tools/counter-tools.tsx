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

  const cards: Array<[string, string]> = [
    ["Words", stats.words.toLocaleString()],
    ["Characters", stats.chars.toLocaleString()],
    ["Characters (no spaces)", stats.charsNoSpaces.toLocaleString()],
    ["Sentences", stats.sentences.toLocaleString()],
    ["Paragraphs", stats.paragraphs.toLocaleString()],
    ["Reading time", formatMinutes(stats.readingMinutes)],
    ["Speaking time", formatMinutes(stats.speakingMinutes)],
  ];

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">Your text</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Paste or type — counts update live, nothing leaves your browser."
          className="mt-4 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-relaxed text-white outline-none focus:border-cyan-300/60"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setText("");
              emitToolEvent({ tool: "counter", action: "clear" });
            }}
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10"
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
            className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Copy stats
          </button>
          <button
            type="button"
            onClick={saveSnapshot}
            disabled={!storageOk || stats.words === 0}
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40"
          >
            Save snapshot
          </button>
        </div>
        {copied ? <p className="mt-3 text-sm text-cyan-300">Stats copied.</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black text-white">{value}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">History</p>
          {storageOk ? (
            history.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {history.map((s, i) => (
                  <li key={`${s.at}-${i}`}>
                    {s.words.toLocaleString()} words · {s.chars.toLocaleString()} chars
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No snapshots yet — counts update live either way.
              </p>
            )
          ) : (
            <p className="mt-2 text-sm text-amber-300">
              Local storage unavailable — history off, counts still live.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
