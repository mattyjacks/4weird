import Link from "next/link";
import { featuresForGame, gameRequiresAi } from "@/lib/game-ai";

/**
 * Game AI disclosure badge. Rendered on game detail + play shells:
 * required AI (game cannot run without metered compute) vs optional AI
 * (toggleable dialogue/director/TTS) — both metered with the same 25% cut.
 */
export function GameAiBadge({ slug }: { slug: string }) {
  const features = featuresForGame(slug);
  if (!features.length) return null;
  const required = gameRequiresAi(slug);
  return (
    <section aria-label="Game AI features" className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/[.06] p-4">
      <p className="text-sm font-black text-amber-200">
        {required ? "🤖 This game requires AI compute" : "🤖 Optional AI features available"}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-slate-300">
        {features.map((f) => (
          <li key={`${f.kind}-${f.mode}`}>
            <b className="text-white">{f.label}</b>{" "}
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs">
              {f.mode} · {f.provider} · {f.kind}
            </span>
            <br />
            <span className="text-slate-400">{f.blurb}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-400">
        AI is metered in Vibe Coins (100 = $1.00) with the same 25% platform cut included — never added on top.
        Rent RunPods, inference endpoints, and AI APIs behind one gross price.{" "}
        <Link href="/my/usage/" className="text-cyan-300 hover:underline">
          See your usage →
        </Link>
      </p>
    </section>
  );
}
