import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Game AI & Buddy",
  description:
    "How game AI (dialogue bots, AI directors, voice) and the 9-voice Gaming Buddy work, what they cost, and how to use them on any play page.",
};

const h2 = "mt-10 text-2xl font-bold tracking-tight";
const p = "mt-3 text-muted-foreground leading-relaxed";

export default function GameAiBuddyPage() {
  return (
    <article>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
        Docs · Play smarter
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Game AI &amp; Buddy 🎙️</h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
        Dialogue bots, AI directors, voice acting — plus a universal 9-voice Gaming Buddy that
        reads the screen and coaches you live. All metered with the 25% cut included.
      </p>

      <h2 className={h2}>1. Which games use AI (and how you&apos;ll know)</h2>
      <p className={p}>
        Games declare AI per title. Detail pages (<code>/games/[slug]</code>) and play pages show badges
        disclosing the mode + provider + “25% cut included”:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li><strong className="text-foreground">Required AI:</strong> the core loop needs it (e.g. an attack director driving enemies). Playing the game uses AI by definition.</li>
        <li><strong className="text-foreground">Optional AI:</strong> toggleable dialogue bots, AI directors, or text-to-speech you can switch on/off. Off means no AI metering for that feature.</li>
      </ul>

      <h2 className={h2}>2. What AI costs</h2>
      <p className={p}>
        Game AI meters per unit — dialogue/director/inference turns, TTS characters, GPU minutes — debited
        in gross coins with the 25/75 split recorded server-side. Kinds include dialogue, director, TTS,
        GPU-backed battles, inference, buddy-chat, and buddy-TTS. Game rental (load + per-second play) bills
        underneath; AI bills on top only when used. Every line lands on{" "}
        <Link className="underline" href="/my/usage/">/my/usage/</Link> by kind + by game.
      </p>

      <h2 className={h2}>3. Gaming Buddy: your universal coach (/buddy)</h2>
      <p className={p}>
        <Link className="underline" href="/buddy">/buddy</Link> plus the widget on every play page is one
        coach across all 34 games. It reads the screen + score events, reacts via an observe → reason → act
        loop, chats back, and speaks in 9 voices.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li><strong className="text-foreground">Voices (9):</strong> Alloy, Ash, Coral, Echo, Fable, Onyx, Nova, Sage, Shimmer — Nova by default — at 0.5x–2.0x speed.</li>
        <li><strong className="text-foreground">Sessions:</strong> start/end a Buddy session from the widget; chat and TTS actions meter per turn while the session is open.</li>
        <li><strong className="text-foreground">Live spend:</strong> the widget shows session / total / 24h / 1h spend so costs never surprise you.</li>
        <li><strong className="text-foreground">Fallbacks:</strong> when provider voice is unavailable the Buddy falls back locally (including browser speech) — metering still records the turn.</li>
      </ul>

      <h2 className={h2}>4. Using the Buddy well</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6 text-muted-foreground">
        <li>Open any play page, start a Buddy session, and ask for what you want: “coach my aim,” “explain this level,” “call out pickups.”</li>
        <li>Keep sessions scoped (one game, one goal) — shorter sessions cost less and coach better.</li>
        <li>Toggle optional in-game AI separately from the Buddy: e.g. mute a game&apos;s narrator but keep Buddy coaching.</li>
        <li>End the session when you stop playing — open sessions keep the door open for metered turns.</li>
        <li>Guests: Buddy, multiplayer, saves, and game AI are signed-in only. Sign up to unlock them.</li>
      </ol>

      <h2 className={h2}>5. Troubleshooting</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li><strong className="text-foreground">No voice:</strong> check device volume + browser autoplay permission; try a different voice/speed; the widget falls back to on-device speech.</li>
        <li><strong className="text-foreground">Spend question:</strong> compare the widget&apos;s session line with <Link className="underline" href="/my/usage/">/my/usage/</Link> by-kind + recent-turns lines.</li>
        <li><strong className="text-foreground">AI badge vs. Buddy:</strong> a game can have no built-in AI and still support the universal Buddy overlay — badges describe the game, the widget describes the coach.</li>
      </ul>

      <p className="mt-8 text-sm text-muted-foreground">
        Next: <Link className="underline" href="/docs/playing-games">Playing games →</Link> ·{" "}
        <Link className="underline" href="/docs/vibecodeworker">VibeCodeWorker →</Link>
      </p>
    </article>
  );
}
