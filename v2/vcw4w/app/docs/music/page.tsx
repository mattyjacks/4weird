import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/music" },
  title: "Music Docs — $music:1 Tiny Songs & SFX",
  description:
    "What $music:1 is: the ultra-small 4weird song + SFX format with a tiny-file promise (songs ≤ 64KB, sfx ≤ 2KB), validated per-error and playable everywhere.",
};

const theme = {
  bg: "bg-gradient-to-br from-lime-950 via-slate-950 to-emerald-950",
  border: "border-lime-300/20",
  chip: "border-lime-300/40 bg-lime-300/10 text-lime-200",
  title: "bg-gradient-to-r from-lime-300 via-emerald-200 to-amber-200 bg-clip-text text-transparent",
};

export default function MusicDocsPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · music"
        title={<>Tiny files. <span className={theme.title}>Big sound.</span></>}
        lede={<>$music:1 is the 4weird song + SFX format: plain JSON you can paste into a URL, validate per-error, and play in the browser or inside any HTML game. Songs stay under 64KB, sound effects under 2KB — small enough to share, embed, and store forever.</>}
        stats={[
          ["64KB", "max song"],
          ["2KB", "max sfx"],
          ["5", "waveforms"],
          ["0", "dependencies"],
        ]}
        glyph="🎵"
        theme={theme}
        crumb="Music"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[36, 58, 44, 70, 52, 64, 42].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-lime-200/50 bg-gradient-to-t from-emerald-500 to-lime-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The format"
        title="What $music:1 is"
        body="One authoritative contract (lib/music-format.ts): a song is a title, a tempo, and tracks of notes; a sound effect is a frequency sweep with a duration. Waveforms are shared across both — square, triangle, sawtooth, sine, noise — and validation returns a per-error list, never a bare reject."
      />
      <MockWindow title="$music:1 — minimal song + sfx" badge="valid JSON">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>{`{ "title": "Hi", "bpm": 120, "tracks": [...] }`}</span><span className="font-black text-lime-300">song</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>{`{ "inst": "square", "wave": "square", "notes": [{ "t": 0, "n": 60, "d": 1 }] }`}</span><span className="font-black text-lime-300">track</span></div>
          <div className="flex justify-between gap-3 rounded-lg border border-lime-300/30 bg-lime-300/10 px-3 py-2"><span className="font-bold text-lime-200">{`{ "name": "Blip", "freqStart": 880, "freqEnd": 440, "dur": 0.2 }`}</span><span className="font-black text-lime-200">sfx</span></div>
        </div>
      </MockWindow>

      <SectionHead
        index="2"
        kicker="The promise"
        title="Tiny files, on purpose"
        body="Every payload is measured as its JSON.stringify byte length and capped: songs at 65,536 bytes, effects at 2,048. If it fits, it ships — into a share link, a game bundle, or the seed library. Notes carry start step (t), MIDI pitch (n), length (d), and optional velocity (v); nothing else is required."
      />
      <Steps
        items={[
          ["Write a song", <>Give it a title, a bpm from 40–240, and one or more tracks. Each track names an instrument, picks a wave, and lists notes — start step, MIDI note 0–127, duration in steps.</>],
          ["Write a sound effect", <>Name it, set the frequency sweep (freqStart → freqEnd), a duration in seconds, and optional volume, noise mix, and wave. A coin blip is one line of JSON.</>],
          ["Validate per-error", <>Run the payload through the validator: you get back ok, a per-error list, the byte size, and the detected kind — so a broken note tells you exactly which field failed.</>],
          ["Play or share it", <>Open it in the maker at /music/maker, submit it to the bot API for a canonical form + share URL, or drop it into a game via the embed runtime.</>],
        ]}
      />

      <SectionHead
        index="3"
        kicker="Where next"
        title="Maker, bots, games"
        body="The maker walkthrough covers the step-sequencer and SFX lab; the bots guide covers composing over HTTP against /api/music; the games guide covers embedding the runtime and the seed format. The music library and in-game runtime land alongside these docs."
      />
      <Callout tone="rose" title="Persistence is queued, not landed">
        The bot API validates statelessly today — no database writes. A <code>music_submissions</code> persistence table is a queued future request, so never present submissions as saved server-side yet. Anything marked stub-only elsewhere in these guides stays stub-only.
      </Callout>

      <Pager current="/docs/music" />
    </article>
  );
}
