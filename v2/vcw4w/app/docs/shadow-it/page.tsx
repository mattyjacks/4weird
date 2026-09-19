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

      <h2 className="mt-10 text-xl font-black">Spot it early: five signs of Shadow IT</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Shadow IT rarely announces itself. It shows up as small workarounds that feel
        faster today and cost the team later. If two or more of these sound familiar,
        your team already has some.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          ["📎 Mystery links", "Work arrives as links to apps nobody approved, and nobody can say who else can open them."],
          ["💳 The hidden card", "One teammate pays for a tool on a personal card, so spending never appears in one list."],
          ["🔑 Password sprawl", "New hires get five new logins in week one, and leavers keep access nobody remembers to cut."],
          ["🗑️ No second copy", "The only copy of a file lives in a free app with no backups and no version history."],
          ["🤫 Ask, but quietly", "People whisper which unapproved tool to use instead of asking IT in the open."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-black">Shadow habit versus the approved path</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Every shadow habit has an approved twin on 4weird that keeps the same work
        visible, logged, and backed up. Pick the row that matches your habit.
      </p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <caption className="bg-muted/50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Common shadow habits and where they belong
          </caption>
          <thead>
            <tr className="border-y border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-2.5">Shadow habit</th>
              <th scope="col" className="px-4 py-2.5">Approved path</th>
              <th scope="col" className="px-4 py-2.5">What you gain</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">Random file shares</th>
              <td className="px-4 py-2.5 text-muted-foreground">Team vault and squad projects</td>
              <td className="px-4 py-2.5 text-muted-foreground">Logged sharing, real backups, clean offboarding</td>
            </tr>
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">Side chat apps</th>
              <td className="px-4 py-2.5 text-muted-foreground">Squad channels</td>
              <td className="px-4 py-2.5 text-muted-foreground">One membership list, searchable history</td>
            </tr>
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">Free AI side tools</th>
              <td className="px-4 py-2.5 text-muted-foreground">Approved agent runs</td>
              <td className="px-4 py-2.5 text-muted-foreground">Metered cost in one ledger, no pasted secrets</td>
            </tr>
            <tr>
              <th scope="row" className="px-4 py-2.5 font-black">Personal cloud desktops</th>
              <td className="px-4 py-2.5 text-muted-foreground">Managed desktops</td>
              <td className="px-4 py-2.5 text-muted-foreground">Idle policies, honest billing, team visibility</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-xl font-black">Move one stray folder back in ten minutes</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Do not try to fix every shadow app at once. Move one folder this week and the
        pattern becomes obvious to the whole team.
      </p>
      <ol className="mt-4 space-y-3 text-sm leading-relaxed">
        {[
          ["1. Name the stray", "Pick the one folder people actually open: the shared doc, the asset pile, the client export. Write down who uses it and what breaks if it vanishes."],
          ["2. Copy it home", "Do the work where the team can see it: drafts at /work, files where the squad keeps them, questions at /it. Keep the old copy until the new one is confirmed."],
          ["3. Fix the doors", "Share from the new home only, remove the old link from bookmarks and chats, and collect the extra passwords people made for the stray app."],
          ["4. Tell the team once", "Post where the folder lives now and who approves new tools. Future strays die at birth when asking IT is the normal path."],
        ].map(([title, body]) => (
          <li key={title} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{title}</p>
            <p className="mt-1 text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>

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
