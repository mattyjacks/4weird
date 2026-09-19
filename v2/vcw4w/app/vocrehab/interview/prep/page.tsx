import type { Metadata } from "next";
import Link from "next/link";
import VocrehabRoleplayPanel from "@/components/vocrehab/vocrehab-roleplay-panel";

export const metadata: Metadata = {
  title: "Interview prep — VocRehab",
  description:
    "VocRehab interview prep: five tailored practice questions, then rehearse each one out loud with the practice manager.",
  alternates: { canonical: "/vocrehab/interview/prep" },
};

const vocrehabPrepQuestions = [
  {
    vocrehabQuestion: "Tell me a little about yourself.",
    vocrehabHint: "Two sentences: who you are as a worker, why this role.",
  },
  {
    vocrehabQuestion: "What is a strength you bring to this work?",
    vocrehabHint: "Name one strength, then one short example of using it.",
  },
  {
    vocrehabQuestion: "Tell me about a challenge you handled.",
    vocrehabHint: "One challenge, what you did next, what came of it.",
  },
  {
    vocrehabQuestion: "How do you work with a team?",
    vocrehabHint: "One example: your part, how you communicated, the result.",
  },
  {
    vocrehabQuestion: "Why does this role fit you right now?",
    vocrehabHint: "One or two sentences tying your strengths to this job.",
  },
];

export default function Page() {
  return (
    <main className="vocrehab-interview-prep mx-auto w-full max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/interview">Interview</Link> → Prep
      </nav>
      <h1 className="text-xl font-bold">Interview prep generator</h1>
      <p className="text-muted-foreground">
        Pick a job goal, work these five questions, then rehearse each one
        below with the practice manager — by text or voice. Up to 6 turns,
        then a wrap-up with a retry offer.
      </p>
      <ol className="list-decimal space-y-2 rounded-xl border p-3 pl-8">
        {vocrehabPrepQuestions.map((vocrehabItem) => (
          <li key={vocrehabItem.vocrehabQuestion}>
            <p className="font-medium">{vocrehabItem.vocrehabQuestion}</p>
            <p className="text-sm text-muted-foreground">
              {vocrehabItem.vocrehabHint}
            </p>
          </li>
        ))}
      </ol>
      <VocrehabRoleplayPanel initialScenario="prep" />
      <section aria-label="Answer shape" className="space-y-2 pt-2">
        <h2 className="text-lg font-semibold">A shape that fits every question</h2>
        <p className="text-sm text-muted-foreground">
          All five questions above reward the same three part shape: a point
          in one sentence, a true example in two sentences, and a link to
          this role in one sentence. Four sentences total keeps you inside
          thirty to sixty seconds and leaves room for follow-ups. Memorize
          the shape, not the script, so each answer sounds thought through
          rather than recited.
        </p>
      </section>
      <section aria-label="Worked mini examples" className="space-y-2">
        <h2 className="text-lg font-semibold">Short examples for each question</h2>
        <p className="text-sm text-muted-foreground">
          These fictional samples show the shape in action. Borrow the
          structure and supply your own facts.
        </p>
        <ol className="list-decimal space-y-2 rounded-xl border p-3 pl-8 text-sm">
          <li>
            <p className="font-medium">Tell me about yourself.</p>
            <p className="text-muted-foreground">
              I am a steady hands on worker who takes pride in accurate
              stocking. At a food pantry I kept three aisles faced and logged
              every donation. That care with inventory is what I want to
              bring to your store.
            </p>
          </li>
          <li>
            <p className="font-medium">A strength you bring.</p>
            <p className="text-muted-foreground">
              My strength is calm recovery. When a delivery arrived half
              short, I counted, flagged the gap, and rebuilt the display from
              backup stock. Your team gets someone who fixes the gap instead
              of freezing.
            </p>
          </li>
          <li>
            <p className="font-medium">A challenge you handled.</p>
            <p className="text-muted-foreground">
              Our bus route changed midwinter and I lost my ride. I tested
              two earlier buses, confirmed the new arrival with my lead, and
              kept perfect attendance through the season. I plan around
              obstacles early.
            </p>
          </li>
          <li>
            <p className="font-medium">Working with a team.</p>
            <p className="text-muted-foreground">
              On pantry Saturdays I ran the door count while two partners
              bagged. I called out restock needs every twenty minutes so
              nobody guessed. Clear short updates are how I keep a crew
              smooth.
            </p>
          </li>
          <li>
            <p className="font-medium">Why this role fits now.</p>
            <p className="text-muted-foreground">
              This stockroom role fits because accuracy and routine are my
              strongest gears, and part time mornings match my transport. I
              am ready to start steady and grow hours as I prove out.
            </p>
          </li>
        </ol>
      </section>
      <section aria-label="Practice routine" className="space-y-2">
        <h2 className="text-lg font-semibold">A twenty minute routine</h2>
        <ol className="list-decimal space-y-2 rounded-xl border p-3 pl-8 text-sm">
          <li>
            <p className="font-medium">Minutes 1 to 5: draft one question in text.</p>
            <p className="text-muted-foreground">
              Type the four sentence shape without editing. Rough and true
              beats smooth and invented.
            </p>
          </li>
          <li>
            <p className="font-medium">Minutes 6 to 12: rehearse it by voice.</p>
            <p className="text-muted-foreground">
              Read your draft aloud twice in the rehearsal room, then answer
              once without looking. Note where you stumbled.
            </p>
          </li>
          <li>
            <p className="font-medium">Minutes 13 to 17: apply the tweak.</p>
            <p className="text-muted-foreground">
              The manager gives one praise and one tweak. Rewrite only the
              tweak line, then say the full answer again.
            </p>
          </li>
          <li>
            <p className="font-medium">Minutes 18 to 20: test under pressure.</p>
            <p className="text-muted-foreground">
              Take the same answer into the{" "}
              <Link href="/vocrehab/interview/jobs" className="underline">
                job sim
              </Link>{" "}
              or ask a friend to interrupt once. Calm resets are the skill
              being trained.
            </p>
          </li>
        </ol>
      </section>
      <section aria-label="Prep questions" className="space-y-2">
        <h2 className="text-lg font-semibold">Common questions</h2>
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border p-3">
            <p className="font-medium">What if I have no good stories?</p>
            <p className="mt-1 text-muted-foreground">
              Use everyday proof. On time bus rides show reliability,
              pantry shifts show teamwork, and caring for family shows
              stamina and scheduling. Small true moments beat grand
              inventions, because managers probe details and truth holds up.
              Your{" "}
              <Link href="/vocrehab/course" className="underline">
                course strengths
              </Link>{" "}
              can remind you which moments count.
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-medium">How long should each answer run?</p>
            <p className="mt-1 text-muted-foreground">
              Aim for thirty to sixty seconds, roughly four sentences. Under
              that sounds thin, over that risks rambling. Time yourself on
              the second voice retry; if you pass a minute, cut the middle
              example to one sentence and keep the link to the role.
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-medium">What if my mind goes blank mid answer?</p>
            <p className="mt-1 text-muted-foreground">
              Pause, breathe, and restate your point in fresh words. Try:
              Let me put that more directly, then give the example again
              slowly. Interviewers forgive a restart far more readily than a
              spiral, and the rehearsal room rewards clean resets with
              stronger feedback. Two calm restarts in practice teach your
              nerves that blanking is survivable, which keeps the next blank
              shorter.
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-medium">What comes after these five?</p>
            <p className="mt-1 text-muted-foreground">
              Take your best answers into harder rooms. The{" "}
              <Link href="/vocrehab/interview/pivot" className="underline">
                pivot builder
              </Link>{" "}
              covers the background question, the{" "}
              <Link href="/vocrehab/interview/disclosure" className="underline">
                disclosure builder
              </Link>{" "}
              covers support needs, and the{" "}
              <Link href="/vocrehab/export" className="underline">
                export page
              </Link>{" "}
              gathers everything for your counselor to review.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
