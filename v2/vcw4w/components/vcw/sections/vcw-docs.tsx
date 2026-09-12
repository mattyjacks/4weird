import Link from "next/link";

/**
 * Native manual section (replaces the framed docs/index.html).
 * Same guidance as the legacy field manual, rewritten for the hosted
 * run loop (/api/vcw/*) instead of the local desktop app.
 */
const sections: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "1. Start at the Hub",
    body: (
      <>
        <p>Open a run on the target that matches the work:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><b>Catalog games</b> — every 4weird game is a legal run target via the Hub.</li>
          <li><b>Cloud remotes</b> — rent a Kasm desktop on RunPod for GPU-heavy or off-site targets.</li>
          <li><b>Your own agent</b> — drive the same loop over HTTP with a login session or gateway key.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "2. Run a playtest",
    body: (
      <ol className="mt-2 space-y-2">
        <li><b className="text-cyan-300">01 — </b>Open a run with a game slug and a plain-language goal (1–500 chars).</li>
        <li><b className="text-cyan-300">02 — </b>Play the game yourself in another tab while you record each observe → reason → act step as a run action.</li>
        <li><b className="text-cyan-300">03 — </b>File anything broken as a bug with a severity. Pause by simply stopping; complete the run with a verdict when done.</li>
      </ol>
    ),
  },
  {
    heading: "3. Work on a cloud remote",
    body: (
      <>
        <p>For targets that need more than your browser, provision an autoplay remote from the Cloud Run page.
        Open the stream URL, log in with the one-time VNC password, and open the locked game URL in the remote
        Chromium. Idle remotes warn, then stop, then terminate — stop yours from /runpods when finished.</p>
        <p className="mt-2"><b>For video:</b> record the remote stream with OBS or another recorder. VibeCodeWorker
        supplies the supervised playtest; your recorder creates the final footage.</p>
      </>
    ),
  },
  {
    heading: "4. Review, evidence, and repair",
    body: (
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li><b>Run detail</b> — the full observe → reason → act trail plus findings; read before every next step.</li>
        <li><b>Export</b> — the uncapped portable archive (2000 steps + 500 bugs) for offline analysis.</li>
        <li><b>Compare</b> — two runs side by side: verdicts, step-kind mix, bug-severity mix.</li>
        <li><b>Handoff</b> — a portable markdown brief with a next-actions checklist for any coding tool.</li>
      </ul>
    ),
  },
  {
    heading: "5. Troubleshooting",
    body: (
      <>
        <p><b>No games listed:</b> the catalog needs a login session — sign in, then retry.</p>
        <p className="mt-1"><b>Run won&apos;t open:</b> the slug must be a catalog slug and the goal 1–500 chars.</p>
        <p className="mt-1"><b>Remote won&apos;t start:</b> the provision call answers honestly (unconfigured, no stock, over
        budget) — fix the reported state and retry; nothing is ever faked.</p>
      </>
    ),
  },
  {
    heading: "6. Good test goals",
    body: (
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>“Open the menu, change one setting, return to the game, and check controls.”</li>
        <li>“Walk a short route, rotate the camera, and note frame drops or stuck movement.”</li>
        <li>“Test the sign-up form for validation, keyboard navigation, and visible errors.”</li>
      </ul>
    ),
  },
];

export function VcwDocs() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-l-4 border-cyan-300 bg-white/[.03] p-5">
        <p className="font-bold text-white">Keep control of the run.</p>
        <p className="mt-1 text-sm text-slate-300">
          Review the selected target and stop whenever the behavior is not what you intended. Nothing ships
          without your review.
        </p>
      </div>
      {sections.map((s) => (
        <section key={s.heading} className="rounded-2xl border border-white/10 bg-white/[.02] p-5">
          <h2 className="text-lg font-black text-white">{s.heading}</h2>
          <div className="mt-2 text-sm leading-relaxed text-slate-300">{s.body}</div>
        </section>
      ))}
      <p className="text-sm text-slate-400">
        Full endpoint reference lives at <Link href="/docs/vibecodeworker" className="text-cyan-300 hover:underline">/docs/vibecodeworker</Link>.
      </p>
    </div>
  );
}
