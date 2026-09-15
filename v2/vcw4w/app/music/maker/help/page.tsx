import type { Metadata } from "next";
import Link from "next/link";
import { BotCookbook } from "./bot-cookbook";

export const metadata: Metadata = {
  alternates: { canonical: "/music/maker/help" },
  title: "Music Maker Help: Bot Cookbook, 4W-1 Format, SFX Recipes | 4weird",
  description:
    "Help for Music Maker: bot API cookbook with curl and node examples, the 4W-1 song and SFX format reference, and copy-ready SFX recipes.",
};

const WAVES = ["square", "saw", "tri", "sine", "noise"] as const;

const SFX_KINDS = [
  "raygun",
  "death",
  "putt",
  "coin",
  "hit",
  "jump",
  "win",
  "lose",
  "click",
  "alarm",
] as const;

const RAYGUN_JSON = JSON.stringify(
  {
    v: 1,
    name: "Raygun",
    kind: "raygun",
    steps: [
      { wave: "saw", freq: 2000, freqEnd: 200, dur: 0.4, vol: 0.6, type: "tone" },
    ],
  },
  null,
  2,
);

const DEATH_JSON = JSON.stringify(
  {
    v: 1,
    name: "Death",
    kind: "death",
    steps: [
      { wave: "saw", freq: 400, freqEnd: 120, dur: 0.6, vol: 0.6, type: "tone" },
      { wave: "noise", freq: 300, freqEnd: 80, dur: 0.3, vol: 0.35, type: "noise" },
    ],
  },
  null,
  2,
);

const JUMP_JSON = JSON.stringify(
  {
    v: 1,
    name: "Jump",
    kind: "jump",
    steps: [
      { wave: "square", freq: 300, freqEnd: 900, dur: 0.25, vol: 0.5, type: "tone" },
    ],
  },
  null,
  2,
);

const SONG_JSON = JSON.stringify(
  {
    v: 1,
    title: "First Loop",
    bpm: 120,
    tracks: [
      {
        wave: "square",
        notes: [
          { t: 0, n: 60, d: 1 },
          { t: 1, n: 64, d: 1 },
        ],
      },
    ],
  },
  null,
  2,
);

function RecipeCard({ title, blurb, code }: { title: string; blurb: string; code: string }) {
  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-white/[.03]">
      <div className="border-b border-white/10 px-3 py-2">
        <h3 className="text-sm font-black">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-300">{blurb}</p>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed text-cyan-100">
        <code>{code}</code>
      </pre>
    </article>
  );
}

export default function Page() {
  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-3 pb-6 pt-4 sm:px-4 sm:pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          Music Maker - Help
        </p>
        <h1 className="mt-1 max-w-3xl text-2xl font-black leading-tight tracking-tight sm:text-3xl">
          Help, format guide, <span className="text-cyan-300">and bot cookbook.</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-300">
          Everything on this page is static reference. Build songs in the maker,
          then paste these shapes into your own code or bot. Keep text plain
          ASCII and keep songs friendly for all ages.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/music/maker" className="font-bold text-cyan-300 underline">
            Back to the maker
          </Link>
        </p>

        <BotCookbook />

        <section aria-label="4W-1 format reference" className="mt-6">
          <h2 className="text-xl font-black tracking-tight">
            4W-1 format reference
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            Version is always 1. Validators reject unknown keys, wrong types,
            out-of-range values, and oversize payloads.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <article className="rounded-lg border border-white/10 bg-white/[.03] p-3">
              <h3 className="text-sm font-black">Song fields</h3>
              <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-300">
                <li>v: 1 (only value accepted)</li>
                <li>title: 1 to 120 chars, plain ASCII</li>
                <li>bpm: 40 to 240</li>
                <li>tracks: 1 to 8 items</li>
                <li>track.wave: one of {WAVES.join(" | ")}</li>
                <li>track.vol: optional 0 to 1</li>
                <li>track.notes: up to 512 notes</li>
                <li>note.t: start in beats, 0 to 4096</li>
                <li>note.n: MIDI pitch, integer 0 to 127</li>
                <li>note.d: length in beats, up to 256</li>
                <li>note.v: optional velocity 0 to 1</li>
              </ul>
            </article>
            <article className="rounded-lg border border-white/10 bg-white/[.03] p-3">
              <h3 className="text-sm font-black">SFX fields</h3>
              <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-300">
                <li>v: 1 (only value accepted)</li>
                <li>name: 1 to 80 chars, plain ASCII</li>
                <li>kind: one of {SFX_KINDS.join(" | ")}</li>
                <li>steps: 1 to 32 items</li>
                <li>step.wave: one of {WAVES.join(" | ")}</li>
                <li>step.freq / step.freqEnd: 20 to 20000 Hz</li>
                <li>step.dur: 0.01 to 4 seconds</li>
                <li>step.vol: 0 to 1</li>
                <li>step.type: tone or noise</li>
              </ul>
            </article>
          </div>

          <article className="mt-3 rounded-lg border border-white/10 bg-white/[.03] p-3">
            <h3 className="text-sm font-black">Budgets and waves</h3>
            <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-300">
              <li>Song JSON: max 8192 bytes.</li>
              <li>SFX JSON: max 1024 bytes.</li>
              <li>Waves: square, saw, tri, sine, noise.</li>
              <li>SFX kinds: raygun, death, putt, coin, hit, jump, win, lose, click, alarm.</li>
              <li>Share a song link: /music/all/?song=base64url(canonical song JSON).</li>
            </ul>
          </article>

          <figure className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black/40">
            <figcaption className="border-b border-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">
              Minimal song
            </figcaption>
            <pre className="overflow-x-auto p-3 text-xs leading-relaxed text-cyan-100">
              <code>{SONG_JSON}</code>
            </pre>
          </figure>
        </section>

        <section aria-label="SFX recipes" className="mt-6">
          <h2 className="text-xl font-black tracking-tight">
            SFX recipes
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            Copy-ready starting points from the built-in preset library. Tweak
            freq, freqEnd, dur, and vol to taste, then test with POST submit.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <RecipeCard
              title="Raygun"
              blurb="Descending saw zap. Lower freqEnd for a deeper pew."
              code={RAYGUN_JSON}
            />
            <RecipeCard
              title="Death"
              blurb="Falling saw sweep plus a short noise crumble tail."
              code={DEATH_JSON}
            />
            <RecipeCard
              title="Jump"
              blurb="Rising square sweep. Shorten dur for a snappier hop."
              code={JUMP_JSON}
            />
          </div>
        </section>
      </section>
    </div>
  );
}
