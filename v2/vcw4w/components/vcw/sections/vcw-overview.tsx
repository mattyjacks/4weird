import Link from "next/link";

/**
 * Native overview section (replaces the framed overview.html).
 * Same information as the legacy marketing surface, rewritten for the
 * site design language. No iframe: all copy lives in this component.
 */
export function VcwOverview() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
        <p className="text-xs font-bold tracking-widest text-cyan-300">4WEIRD / VIBECODEWORKER</p>
        <h2 className="mt-2 text-2xl font-black text-white">Build with instinct. Test with evidence.</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          VibeCodeWorker is a focused QA workspace for games, websites, and web apps. Give it a target and a
          goal; it helps you observe the experience, stress key paths, collect issues, and organize what to fix
          next.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/vibecodeworker/run"
            className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
          >
            Launch Cloud Run →
          </Link>
          <Link
            href="/vibecodeworker/full"
            className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Open Full Web →
          </Link>
          <Link
            href="/vibecodeworker/demo"
            className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Interface demo →
          </Link>
        </div>
      </section>

      <section aria-label="How it works" className="grid gap-3 sm:grid-cols-3">
        {[
          ["01", "Load a target", "A catalog game, a play URL, or a cloud remote — the workspace remembers it."],
          ["02", "Set a test goal", "Plain language: menus, controls, visual glitches, or a custom flow."],
          ["03", "Review evidence", "Behavior, issues, and repair context in one trail."],
        ].map(([n, title, body]) => (
          <div key={n} className="rounded-xl border border-white/10 bg-white/[.02] p-4">
            <p className="text-xs font-black text-cyan-300">{n}</p>
            <p className="mt-1 font-bold text-white">{title}</p>
            <p className="mt-1 text-sm text-slate-400">{body}</p>
          </div>
        ))}
      </section>

      <section aria-label="The loop">
        <h2 className="text-xl font-black text-white">From a vague feeling to a useful next step.</h2>
        <ol className="mt-3 space-y-3">
          {[
            ["Point it at the work", "Open a run on a catalog game. The run holds the goal, the trail, and the verdict."],
            ["Name the outcome", "“Test menus,” “find visual glitches,” “check keyboard controls” — observable goals beat vague ones."],
            ["Run and observe", "Record each observe → reason → act iteration as run actions; file anything broken as a bug."],
            ["Investigate with context", "Compare runs, export the full trail, or grab a handoff brief for your coding tool."],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-3 rounded-xl border border-white/10 bg-white/[.02] p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-sm font-black text-cyan-300">
                {i + 1}
              </span>
              <div>
                <p className="font-bold text-white">{title}</p>
                <p className="mt-0.5 text-sm text-slate-400">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Capabilities" className="grid gap-3 sm:grid-cols-2">
        {[
          ["◉ Focused playtests", "Start with just a target and a testing goal. The everyday workflow stays out of the way."],
          ["⌁ Live evidence", "Follow the action trail, findings, screenshots, and replay notes on every run."],
          ["⌘ Full API", "Every click above is a documented /api/vcw/* call — drive the same loop from your own agent."],
          ["↗ Repair-ready context", "Turn an observed issue into a report, an export archive, or a handoff brief."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl border border-white/10 bg-white/[.02] p-4">
            <p className="font-bold text-white">{title}</p>
            <p className="mt-1 text-sm text-slate-400">{body}</p>
          </div>
        ))}
      </section>

      <section aria-label="Control" className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-xl font-black text-white">You decide what runs and what changes.</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          VibeCodeWorker explores and organizes repair work, but it never ships a change by itself. Review
          targets, findings, and any proposed fix before you apply it.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-black/30 p-4">
            <p className="font-bold text-white">For games</p>
            <p className="mt-1 text-sm text-slate-400">Menus, controls, restarts, visual states, and performance behavior.</p>
          </div>
          <div className="rounded-xl bg-black/30 p-4">
            <p className="font-bold text-white">For web apps</p>
            <p className="mt-1 text-sm text-slate-400">Flows, forms, responsiveness, console errors, and UX across a target.</p>
          </div>
          <div className="rounded-xl bg-black/30 p-4">
            <p className="font-bold text-white">For deeper work</p>
            <p className="mt-1 text-sm text-slate-400">Run compare, full exports, and handoff briefs when the task calls for them.</p>
          </div>
        </div>
      </section>

      <section aria-label="Pricing">
        <h2 className="text-xl font-black text-white">Pick the route that fits the work.</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ["BYOK", "Bring your own key", "Use the gateway with your own provider keys at base price."],
            ["Hosted", "Use our GPUs", "Cloud remotes and hosted runs with the 25% cut already inside every quote."],
            ["Cloud", "Managed workspace", "A Kasm desktop remote with the game and agent side by side."],
          ].map(([kicker, title, body]) => (
            <div key={title} className="rounded-xl border border-white/10 bg-white/[.02] p-4">
              <p className="text-xs font-black tracking-widest text-cyan-300">{kicker}</p>
              <p className="mt-1 font-bold text-white">{title}</p>
              <p className="mt-1 text-sm text-slate-400">{body}</p>
            </div>
          ))}
        </div>
        <Link href="/pricing/" className="mt-4 inline-block text-sm font-bold text-cyan-300 hover:underline">
          See launch pricing and memberships →
        </Link>
      </section>
    </div>
  );
}
