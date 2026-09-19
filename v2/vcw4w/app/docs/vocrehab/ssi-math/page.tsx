import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SSI math, dated 2026 — VocRehab",
  description:
    "How the VocRehab SSI sketch works from 2026 parameters, what it leaves out, and why it is practice — not advice.",
  alternates: { canonical: "/docs/vocrehab/ssi-math" },
};

// /docs/vocrehab/ssi-math — dated 2026 explainer + not-advice disclaimer.
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/docs/vocrehab" className="text-sm underline">
        All guides
      </Link>
      <p className="rounded-xl border border-amber-300/40 bg-amber-300/10 p-4 text-sm font-bold">
        Not advice. This sketch is practice math from parameters dated 2026 — it is not a benefits
        decision and not financial advice. Confirm everything with a benefits counselor or the
        Social Security Administration.
      </p>
      <h1 className="text-2xl font-bold">SSI math, dated 2026</h1>
      <p className="text-sm text-muted-foreground">
        The SSI slider turns an hourly wage and weekly hours into monthly earnings, then sketches
        how countable income could shift a check. The parameters carry a 2026 version stamp, so an
        old sketch never pretends to be current law.
      </p>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">What the sketch includes</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>Monthly earnings from wage × hours — straight multiplication, shown step by step.</li>
          <li>A simplified countable-income sketch from the 2026 parameters.</li>
          <li>An about-estimate of the SSI shift, labeled as an estimate on screen.</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">What the sketch leaves out</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>State supplements, impairment-related work expenses, and PASS plans.</li>
          <li>Timing rules, overpayments, and reporting delays.</li>
          <li>Every other program that interacts with SSI (Medicaid, SNAP, housing).</li>
        </ul>
      </section>
      <p className="rounded-xl border border-white/15 p-4 text-sm">
        Use the sketch to rehearse questions for a real counselor — &ldquo;if I worked this many
        hours, what should I ask about?&rdquo; — and save a run only when you want to keep the
        question, not the answer.
      </p>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Worked example: wage to monthly earnings</h2>
        <p className="text-sm">
          The slider does one honest multiplication first. At 15 dollars an hour and 10 hours
          a week, weekly pay is 150 dollars, and the monthly figure multiplies that across the
          month, shown step by step on screen. Only after that does the simplified
          countable-income sketch apply the 2026 parameters to produce an about-estimate of
          the shift. Try three passes: your current hours, five more hours, and five fewer.
          Write the three about-estimates down, then bring them to a benefits counselor with
          the question each one raised. The numbers are rehearsal props, not predictions.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">How to read the result screen</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>Monthly earnings.</strong> Straight wage times hours math. Check this line
            first, because every later line depends on it.
          </li>
          <li>
            <strong>Countable-income sketch.</strong> The simplified pass using the stamped
            2026 parameters. Simplified means real rules are missing here on purpose.
          </li>
          <li>
            <strong>About-estimate label.</strong> The screen marks the shift as an estimate.
            If a number ever looks exact, treat that as a warning to confirm with a human.
          </li>
          <li>
            <strong>Version stamp.</strong> The 2026 date tells you which parameter set ran.
            An older saved sketch never pretends to be current law.
          </li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Questions worth bringing a counselor</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>If I worked these hours, what work expenses or plans should I ask about.</li>
          <li>Which state supplements or timing rules could change this sketch.</li>
          <li>How do Medicaid, SNAP, or housing interact with earnings here.</li>
          <li>What should I report, when, and to whom, if I start work.</li>
        </ul>
        <p className="text-sm">
          Practice asking them in{" "}
          <Link href="/vocrehab/interview/prep" className="underline">
            interview prep
          </Link>{" "}
          and sketch disclosure timing with{" "}
          <Link href="/vocrehab/decide/disclosure-paths" className="underline">
            disclosure paths
          </Link>
          .
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Troubleshooting</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>The number looks scary.</strong> It is a sketch from incomplete rules.
            Change one input, note how the estimate moves, and bring both versions to a
            counselor instead of deciding alone.
          </li>
          <li>
            <strong>Saved sketch looks old.</strong> Check the 2026 stamp. Re-run with
            current inputs rather than trusting a saved figure.
          </li>
          <li>
            <strong>Want to keep the question.</strong> Save the run from{" "}
            <Link href="/vocrehab/decide/ssi" className="underline">
              the SSI sketch
            </Link>
            . You can download your rows from{" "}
            <Link href="/vocrehab/export" className="underline">
              the export page
            </Link>
            .
          </li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Common questions</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm">
          <li>
            <strong>Is this financial advice.</strong> No. It is practice math for
            rehearsing questions. Confirm everything with a benefits counselor or the Social
            Security Administration.
          </li>
          <li>
            <strong>Does saving a sketch file anything.</strong> No. Saved runs stay in your
            account. Nothing here files with an agency or decides eligibility.
          </li>
          <li>
            <strong>Where do I start.</strong> Read{" "}
            <Link href="/docs/vocrehab/getting-started" className="underline">
              getting started
            </Link>
            , then open the slider with this explainer beside it.
          </li>
          <li>
            <strong>Can my counselor help.</strong> Yes, with review and referrals, not with
            filing. Their workflow is in{" "}
            <Link href="/docs/vocrehab/counselors" className="underline">
              the counselor guide
            </Link>
            , and data rules are in{" "}
            <Link href="/docs/vocrehab/privacy-safety" className="underline">
              privacy and safety
            </Link>
            .
          </li>
        </ul>
      </section>
            <section className="space-y-2">
        <h2 className="text-lg font-bold">Try it in order</h2>
        <p className="text-sm">
          Budget about fifteen minutes with this explainer open beside the slider. Run the
          baseline, vary one input, list the gaps, then rehearse the handoff. Slow passes
          with written notes beat fast clicking, because the goal is sharper questions, not
          a sharper number.
        </p>
        <ol className="list-decimal space-y-2 pl-6 text-sm">
          <li>
            <strong>Run the baseline.</strong> Enter your current wage and hours at{" "}
            <Link href="/vocrehab/decide/ssi" className="underline">
              the SSI sketch
            </Link>{" "}
            and read the monthly earnings line. Confirm the multiplication matches your own
            pay stub rhythm before going further.
          </li>
          <li>
            <strong>Change one thing.</strong> Raise hours by a small step and note the new
            about-estimate. Lower them by the same step and note that one too. Three runs
            make the pattern visible without pretending precision.
          </li>
          <li>
            <strong>List what is missing.</strong> State supplements, work expenses, PASS
            plans, timing rules, and sibling programs all sit outside the sketch. Turn each
            gap into a written question.
          </li>
          <li>
            <strong>Rehearse the conversation.</strong> Bring the three runs plus the
            question list to a benefits counselor. Practice the opening line in{" "}
            <Link href="/vocrehab/interview/prep" className="underline">
              interview prep
            </Link>{" "}
            so the meeting starts with your numbers, not nerves.
          </li>
        </ol>
      </section>
    </main>
  );
}
