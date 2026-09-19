import type { Metadata } from "next";
import Link from "next/link";
import VocrehabRoleplayPanel from "@/components/vocrehab/vocrehab-roleplay-panel";

export const metadata: Metadata = {
  title: "Background pivot — VocRehab",
  description:
    "VocRehab background pivot: a short, accountability-forward, growth-framed answer — then rehearse the delivery out loud.",
  alternates: { canonical: "/vocrehab/interview/pivot" },
};

export default function Page() {
  return (
    <main className="vocrehab-interview-pivot mx-auto w-full max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/interview">Interview</Link> → Background pivot
      </nav>
      <h1 className="text-xl font-bold">The background pivot</h1>
      <p className="text-muted-foreground">
        Growth-framed, accountability-forward, short — about 30 to 60 seconds
        spoken. No graphic detail, no legal claims, and it ends on the present:
        your skills, your reliability, your supports. The practice manager asks
        the hard question once, kindly, and never asks for case numbers,
        charges in detail, or court identifiers.
      </p>
      <ol className="list-decimal space-y-2 rounded-xl border p-3 pl-8">
        <li>
          <p className="font-medium">One neutral line about the past.</p>
          <p className="text-sm text-muted-foreground">
            Plain and brief — no detail beyond what a stranger needs.
          </p>
        </li>
        <li>
          <p className="font-medium">What changed.</p>
          <p className="text-sm text-muted-foreground">
            One concrete step: training, steady work, or a support you use.
          </p>
        </li>
        <li>
          <p className="font-medium">What is true now.</p>
          <p className="text-sm text-muted-foreground">
            Reliability, skills, supports — in two sentences, ending forward.
          </p>
        </li>
      </ol>
      <VocrehabRoleplayPanel initialScenario="pivot" />
      <section aria-label="Worked example" className="space-y-2 pt-2">
        <h2 className="text-lg font-semibold">A full example, forty five seconds</h2>
        <p className="text-sm text-muted-foreground">
          Read this fictional answer aloud and time yourself. It follows the
          three beats above and lands inside a minute. Adapt the shape to
          your own facts; never borrow details that are not yours.
        </p>
        <blockquote className="rounded-xl border p-3 text-sm">
          A few years ago I served time and came home with no recent work
          history. Since then I finished a warehouse skills course, held a
          steady volunteer stockroom shift for eight months, and met weekly
          with my counselor on reliability habits. Today I show up early,
          I follow written lists exactly, and I ask for help before small
          issues grow. I am ready to bring that steadiness to your team.
        </blockquote>
        <p className="text-sm text-muted-foreground">
          Notice the discipline: one neutral past line, one concrete change
          with proof, then a present tense close on skills. No charges named,
          no dates debated, no apology spiral, and the final sentence faces
          the employer.
        </p>
      </section>
      <section aria-label="Delivery tips" className="space-y-2">
        <h2 className="text-lg font-semibold">Delivery tips that sell honesty</h2>
        <ul className="list-disc space-y-2 rounded-xl border p-3 pl-8 text-sm text-muted-foreground">
          <li>
            Speak at a walking pace. Rushing signals shame, while a measured
            tempo signals ownership.
          </li>
          <li>
            Keep eye contact through the present tense lines. That is where
            trust is won.
          </li>
          <li>
            Breathe once between beats. The pause reads as composure, not
            forgetting.
          </li>
          <li>
            End with the role, not the record. Your last words should name
            what you bring to this team.
          </li>
          <li>
            If emotion rises, shorten the past line on the next retry. Fewer
            words about then means more steadiness about now.
          </li>
        </ul>
      </section>
      <section aria-label="What not to say" className="space-y-2">
        <h2 className="text-lg font-semibold">Lines to leave out</h2>
        <ul className="list-disc space-y-2 rounded-xl border p-3 pl-8 text-sm text-muted-foreground">
          <li>
            Case numbers, charge names, facility names, or any legal
            identifiers. A stranger does not need them.
          </li>
          <li>
            Graphic detail about what happened. Neutral and brief protects
            both you and the listener.
          </li>
          <li>
            Claims about the law, expungement, or what the employer may ask.
            Those questions belong to your counselor or a legal aid clinic.
          </li>
          <li>
            Promises you cannot prove yet. Reliability is shown through the
            concrete change you already completed.
          </li>
        </ul>
      </section>
      <section aria-label="Gap example" className="space-y-2">
        <h2 className="text-lg font-semibold">A second example for employment gaps</h2>
        <p className="text-sm text-muted-foreground">
          The pivot shape also fits gaps with no justice involvement, such
          as years spent caregiving. Here is a fictional forty second
          version. One neutral line names the gap, the middle proves growth,
          and the close sells readiness.
        </p>
        <blockquote className="rounded-xl border p-3 text-sm">
          I stepped away from paid work for four years to care for an aging
          parent full time. During that stretch I managed medications,
          appointments, and a tight household budget, then completed a
          customer service certificate last spring. Today I bring scheduling
          discipline, calm under pressure, and fresh training to your front
          desk.
        </blockquote>
        <p className="text-sm text-muted-foreground">
          Caregiving counts as evidence: budgets prove numeracy,
          appointments prove reliability, and certification proves currency.
          Pair this answer with resume lines from the{" "}
          <Link href="/vocrehab/interview/resume" className="underline">
            resume builder
          </Link>{" "}
          so the spoken story and the printed page reinforce each other.
        </p>
      </section>
      <section aria-label="Pivot questions" className="space-y-2">
        <h2 className="text-lg font-semibold">Common questions</h2>
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border p-3">
            <p className="font-medium">What if they press for details?</p>
            <p className="mt-1 text-muted-foreground">
              Hold the boundary warmly and repeat the present. Try: I keep
              the past brief out of respect for your time. What matters for
              this role is my training, my attendance record, and my
              references, and I am glad to share those. Practice that reset
              line in the room below until it feels automatic, and discuss
              any disclosure rules with your counselor first.
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-medium">How does this connect to my other prep?</p>
            <p className="mt-1 text-muted-foreground">
              The pivot is one answer inside a larger interview. Build your
              general stories in the{" "}
              <Link href="/vocrehab/interview/prep" className="underline">
                prep generator
              </Link>
              , test the pivot under pressure in the{" "}
              <Link href="/vocrehab/interview/jobs" className="underline">
                job sim
              </Link>
              , and review the full set with the{" "}
              <Link href="/vocrehab/course" className="underline">
                course lessons
              </Link>
              . One short answer, rehearsed well, lifts the whole
              conversation.
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-medium">Should my counselor hear this first?</p>
            <p className="mt-1 text-muted-foreground">
              Yes. Bring your draft to your next session before using it
              live. Your counselor can check the tone, confirm it fits your
              employment goal, and align it with your support needs. Save the
              approved version from the{" "}
              <Link href="/vocrehab/export" className="underline">
                export page
              </Link>{" "}
              so you both reference the same words.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
