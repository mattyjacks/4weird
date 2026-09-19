import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/music/maker" },
  title: "Music Maker Walkthrough — Step Sequencer & SFX Lab",
  description:
    "Make $music:1 songs in the browser: the /music/maker step-sequencer (8 tracks, wave picker, BPM, tap record, share links) plus the SFX lab (sweeps, presets, preview).",
};

const theme = {
  bg: "bg-gradient-to-br from-lime-950 via-slate-950 to-emerald-950",
  border: "border-lime-300/20",
  chip: "border-lime-300/40 bg-lime-300/10 text-lime-200",
  title: "bg-gradient-to-r from-lime-300 via-emerald-200 to-amber-200 bg-clip-text text-transparent",
};

export default function MusicMakerDocsPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · music · maker"
        title={<>Sequence the grid. <span className={theme.title}>Bake the blip.</span></>}
        lede={<>The maker at /music/maker is an on-device song bench with a step-sequencer grid and an SFX lab side by side: up to 8 tracks with per-track wave and volume, piano-roll editing, tap record, share links — and one-click rayguns. Everything runs in your browser; drafts live in localStorage.</>}
        stats={[
          ["8", "tracks max"],
          ["40–240", "bpm range"],
          ["8KB", "share budget"],
          ["0", "uploads needed"],
        ]}
        glyph="🎛️"
        theme={theme}
        crumb="Maker"
        art={
          <div className="grid grid-cols-8 gap-1.5" aria-hidden="true">
            {[1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1].map((on, i) => (
              <div
                key={i}
                className={`h-6 w-6 rounded-md border sm:h-7 sm:w-7 ${on ? "border-lime-200/60 bg-gradient-to-br from-lime-400 to-emerald-500 shadow-lg" : "border-white/10 bg-white/5"}`}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Step sequencer"
        title="Build a loop on the grid"
        body="Pick a track, pick a wave (square, triangle, sawtooth, sine, noise), and toggle notes on the piano roll — drag to stretch a note longer. Dial the BPM, layer up to 8 tracks, and the budget meter keeps the whole song inside share size."
      />
      <MockWindow title="maker — step sequencer session" badge="8 tracks">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>T1 · square lead — 16 steps</span><span className="font-black text-lime-300">vol 0.8</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>T2 · triangle bass — 16 steps</span><span className="font-black text-lime-300">vol 0.7</span></div>
          <div className="flex justify-between gap-3 rounded-lg border border-lime-300/30 bg-lime-300/10 px-3 py-2"><span className="font-bold text-lime-200">T3 · noise hats — tap record armed</span><span className="font-black text-lime-200">bpm 128</span></div>
        </div>
      </MockWindow>

      <SectionHead
        index="2"
        kicker="Walkthrough"
        title="From first note to share link"
        body="Work left to right: lay down steps, shape the sound, record a human feel, then export. Import and export speak canonical $music:1 JSON, and share links carry the song base64-encoded in ?song=."
      />
      <Steps
        items={[
          ["Toggle steps on the roll", <>Click cells to place notes on the piano roll; drag a note&apos;s edge to stretch its duration. Copy, paste, or clear whole bars when a section repeats.</>],
          ["Shape each track", <>Set the per-track wave and volume — square leads, triangle bass, noise hats. Keep every note inside MIDI 0–127 and the track count at 8 or fewer.</>],
          ["Set tempo and tap record", <>Slide the BPM anywhere from 40–240, then tap-record a pass for human timing on top of the grid. Watch the byte budget meter stay inside share size.</>],
          ["Preview and export", <>Hit play for the on-device WebAudio preview, then download the canonical JSON, copy the ?song= share link, or keep iterating — drafts persist in localStorage.</>],
        ]}
      />

      <SectionHead
        index="3"
        kicker="SFX lab"
        title="Design one-line sound effects"
        body="The SFX lab lands alongside the maker: pick a wave, sweep freqStart down to freqEnd, set duration, volume, and noise mix, then preview live. Start from a preset — raygun, death, jump, coin, explosion, laser, powerup, gameover — and tweak until it zings."
      />
      <Callout tone="cyan" title="SFX lab lands alongside">
        The lab UI and preset recipes ship with the maker surface: wave picker, freq/duration/volume/noise sliders, live preview, preset buttons, and download-JSON. Anything in the lab you cannot click yet is planned — treat unshipped knobs as forthcoming, not broken.
      </Callout>

      <SectionHead
        index="4"
        kicker="Worked example"
        title="An 8 bar loop at 128 BPM"
        body="Build a danceable loop in four tracks and under five minutes: drums, bass, chords, lead. The budget meter stays green the whole way because note data is tiny."
      />
      <Steps
        items={[
          ["Track 1: noise hats", <>Set wave to noise, volume 0.5, BPM 128. Toggle every off beat cell across 16 steps for the tick. Copy the bar once to cover 8 bars without extra work.</>],
          ["Track 2: triangle bass", <>Set wave to triangle, volume 0.7. Place root notes on steps 0, 4, 8, 12 using MIDI 36..48. Drag one note longer to slide into the next bar for movement.</>],
          ["Track 3: square stabs", <>Set wave to square, volume 0.6. Add short chord stabs on steps 2 and 10. Keep durations at 1 step so the bass breathes between hits.</>],
          ["Track 4: sine sparkle", <>Set wave to sine, volume 0.5. Tap record a one bar fill an octave up, then keep the best take and clear the rest. Human timing over the grid is what makes it feel played.</>],
          ["Share it", <>Preview on device speakers, confirm the byte budget sits inside share size, then copy the ?song= link. Paste the link in a fresh tab to confirm it loads before sending it to anyone.</>],
        ]}
      />

      <SectionHead
        index="5"
        kicker="Troubleshooting"
        title="Share link too big, no sound, lost draft"
        body="Maker problems cluster into three buckets: budget overflow, browser audio policy, and localStorage surprises. Each has a fast fix."
      />
      <Steps
        items={[
          ["Share link overflows the budget", <>Cut track count first (mute test: drop to 4 tracks and recheck the meter), then shorten long notes, then lower BPM precision. Eight tracks of 16 steps should fit easily, so overflow usually means one runaway track.</>],
          ["Pressing play makes no sound", <>Browsers gate audio behind a gesture. Click inside the page once, confirm volume sliders are up on both the track and the master, and retry. If a Bluetooth device stole output, switch sinks and press play again.</>],
          ["Draft vanished after a wipe", <>Drafts live in localStorage on that device and browser only. Clearing site data removes them, private windows never kept them, and a different browser never had them. Export canonical JSON for anything you care about.</>],
          ["Imported JSON fails", <>Paste it through the validator and read the per error list. Common culprits: wave misspellings, MIDI notes outside 0..127, BPM outside 40..240, or more than 8 tracks. Fix the listed fields and reimport.</>],
        ]}
      />
      <Callout tone="emerald" title="Stuck on an instrument choice?">
        The maker instrument help pages describe each voice and its sweet range. Pair them with the SFX lab presets (coin, jump, raygun, explosion) when a game needs UI sounds alongside the loop.
      </Callout>

      <Pager current="/docs/music/maker" />
    </article>
  );
}
