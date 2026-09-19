import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Getting started with VocRehab",
  description:
    "The short VocRehab tour: learn the course, play the games, rehearse conversations, and sketch SSI math.",
  alternates: { canonical: "/docs/vocrehab/getting-started" },
};

// /docs/vocrehab/getting-started — plain-language onboarding.
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/docs/vocrehab" className="text-sm underline">
        All guides
      </Link>
      <h1 className="text-2xl font-bold">Getting started with VocRehab</h1>
      <p className="text-sm text-muted-foreground">
        VocRehab helps you practice work skills at your own pace. No account is needed to explore;
        signing in saves your progress.
      </p>
      <ol className="list-decimal space-y-3 pl-6 text-sm">
        <li>
          <strong>Learn the course.</strong> Short lessons with small XP steps. Your lesson state is
          yours alone.
        </li>
        <li>
          <strong>Play the games.</strong> Five timed practice games (filing, inbox triage, focus
          shifts, barrier runs, schedule juggling) with untimed practice and extra time on request.
        </li>
        <li>
          <strong>Rehearse conversations.</strong> Practice disclosure timing, pivots, and prep with
          a roleplay partner that never judges.
        </li>
        <li>
          <strong>Sketch the math.</strong> The SSI slider shows about-estimates of how earnings
          could shift a check — a sketch, never a promise. See{" "}
          <Link href="/docs/vocrehab/ssi-math" className="underline">
            the SSI explainer
          </Link>
          .
        </li>
      </ol>
      <p className="rounded-xl border border-white/15 p-4 text-sm">
        Working with a counselor? They draft notes from pasted transcripts and approve every word by
        hand. Read <Link href="/docs/vocrehab/counselors" className="underline">the counselor guide</Link>{" "}
        and <Link href="/docs/vocrehab/privacy-safety" className="underline">privacy and safety</Link>.
      </p>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Your first visit, step by step</h2>
        <p className="text-sm">
          Open{" "}
          <Link href="/vocrehab/course" className="underline">
            the course
          </Link>{" "}
          and finish the first lesson. It takes a few minutes and teaches the XP rhythm: short
          reads, one small task, progress saved to your account when signed in. Then open{" "}
          <Link href="/vocrehab/play" className="underline">
            the practice arcade
          </Link>{" "}
          and play File Sort. The untimed practice round shows the controls, then the countdown
          starts the scored run. Tab moves focus, Enter or Space chooses, and results arrive in
          plain bands like steady or strong, with supports instead of grades. Pause or exit
          anytime. Nothing here affects benefits or eligibility, ever.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">A week-one plan</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>Day one, two games.</strong> Try File Sort and Inbox Sprint from{" "}
            <Link href="/docs/vocrehab/games" className="underline">
              the games catalog
            </Link>
            . One practice round each, then one scored run. Retry anything that felt rushed.
          </li>
          <li>
            <strong>Day two, one rehearsal.</strong> Open{" "}
            <Link href="/vocrehab/interview/prep" className="underline">
              interview prep
            </Link>{" "}
            and practice disclosure timing once. Keep the prep notes short and in your own
            words.
          </li>
          <li>
            <strong>Day three, one sketch.</strong> Read{" "}
            <Link href="/docs/vocrehab/ssi-math" className="underline">
              the SSI explainer
            </Link>
            , then move the slider at{" "}
            <Link href="/vocrehab/decide/ssi" className="underline">
              the SSI sketch
            </Link>
            . Write down two questions for a benefits counselor. The sketch is practice math,
            not advice.
          </li>
          <li>
            <strong>Day four, plan a month.</strong> Play{" "}
            <Link href="/vocrehab/play/schedule-juggle" className="underline">
              Schedule Juggle
            </Link>{" "}
            on Easy. Protect rest first, then place shifts around it. The guide at{" "}
            <Link href="/docs/vocrehab/schedule-juggle" className="underline">
              Schedule Juggle docs
            </Link>{" "}
            explains travel modes and saves.
          </li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Signing in, and what changes</h2>
        <p className="text-sm">
          Guests can play every game and read every lesson. Signing in adds three things:
          progress saving across visits, run history you can review with a counselor, and
          consent receipts for drafting, exporting, and syncing. Each consent is separate and
          revocable. Full rules live in{" "}
          <Link href="/docs/vocrehab/privacy-safety" className="underline">
            privacy and safety
          </Link>
          .
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Troubleshooting</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>Progress did not save.</strong> You are probably signed out. Sign in and
            replay one lesson. Guest progress stays on the device only.
          </li>
          <li>
            <strong>A game feels too fast.</strong> Replay the untimed practice round, ask for
            extra time where offered, or switch to an untimed game like Barrier Run. Retries
            always count the same.
          </li>
          <li>
            <strong>Keyboard confusion.</strong> Tab moves, Enter or Space chooses, arrow keys
            help in File Sort. Results are announced through a live region for screen readers.
          </li>
          <li>
            <strong>Want the exact same set again.</strong> Use a{" "}
            <Link href="/docs/vocrehab/seeds" className="underline">
              practice seed
            </Link>
            : copy the ?seed= address, share it, and reload to get identical items.
          </li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Common questions</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>Is this a test.</strong> No. Every summary is strengths-first, every retry
            is equal, and every game starts with practice. Rehearsal is the whole point.
          </li>
          <li>
            <strong>Does it cost anything.</strong> Practice itself is free to explore. If a
            connected feature ever meters coins, the price shows before you confirm.
          </li>
          <li>
            <strong>Who sees my runs.</strong> Only you, until you choose to share. Counselors
            see only their own drafts, never your account rows.
          </li>
          <li>
            <strong>What if I only have ten minutes.</strong> Play one untimed Barrier Run
            scene or finish one micro lesson. Short sessions compound: steady streaks beat
            rare marathons, and every visit starts fresh with practice first.
          </li>
        </ul>
      </section>
    </main>
  );
}
