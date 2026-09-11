import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, MockWindow, Pager } from "@/components/docs/docs-bits";

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
        lede={<>Dialogue bots, AI directors, voice acting — plus a universal 9-voice Gaming Buddy that reads the screen and coaches you live. All metered with the 25% cut included.</>}
        stats={[
          ["9", "voices"],
          ["0.5–2x", "speech speed"],
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
          <p className="mt-2 text-sm text-muted-foreground">The core loop needs it — e.g. an attack director driving enemies. Playing the game <strong className="text-foreground">is</strong> using AI, metered per turn, decision, or GPU minute.</p>
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
      <MockWindow title="gaming buddy — live session" badge="9.2¢ this session">
        <div className="space-y-3 text-sm">
          <div className="flex gap-2.5">
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/30">🎙️</span>
            <div className="rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2">
              <p className="text-[11px] font-bold text-rose-300">Buddy · Nova 1.2x</p>
              <p>Nice dodge! Two pickups spawn left in ~5s — grab the shield first 🛡️</p>
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
        <li><strong className="text-foreground">Keep sessions scoped</strong> — one game, one goal. Shorter sessions cost less and coach better.</li>
        <li><strong className="text-foreground">End the session</strong> when you stop playing — open sessions keep the door open for metered turns.</li>
        <li><strong className="text-foreground">Guests:</strong> Buddy, multiplayer, saves, and game AI are signed-in only. Sign up to unlock them.</li>
      </ol>
      <Callout tone="rose" title="No voice? Check the stage, not the actor.">
        Device volume + browser autoplay permission first, then another voice/speed. The widget falls back to on-device
        speech when provider voice is unavailable — the turn still meters. Spend questions? Compare the widget&apos;s session
        line with <Link className="underline" href="/my/usage/">/my/usage/</Link> by-kind + recent-turns lines.
      </Callout>

      <Pager current="/docs/game-ai-buddy" />
    </article>
  );
}
