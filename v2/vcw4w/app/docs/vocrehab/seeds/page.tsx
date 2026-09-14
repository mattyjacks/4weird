import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/vocrehab/seeds" },
  title: "VocRehab practice seeds",
  description:
    "How VocRehab practice sets shuffle every load, how to replay an exact set with ?seed=, and how counselors review the seed log.",
};

const theme = {
  bg: "bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950",
  border: "border-emerald-300/20",
  chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  title: "bg-gradient-to-r from-emerald-300 via-teal-200 to-lime-200 bg-clip-text text-transparent",
};

export default function VocRehabSeedsPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · vocrehab"
        title={<>Practice seeds: same work, <span className={theme.title}>fair replay.</span></>}
        lede={<>Every VocRehab practice set shuffles itself each time it loads — so practice stays fresh. When you need the exact same items again, the seed makes it replayable: same seed, same items, every time.</>}
        stats={[
          ["Default", "shuffled every load"],
          ["?seed=", "exact replay"],
          ["Retries", "count the same"],
          ["0", "eligibility effect"],
        ]}
        glyph="🌱"
        theme={theme}
        crumb="Practice seeds"
      />

      <SectionHead
        index="1"
        kicker="Fresh by default"
        title="Random every load — unless you ask for a seed"
        body="Open any practice set and the items shuffle automatically. Nothing to turn on, nothing to reset. The shuffle only stops when the page address carries a ?seed= value — then the set freezes into that exact order."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">🔀</p>
          <p className="mt-1 font-black">No seed in the address</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The set shuffles on every load. Each visit is a new mix — good for everyday practice
            and for keeping things from going stale.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">🔒</p>
          <p className="mt-1 font-black">Seed in the address</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The set locks into one fixed order. Reload it tomorrow and you get the very same
            items — good for check-ins, make-ups, and side-by-side comparisons.
          </p>
        </div>
      </div>

      <SectionHead
        index="2"
        kicker="Replay an exact set"
        title="Replaying a seed in three steps"
        body="A seed looks like VRHB-XXXXXX — six letters or numbers after the VRHB- prefix. A counselor can read one out, write it on a handout, or paste it into a message, and the learner lands on the identical set."
      />
      <Steps
        items={[
          ["Copy the seed", <>Find the seed in the practice page address — the part after <code>?seed=</code>, for example <code>?seed=VRHB-K7Q2MD</code>.</>],
          ["Share or save it", <>Write it down, send it in a message, or bookmark the full address. The seed alone is enough — no account or login needed to hold onto it.</>],
          ["Open the seeded address", <>Load the same practice page with the seed attached. The items appear in the exact saved order, ready to work through again.</>],
        ]}
      />
      <Callout tone="violet" title="Try it with any set.">
        Take a practice address and add <code>?seed=VRHB-K7Q2MD</code> to the end. Reload the page
        a few times — the order stays put. Remove the <code>?seed=</code> part and reload — the
        shuffle comes back.
      </Callout>

      <SectionHead
        index="3"
        kicker="For counselors and admins"
        title="The admin view: seed log, reload check, CSV export"
        body="The admin view keeps a simple log of which seeds were used and when. It exists so a counselor can confirm what a learner actually saw — without watching over their shoulder."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">📋</p>
          <p className="mt-1 font-black">Seed log</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Each practice run records its seed and date. Find the run, and you know exactly which
            set the learner worked through.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">🔁</p>
          <p className="mt-1 font-black">Same-seed reload</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open the logged seed yourself and you see the exact same items in the exact same
            order. What you review is what they practiced.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl" aria-hidden="true">📥</p>
          <p className="mt-1 font-black">CSV export</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Export the log as a plain spreadsheet file for case notes or team review. Seeds,
            dates, and completion — nothing personal beyond what your program already keeps.
          </p>
        </div>
      </div>

      <SectionHead
        index="4"
        kicker="Practice, not a test"
        title="Strengths first — retries count the same"
        body="VocRehab practice is rehearsal, not an exam. Scores highlight what went well first, and trying again is part of the plan — never a penalty."
      />
      <Callout tone="emerald" title="How scoring works here.">
        Every attempt counts the same, first try or fifth. There is no timer bonus and no
        retry penalty — the point is steady progress, not a perfect first run. Nothing in
        practice affects benefits or eligibility, ever.
      </Callout>
      <p className="mt-4 text-sm text-muted-foreground">
        New to VocRehab? Start with the{" "}
        <Link className="underline" href="/docs/vocrehab/getting-started">getting-started guide</Link>{" "}
        or read <Link className="underline" href="/docs/vocrehab/counselors">what counselors see</Link>.
      </p>

      <Pager current="/docs/vocrehab/seeds" />
    </article>
  );
}
