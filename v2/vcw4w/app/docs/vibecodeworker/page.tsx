import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "VibeCodeWorker",
  description:
    "How to use VibeCodeWorker: check status, open QA runs, record observe-reason-act steps, file bugs, complete runs, and export handoffs.",
};

const h2 = "mt-10 text-2xl font-bold tracking-tight";
const p = "mt-3 text-muted-foreground leading-relaxed";

export default function VcwPage() {
  return (
    <article>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
        Docs · QA product
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">VibeCodeWorker ⚙️</h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
        Evidence-driven QA: point it at a game, watch it observe → reason → act, and get runs,
        findings, bugs, and portable handoffs with proof. Start at{" "}
        <Link className="underline" href="/vibecodeworker">/vibecodeworker</Link>.
      </p>

      <h2 className={h2}>1. Surfaces (/vibecodeworker/*)</h2>
      <p className={p}>
        Overview, hub, run, full, phone, docs, and demo sections each pair a guide with the live
        surface plus a public service-status pill. If the status pill reports trouble, wait before
        opening runs — the loop depends on the service underneath.
      </p>

      <h2 className={h2}>2. The agent loop in 7 steps (signed in)</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6 text-muted-foreground">
        <li><strong className="text-foreground">Check status:</strong> confirm the service, catalog game count, and recent runs/bugs. If the catalog is empty or unhealthy, stop here.</li>
        <li><strong className="text-foreground">Pick a target:</strong> list catalog games (slug, title, genre, play URL). Every legal run target comes from this list — first-party play URLs only.</li>
        <li><strong className="text-foreground">Open a run:</strong> choose a catalog slug + a 1–500 character goal (“verify level 2 boss spawns adds”). You get a run ID.</li>
        <li><strong className="text-foreground">Observe → reason → act:</strong> read the full run (trail + findings) before every next step, then append one iteration: an observation, an action, or a finding (each with text + optional small data object; open runs only).</li>
        <li><strong className="text-foreground">File bugs:</strong> title + description + severity (low/medium/high/critical, default medium), optionally pinned to a run (which defaults the game slug).</li>
        <li><strong className="text-foreground">Complete the run:</strong> close with a summary + verdict (pass / fail / inconclusive). Closed runs reject further steps.</li>
        <li><strong className="text-foreground">Hand off:</strong> export a portable markdown brief for any coding tool (defaults to your latest run). The dashboard gives recent runs + bugs in one view.</li>
      </ol>

      <h2 className={h2}>3. Autoplay + cloud execution</h2>
      <p className={p}>
        Autoplay provisions a real remote to play the game for you (or reports honestly that it
        couldn&apos;t start). Catalog games run on-site only; special titles may require GPU-boosted,
        off-site, desktop-backed remotes — the request tells you which. The hosted site has no live
        browser of its own: you drive play locally (or via an autoplay remote) and record each iteration
        through the run actions. Live-browser control exists only on local workers, never in the hosted
        run API.
      </p>

      <h2 className={h2}>4. Writing good runs + bugs</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li><strong className="text-foreground">Goals:</strong> one verifiable claim per run (“main menu → new game → first checkpoint with no console errors”).</li>
        <li><strong className="text-foreground">Steps:</strong> small, timestamped, evidence-first (“screenshot shows…”, “score event fired…”) — one kind per append.</li>
        <li><strong className="text-foreground">Bugs:</strong> expected vs. actual + reproduction path + severity + run link. Critical = data loss, payment error, or safety issue.</li>
        <li><strong className="text-foreground">Verdicts:</strong> pass (goal met with evidence), fail (reproducible defect filed), inconclusive (blocked — say what blocked you).</li>
      </ul>

      <h2 className={h2}>5. Limits + troubleshooting</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li>Runs, steps, and bugs are rate-limited per user; back off on 429s and respect retry signals.</li>
        <li>Slugs must be catalog; goals/text have length caps; data payloads cap at ~10 KB. Oversized appends are rejected — trim and retry.</li>
        <li>Only open runs accept steps; completed runs are read-only history.</li>
        <li>Usage may be metered and autoplay depends on real capacity — “couldn&apos;t start” is an honest capacity answer, not a bug in your goal.</li>
      </ul>

      <p className="mt-8 text-sm text-muted-foreground">
        Next: <Link className="underline" href="/docs/agents-compute">Agents &amp; cloud →</Link> ·{" "}
        <Link className="underline" href="/docs/faq">FAQ &amp; support →</Link>
      </p>
    </article>
  );
}
