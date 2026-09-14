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
    </main>
  );
}
