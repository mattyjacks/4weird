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
    <main className="vocrehab-discover mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Discover: no tests that feel like tests</h1>
      <p className="mt-2 text-stone-700 dark:text-stone-300">
        You play short work scenarios instead of filling long forms. What you do in the game becomes your profile — strengths first, never labels.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:shadow">
            <h2 className="text-lg font-semibold text-stone-900">{l.title}</h2>
            <p className="mt-1 text-sm text-stone-600">{l.blurb}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
