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
  { href: "/vocrehab/play", title: "Work & Life Practice Games", blurb: "Eleven work and life practice games. Play free, save when you choose." },
  { href: "/docs/vocrehab", title: "Guides", blurb: "Getting started, counselor notes, privacy, and the SSI math explainer." },
] as const;

const QUICK_PLAY_GAMES = [
  { href: "/vocrehab/play/file-sort", title: "File Sort", glyph: "🗂️" },
  { href: "/vocrehab/play/inbox-sprint", title: "Inbox Sprint", glyph: "📥" },
  { href: "/vocrehab/play/focus-shift", title: "Focus Shift", glyph: "🎯" },
  { href: "/vocrehab/play/barrier-run", title: "Barrier Run", glyph: "🧭" },
  { href: "/vocrehab/play/schedule-juggle", title: "Schedule Juggle", glyph: "🗓️" },
  { href: "/vocrehab/play/phone-greeting", title: "Front-Desk Hello", glyph: "☎️" },
  { href: "/vocrehab/play/time-punch", title: "Shift Punch", glyph: "⏱️" },
  { href: "/vocrehab/play/tool-match", title: "Tool Crib", glyph: "🧰" },
  { href: "/vocrehab/play/paycheck-plan", title: "Paycheck Planner", glyph: "💵" },
  { href: "/vocrehab/play/energy-budget", title: "Energy Budget", glyph: "🔋" },
  { href: "/vocrehab/play/resume-rescue", title: "Resume Rescue", glyph: "📝" },
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
        <section aria-label="Quick Play" className="mt-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h2 className="text-[15px] font-semibold text-stone-900">Quick Play</h2>
            <p className="text-[13px] text-stone-600">Jump straight into a Work &amp; Life Practice Game.</p>
            <Link href="/vocrehab/play" className="ml-auto text-[13px] font-semibold text-cyan-700 underline">
              All games →
            </Link>
          </div>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_PLAY_GAMES.map((g) => (
              <li key={g.href}>
                <Link
                  href={g.href}
                  className="flex items-center gap-2 rounded-lg border border-stone-200 px-2.5 py-2 hover:bg-stone-50 hover:shadow"
                >
                  <span aria-hidden="true" className="text-lg leading-none">{g.glyph}</span>
                  <span className="text-[13px] font-semibold text-stone-900">{g.title}</span>
                  <span aria-hidden="true" className="ml-auto text-stone-400">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
