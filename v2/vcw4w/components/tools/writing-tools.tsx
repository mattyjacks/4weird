"use client";

import { useMemo, useState } from "react";
import { copyText, emitToolEvent } from "@/components/tools/interop";

const TITLE_OPENERS = ["Neon", "Hollow", "Crimson", "Silent", "Astral", "Rusty", "Velvet", "Quantum"];
const TITLE_CORES = ["Graveyard", "Arcade", "Vortex", "Kingdom", "Circuit", "Harbor", "Labyrinth", "Outpost"];
const TITLE_CLOSERS = ["Uprising", "Chronicles", "Protocol", "Drift", "Requiem", "Riot", "Odyssey", "Zero"];

const GENRES = ["Arena shooter", "Cozy sim", "Roguelike", "Puzzle", "Racing", "Tower defense", "RPG"];
const TONES = ["Playful", "Epic", "Mysterious", "Chill"];

function makeTitles(seedWord: string, count: number, salt: number): string[] {
  const seed = seedWord.trim() || "Weird";
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const a = TITLE_OPENERS[(seed.length + salt + i * 3) % TITLE_OPENERS.length];
    const b = TITLE_CORES[(seed.charCodeAt(0) + salt * 7 + i * 5) % TITLE_CORES.length];
    const c = TITLE_CLOSERS[(seed.length * 7 + salt * 3 + i * 2) % TITLE_CLOSERS.length];
    out.push(i % 2 === 0 ? `${a} ${b}: ${c}` : `${seed} ${b} ${c}`);
  }
  return out;
}

function makePitch(game: string, genre: string, hook: string, tone: string): string {
  const name = game.trim() || "Untitled Game";
  const h = hook.trim() || "one more run that turns into ten";
  return (
    `${name} is a ${tone.toLowerCase()} ${genre.toLowerCase()} where ${h}.\n\n` +
    `Play free in your browser on 4weird — no download, no install. ` +
    `Climb the leaderboards, squad up with friends, and chase ${h}.\n\n` +
    `Try ${name} today: your first run is on us.`
  );
}

// Writing tools: heuristic game-title generator + marketing pitch builder.
// Fully offline (no AI keys, no network) so it is fail-open by construction.
// Hydration-safe: static initial state; clipboard/bus only in handlers.
export function WritingTools() {
  const [seedWord, setSeedWord] = useState("Grave");
  const [gameName, setGameName] = useState("GraveGain 3D");
  const [genre, setGenre] = useState(GENRES[0]);
  const [hook, setHook] = useState("every arena collapses a little faster than the last");
  const [tone, setTone] = useState(TONES[1]);
  const [round, setRound] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const titles = useMemo(() => makeTitles(seedWord, 6, round), [seedWord, round]);
  const pitch = useMemo(() => makePitch(gameName, genre, hook, tone), [gameName, genre, hook, tone]);

  const handleCopy = (text: string, label: string) => {
    void copyText(text, label).then((ok) => {
      setCopied(ok ? `${label} copied.` : "Copy unavailable — select the text manually.");
      window.setTimeout(() => setCopied(null), 2500);
    });
    emitToolEvent({ tool: "writing", action: "copy", detail: label });
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">Game title generator</h2>
        <p className="mt-2 text-sm text-slate-400">
          Heuristic combos from a seed word — reroll as often as you like.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={seedWord}
            onChange={(e) => setSeedWord(e.target.value)}
            maxLength={24}
            placeholder="Seed word (e.g. Grave)"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
          />
          <button
            type="button"
            onClick={() => {
              setRound((r) => r + 1);
              emitToolEvent({ tool: "writing", action: "reroll-titles" });
            }}
            className="shrink-0 rounded-full bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Reroll titles
          </button>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {titles.map((t) => (
            <li key={`${round}-${t}`}>
              <button
                type="button"
                onClick={() => handleCopy(t, "Title")}
                title="Click to copy"
                className="w-full rounded-xl bg-black/40 px-4 py-3 text-left text-sm font-bold text-white transition hover:border hover:border-cyan-300/50"
              >
                {t}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">Pitch copywriter</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Game name
            </span>
            <input
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              maxLength={60}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Genre
            </span>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Tone
            </span>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Hook (one line)
            </span>
            <input
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              maxLength={140}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            />
          </label>
        </div>
        <div className="mt-4 whitespace-pre-line rounded-2xl bg-black/40 p-5 text-sm leading-relaxed text-slate-200">
          {pitch}
        </div>
        <button
          type="button"
          onClick={() => handleCopy(pitch, "Pitch")}
          className="mt-4 rounded-full bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
        >
          Copy pitch
        </button>
        {copied ? <p className="mt-3 text-sm text-cyan-300">{copied}</p> : null}
      </div>
    </div>
  );
}
