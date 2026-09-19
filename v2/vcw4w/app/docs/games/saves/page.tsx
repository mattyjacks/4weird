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

      <SectionHead
        index="4"
        kicker="Four slots, four jobs"
        title="Which slot for which run"
        body="Slot 0 is the safe home. Slots 1 to 3 are your lab bench: clean until cheats touch them, branded forever after."
      />
      <div className="mt-5 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-muted-foreground">Slot</th>
              <th className="px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-muted-foreground">Best job</th>
              <th className="px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-muted-foreground">Cheat rule</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {[
              ["Slot 0", "Main run plus autosave home", "Cheat-proof: markers stripped on write, cheat requests refused."],
              ["Slot 1", "Second run or clean alternate", "Stays clean until cheats are used, then branded permanently."],
              ["Slot 2", "Experiments and risky strategies", "Same permanent brand rule as slot 1. Test here, not in slot 0."],
              ["Slot 3", "Throwaway cheats and chaos", "Assume branded from the first cheat. Still playable, forever flagged."],
            ].map(([k, v, r]) => (
              <tr key={k}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold">{k}</td>
                <td className="px-4 py-3 text-muted-foreground">{v}</td>
                <td className="px-4 py-3 text-muted-foreground">{r}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Callout tone="cyan" title="One slot per run.">
        Give each active run its own slot and name the job honestly: slot 0 for the run you care about, slot 3
        for the chaos. When a save is branded, you never have to wonder which timeline it belongs to.
      </Callout>

      <SectionHead
        index="5"
        kicker="Phone to desktop"
        title="Worked example: move a run between devices"
        body="Signed in, the same run follows you. Here is the exact handoff, start to finish."
      />
      <Steps
        items={[
          [
            "Finish on the phone, signed in",
            <>Play while signed in so the slot writes sync to the cloud, and note which slot number you are on. Signed-out play keeps only the device mirror, which never leaves that browser.</>,
          ],
          [
            "Open the same game on desktop",
            <>Sign in with the same account on the second device (check <Link className="font-bold underline" href="/account">/account</Link> if you are unsure which account holds the run) and open the same game.</>,
          ],
          [
            "Load the same slot and kind",
            <>Pick the same slot 0 to 3 you played on the phone. Load the manual copy for your save, or the auto companion if the manual copy ever fails: same run, at most a minute older.</>,
          ],
        ]}
      />

      <SectionHead
        index="6"
        kicker="When saves misbehave"
        title="Troubleshooting"
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">🧭 <strong className="text-foreground">Run did not follow me.</strong> The usual causes, in order: one device was signed out, the two devices use different accounts, or a different slot was loaded. Fix: sign in on both, confirm the same account, load the same slot number.</li>
        <li className="rounded-xl border border-border bg-card p-3">🧩 <strong className="text-foreground">Manual load fails.</strong> Load the auto companion of the same slot instead. If the manual copy fails to parse, the companion restores the same run from at most a minute earlier.</li>
        <li className="rounded-xl border border-border bg-card p-3">🖋️ <strong className="text-foreground">Slot shows a cheat mark.</strong> That mark is permanent and survives delete and recreate. Move the serious run to cheat-proof slot 0 and keep the branded slot for chaos.</li>
        <li className="rounded-xl border border-border bg-card p-3">👻 <strong className="text-foreground">Guest progress vanished.</strong> The device mirror lives in that browser only: clearing site data, switching browsers, or switching devices ends it. Sign in for cloud slots that travel.</li>
        <li className="rounded-xl border border-border bg-card p-3">⏸️ <strong className="text-foreground">Autosave stopped writing.</strong> Check the opt-out toggle in the Cloud saves section of the game shell. Timed and on-request writes stop while it is off; manual slot writes still work.</li>
      </ul>

      <SectionHead
        index="7"
        kicker="Two homes for progress"
        title="Guest or signed in: where your run lives"
        body="Same shell, different home. The device mirror forgives accidents; only the cloud follows you."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">🧭 Signed out: device mirror</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Autosave keeps a mirror in this browser, so a refresh or an accidental close still resumes.
            That mirror never leaves the device, vanishes with cleared site data, and cannot hop browsers.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-black">☁️ Signed in: cloud sync</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The same slot writes sync to the cloud under your account. Any device with the same login
            loads the same slot number and continues the identical run: manual copy plus auto companion.
          </p>
        </div>
      </div>

      <SectionHead
        index="8"
        kicker="Speak save fluently"
        title="Glossary"
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">🗄️ <strong className="text-foreground">Slot.</strong> One of four numbered homes (0 to 3) per game. Each slot holds two copies: manual plus auto.</li>
        <li className="rounded-xl border border-border bg-card p-3">✍️ <strong className="text-foreground">Manual copy.</strong> The write your Save button makes. Loads with Save plus Load; never touched by the minute timer.</li>
        <li className="rounded-xl border border-border bg-card p-3">🤖 <strong className="text-foreground">Auto companion.</strong> The Load-only backup the timer refreshes. Restores the same slot when the manual copy fails.</li>
        <li className="rounded-xl border border-border bg-card p-3">🔀 <strong className="text-foreground">Kind.</strong> The cloud selector: ?kind=manual fetches your save, ?kind=auto fetches the companion, omitting it fetches both.</li>
        <li className="rounded-xl border border-border bg-card p-3">📱 <strong className="text-foreground">Device mirror.</strong> The signed-out browser copy, with the auto mirror stored under the :auto suffix. Handy, but homebound.</li>
        <li className="rounded-xl border border-border bg-card p-3">🖋️ <strong className="text-foreground">Cheat mark.</strong> The permanent cheat_mode:true brand on slots 1 to 3 once cheats are used. A database invariant, not a label.</li>
      </ul>

      <SectionHead
        index="9"
        kicker="Thirty second habit"
        title="Checklist before you close the tab"
        body="Runs are lost in the gap between playing and saving. Close that gap with four glances."
      />
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">👁️ <strong className="text-foreground">Glance at the slot number.</strong> Confirm you are writing to the slot you mean: 0 for the keeper run, 3 for the chaos run. A save in the wrong slot is not lost, just parked where you will not look.</li>
        <li className="rounded-xl border border-border bg-card p-3">👤 <strong className="text-foreground">Glance at the login.</strong> If the header offers Login instead of Dashboard, this browser holds only a mirror. Sign in before the milestone moment, not after it.</li>
        <li className="rounded-xl border border-border bg-card p-3">💾 <strong className="text-foreground">Press Save on milestones.</strong> Autosave covers minutes, not meaning: after a boss, a cutscene, or a perfect day, write the manual copy deliberately so the companion is never your only witness.</li>
        <li className="rounded-xl border border-border bg-card p-3">🧾 <strong className="text-foreground">Verify on the next visit.</strong> When you return, load the slot and confirm the run before playing on. Catching a wrong slot early costs seconds; catching it after an hour of overwriting costs the hour.</li>
      </ul>

      <p className="mt-8 text-sm text-muted-foreground">
        Slot mechanics in full in <Link className="font-bold underline" href="/docs/playing-games">Playing games</Link> ·
        Fridge Simulator handoff in <Link className="font-bold underline" href="/docs/games-fridge/saves">Resume anywhere</Link>.
      </p>
    </article>
  );
}
