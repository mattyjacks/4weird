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
    </main>
  );
}
