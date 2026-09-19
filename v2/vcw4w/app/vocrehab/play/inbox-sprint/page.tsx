/**
 * VocRehab Inbox Sprint game page (client composition boundary).
 *
 * Usage: route `app/vocrehab/play/inbox-sprint/page.tsx`. Client component
 * composing the shared `VocrehabGameFrame` with its game via render prop.
 * Practice-first copy and the no-test promise render above the frame.
 * Route metadata + canonical live in the sibling server layout.
 */

"use client";

import Link from "next/link";
import VocrehabGameFrame from "@/components/vocrehab/vocrehab-game-frame";
import VocrehabGameInboxSprint from "@/components/vocrehab/vocrehab-game-inbox-sprint";

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> → Inbox Sprint
      </nav>
      <h1 className="text-xl font-bold">Inbox Sprint: triage email without fear</h1>
      <p className="text-sm text-muted-foreground">
        Start with the untimed practice rep. Flagging the phishing-ish message is praised; opening
        its link is coached, never punished. Practice, not a test. Nothing here grades you.
      </p>
      <VocrehabGameFrame
        vocrehabGameId="inbox-sprint"
        vocrehabTitle="Inbox Sprint"
        vocrehabInstructions="Triage 8 mock messages: reply now, schedule, file, or flag. One message needs a short careful reply from a starter sentence."
        vocrehabPracticeSteps={[
          "Read each message and pick reply, schedule, file, or flag.",
          "Flag anything that looks like phishing. Flagging is always safe.",
          "Write the one careful reply from the sentence starter.",
        ]}
        vocrehabTimeLimitSec={180}
        vocrehabExitHref="/vocrehab/play"
      >
        {(run) => <VocrehabGameInboxSprint {...run} />}
      </VocrehabGameFrame>
      <section aria-label="How to play Inbox Sprint" className="space-y-2 pt-2">
        <h2 className="text-base font-bold">How to play</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Warm up with the untimed practice rep. Eight mock messages arrive: four
            legitimate, four phishing. Read each fully before touching any action,
            because skimmers feed phishers.
          </li>
          <li>
            Triage every message into reply now, schedule, file, or flag. Urgent real
            mail earns a reply, FYI mail gets filed, routine mail gets scheduled, and
            anything phishing gets flagged. Flagging is always safe, even if you are unsure.
          </li>
          <li>
            Write the one careful reply from the sentence starter: thank you for
            sharing this, what would help is, followed by your own clear ask. Keep it
            short, specific, and kind.
          </li>
          <li>
            Run the scored three-minute sprint when ready. Same eight-message shape,
            same seed replayable, so the second attempt measures learning rather than
            luck with an easier inbox.
          </li>
        </ol>
        <h3 className="font-semibold text-foreground">Before you start</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Decide your personal phishing tells before the first message: unknown sender
          plus urgency plus a link is the classic trio. Keep a finger on flag as your
          default weapon. Two slow practice reps that name each tell out loud beat ten
          fast sprints that reward guessing.
        </p>
      </section>
      <section aria-label="Inbox Sprint scoring and strategy" className="space-y-2">
        <h2 className="text-base font-bold">Scoring and strategy</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Flag first, sort second.</strong> Sweep
            all eight for phishing before assigning reply, schedule, or file. Catching
            all four phish locks in half the score before time pressure builds.
          </li>
          <li>
            <strong className="text-foreground">Map urgency honestly.</strong> Only truly
            time-critical mail deserves reply now. When torn between reply and
            schedule, ask whether anyone is blocked waiting; if not, schedule it and
            move on.
          </li>
          <li>
            <strong className="text-foreground">Borrow the starter.</strong> The careful
            reply begins from a polite sentence frame on purpose. Finish it plainly
            instead of performing formality: one need, one deadline, one thank you.
            Rehearse that shape in{" "}
            <Link href="/vocrehab/interview/prep" className="underline">interview prep</Link>{" "}
            and every future cover email gets easier.
          </li>
          <li>
            <strong className="text-foreground">Review the misses.</strong> After the run,
            sort errors into phish-missed versus legit-misfiled. Phish misses mean
            studying sender tells, while misfiles mean clarifying urgency rules. Drill
            the weaker pile, then compare on the{" "}
            <Link href="/vocrehab/play" className="underline">games index</Link>.
          </li>
        </ul>
      </section>
      <section aria-label="Inbox Sprint questions" className="space-y-2">
        <h2 className="text-base font-bold">Common questions</h2>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground">What if I flag a real message?</h3>
            <p>
              In this game a wrong flag costs less than an opened phish link, which
              matches real workplaces: a flagged legit email gets a second look, while
              a clicked phish link triggers incident response. When uncertain, flag it.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">How long should the careful reply be?</h3>
            <p>
              Two to three sentences. Complete the starter with your specific need and
              a concrete next step, then stop. Long replies bury the ask, and buried
              asks get ignored by busy managers.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Does this help with real office email?</h3>
            <p>
              Directly. Reply, schedule, file, flag is the triage loop of every admin,
              support, and dispatch role. A steady scored run becomes an interview
              anecdote about inbox judgment, and your{" "}
              <Link href="/vocrehab/interview/resume" className="underline">resume</Link> can
              cite email triage as a practiced skill.
            </p>
          </div>
        </div>
      </section>
      <section aria-label="Inbox Sprint measures and who benefits" className="space-y-2">
        <h2 className="text-base font-bold">What the run measures</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The scored run observes three qualities offices screen for: security sense,
          or flagging all four phishing messages without opening their links; priority
          judgment, or routing legit mail to reply, schedule, or file correctly; and
          written clarity, or completing the careful reply with a specific ask. Your
          summary separates security misses from sorting misses so practice stays targeted.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Aspiring administrative assistants, customer support reps, dispatchers, and
          office clerks will find this drill directly relevant. If postings keep asking
          for email management plus security awareness, a steady sprint gives you
          honest evidence and a story about protecting the inbox while keeping real
          work moving.
        </p>
      </section>
    </main>
  );
}
