import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/games/saves" },
  title: "Game saves: autosave default ON",
  description:
    "Autosave runs by default: every minute plus on game request, into cheat-free slot 0. Device mirror when signed out, cloud sync when signed in.",
};

const theme = {
  bg: "bg-gradient-to-br from-cyan-950 via-slate-950 to-violet-950",
  border: "border-cyan-400/20",
  chip: "border-cyan-300/40 bg-cyan-300/10 text-cyan-200",
  title: "bg-gradient-to-r from-cyan-300 via-sky-200 to-violet-300 bg-clip-text text-transparent",
};

export default function GameSavesPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · games · saves"
        title={<>Never lose a run. <span className={theme.title}>Autosave is on.</span></>}
        lede={<>Cloud save slots 0-3 keep your run across devices. Autosave handles slot 0 for you — every minute and whenever the game asks — so quitting mid-run still resumes cleanly.</>}
        stats={[
          ["ON", "autosave default"],
          ["60s", "timed autosave"],
          ["0", "cheat-free autosave slot"],
          ["4", "slots · 0-3"],
        ]}
        glyph="💾"
        theme={theme}
        crumb="Game saves"
        art={
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/40 p-4 backdrop-blur">
            <span aria-hidden="true" className="text-3xl">🎮</span>
            <p className="font-mono text-sm font-bold tracking-widest text-cyan-200">AUTOSAVE → SLOT 0 → ☁️</p>
            <span aria-hidden="true" className="text-3xl">☁️</span>
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Set-and-forget"
        title="Autosave (default ON)"
        body="Autosave is enabled by default. It saves every minute plus whenever the game requests it (e.g. after a cutscene), so your latest progress is always parked safely."
      />
      <Steps
        items={[
          [
            "Timed save, every minute",
            <>Once a minute during play, the shell writes the current game state to autosave. No button press needed — pause, close the tab, come back later.</>,
          ],
          [
            "Event save, on game request",
            <>Games can request a save at natural breakpoints (e.g. after a cutscene, level clear, or day advance). Each request lands immediately, on top of the minute timer.</>,
          ],
          [
            "Always lands in slot 0",
            <>Autosave writes to slot 0, the cheat-proof / cheat-free slot. Any cheat marker the client sends is stripped on write, so the autosave slot stays clean no matter what.</>,
          ],
        ]}
      />
      <MockWindow title="4weird.com - autosave" badge="slot 0">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">EVERY 60s · timed</span><span className="font-bold text-emerald-300">→ SLOT 0</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">ON REQUEST · e.g. after cutscene</span><span className="font-bold text-emerald-300">→ SLOT 0</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">SLOT 0 · safety</span><span className="font-bold text-cyan-300">CHEAT-FREE · marker stripped</span></div>
          <p className="pt-1 text-[11px] text-slate-500">default ON · opt-out in the Cloud saves section below</p>
        </div>
      </MockWindow>

      <SectionHead
        index="2"
        kicker="Signed out or in"
        title="Cloud saves"
        body="Autosave works signed-out via the device mirror, and cloud-syncs when signed in. Sign in with the same account on any device, load the same slot, and the run follows you."
      />
      <ul className="mt-5 list-disc space-y-2 pl-6 text-sm leading-relaxed text-muted-foreground">
        <li><strong className="text-foreground">Signed out:</strong> autosave keeps a device mirror so a refresh or accidental close still resumes on this device.</li>
        <li><strong className="text-foreground">Signed in:</strong> the same slot-0 write syncs to the cloud, so phone → desktop → phone resumes the same run.</li>
        <li><strong className="text-foreground">Opt-out:</strong> prefer manual saves only? Turn autosave off with the toggle in this Cloud saves section of the game shell. Timed and on-request writes stop; manual slot writes still work.</li>
      </ul>
      <Callout tone="cyan" title="Keep slot 0 as your safety net.">
        Slots 1-3 are yours for experiments and alternate runs — cheats brand them permanently. Autosave&apos;s slot-0 home stays cheat-free, so leave it as the run you care about.
      </Callout>

      <SectionHead
        index="3"
        kicker="Dual-save"
        title="Manual + load-only autosave per slot"
        body="Each slot 0-3 holds two copies: your manual save (Save + Load) and its autosave companion (Load-only backup). Autosave writes the auto companion of the active slot every minute — a load-only safety net if the manual copy corrupts."
      />
      <ul className="mt-5 list-disc space-y-2 pl-6 text-sm leading-relaxed text-muted-foreground">
        <li><strong className="text-foreground">Manual vs autosave:</strong> Save writes the manual copy; the minute-timer autosave writes the auto companion of the active slot. Autosave never overwrites your manual save.</li>
        <li><strong className="text-foreground">Active-slot rule:</strong> autosave follows the slot you are playing — the companion belongs to the active slot, not always slot 0.</li>
        <li><strong className="text-foreground">Cloud kind:</strong> <code>?kind=manual|auto</code> selects which copy (omitted = both); PUT defaults to <code>kind=manual</code>. On this device the auto mirror lives under the <code>:auto</code> suffix.</li>
        <li><strong className="text-foreground">Corrupt-manual recovery:</strong> if a manual copy fails to parse or apply, Load-autosave restores the auto companion for the same slot — same run, one minute older at most.</li>
      </ul>

      <p className="mt-8 text-sm text-muted-foreground">
        Slot mechanics in full in <Link className="font-bold underline" href="/docs/playing-games">Playing games</Link> ·
        Fridge Simulator handoff in <Link className="font-bold underline" href="/docs/games-fridge/saves">Resume anywhere</Link>.
      </p>
    </article>
  );
}
