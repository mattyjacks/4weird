import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Discover your work self",
  description: "VocRehab Discover: play short work scenarios and turn your play into a strengths-first profile.",
  alternates: { canonical: "/vocrehab/discover" },
};

const LINKS = [
  { href: "/vocrehab/discover/ipe", title: "Your IPE", blurb: "What an employment plan is, in plain words." },
  { href: "/vocrehab/discover/barriers", title: "Barriers", blurb: "Name what gets in the way, then match supports." },
  { href: "/vocrehab/discover/readiness", title: "Readiness", blurb: "See where you stand, supports-first." },
  { href: "/vocrehab/discover/goals", title: "Goals", blurb: "Pick one direction to explore first." },
  { href: "/vocrehab/discover/remote", title: "Remote check", blurb: "Does remote work fit, and with what setup?" },
] as const;

export default function VocrehabDiscoverPage() {
  return (
    <main className="vocrehab-discover mx-auto w-full max-w-6xl px-3 py-2">
      <div className="flex h-8 items-center gap-2">
        <h1 className="truncate text-[15px] font-bold tracking-tight text-stone-900 dark:text-stone-50">Discover: no tests that feel like tests</h1>
        <span className="ml-auto shrink-0 rounded-full border border-stone-200 bg-white px-2 py-px text-[11px] font-bold text-stone-600">
          5 assessments
        </span>
      </div>
      <p className="text-xs text-stone-700 dark:text-stone-300">
        You play short work scenarios instead of filling long forms. What you do in the game becomes your profile — strengths first, never labels.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="flex flex-col rounded-lg border border-stone-200 bg-white p-3 shadow-sm hover:shadow">
            <h2 className="text-sm font-semibold text-stone-900">{l.title}</h2>
            <p className="mt-0.5 text-xs text-stone-600">{l.blurb}</p>
            <p className="mt-1 text-[11px] font-medium text-stone-500">Estimated: 5 mins · Not Started</p>
            <span className="mt-auto pt-2 text-xs font-semibold text-cyan-700">Start Assessment &rarr;</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
