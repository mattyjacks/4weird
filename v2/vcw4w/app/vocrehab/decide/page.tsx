import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Decide with supports",
  description: "VocRehab Decide: sketch earnings shifts and rehearse disclosure timing before you decide.",
  alternates: { canonical: "/vocrehab/decide" },
};

export default function VocrehabDecidePage() {
  return (
    <main className="vocrehab-decide mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Decide: sketches, not verdicts</h1>
      <p className="mt-2 text-stone-700 dark:text-stone-300">
        Two practice tools. The SSI slider sketches how earnings could shift a check — teaching math, never a promise. The disclosure
        adventure lets you rehearse timing before you choose anything for real.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/vocrehab/decide/ssi" className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:shadow">
          <h2 className="text-lg font-semibold text-stone-900">SSI sketch slider</h2>
          <p className="mt-1 text-sm text-stone-600">Wage + hours sliders, a gauge, and a dated disclaimer.</p>
        </Link>
        <Link href="/vocrehab/decide/disclosure-paths" className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:shadow">
          <h2 className="text-lg font-semibold text-stone-900">Disclosure paths</h2>
          <p className="mt-1 text-sm text-stone-600">A choose-your-moment adventure with rehearse lines.</p>
        </Link>
      </div>
    </main>
  );
}
