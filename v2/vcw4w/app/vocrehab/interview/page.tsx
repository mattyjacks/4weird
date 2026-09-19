import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Interview Suite — VocRehab",
  description:
    "VocRehab Suite B: rehearse interviews out loud with a practice manager — prep, background pivot, disclosure, and resume.",
  alternates: { canonical: "/vocrehab/interview" },
};

const vocrehabInterviewTools = [
  {
    href: "/vocrehab/interview/jobs",
    title: "Live job interview sim (20 jobs)",
    blurb:
      "Pick a real job, pick a difficulty, rehearse live — turn-based or voice, typing always free, report card at 6 turns.",
  },
  {
    href: "/vocrehab/interview/prep",
    title: "Interview prep generator",
    blurb:
      "Five tailored practice questions for your job goal — then rehearse each one out loud with the practice manager.",
  },
  {
    href: "/vocrehab/interview/pivot",
    title: "Criminal background pivot",
    blurb:
      "Short, accountability-forward, growth-framed. One neutral line, what changed, what is true now — then rehearse the delivery.",
  },
  {
    href: "/vocrehab/interview/disclosure",
    title: "Disclosure + accommodation scripts",
    blurb:
      "Your words, your call. Practice the ask — and know that not disclosing now is always a valid ending.",
  },
  {
    href: "/vocrehab/interview/resume",
    title: "Resume builder",
    blurb:
      "Structured sections from your goals and strengths. Clean JSON + print export. Nothing auto-sends anywhere.",
  },
];

export default function Page() {
  return (
    <main className="vocrehab-interview-index mx-auto w-full max-w-3xl space-y-4 p-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab">VocRehab</Link> → Interview
      </nav>
      <h1 className="text-2xl font-bold">Tell your story out loud</h1>
      <p className="text-muted-foreground">
        A printed script helps for ten minutes; a rehearsed conversation helps
        for ten years. Every tool below ends in a rehearsal room — chat or
        voice, transcript always visible, nothing saved unless you tap Save.
      </p>
      <ul className="grid gap-3">
        {vocrehabInterviewTools.map((vocrehabTool) => (
          <li key={vocrehabTool.href} className="rounded-xl border p-4">
            <Link
              href={vocrehabTool.href}
              className="text-lg font-semibold underline"
            >
              {vocrehabTool.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              {vocrehabTool.blurb}
            </p>
          </li>
        ))}
      </ul>
      <section aria-label="How to use the suite" className="space-y-2 pt-2">
        <h2 className="text-xl font-semibold">How to use this suite</h2>
        <p>
          Start with the tool that matches your nearest worry, then rehearse
          one answer at a time. Each room works the same way: you read a
          prompt, you respond by typing or speaking, and the practice manager
          replies with one praise, one tweak, and an invitation to retry.
          Nothing is graded and nothing is saved unless you tap Save, so the
          cheapest move is to attempt early and revise often.
        </p>
        <ol className="list-decimal space-y-2 rounded-xl border p-3 pl-8">
          <li>
            <p className="font-medium">Pick one upcoming situation.</p>
            <p className="text-sm text-muted-foreground">
              Name the real event: an application going out Friday, a hiring
              fair next week, or a callback you already received.
            </p>
          </li>
          <li>
            <p className="font-medium">Open the matching tool below.</p>
            <p className="text-sm text-muted-foreground">
              General nerves mean prep, a gap in your history means pivot, a
              support need means disclosure, and an empty page means resume.
            </p>
          </li>
          <li>
            <p className="font-medium">Rehearse out loud at least twice.</p>
            <p className="text-sm text-muted-foreground">
              Typing plans the words, but voice builds the steadiness you need
              in the room. Use both modes before you stop.
            </p>
          </li>
          <li>
            <p className="font-medium">Keep the version that sounds like you.</p>
            <p className="text-sm text-muted-foreground">
              Short, true sentences beat polished paragraphs. Save the draft
              you would actually say on a calm day.
            </p>
          </li>
          <li>
            <p className="font-medium">Bring one artifact to your counselor.</p>
            <p className="text-sm text-muted-foreground">
              A saved answer, a script, or a printed resume turns the next
              meeting from brainstorming into review.
            </p>
          </li>
        </ol>
      </section>
      <section aria-label="Which tool first" className="space-y-2">
        <h2 className="text-xl font-semibold">Which tool should you open first</h2>
        <p>
          If interviews in general make you freeze, begin with the{" "}
          <Link href="/vocrehab/interview/prep" className="underline">
            prep generator
          </Link>
          , which gives you five tailored questions and a rehearsal room for
          each one. If one specific question terrifies you, usually the one
          about your background, go straight to the{" "}
          <Link href="/vocrehab/interview/pivot" className="underline">
            background pivot
          </Link>{" "}
          and build a thirty to sixty second answer that ends on your present
          strengths. If you need changes to do the job well, such as a
          schedule tweak or written instructions, the{" "}
          <Link href="/vocrehab/interview/disclosure" className="underline">
            disclosure builder
          </Link>{" "}
          helps you word a brief ask. If your page is blank, the{" "}
          <Link href="/vocrehab/interview/resume" className="underline">
            resume builder
          </Link>{" "}
          turns volunteer shifts, caregiving, gigs, and training into
          scannable lines. And if you learn by doing, the{" "}
          <Link href="/vocrehab/interview/jobs" className="underline">
            job sim
          </Link>{" "}
          drops you into a realistic interview for twenty real roles.
        </p>
      </section>
      <section aria-label="What changes after rehearsal" className="space-y-2">
        <h2 className="text-xl font-semibold">What changes after you rehearse</h2>
        <p>
          Most learners arrive with answers living only in their heads, long
          on worry and short on wording. After two or three spoken repetitions
          with feedback, the same person holds concrete sentences they can
          repeat under pressure. Managers notice the difference quickly:
          direct eye contact, a steady pace, and examples that tie strengths
          to the role at hand. The suite also teaches recovery, because every
          room lets you pause, shorten a rambling answer, and try again
          without penalty. That habit of resetting calmly is what carries into
          the real interview when a curveball lands.
        </p>
        <p>
          Rehearsal pairs well with the rest of the course. Your strengths
          from the{" "}
          <Link href="/vocrehab/course" className="underline">
            course lessons
          </Link>{" "}
          become proof lines in your answers, your timing choice from the{" "}
          <Link href="/vocrehab/decide/disclosure-paths" className="underline">
            disclosure decision map
          </Link>{" "}
          shapes what you share, and your earnings sketch from the{" "}
          <Link href="/vocrehab/decide/ssi" className="underline">
            SSI slider
          </Link>{" "}
          steadies questions about hours. When everything is ready, collect
          your drafts on the{" "}
          <Link href="/vocrehab/export" className="underline">
            export page
          </Link>{" "}
          and walk into your counselor meeting with evidence, not just hopes.
        </p>
      </section>
      <section aria-label="Interview suite questions" className="space-y-2">
        <h2 className="text-xl font-semibold">Common questions</h2>
        <div className="space-y-3">
          <div className="rounded-xl border p-3">
            <p className="font-medium">Do I need an account to practice?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No. Guests can use every rehearsal room freely, and progress
              stays in your browser until you sign in. Saving a draft for your
              counselor is the only step that asks for sign-in, and the page
              will tell you plainly when that happens.
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-medium">What if I have never interviewed before?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Then the prep generator is your starting line. It hands you the
              five questions nearly every manager asks, with hints for shaping
              short answers from true stories. Work them in order, rehearse
              each one once by voice, and you will walk in knowing the shape
              of the conversation before it begins.
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-medium">Can I practice a criminal background answer here?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Yes, that is exactly what the pivot room is for. You will draft
              one neutral line about the past, one concrete change, and two
              sentences about what is true now, then rehearse delivery with a
              manager who asks kindly and never requests case numbers or
              court details.
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-medium">Will my words be sent anywhere?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No. Transcripts stay visible to you during practice, and nothing
              leaves the page unless you choose Download, Print, or Save. The
              resume builder states the same promise on screen: your draft
              exports as JSON or paper, and it never auto-sends to any
              employer or system.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
