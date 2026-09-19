import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import VocrehabGamePaycheckPlan from "@/components/vocrehab/vocrehab-game-paycheck-plan";
import { parseSeed } from "@/lib/vocrehab-seed";

async function vocrehabSavePaycheckRun(events: { t_ms: number; kind: string; detail: Record<string, unknown> }[], summary?: Record<string, unknown>): Promise<boolean | "guest" | "error"> {
  "use server";
  try {
    const requestHeaders = await headers();
    const cookie = requestHeaders.get("cookie") ?? "";
    const req = new Request("https://vocrehab.local/api/vocrehab/games", { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ game_id: "paycheck-plan", events, summary }) });
    const { POST } = await import("@/app/api/vocrehab/games/route");
    const res = await POST(req);
    return res.status === 401 ? "guest" : res.ok;
  } catch { return "error"; }
}

export const metadata: Metadata = {
  title: "Paycheck Planner | VocRehab",
  description: "VocRehab paycheck planning game: turn gross pay into a funded plan across rent, transport, bills, and savings, then absorb a mid-round curveball without breaking the budget.",
  alternates: { canonical: "/vocrehab/play/paycheck-plan" },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ seed?: string | string[]; savedStateId?: string | string[]; kid_id?: string | string[] }> }) {
  const params = await searchParams;
  const seed = parseSeed(typeof params.seed === "string" ? params.seed : null) ?? undefined;
  const savedStateId = typeof params.savedStateId === "string" ? params.savedStateId : undefined;
  const kidId = typeof params.kid_id === "string" ? params.kid_id : undefined;
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> → Paycheck Planner
      </nav>
      <h1 className="text-xl font-bold">Paycheck Planner: make one paycheck cover real life</h1>
      <p className="text-sm text-muted-foreground">
        Start with the practice round at sixteen dollars an hour for twenty hours.
        The scored run adds deductions plus one curveball bill. Practice, not a test,
        nothing here grades you.
      </p>
      <VocrehabGamePaycheckPlan vocrehabGameId="paycheck-plan" vocrehabSeed={seed} vocrehabSavedStateId={savedStateId} vocrehabKidId={kidId} vocrehabOnComplete={vocrehabSavePaycheckRun} />
      <section aria-label="How to play Paycheck Planner" className="space-y-2 pt-2">
        <h2 className="text-base font-bold">How to play</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Learn the loop in the intro and practice phases: a three-second countdown
            opens each round, and every round moves through gross pay, allocation,
            curveball, and closeout. The sixteen dollar practice wage keeps the math friendly.
          </li>
          <li>
            Convert gross to net first. Apply the labeled deduction rate to see what
            actually lands, because budgeting gross pay is the classic first-paycheck
            mistake. Allocate only the net across rent, transport, groceries, bills,
            and savings.
          </li>
          <li>
            Survive the curveball. Mid-round, an unplanned cost lands with a fixed
            price: a repair, a fee, a fare hike. Cover it by trimming flexible buckets
            before touching rent or savings, the way resilient households do.
          </li>
          <li>
            Close the round and read the results screen, which shows where every
            dollar went. Replay the seed to test a different split against the same
            curveball and watch the outcome change.
          </li>
        </ol>
        <h3 className="font-semibold text-foreground">Before you start</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Write down your real fixed costs first: rent share, bus pass, phone bill.
          Those numbers anchor every allocation choice you make in the game. One
          focused round beats three distracted ones, and the practice wage exists
          precisely so the arithmetic never blocks the lesson.
        </p>
      </section>
      <section aria-label="Paycheck Planner scoring and strategy" className="space-y-2">
        <h2 className="text-base font-bold">Scoring and strategy</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Net, never gross.</strong> Multiply wage
            by hours, subtract the deduction, and treat the remainder as your entire
            universe. Plans built on gross pay collapse at the first bill; plans built
            on net survive contact with reality.
          </li>
          <li>
            <strong className="text-foreground">Fund in priority order.</strong> Roof and
            ride first, then food and bills, then savings with whatever remains. When
            the curveball lands, cut from the bottom of that list upward and protect
            the top fiercely.
          </li>
          <li>
            <strong className="text-foreground">Keep a curveball reserve.</strong> Even a
            tiny unallocated buffer absorbs most mid-round surprises without touching
            rent. Players who reserve ten percent finish calmer than players who
            allocate to the last cent. The same reserve logic powers{" "}
            <Link href="/vocrehab/play/energy-budget" className="underline">Energy Budget</Link>.
          </li>
          <li>
            <strong className="text-foreground">Replay to compare philosophies.</strong> Run
            the same seed twice: once protecting savings at all costs, once protecting
            lifestyle spending. The results screen makes the tradeoff visible, which is
            exactly the conversation to bring to{" "}
            <Link href="/vocrehab/course" className="underline">the money lessons</Link>.
          </li>
        </ul>
      </section>
      <section aria-label="Paycheck Planner questions" className="space-y-2">
        <h2 className="text-base font-bold">Common questions</h2>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground">Are the dollar amounts realistic?</h3>
            <p>
              They are teaching numbers, not a cost-of-living survey. The practice wage
              and hours keep arithmetic simple so the allocation logic shines through.
              Apply the same gross-to-net-to-buckets method to your real pay stub and
              the skill transfers directly.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">What if the curveball breaks my budget?</h3>
            <p>
              Then the game did its job safely. A broken game budget costs nothing and
              teaches the reserve habit; a broken real budget costs late fees. Replay
              with a buffer and watch the same surprise become manageable.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Does my run save anywhere?</h3>
            <p>
              Signed-in runs save through the same pipeline as the other practice
              games, while guests keep results on screen only. Either way nothing here
              affects benefits or employment records. Browse the{" "}
              <Link href="/vocrehab/play" className="underline">games index</Link> for
              the next drill when this one clicks.
            </p>
          </div>
        </div>
      </section>
      <section aria-label="Paycheck Planner measures and who benefits" className="space-y-2">
        <h2 className="text-base font-bold">What the run measures</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The scored run observes three money muscles programs screen for: net-pay
          thinking, or budgeting take-home instead of gross; priority allocation, or
          funding roof, ride, food, and bills before wants; and shock absorption, or
          covering the curveball from flexible buckets without raiding rent. The
          results screen itemizes every dollar so the lesson is visible, not vibes.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Teens with first jobs, adults returning to hourly work, and anyone whose
          first paycheck evaporated mysteriously will find this drill directly
          relevant. If counselors keep asking about budgeting skills, a funded plan
          that survives a curveball is concrete proof of financial readiness.
        </p>
      </section>
    </main>
  );
}
