import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "VocRehab guides",
  description:
    "Plain-language VocRehab guides: getting started, counselor workflow, privacy and safety, and the 2026 SSI math explainer.",
  alternates: { canonical: "/docs/vocrehab" },
};

// /docs/vocrehab — guides hub (server, plain language).
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">VocRehab guides</h1>
      <p className="text-sm text-muted-foreground">
        Plain-language guides to practicing work skills, sketching SSI math, and working with a
        counselor. VocRehab is practice and preparation, never an eligibility decision. Start
        with getting started, then follow the order below that matches your goal: play and
        rehearse on your own, bring questions to a counselor, and keep privacy in your control
        the whole way.
      </p>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Which guide do you need first</h2>
        <p className="text-sm">
          New here and practicing solo. Read{" "}
          <Link href="/docs/vocrehab/getting-started" className="underline">
            getting started
          </Link>{" "}
          first, then open{" "}
          <Link href="/docs/vocrehab/games" className="underline">
            the games catalog
          </Link>{" "}
          and play one round of anything that looks fun. Bringing a counselor. Skim getting
          started, then send them{" "}
          <Link href="/docs/vocrehab/counselors" className="underline">
            the counselor guide
          </Link>
          . Worried about benefits math. Read{" "}
          <Link href="/docs/vocrehab/ssi-math" className="underline">
            the SSI explainer
          </Link>{" "}
          before you touch the slider, so you know what the sketch leaves out. Planning a
          tricky month. Open{" "}
          <Link href="/docs/vocrehab/schedule-juggle" className="underline">
            Schedule Juggle
          </Link>
          . Repeating a set for a check-in. Learn{" "}
          <Link href="/docs/vocrehab/seeds" className="underline">
            practice seeds
          </Link>
          . Unsure about data. Read{" "}
          <Link href="/docs/vocrehab/privacy-safety" className="underline">
            privacy and safety
          </Link>
          .
        </p>
      </section>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <Link
            href="/docs/vocrehab/getting-started"
            className="block rounded-xl border border-white/15 p-5 hover:bg-white/5"
          >
            <span className="font-bold">Getting started</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              The short tour: courses, games, rehearsals, and the decide tools.
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/docs/vocrehab/counselors"
            className="block rounded-xl border border-white/15 p-5 hover:bg-white/5"
          >
            <span className="font-bold">For counselors</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              The approval workflow, and why nothing auto-files or auto-sends.
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/docs/vocrehab/privacy-safety"
            className="block rounded-xl border border-white/15 p-5 hover:bg-white/5"
          >
            <span className="font-bold">Privacy and safety</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Consent first, redaction by default, your export and deletion rights.
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/docs/vocrehab/ssi-math"
            className="block rounded-xl border border-white/15 p-5 hover:bg-white/5"
          >
            <span className="font-bold">SSI math, dated 2026</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              How the sketch works, what it leaves out, and why it is not advice.
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/docs/vocrehab/games"
            className="block rounded-xl border border-white/15 p-5 hover:bg-white/5"
          >
            <span className="font-bold">Games catalog</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              All eleven micro-games: what each observes, keyboard play, retry policy.
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/docs/vocrehab/schedule-juggle"
            className="block rounded-xl border border-white/15 p-5 hover:bg-white/5"
          >
            <span className="font-bold">Schedule Juggle</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Monthly planning play: 24-hour days, travel modes, levels, saves.
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/docs/vocrehab/seeds"
            className="block rounded-xl border border-white/15 p-5 hover:bg-white/5"
          >
            <span className="font-bold">Practice seeds</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Shuffled-by-default sets, exact replays with ?seed=, counselor review.
            </span>
          </Link>
        </li>
      </ul>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">How the guides fit together</h2>
        <p className="text-sm">
          VocRehab has four moving parts, and each guide covers one. Courses teach short
          lessons with small XP steps. Games rehearse office and scheduling skills with
          untimed practice first and strengths-first summaries after. Rehearsals let you
          practice disclosure timing, pivots, and prep with a roleplay partner. Decide tools
          sketch SSI math and disclosure paths as practice, never as decisions. Play them at{" "}
          <Link href="/vocrehab/play" className="underline">
            the practice arcade
          </Link>
          , study at{" "}
          <Link href="/vocrehab/course" className="underline">
            the course
          </Link>
          , and rehearse interviews at{" "}
          <Link href="/vocrehab/interview/prep" className="underline">
            interview prep
          </Link>
          .
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">A first week plan</h2>
        <ol className="list-decimal space-y-2 pl-6 text-sm">
          <li>
            <strong>Day one, explore.</strong> Play two games as a guest and finish one short
            course lesson. Nothing is graded and retries always count the same.
          </li>
          <li>
            <strong>Day two, rehearse.</strong> Try one interview prep round and one disclosure
            path sketch. Save only what you want to keep.
          </li>
          <li>
            <strong>Day three, sketch.</strong> Open the SSI slider with the explainer beside
            it. Write down two questions for a benefits counselor.
          </li>
          <li>
            <strong>Later, invite help.</strong> When you want a second pair of eyes, give
            consent for one client session, then review the counselor drafts together.
          </li>
        </ol>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Common questions</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>Do I need an account.</strong> No. Guests can explore courses, games, and
            rehearsals. Signing in saves progress, runs, and lesson state to your profile.
          </li>
          <li>
            <strong>Will practice affect my benefits.</strong> Never. Games, sliders, and
            rehearsals are preparation only. Nothing here files with an agency or decides
            eligibility.
          </li>
          <li>
            <strong>What if I get stuck.</strong> Every game has a practice round, a pause
            option, and unlimited retries. Keyboard play works throughout: Tab to move, Enter
            or Space to choose.
          </li>
          <li>
            <strong>How do I share progress.</strong> Sign in so runs save, then review them
            with a counselor. For exact repeats, share a practice seed address instead of
            screenshots.
          </li>
          <li>
            <strong>Where do interview rehearsals live.</strong> Under{" "}
            <Link href="/vocrehab/interview/prep" className="underline">
              interview prep
            </Link>
            , with resume, jobs, pivot, and disclosure rooms beside it.
          </li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">If something looks off</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>A game will not load.</strong> Return to{" "}
            <Link href="/vocrehab/play" className="underline">
              the practice arcade
            </Link>{" "}
            and open a different game first. If one title stalls while others play, note the
            title and try again later.
          </li>
          <li>
            <strong>Progress vanished.</strong> Guest visits do not sync. Sign in, replay one
            lesson, and confirm the profile shows it before continuing.
          </li>
          <li>
            <strong>Counselor drafting refused.</strong> That means consent is missing or
            revoked. Grant a fresh receipt, paste a shorter excerpt, and retry. The refusal
            protects both sides.
          </li>
          <li>
            <strong>SSI numbers confuse.</strong> Close the slider, reread{" "}
            <Link href="/docs/vocrehab/ssi-math" className="underline">
              the SSI explainer
            </Link>
            , and reopen with one input changed at a time. Bring the written questions to a
            benefits counselor.
          </li>
        </ul>
      </section>
      <p className="rounded-xl border border-white/15 p-4 text-sm">
        Start with{" "}
        <Link href="/docs/vocrehab/getting-started" className="underline">
          getting started
        </Link>
        , check{" "}
        <Link href="/docs/vocrehab/privacy-safety" className="underline">
          privacy and safety
        </Link>{" "}
        whenever data is involved, and point benefits questions at{" "}
        <Link href="/docs/vocrehab/ssi-math" className="underline">
          the SSI explainer
        </Link>{" "}
        plus a real benefits counselor.
      </p>
    </main>
  );
}
