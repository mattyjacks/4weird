import { getGamePlaybook } from "@/lib/game-playbooks";

/**
 * Per-game playbook panel (v2 layer): controls, goal, boot steps, and tips
 * sourced from each game's own game.json. Rendered on detail pages (full)
 * and play pages (compact) so every catalog game teaches itself.
 */
export function GamePlaybookPanel({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const playbook = getGamePlaybook(slug);
  if (!playbook) return null;
  return (
    <section
      aria-label={`How to play this game`}
      className="mt-4 rounded-2xl border border-white/15 bg-white/[.03] p-4 text-sm sm:p-5"
    >
      <h2 className="text-base font-black text-white">🎮 How to play</h2>
      <p className="mt-1 font-semibold text-cyan-200">{playbook.controls}</p>
      <p className="mt-2 text-slate-300">🎯 {playbook.goal}</p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-slate-300">
        {playbook.boot.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {!compact && (
        <>
          <h3 className="mt-4 text-sm font-bold uppercase tracking-wider text-slate-400">Tips</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-300">
            {playbook.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
