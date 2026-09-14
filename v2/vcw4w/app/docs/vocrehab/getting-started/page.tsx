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
    </main>
  );
}
