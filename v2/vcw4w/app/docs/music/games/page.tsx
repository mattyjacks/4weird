import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/music/games" },
  title: "Music in Games — Embed fourweird-music.js + Seed Format",
  description:
    "Put $music:1 sound in any HTML game: include fourweird-music.js, call window.FourWeirdMusic play/stop, and ship tiny seed files from public/music/seeds.",
};

const theme = {
  bg: "bg-gradient-to-br from-lime-950 via-slate-950 to-emerald-950",
  border: "border-lime-300/20",
  chip: "border-lime-300/40 bg-lime-300/10 text-lime-200",
  title: "bg-gradient-to-r from-lime-300 via-emerald-200 to-amber-200 bg-clip-text text-transparent",
};

export default function MusicGamesDocsPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · music · games"
        title={<>One script tag. <span className={theme.title}>Every game sings.</span></>}
        lede={<>The in-game runtime is a single dependency-free script: include /games/html/fourweird-music.js, call window.FourWeirdMusic, and your game plays $music:1 songs and SFX through lazy WebAudio — fail-open when audio is missing, silent when a payload is invalid.</>}
        stats={[
          ["1", "script tag"],
          ["8KB", "song budget"],
          ["1KB", "sfx budget"],
          ["0", "assets needed"],
        ]}
        glyph="👾"
        theme={theme}
        crumb="Games"
        art={
          <div className="font-mono text-xs leading-relaxed" aria-hidden="true">
            <p className="text-slate-400">&lt;script src=&quot;/games/html/fourweird-music.js&quot;&gt;&lt;/script&gt;</p>
            <p><span className="text-lime-300">M.playSong</span><span className="text-slate-200">(song);</span></p>
            <p><span className="text-lime-300">M.playSfx</span><span className="text-slate-200">(&quot;coin&quot;);</span></p>
            <p><span className="text-lime-300">M.stopSong</span><span className="text-slate-200">();</span></p>
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The runtime"
        title="Embed fourweird-music.js"
        body="Reference the runtime by its absolute /games/html/ path — never a relative copy — and it guards itself idempotently on window.FourWeirdMusic. The AudioContext is created lazily on the first play call and resumed if suspended, so autoplay policies stay happy."
      />
      <MockWindow title="game.html — music wiring" badge="/games/html/">
        <div className="space-y-2 font-mono text-xs">
          <div className="rounded-lg bg-white/5 px-3 py-2 text-slate-300">&lt;script src=&quot;/games/html/fourweird-music.js&quot;&gt;&lt;/script&gt;</div>
          <div className="rounded-lg bg-white/5 px-3 py-2"><span className="text-lime-300">var M</span> = window.FourWeirdMusic;</div>
          <div className="rounded-lg bg-white/5 px-3 py-2"><span className="text-lime-300">M.playSong</span>(songObj); <span className="text-slate-500">{"// or a seed URL, or JSON text via playSongJson"}</span></div>
          <div className="rounded-lg border border-lime-300/30 bg-lime-300/10 px-3 py-2"><span className="font-bold text-lime-200"><span className="text-lime-200">M.playSfx</span>(&quot;raygun&quot;);</span><span className="text-lime-200/70"> M.setVolumes({`{ music: 0.5 }`});</span></div>
        </div>
      </MockWindow>

      <SectionHead
        index="2"
        kicker="Walkthrough"
        title="From silent game to soundtrack"
        body="Wire once, then drive everything through the M handle: songs for loops, baked SFX kind names for one-liners, volumes and mute for the options screen. Invalid payloads fail silently to false — your game never crashes on a bad note."
      />
      <Steps
        items={[
          ["Include the script", <>Add <code>{`<script src="/games/html/fourweird-music.js">`}</code> with the absolute path, then grab <code>window.FourWeirdMusic</code>. Including it twice is safe — the second load returns early.</>],
          ["Play a song loop", <>Call <code>playSong</code> with a song object, a <code>$music:1</code> wrapper, or a seed URL (fetched fail-open). Stop it with <code>stopSong</code> (alias: <code>stop</code>).</>],
          ["Fire sound effects", <>Call <code>playSfx</code> with a baked kind name (raygun, death, coin, jump, win, lose, click, alarm…), an SFX object, or JSON text via <code>playSfxJson</code>.</>],
          ["Mix and mute", <>Balance with <code>setVolumes({`{ master, music, sfx }`})</code> and honor the player&apos;s choice with <code>setMuted(true)</code> on the options screen.</>],
        ]}
      />

      <SectionHead
        index="3"
        kicker="Seed format"
        title="Ship tiny soundtrack files"
        body="Game soundtracks live on as small JSON seeds: *.song.json loops transcribed from each game's signature sound (menu, boss, death, coin) and *.sfx.json one-shot recipes. The embed runtime enforces its own tight budgets — songs ≤ 8KB, sfx ≤ 1KB, 8 tracks and 512 notes max — so every seed stays playable anywhere."
      />
      <Callout tone="cyan" title="Seeds land alongside">
        The seed library under <code>public/music/seeds/</code> transcribes the live synth voices of current games into the seed format. Until a seed you want exists, compose it in the maker or fetch it from the bot API — and treat missing seeds as planned, not broken. Never hand-edit a game bundle to add music; the runtime is additive by design.
      </Callout>

      <SectionHead
        index="4"
        kicker="Worked example"
        title="Title loop plus coin SFX in one file"
        body="Wire a menu loop that starts on first input and a coin blip that fires on pickup. Both calls are fail open, so a missing file never breaks the game."
      />
      <MockWindow title="game.html — loop plus pickup" badge="copy pattern">
        <div className="space-y-2 font-mono text-xs">
          <div className="rounded-lg bg-white/5 px-3 py-2 text-slate-300">startButton.onclick = () =&gt; M.playSong(titleLoop);</div>
          <div className="rounded-lg bg-white/5 px-3 py-2 text-slate-300">onPickup = () =&gt; M.playSfx(coin);</div>
          <div className="rounded-lg bg-white/5 px-3 py-2 text-slate-300">optionsToggle.onchange = (e) =&gt; M.setMuted(e.target.checked);</div>
          <div className="rounded-lg border border-lime-300/30 bg-lime-300/10 px-3 py-2 text-lime-200">bad payload returns false, game keeps running</div>
        </div>
      </MockWindow>

      <SectionHead
        index="5"
        kicker="Troubleshooting"
        title="Silent game, autoplay block, bad payload"
        body="Music bugs in games are almost always wiring, policy, or payload shape. Check in this order and most sessions recover in a minute."
      />
      <Steps
        items={[
          ["Nothing plays at all", <>Confirm the script tag uses the absolute path <code>/games/html/fourweird-music.js</code> and that <code>window.FourWeirdMusic</code> exists before your first call. A relative copy or a doubled bundle path is the most common silence.</>],
          ["Music starts only after a click", <>That is autoplay policy working as intended. Bind the first <code>playSong</code> to a start button or any tap, and create the AudioContext lazily inside that handler. Resume it if the browser reports suspended.</>],
          ["SFX fires but the song will not loop", <>Check the song object shape and the 8KB song budget (8 tracks and 512 notes max). Fetch seed URLs fail open, so a 404 seed reads as silence. Inline the canonical JSON to isolate fetch versus shape.</>],
          ["A bad note crashes the scene", <>It should not. Invalid payloads fail silently to false by design. If your game throws, the throw is in your caller, so guard the call site and keep the frame loop independent of audio.</>],
          ["Volumes fight each other", <>Balance with <code>setVolumes</code> using separate music and sfx levels, then honor the options screen mute flag on every scene change. Persist the mute choice so returning players keep their setting.</>],
        ]}
      />
      <Callout tone="emerald" title="Compose the soundtrack first">
        Build loops in the maker step sequencer or generate them through the bot API, then paste the canonical JSON into your game as seeds. One validated file serves the web player, the chat share link, and the in game loop with no conversion.
      </Callout>

      <Pager current="/docs/music/games" />
    </article>
  );
}
