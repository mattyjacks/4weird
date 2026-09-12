import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/game-ai-buddy" },
  title: "Game AI & Buddy",
  description:
    "How game AI (dialogue bots, AI directors, voice) and the 9-voice Gaming Buddy work, what they cost, and how to use them on any play page.",
};

const theme = {
  bg: "bg-gradient-to-br from-rose-950 via-slate-950 to-orange-950",
  border: "border-rose-400/20",
  chip: "border-rose-300/40 bg-rose-300/10 text-rose-200",
  title: "bg-gradient-to-r from-rose-300 via-pink-200 to-orange-300 bg-clip-text text-transparent",
};

const VOICES = ["Alloy", "Ash", "Coral", "Echo", "Fable", "Onyx", "Nova", "Sage", "Shimmer"];
const EQ = [42, 68, 34, 80, 56, 92, 48, 74, 38, 86, 60, 96, 52, 70, 40, 82, 58, 90, 46, 66, 36, 76, 54, 88];

export default function GameAiBuddyPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · your co-pilot"
        title={<>A coach who <span className={theme.title}>watches you play.</span></>}
        lede={<>Dialogue bots, AI directors, voice acting - plus a universal 9-voice Gaming Buddy that reads the screen and coaches you live. All metered with the 25% cut included.</>}
        stats={[
          ["9", "voices"],
          ["0.5-2x", "speech speed"],
          ["2", "AI kinds: built-in + Buddy"],
          ["1 widget", "every play page"],
        ]}
        glyph="🎙️"
        theme={theme}
        crumb="Game AI & Buddy"
        art={
          <div className="flex h-16 items-end gap-1 rounded-2xl border border-white/15 bg-black/40 p-3 backdrop-blur" aria-hidden="true">
            {EQ.map((h, i) => (
              <div
                key={i}
                className="eq-bar w-full rounded-full bg-gradient-to-t from-rose-500 to-orange-300"
                style={{ height: `${h}%`, animationDelay: `${(i % 8) * 0.14}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Know what you're playing with"
        title="Required vs. optional AI"
        body="Detail and play pages wear badges disclosing mode + provider + '25% cut included'. Learn to read them:"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-rose-400/40 bg-gradient-to-b from-rose-500/15 to-transparent p-5">
          <p className="inline-block rounded-full bg-rose-500/25 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-300">Required AI</p>
          <p className="mt-2 text-sm text-muted-foreground">The core loop needs it - e.g. an attack director driving enemies. Playing the game <strong className="text-foreground">is</strong> using AI, metered per turn, decision, or GPU minute.</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/40 bg-gradient-to-b from-emerald-500/15 to-transparent p-5">
          <p className="inline-block rounded-full bg-emerald-500/25 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-300">Optional AI</p>
          <p className="mt-2 text-sm text-muted-foreground">Toggleable dialogue bots, directors, TTS. <strong className="text-foreground">Off means zero AI metering</strong> for that feature. Mix freely with the Buddy.</p>
        </div>
      </div>

      <SectionHead
        index="2"
        kicker="The voice cast"
        title="Nine voices, one default diva"
        body="Nova ships as the default; all nine ride the same meters (chat tokens + voice characters + optional screen snapshot + database writes, 25% inside)."
      />
      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-9">
        {VOICES.map((v) => (
          <div
            key={v}
            className={`rounded-2xl border p-3 text-center transition hover:-translate-y-0.5 ${
              v === "Nova"
                ? "border-rose-300/60 bg-gradient-to-b from-rose-400/25 to-transparent shadow-lg"
                : "border-border bg-card"
            }`}
          >
            <p aria-hidden="true" className="text-xl">🖣️</p>
            <p className="mt-1 text-xs font-black">{v}</p>
            {v === "Nova" && <p className="text-[10px] font-bold text-rose-500">DEFAULT</p>}
          </div>
        ))}
      </div>

      <SectionHead
        index="3"
        kicker="How a session sounds"
        title="Buddy 101"
      />
      <MockWindow title="gaming buddy - live session" badge="9.2¢ this session">
        <div className="space-y-3 text-sm">
          <div className="flex gap-2.5">
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/30">🎙️</span>
            <div className="rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2">
              <p className="text-[11px] font-bold text-rose-300">Buddy · Nova 1.2x</p>
              <p>Nice dodge! Two pickups spawn left in ~5s - grab the shield first 🛡️</p>
            </div>
          </div>
          <div className="flex flex-row-reverse gap-2.5">
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">🙂</span>
            <div className="rounded-2xl rounded-tr-sm bg-rose-500/25 px-3 py-2"><p>coach my aim for this boss?</p></div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold text-slate-400">
            <span className="rounded-full border border-white/10 px-2.5 py-1">session 4.1¢</span>
            <span className="rounded-full border border-white/10 px-2.5 py-1">total 38.7¢</span>
            <span className="rounded-full border border-white/10 px-2.5 py-1">24h 12.0¢</span>
            <span className="rounded-full border border-white/10 px-2.5 py-1">1h 4.1¢</span>
          </div>
        </div>
      </MockWindow>
      <ol className="mt-5 list-decimal space-y-2 pl-6 text-sm leading-relaxed text-muted-foreground">
        <li>Open any play page, <strong className="text-foreground">start a Buddy session</strong>, ask for what you want: “coach my aim,” “explain this level,” “call out pickups.”</li>
        <li><strong className="text-foreground">Keep sessions scoped</strong> - one game, one goal. Shorter sessions cost less and coach better.</li>
        <li><strong className="text-foreground">End the session</strong> when you stop playing - open sessions keep the door open for metered turns.</li>
        <li><strong className="text-foreground">Guests:</strong> Buddy, multiplayer, saves, and game AI are signed-in only. Sign up to unlock them.</li>
      </ol>
      <Callout tone="rose" title="No voice? Check the stage, not the actor.">
        Device volume + browser autoplay permission first, then another voice/speed. The widget falls back to on-device
        speech when provider voice is unavailable - the turn still meters. Spend questions? Compare the widget&apos;s session
        line with <Link className="underline" href="/my/usage/">/my/usage/</Link> by-kind + recent-turns lines.
      </Callout>

      <SectionHead
        index="4"
        kicker="Under the hood"
        title="A Buddy turn: observe → reason → act → meter"
        body="Every chat turn reuses the VibeCodeWorker loop shape. The widget observes the screen, the server reasons with a real model (or a clearly-labelled free fallback), acts by speaking, and meters the true cost - tokens + image + database - with the 25% cut inside."
      />
      <MockWindow title="POST /api/buddy/chat - one turn" badge="true-cost metered">
        <div className="space-y-1.5 font-mono text-xs sm:text-sm">
          <p><span className="text-slate-500"># observe: what the widget forwards</span></p>
          <p><span className="text-slate-300">{`{ "game_slug": "gravegain2d", "screen_text": "…≤2000 chars",`}</span></p>
          <p><span className="text-slate-300">{`  "score": 1200, "voice": "nova", "session_id": "…",`}</span></p>
          <p><span className="text-slate-300">{`  "message": "coach my aim?", "history": […], "brain": "auto" }`}</span></p>
          <p><span className="text-slate-500"># reason → act → meter: reply + per-turn cost breakdown</span></p>
          <p><span className="text-emerald-300">✔ reply + cost {"{ chat, image, db }"}</span><span aria-hidden="true" className="docs-cursor text-rose-300">▌</span></p>
        </div>
      </MockWindow>
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">👀 <strong className="text-foreground">Observe is explicit, never sneaky.</strong> The client forwards game slug, title, screen text, score, and optionally a downscaled JPEG/PNG snapshot plus an opt-in camera frame. Every distinct frame reaches the model for that turn only - never stored, never logged - and each bills as image input tokens on the chat leg.</li>
        <li className="rounded-xl border border-border bg-card p-3">🧠 <strong className="text-foreground">Reason picks its brain by key.</strong> <code className="font-mono">brain: &quot;auto&quot;</code> (default) prefers the OpenAI Responses API when its key is set, falls back to OpenRouter chat-completions, and returns a clearly-labelled local reply at zero cost with neither. You can pin <code className="font-mono">&quot;openai&quot;</code> or <code className="font-mono">&quot;openrouter&quot;</code> explicitly - or send <code className="font-mono">&quot;stream&quot;: true</code> for live token deltas over SSE instead of one JSON blob.</li>
        <li className="rounded-xl border border-border bg-card p-3">💬 <strong className="text-foreground">History is short and amnesiac by default.</strong> Up to 8 recent turns ride along for context and are never stored server-side; cross-session memory only exists when you opt in (see below). Typed questions cap at 500 chars, screen context at 3000 in the final prompt.</li>
        <li className="rounded-xl border border-border bg-card p-3">🚦 <strong className="text-foreground">Chat and voice throttle separately</strong> (tens of requests per minute per player) so a rapid-fire coaching session degrades into &quot;slow down&quot; instead of a surprise bill. Game-AI metering behind it caps quantities per call for the same reason.</li>
      </ul>

      <SectionHead
        index="5"
        kicker="Shortcuts"
        title="Slash commands + the intent router"
        body="Don't type an essay mid-boss-fight. The widget expands shortcuts into full model-ready prompts, and a keyword router steers the persona before the model even sees the turn."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["/tactics …", "One concise tactical recommendation for the current battle state, focused on whatever follows the slash. The action catalog's coaching button fires this for you."],
          ["/hail …", "A short fictional enemy-commander radio taunt, then one fair counter-tactic. Roleplay first, coaching always."],
          ["/react …", "React to the moment in 1-2 short sentences - the default lens when you just want company, not counsel."],
          ["/vibe …", "Match energy from the opt-in camera frame: warm, kind, never diagnosing, never identifying."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-mono text-sm font-black text-rose-500">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="violet" title="Media intents win over chit-chat.">
        The router checks in order: sound effects, theme music, concept art, spoken lines, coaching questions, then
        plain chat. Ask for a boss theme and you&apos;ll get a vivid two-sentence moment description plus a ready-to-fire
        media hint - a <code className="font-mono">/api/fal/generate</code> payload that costs nothing until you use
        it. One-click action buttons (theme music, victory poster, and friends) ride the same path with an honest coin
        estimate shown before you tap.
      </Callout>

      <SectionHead
        index="6"
        kicker="Continuity"
        title="Sessions group spend, memory is opt-in"
        body="Sessions are the wallet's unit of grouping: start one when you sit down, end it when you stand up, and the widget plus /my/usage/ show live session spend. Memory - the Buddy remembering you across sessions - is a separate, explicit yes."
      />
      <Steps
        items={[
          ["Start, resume, end", <>Open with <code className="font-mono">POST /api/buddy/session {"{ action: \"start\" }"}</code> (game slug + voice), close with <code className="font-mono">{"{ action: \"end\" }"}</code>. Reloaded mid-game? <code className="font-mono">GET /api/buddy/session?open=1</code> lists your open sessions newest-first so the widget resumes instead of orphaning a meter.</>],
          ["Opt into memory per game", <>Memory lives per game behind <code className="font-mono">GET/POST /api/buddy/memory</code>. POST without <code className="font-mono">consent: true</code> stores nothing, full stop. What&apos;s stored is an extractive rolling buffer of plain &quot;Player: … / Buddy: …&quot; lines - zero model calls, zero AI spend - merged and trimmed oldest-first, then carried into future prompts as one short capped block.</>],
          ["Presence costs extra, on purpose", <>The optional 3D avatar meters by the minute and camera check-ins by the frame through <code className="font-mono">POST /api/buddy/presence</code>, each with a sane per-call cap so a buggy loop can&apos;t drain a wallet in one call. Off by default; the coach works fine without either.</>],
        ]}
      />

      <SectionHead
        index="7"
        kicker="Volume knob"
        title="Voice: models, speed, and the free fallback"
        body="Voice output is metered separately from chat - and only when provider voice actually speaks. Everything else is free by construction."
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">🎛️ <strong className="text-foreground">Two models, nine voices, quarter-step speed.</strong> <code className="font-mono">POST /api/buddy/tts</code> takes up to 2000 chars with <code className="font-mono">tts-1</code> (default) or <code className="font-mono">tts-1-hd</code>, any of the 9 voices, and speed clamped to 0.5-2x in 0.25 steps. HD costs more per character - the per-turn breakdown says exactly how much.</li>
        <li className="rounded-xl border border-border bg-card p-3">🔇 <strong className="text-foreground">No key, no problem, no bill.</strong> Without a provider key the route returns a fallback flag and the widget speaks through your browser&apos;s built-in speech - free, instant, slightly more robotic. Provider hiccup mid-session? Same fallback, same zero charge.</li>
        <li className="rounded-xl border border-border bg-card p-3">🎨 <strong className="text-foreground">Game voices have their own meter.</strong> Built-in game TTS/NPC lines meter through <code className="font-mono">POST /api/game-ai/meter</code> by kind (<code className="font-mono">dialogue</code>, <code className="font-mono">director</code>, <code className="font-mono">tts</code>, <code className="font-mono">runpod-gpu</code>, <code className="font-mono">inference</code>, <code className="font-mono">buddy-*</code>) with the same 25% cut - toggle the feature off and that meter stops dead.</li>
      </ul>
      <Callout tone="rose" title="Barge in - it's designed for it.">
        Start talking while Buddy talks and the widget stops its audio, keeps your partial sentence plus how far Buddy
        got, and resumes with both in context - nothing either side said is lost. Turns where you cut in are preserved
        preferentially in memory and flagged so the next answer addresses your newest point first.
      </Callout>

      <SectionHead
        index="8"
        kicker="Price tags"
        title="What each leg costs"
        body="Buddy turns bill true upstream cost converted to gross Vibe Coins (provider dollars × 100 ÷ 0.75, 25% inside, centicentcoin resolution, minimum a hair above zero per leg). Built-in game AI meters at fixed kind rates instead - same cut, simpler math:"
      />
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {[
          ["💬 Dialogue", "3 / 1k tokens", "NPC chat, quests, Buddy conversation"],
          ["🎬 Director", "2 / decision", "Spawns, pacing, difficulty calls"],
          ["🔊 Game TTS", "2 / 1k chars", "In-game voice lines, announcers"],
          ["🎙️ Buddy voice", "per-char meter", "tts-1 or tts-1-hd + DB leg, true cost"],
          ["🖼️ Avatar", "0.08 / min", "Optional 3D presence, off by default"],
          ["📷 Camera", "0.03 / frame", "Opt-in emotion/body-language frames"],
        ].map(([t, s, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-0.5 font-mono text-xs font-bold text-rose-500">{s}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="rose" title="GPU-backed game AI bills by the minute.">
        Directors running on rented RunPod GPUs or hosted inference endpoints meter compute time rather than tokens -
        check the game&apos;s detail-page badge for which provider backs its features. Whatever the unit, the widget&apos;s
        session line and <Link className="underline" href="/my/usage/">/my/usage/</Link> by-kind lines always agree:
        if they don&apos;t, that&apos;s a bug worth reporting, not a fee worth paying twice.
      </Callout>

      <SectionHead
        index="9"
        kicker="The lineup"
        title="Which games ship AI today"
        body="Games declare AI features in a static registry the play shell reads without a database round-trip - so the 25% badge renders instantly. Everything listed today is optional: toggle it off, pay nothing for it."
      />
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {[
          ["🪦 GraveGain 2D + 3D", "Optional NPC dialogue bot plus an optional RunPod-backed game director pacing spawns and encounters."],
          ["🧟 Last Words: Zombies", "Optional director tuning zombie horde waves to your typing speed, plus zombie voice-line taunts in any of the 9 voices."],
          ["🐾 Assassin Animals", "Optional director adapting facility layouts and patrols to your stealth, via a hosted inference endpoint."],
          ["🦈 BattleSharks 2 + more", "Optional mutation announcer and arena directors (RunPod GPU), each badged with mode + provider + cut on the detail page."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <Callout tone="rose" title="No badge, no meter.">
        Games outside the registry are treated as &quot;no AI&quot; - playing them costs no AI metering at all. The
        Buddy still coaches on any play page regardless, because the Buddy is yours, not the game&apos;s.
      </Callout>

      <Pager current="/docs/game-ai-buddy" />
    </article>
  );
}
