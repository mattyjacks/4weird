import type { Metadata } from "next";
import Link from "next/link";
import VocrehabShell from "@/components/vocrehab/vocrehab-shell";

export const metadata: Metadata = {
  title: "VocRehab — Learn Work Skills by Playing | 4weird",
  description:
    "No forms that feel like tests, no scripts you read alone. VocRehab is a playable course: micro-games, AI rehearsal, visual benefits maps, and consent-gated session help.",
  alternates: { canonical: "/vocrehab" },
};

const VOCREHAB_SUITES = [
  { href: "/vocrehab/interview", title: "Interview", blurb: "Rehearse out loud with a practice partner, then keep your script." },
  { href: "/vocrehab/pro", title: "For counselors", blurb: "Paste notes once, review four drafts. Nothing files itself." },
  { href: "/vocrehab/play", title: "Arcade", blurb: "All five micro-games in one place. Practice free, save when you choose." },
  { href: "/docs/vocrehab", title: "Guides", blurb: "Getting started, counselor notes, privacy, and the SSI math explainer." },
] as const;

export default function VocrehabHubPage() {
  return (
    <main className="vocrehab-hub">
      <VocrehabShell />
      <section aria-label="More suites" className="mx-auto w-full max-w-6xl px-3 pb-4">
        <div className="mt-2 flex h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 shadow-sm">
          <p className="shrink-0 text-[13px] font-bold text-stone-900">Your progress</p>
          <div
            className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            aria-label="Course progress"
          >
            <div className="h-full w-0 rounded-full bg-emerald-500" />
          </div>
          <p className="shrink-0 text-xs font-semibold text-stone-600">0 XP · 0/4 lessons done</p>
          <details className="relative shrink-0">
            <summary className="cursor-pointer list-none rounded-full border border-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-600 hover:bg-stone-50 [&::-webkit-details-marker]:hidden">
              ♿ Access
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-56 rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-600 shadow-lg">
              Text size, contrast, voice, and motion follow your device settings. Full how-tos in{" "}
              <Link href="/docs/vocrehab" className="font-semibold text-cyan-700 underline">
                Guides
              </Link>
              .
            </div>
          </details>
        </div>
        <div className="mt-2 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {VOCREHAB_SUITES.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm hover:shadow"
            >
              <h2 className="text-[15px] font-semibold text-stone-900">{s.title}</h2>
              <p className="mt-0.5 text-[13px] text-stone-600">{s.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
