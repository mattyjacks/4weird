import type { Metadata } from "next";
import Link from "next/link";
import { VocrehabGameToolMatch } from "@/components/vocrehab/vocrehab-game-tool-match";
import { parseSeed } from "@/lib/vocrehab-seed";

export const metadata: Metadata = {
  title: "Tool Crib: match jobs to tools game | VocRehab",
  description: "VocRehab task-knowledge game: match 8 jobs to the right tool from four options and flag safety-gear needs. Over-gearing is forgiven, under-gearing is not.",
  alternates: { canonical: "/vocrehab/play/tool-match" },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ seed?: string | string[] }> }) {
  const params = await searchParams;
  const seed = parseSeed(typeof params.seed === "string" ? params.seed : null) ?? undefined;
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> → Tool Crib
      </nav>
      <h1 className="text-xl font-bold">Tool Crib: match every job to its tool</h1>
      <p className="text-sm text-muted-foreground">
        Start with the untimed practice rep. Eight jobs, four tool choices each, plus
        a safety gear call on every job. Practice, not a test, nothing here grades you.
      </p>
      <VocrehabGameToolMatch vocrehabSeed={seed} />
      <section aria-label="How to play Tool Crib" className="space-y-2 pt-2">
        <h2 className="text-base font-bold">How to play</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Read the job first, tools second. Each of the eight jobs shows four tool
            options. Picture yourself doing the task, then pick the tool a supervisor
            would hand you.
          </li>
          <li>
            Make the safety call on every job. Decide whether the task needs gloves,
            goggles, a vest, or similar gear. When in doubt, flag gear: over-gearing
            is always forgiven, under-gearing never is.
          </li>
          <li>
            Work through all eight jobs without rushing. There is no countdown here,
            so spend the time on the two jobs that feel ambiguous and notice which
            workplaces they resemble.
          </li>
          <li>
            Read your summary, then replay the same seed. The deal stays fixed per
            seed, so a replay tells you whether the lesson stuck or the first pass
            was luck.
          </li>
        </ol>
        <h3 className="font-semibold text-foreground">Before you start</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Think of one real shop, kitchen, or site you have seen. Anchor each guess
          to that memory: which drawer held the right tool, who wore the gear. If a
          job stumps you twice, write it down and ask someone who does that work.
          Asking is the skill being trained, not just knowing.
        </p>
      </section>
      <section aria-label="Tool Crib scoring and strategy" className="space-y-2">
        <h2 className="text-base font-bold">Scoring and strategy</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Tool first, gear second.</strong> Lock in
            the tool choice, then make a separate deliberate safety decision. Splitting
            the two judgments keeps one hard call from contaminating the other.
          </li>
          <li>
            <strong className="text-foreground">Default to gear.</strong> Half your score
            comes from safety calls, and the scorer forgives extra caution completely.
            A flagged vest you did not need costs nothing; a missing one costs the point.
          </li>
          <li>
            <strong className="text-foreground">Ask for the tool map.</strong> Missed tools
            mean unfamiliar workplaces, not low ability. The run summary suggests asking
            for the one-page tool map on day one, because every shop has one and asking
            is expected. Rehearse that ask in{" "}
            <Link href="/vocrehab/interview/prep" className="underline">interview prep</Link>.
          </li>
          <li>
            <strong className="text-foreground">Track your miss type.</strong> Tool misses
            point to exposure gaps, while safety misses point to risk habits. Knowing
            which one you own turns the next run into targeted study instead of a
            rematch. Compare notes with{" "}
            <Link href="/vocrehab/play" className="underline">the games index</Link> for
            companion safety drills.
          </li>
        </ul>
      </section>
      <section aria-label="Tool Crib questions" className="space-y-2">
        <h2 className="text-base font-bold">Common questions</h2>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground">I have never done these jobs. Am I supposed to guess?</h3>
            <p>
              Reason it out, then guess proudly. The game measures judgment under
              unfamiliarity, which is exactly what the first week of any hands-on job
              feels like. Eliminate the two tools that clearly belong elsewhere, then
              commit to the better of the remaining pair.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Should I really flag gear on almost everything?</h3>
            <p>
              In this game, yes, and on real sites the same instinct keeps you employed.
              Supervisors correct an over-geared newcomer with a smile and retrain an
              under-geared one with paperwork. Err toward protection every time.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">How do I use my score in a job search?</h3>
            <p>
              Quote the pattern, not the percent: eight jobs kitted with steady tool
              accuracy and a safety-first default. That sentence belongs on applications
              for warehouse, custodial, landscaping, and shop helper roles, and it gives
              your <Link href="/vocrehab/interview/resume" className="underline">resume builder</Link> a
              concrete line about workplace readiness.
            </p>
          </div>
        </div>
      </section>
      <section aria-label="Tool Crib measures and who benefits" className="space-y-2">
        <h2 className="text-base font-bold">What the run measures</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The scored run observes two qualities crew leads screen for: tool sense, or
          matching each job to the implement that fits it; and safety judgment, or
          flagging protective gear wherever the task warrants it. Each job contributes
          up to two points, one per judgment, and the summary separates tool misses
          from safety misses so your next reps can target the weaker half.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Aspiring warehouse associates, custodians, landscapers, kitchen prep cooks,
          and maintenance helpers will find this drill directly relevant. If postings
          keep asking for hands-on readiness plus safety awareness, a steady scored
          run gives you honest evidence and a story about learning unfamiliar
          workplaces fast.
        </p>
      </section>
    </main>
  );
}
