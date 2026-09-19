import type { Metadata } from "next";
import Link from "next/link";
import { VocrehabGamePhoneGreeting } from "@/components/vocrehab/vocrehab-game-phone-greeting";
import { parseSeed } from "@/lib/vocrehab-seed";

export const metadata: Metadata = {
  title: "Front-Desk Hello: phone greeting practice game | VocRehab",
  description: "VocRehab listening game: greet 6 callers warmly from three options each, then recall one detail per call. Warmth plus memory, scored together.",
  alternates: { canonical: "/vocrehab/play/phone-greeting" },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ seed?: string | string[] }> }) {
  const params = await searchParams;
  const seed = parseSeed(typeof params.seed === "string" ? params.seed : null) ?? undefined;
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> → Front-Desk Hello
      </nav>
      <h1 className="text-xl font-bold">Front-Desk Hello: warm greetings, sharp memory</h1>
      <p className="text-sm text-muted-foreground">
        Start with the untimed practice rep. Six callers, three greeting choices each,
        then one memory question per call. Practice, not a test, nothing here grades you.
      </p>
      <VocrehabGamePhoneGreeting vocrehabSeed={seed} />
      <section aria-label="How to play Front-Desk Hello" className="space-y-2 pt-2">
        <h2 className="text-base font-bold">How to play</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Read the caller context first: who is calling and what situation they are
            in. The context line tells you which greeting tone fits, so never skip it.
          </li>
          <li>
            Choose one of three greetings. The warmest option names you and your
            workplace and offers a clear next step. Cold or brusque options cost
            courtesy points, exactly like a real front desk.
          </li>
          <li>
            Answer the recall question for each call. Before replying, jot the caller
            name plus one word, for example Rosa plus invoice, because the detail you
            note is the detail you keep.
          </li>
          <li>
            Finish all six calls, read your summary, then replay the seed. Fixed deals
            per seed mean the replay measures learning, not luck with easier callers.
          </li>
        </ol>
        <h3 className="font-semibold text-foreground">Before you start</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Keep a real notepad beside you and use it every call, even though the game
          never requires it. The habit transfers directly to dispatch desks, clinics,
          and reception counters. Say each greeting choice out loud once before
          tapping it: your ear catches cold phrasing your eyes forgive.
        </p>
      </section>
      <section aria-label="Front-Desk Hello scoring and strategy" className="space-y-2">
        <h2 className="text-base font-bold">Scoring and strategy</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Name and workplace first.</strong> Opening
            with your name plus where you work buys thinking time and sounds
            professional on every call type. The scorer rewards it, and so do real callers.
          </li>
          <li>
            <strong className="text-foreground">Chase recall, not just warmth.</strong> Each
            call is worth three points: two for courtesy, one for memory. Players who
            ace greetings but skip notes plateau fast, while note takers climb into the
            steady band.
          </li>
          <li>
            <strong className="text-foreground">Confirm the next step aloud.</strong> End
            each mental greeting with what happens next: a transfer, a callback, a
            hold. Callers forgive pauses but remember vagueness, so practice the
            closing line in{" "}
            <Link href="/vocrehab/interview/prep" className="underline">interview prep</Link>{" "}
            until it sounds automatic.
          </li>
          <li>
            <strong className="text-foreground">Learn your weak half.</strong> The summary
            splits missed warmth from missed recall. Warmth misses mean rehearsing
            phrasing, while recall misses mean upgrading the notepad habit. Drill the
            weaker half next, then compare runs on the{" "}
            <Link href="/vocrehab/play" className="underline">games index</Link>.
          </li>
        </ul>
      </section>
      <section aria-label="Front-Desk Hello questions" className="space-y-2">
        <h2 className="text-base font-bold">Common questions</h2>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground">Is writing notes cheating?</h3>
            <p>
              No, it is the job. Receptionists, dispatchers, and clinic schedulers all
              write while they listen. The game lets you practice the exact professional
              habit: hear it, jot it, use it in your reply.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">What if I am nervous on phones?</h3>
            <p>
              Start with one call per sitting and read every option twice before
              choosing. Nervousness fades as the opening line becomes muscle memory,
              which is why the name-and-workplace opener is worth drilling until it
              feels boring.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">How do I talk about this game in interviews?</h3>
            <p>
              Describe the two-skill combo: greeting six varied callers warmly while
              retaining one detail each. That maps directly to postings asking for
              communication plus attention to detail, and it gives your{" "}
              <Link href="/vocrehab/interview/resume" className="underline">resume</Link> a
              concrete customer service line.
            </p>
          </div>
        </div>
      </section>
      <section aria-label="Front-Desk Hello measures and who benefits" className="space-y-2">
        <h2 className="text-base font-bold">What the run measures</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The scored run observes two qualities front offices screen for: courtesy, or
          choosing greetings that are warm and professional rather than flat or
          off-putting; and recall, or retaining one detail per caller through the end
          of the exchange. Six calls times three points sets the scale, and the
          summary names which half needs work with a concrete support tip attached.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Aspiring receptionists, clinic schedulers, dispatch assistants, call center
          trainees, and retail greeters will find this drill directly relevant. If
          postings keep asking for phone presence plus accuracy, a steady scored run
          gives you honest evidence and a story about handling six different humans
          with the same calm professionalism.
        </p>
      </section>
    </main>
  );
}
