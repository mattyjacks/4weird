import type { Metadata } from "next";
import Link from "next/link";
import { SHADOW_IT_RISKS, SHADOW_IT_WHY_BAD_MD } from "@/lib/shadow-it";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/shadow-it" },
  title: "Why Shadow IT is bad",
  description:
    "Plain-English explainer: what Shadow IT is, why secret apps put work at risk, and the approved fix.",
};

export default function ShadowItPage() {
  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Docs · plain-English guide
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Why Shadow IT is bad</h1>
      <p className="mt-2 leading-relaxed text-muted-foreground">
        Shadow IT means using apps for work that your team did not pick. Read this once,
        then use the approved path — it is faster and safer.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed whitespace-pre-wrap">
        {SHADOW_IT_WHY_BAD_MD}
      </div>

      <h2 className="mt-10 text-xl font-black">The risks, in plain words</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SHADOW_IT_RISKS.map((risk) => (
          <div key={risk.id} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{risk.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{risk.plain}</p>
            <p className="mt-2 text-sm">
              <span className="font-bold">Fix: </span>
              {risk.fix}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-black">The fix</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Stop hiding copies of work in secret boxes. Do the work where the team can see it,
        log it, lock it, and back it up.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
        <Link
          className="rounded-full border border-border bg-card px-4 py-2 underline"
          href="/work"
        >
          Do work at /work
        </Link>
        <Link
          className="rounded-full border border-border bg-card px-4 py-2 underline"
          href="/it"
        >
          Ask IT at /it
        </Link>
        <Link
          className="rounded-full border border-border bg-card px-4 py-2 underline"
          href="/boss"
        >
          Check risk at /boss
        </Link>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Rule of thumb: if the team cannot see it, log it, lock it, or back it up, do not
        put work in it. Ask first, then use the approved path.
      </p>
    </article>
  );
}
