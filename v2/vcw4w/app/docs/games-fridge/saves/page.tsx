import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/games-fridge/saves" },
  title: "Fridge Simulator: resume anywhere",
  description:
    "Resume a Fridge Simulator run on any device with cloud save slots 0-3. Slot 0 is cheat-proof; slots 1-3 carry a permanent cheat mark once cheats are used.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950",
  border: "border-emerald-400/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function FridgeSavesPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · Fridge Simulator · saves"
        title={<>Start on mobile. <span className={theme.title}>Finish on desktop.</span></>}
        lede={<>Fridge Simulator runs persist in four cloud save slots per game. Sign in with the same account on any device, load the same slot, and your fridges, budgets, and day counter pick up exactly where you left them.</>}
        stats={[
          ["4", "slots · 0-3"],
          ["0", "cheat-proof safety slot"],
          ["1 MiB", "max save payload"],
          ["410", "deletes are refused"],
        ]}
        glyph="💾"
        theme={theme}
        crumb="Fridge saves"
        art={
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/40 p-4 backdrop-blur">
            <span aria-hidden="true" className="text-3xl">📱</span>
            <p className="font-mono text-sm font-bold tracking-widest text-emerald-200">SLOT 2 → ☁️ → 🖥️ SAME RUN</p>
            <span aria-hidden="true" className="text-3xl">🖥️</span>
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The handoff"
        title="Resume the same run cross-device"
        body="Cloud saves are keyed to your account, the game slug, and the slot number — not the device. The device is interchangeable; the slot is the save."
      />
      <Steps
        items={[
          [
            "Sign in on device A and play into a slot",
            <>Play Fridge Simulator signed in and save into any slot 0-3. The slot payload carries your fridges, inventory, budgets, and day — up to 1 MiB of plain game state.</>,
          ],
          [
            "Sign in with the SAME account on device B",
            <>Guests have no saves: three free loads a day and nothing persists. The account is the bridge — same login, same slots.</>,
          ],
          [
            "Load the same game + slot",
            <>Open the same game (<code>fridgesimulator</code>) and the same slot number. The server returns the most recently written save for that account, game, and slot.</>,
          ],
          [
            "Keep playing — the slot stays yours",
            <>Every later write upserts the same slot, so bouncing phone → desktop → phone just works. There is no merge: latest write wins, per slot.</>,
          ],
        ]}
      />

      <SectionHead
        index="2"
        kicker="Slot 0 safety"
        title="Slot 0 can never be cheat-marked"
        body="Slots 1-3 remember cheats forever: once a cheat touches a slot, every later write to it keeps the mark, and deleting plus recreating cannot launder it. Slot 0 is the exception."
      />
      <MockWindow title="4weird.com - save slots" badge="fridgesimulator">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">SLOT 0 · safety</span><span className="font-bold text-emerald-300">CHEAT-PROOF · marker stripped</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">SLOT 1 · run A</span><span className="font-bold text-slate-200">clean until cheats</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">SLOT 2 · run B</span><span className="font-bold text-slate-200">clean until cheats</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">SLOT 3 · experiments</span><span className="font-bold text-rose-300">cheat-branded · forever flagged</span></div>
          <p className="pt-1 text-[11px] text-slate-500">writes strip cheat_mode on slot 0 · re-apply it on slots 1-3 · deletes refused (410)</p>
        </div>
      </MockWindow>
      <ul className="mt-5 list-disc space-y-2 pl-6 text-sm leading-relaxed text-muted-foreground">
        <li><strong className="text-foreground">Keep your real run on slot 0:</strong> any cheat marker the client sends is stripped on write, and the database enforces the same invariant — slot 0 stays clean no matter what.</li>
        <li><strong className="text-foreground">Experiment on a throwaway slot:</strong> cheats brand slots 1-3 permanently. The mark survives overwrites, so never test cheats in the slot holding a run you care about.</li>
        <li><strong className="text-foreground">You cannot delete your way out:</strong> save deletes are refused, so a branded slot cannot be laundered by recreating it. Pick the slot before you play.</li>
      </ul>

      <SectionHead
        index="3"
        kicker="Dual-save"
        title="Manual + load-only autosave per slot"
        body="Each slot 0-3 holds a manual save (Save + Load) plus its autosave companion (Load-only backup). Autosave writes the auto companion of the active slot every minute — a safety net if the manual copy corrupts."
      />
      <ul className="mt-5 list-disc space-y-2 pl-6 text-sm leading-relaxed text-muted-foreground">
        <li><strong className="text-foreground">Active-slot rule:</strong> the autosave companion belongs to the slot you are playing, so bouncing phone → desktop → phone keeps both copies per slot.</li>
        <li><strong className="text-foreground">Kind + device key:</strong> cloud <code>?kind=manual|auto</code> (omitted = both), PUT defaults to manual; the device auto mirror uses the <code>-auto</code> suffix.</li>
        <li><strong className="text-foreground">Corrupt-manual recovery:</strong> if a manual copy fails to load, Load-autosave restores the same slot&apos;s auto companion — same day counter, same fridges, one minute older at most.</li>
      </ul>

      <SectionHead
        index="4"
        kicker="Worked example"
        title="Weekend trip: tablet, laptop, phone"
        body="A concrete run shows how the slot, the manual copy, and the autosave companion travel together across three devices."
      />
      <Steps
        items={[
          [
            "Friday night: start the run on a tablet",
            <>Sign in, open Fridge Simulator, and save the opening stock into slot 1. Say the run reads day 4, two fridges in Osaka, a budget of 620 coins, and a backpack of rice, eggs, and spinach. Press Save, then confirm the slot timestamp updated.</>,
          ],
          [
            "Saturday: continue on a laptop",
            <>Sign in with the same account on the laptop, open the same game, and load slot 1 manual. The day counter, both fridges, the pantry inventory, and the budget match the tablet exactly. Play through day 5, restock milk and tofu, then press Save again before closing the lid.</>,
          ],
          [
            "Sunday: recover a mistake on a phone",
            <>On the phone, load slot 1 manual and accidentally sell the wrong fridge. Do not panic. Use Load-autosave to restore the same slot&apos;s auto companion from about a minute earlier, then replay the sale correctly and press Save.</>,
          ],
          [
            "Monday: verify the chain",
            <>Load slot 1 on any device and check four things: day counter advanced, budgets consistent, inventory quantities plausible, and no cheat mark on a slot you never cheated in. If one value looks stale, you loaded the wrong slot number or the wrong game slug.</>,
          ],
        ]}
      />
      <MockWindow title="4weird.com - slot 1 verification" badge="checklist">
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-400">GAME SLUG</span><span className="font-bold text-emerald-300">fridgesimulator</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">SLOT + KIND</span><span className="font-bold text-emerald-300">slot 1 manual, auto companion present</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">DAY + BUDGET</span><span className="font-bold text-slate-200">day 6, 588 coins after groceries</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-400">CHEAT MARK</span><span className="font-bold text-emerald-300">absent, clean run</span></div>
          <p className="pt-1 text-[11px] text-slate-500">same account on every device, same slot number every time</p>
        </div>
      </MockWindow>

      <SectionHead
        index="5"
        kicker="Troubleshooting"
        title="Slot confusion, stale loads, and payload limits"
        body="Almost every save complaint is one of four mixups: guest play, mismatched slot, mismatched game slug, or an oversized payload."
      />
      <ul className="mt-5 list-disc space-y-2 pl-6 text-sm leading-relaxed text-muted-foreground">
        <li><strong className="text-foreground">Guest progress vanishes:</strong> signed out play never writes to the cloud. If the slot list looks empty on a second device, confirm both devices show the same username in the account menu.</li>
        <li><strong className="text-foreground">Wrong slot number:</strong> slot 0, 1, 2, and 3 are independent runs. A day 2 kitchen in slot 0 and a day 9 market in slot 2 can coexist. Compare timestamps before assuming data loss.</li>
        <li><strong className="text-foreground">Manual versus auto:</strong> Load reads the manual copy, Load-autosave reads the companion. After a crash, try the companion first, then resume manual saves so the two copies stay close together.</li>
        <li><strong className="text-foreground">Payload ceiling:</strong> saves larger than 1 MiB are rejected. Trim stored screenshots, prune ancient pantry logs, and consolidate half empty fridges, then save again.</li>
        <li><strong className="text-foreground">Cheat mark surprise:</strong> a branded slot 1, 2, or 3 keeps its flag through overwrites and cannot be cleared by delete and recreate. Move serious runs to slot 0 and reserve one slot for modded experiments.</li>
      </ul>
      <Callout tone="emerald" title="Slot picker rule of thumb.">
        Slot 0 holds the honest campaign, slot 1 holds the current challenge, slot 2 holds a shared family run, and
        slot 3 absorbs every risky idea. Decide the layout once, label it in a clan note or notebook, and every device
        follows the same map. Full slot rules also appear in <Link className="underline" href="/docs/playing-games">Playing games</Link>.
      </Callout>

      <Callout tone="cyan" title="Reviewer path: prove the resume in two minutes.">
        Sign in on a phone-sized window, play Fridge Simulator into slot 2, then sign in with the same account in a desktop
        window and load game <code>fridgesimulator</code>, slot 2. Same day counter, same fridges, same budgets — that is the whole feature.
      </Callout>

      <p className="mt-8 text-sm text-muted-foreground">
        Back to the <Link className="font-bold underline" href="/docs/games-fridge">Fridge Simulator guide</Link> ·
        plan meals with the <Link className="font-bold underline" href="/docs/games-fridge/foods">foods table</Link> ·
        slot mechanics in full in <Link className="font-bold underline" href="/docs/playing-games">Playing games</Link>.
      </p>
    </article>
  );
}
