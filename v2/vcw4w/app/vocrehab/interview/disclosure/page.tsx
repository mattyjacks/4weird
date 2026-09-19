import type { Metadata } from "next";
import Link from "next/link";
import VocrehabRoleplayPanel from "@/components/vocrehab/vocrehab-roleplay-panel";

export const metadata: Metadata = {
  title: "Disclosure + accommodation — VocRehab",
  description:
    "VocRehab disclosure builder: your script, your call — practice the accommodation ask. Not disclosing now is always valid.",
  alternates: { canonical: "/vocrehab/interview/disclosure" },
};

export default function Page() {
  return (
    <main className="vocrehab-interview-disclosure mx-auto w-full max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/interview">Interview</Link> → Disclosure
      </nav>
      <h1 className="text-xl font-bold">Disclosure + accommodation ask</h1>
      <p className="text-muted-foreground">
        You own every word. A strong ask has four lines: two sentences of
        disclosure, one sentence requesting the accommodation, one sentence on
        how it helps you do the role well. Share only what you are comfortable
        sharing.
      </p>
      <p className="rounded-xl border p-3 text-sm">
        <strong>Not disclosing right now is completely valid too.</strong> A
        ready closing line: “I will follow up if a need arises.” Nobody here
        will ever pressure you to disclose.
      </p>
      <VocrehabRoleplayPanel initialScenario="disclosure" />
      <section aria-label="A formula that works" className="space-y-2 pt-2">
        <h2 className="text-lg font-semibold">A four line formula that works</h2>
        <p className="text-sm text-muted-foreground">
          Managers respond best to requests they can picture granting. Keep
          the medical history out, name the functional need in plain words,
          request one concrete change, and connect it to the work. Here is a
          fictional stockroom example you can adapt, not copy word for word.
        </p>
        <ol className="list-decimal space-y-2 rounded-xl border p-3 pl-8 text-sm">
          <li>
            <p className="font-medium">Disclosure, sentence one.</p>
            <p className="text-muted-foreground">
              Example: I process written lists more reliably than shouted
              instructions across a noisy floor.
            </p>
          </li>
          <li>
            <p className="font-medium">Disclosure, sentence two.</p>
            <p className="text-muted-foreground">
              Example: That has been true in every warehouse style role I have
              held.
            </p>
          </li>
          <li>
            <p className="font-medium">The accommodation request.</p>
            <p className="text-muted-foreground">
              Example: Could task changes come to me on the printed pick sheet
              or by text?
            </p>
          </li>
          <li>
            <p className="font-medium">How it helps the role.</p>
            <p className="text-muted-foreground">
              Example: Then I catch every change on the first pass and keep
              the line moving.
            </p>
          </li>
        </ol>
      </section>
      <section aria-label="Second example" className="space-y-2">
        <h2 className="text-lg font-semibold">An office example</h2>
        <p className="text-sm text-muted-foreground">
          For a front desk role, the same shape fits a schedule need.
          Example: I take a daily medication that makes early mornings
          unreliable, and a 9:30 start removes the issue entirely. Could we
          set my shift to 9:30 to 5:30? Then my coverage is steady and phones
          never gap. Notice what is missing: no diagnosis name, no dosage, no
          life story, only the need, the ask, and the benefit to the team.
        </p>
      </section>
      <section aria-label="Disclosure mistakes" className="space-y-2">
        <h2 className="text-lg font-semibold">Mistakes that weaken the ask</h2>
        <ul className="list-disc space-y-2 rounded-xl border p-3 pl-8 text-sm text-muted-foreground">
          <li>
            Sharing a full diagnosis or treatment history when the manager only
            needs the functional limit and the fix.
          </li>
          <li>
            Asking vaguely for understanding or patience, which leaves the
            manager with nothing concrete to approve.
          </li>
          <li>
            Stacking three requests at once instead of leading with the single
            change that matters most.
          </li>
          <li>
            Apologizing repeatedly for the need, which frames a normal
            workplace adjustment as a burden.
          </li>
        </ul>
      </section>
      <section aria-label="Choosing not to share" className="space-y-2">
        <h2 className="text-lg font-semibold">If you choose not to share now</h2>
        <p className="text-sm text-muted-foreground">
          Privacy is a strategy, not avoidance. Many strong candidates wait
          until after an offer, when the conversation shifts from screening
          to logistics and a specific request feels ordinary. Others wait
          until a genuine need appears on the job, then raise one adjustment
          with a supervisor who already trusts their output. Both paths are
          honorable, and both stay open while you rehearse. Keep a ready
          closing line for interviews: I will follow up if a need arises.
          Say it warmly, smile, and move the dialogue back to your skills.
          Revisit the timing map each time your health, medication,
          transport, or duties change, since a new role can flip yesterday's
          best answer. Your counselor can log the decision and the date you
          will reconsider, turning a vague someday into a calendar promise.
        </p>
        <p className="text-sm text-muted-foreground">
          Before any live conversation, run this swift checklist. Is your
          request one sentence and tied to a task? Did you remove diagnosis
          names and history? Can you state the benefit to the team in ten
          words? Have you rehearsed the confused manager reset once by
          voice? Four yes answers mean you are ready. Three or fewer means
          one more lap in the room below, which is exactly what it exists
          for. Confidence here comes from brevity plus repetition, never
          from oversharing.
        </p>
      </section>
      <section aria-label="Disclosure questions" className="space-y-2">
        <h2 className="text-lg font-semibold">Common questions</h2>
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border p-3">
            <p className="font-medium">When should I share: now, later, or not at all?</p>
            <p className="mt-1 text-muted-foreground">
              There is no single right moment, which is why timing comes
              before wording here. Walk the{" "}
              <Link href="/vocrehab/decide/disclosure-paths" className="underline">
                disclosure decision map
              </Link>{" "}
              first, compare before applying, at the interview, after the
              offer, on the job, and not now, then return to draft the script
              for the timing you chose. Every node ends with a starter line
              and an exit ramp.
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-medium">What if the manager looks confused?</p>
            <p className="mt-1 text-muted-foreground">
              Stay with the shape and repeat the request once, slowly. Try:
              Happy to clarify. The one change I am asking for is written
              task updates, and that keeps my accuracy high. The rehearsal
              room includes a confused manager branch precisely so you can
              practice this reset calmly before it ever happens live.
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-medium">Can I practice and still choose not to disclose?</p>
            <p className="mt-1 text-muted-foreground">
              Absolutely. Not disclosing now is a complete outcome, and the
              page gives you a ready closing line for it. Many learners
              rehearse the script, save it for later, and use the related{" "}
              <Link href="/vocrehab/course" className="underline">
                course lessons
              </Link>{" "}
              on timing first. Collect whatever you decide on the{" "}
              <Link href="/vocrehab/export" className="underline">
                export page
              </Link>{" "}
              and review it with your counselor.
            </p>
          </div>
        </div>
      </section>
      <p className="text-sm text-muted-foreground">
        Timing first? Walk the{" "}
        <Link
          href="/vocrehab/decide/disclosure-paths"
          className="underline"
        >
          disclosure decision map
        </Link>{" "}
        before you word the script.
      </p>
    </main>
  );
}
