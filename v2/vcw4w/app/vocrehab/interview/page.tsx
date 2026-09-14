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
    </main>
  );
}
