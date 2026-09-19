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

      <SectionHead
        index="4"
        kicker="Worked example"
        title="A tiny loop that fits anywhere"
        body="This canonical song uses two tracks and sixteen steps per track, stays far under the 64KB song cap, and survives a round trip through validation unchanged."
      />
      <MockWindow title="$music:1 — two track loop" badge="copies cleanly">
        <div className="space-y-2 font-mono text-xs">
          <div className="rounded-lg bg-white/5 px-3 py-2 text-slate-300">{`{ "title": "Lantern Loop", "bpm": 112, "tracks": [`}</div>
          <div className="rounded-lg bg-white/5 px-3 py-2 text-slate-300">{`  { "inst": "lead", "wave": "square", "notes": [{ "t": 0, "n": 72, "d": 1 }, { "t": 4, "n": 76, "d": 1 }] },`}</div>
          <div className="rounded-lg bg-white/5 px-3 py-2 text-slate-300">{`  { "inst": "bass", "wave": "triangle", "notes": [{ "t": 0, "n": 48, "d": 2 }, { "t": 8, "n": 43, "d": 2 }] }`}</div>
          <div className="rounded-lg bg-white/5 px-3 py-2 text-slate-300">{`]}`}</div>
          <div className="rounded-lg border border-lime-300/30 bg-lime-300/10 px-3 py-2 text-lime-200">validator: ok, bytes under 1KB, kind song</div>
        </div>
      </MockWindow>

      <SectionHead
        index="5"
        kicker="FAQ"
        title="Budgets, validation, sharing"
        body="The five questions that decide whether a payload ships or gets rejected, answered against the authoritative contract."
      />
      <Steps
        items={[
          ["How is size measured?", <>By the UTF-8 byte length of the JSON.stringify form. Songs cap at 65,536 bytes and effects at 2,048. A song that looks small but embeds long instrument names can surprise you, so check the reported bytes, not the line count.</>],
          ["What does per error validation mean?", <>One response lists every broken field at once (bad wave name, MIDI note 200, negative duration) instead of stopping at the first failure. Fix all listed fields in one pass and resubmit.</>],
          ["Which waves exist?", <>Square, triangle, sawtooth, sine, and noise, shared by songs and effects. Anything else fails validation. Pick square for leads, triangle for bass, and noise for hats and explosions.</>],
          ["What BPM range is legal?", <>40 through 240 inclusive. Below 40 drags and above 240 blurs, so the contract rejects both. Tap tempo in the maker lands you inside the range automatically.</>],
          ["Where does a finished song go?", <>Three doors: play it in the maker step sequencer, POST it to the bot API for a canonical form plus share URL, or embed it in a game through the runtime. The seed library holds curated examples for each door.</>],
        ]}
      />
      <Callout tone="emerald" title="Pick your door next">
        Build by hand in the maker walkthrough, compose over HTTP with the bots guide, or ship inside a game with the games embedding guide. All three speak the same canonical JSON, so a song that validates once plays everywhere.
      </Callout>

      <Pager current="/docs/music" />
    </article>
  );
}
