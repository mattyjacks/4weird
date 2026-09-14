/**
 * VocRehab hub shell (C6 snapshot).
 *
 * Usage:
 *   import VocrehabShell from "@/components/vocrehab/vocrehab-shell";
 *   <VocrehabShell />
 *
 * Renders the hub hero one-liner, 4 suite cards (Discover / Decide /
 * Course / Export), a progress rail (Suspense; reads localStorage
 * `vocrehab-course-progress-v1` on the client, fail-open to 0 XP), and a
 * trust strip. Styling: Tailwind utilities + `vocrehab-*` hooks only.
 */

"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { vocrehabCourseOutline } from "@/lib/vocrehab-course";
import { vocrehabCourseStorageKey } from "./vocrehab-course-card";

const SUITES = [
  { href: "/vocrehab/discover", title: "Discover", blurb: "Play short work scenarios; your play becomes your profile." },
  { href: "/vocrehab/decide", title: "Decide", blurb: "Sketch earnings shifts and rehearse disclosure timing." },
  { href: "/vocrehab/course", title: "Course", blurb: "Bite-size lessons with XP and badges, no exam energy." },
  { href: "/vocrehab/export", title: "Export", blurb: "Download your own data as JSON or CSV, anytime." },
] as const;

function vocrehabReadProgress(): { vocrehabXp: number; vocrehabDone: number } {
  try {
    const raw = window.localStorage.getItem(vocrehabCourseStorageKey);
    if (!raw) return { vocrehabXp: 0, vocrehabDone: 0 };
    const parsed = JSON.parse(raw) as { vocrehabXp?: unknown; vocrehabDone?: unknown };
    return {
      vocrehabXp:
        typeof parsed.vocrehabXp === "number" && Number.isFinite(parsed.vocrehabXp)
          ? Math.max(0, Math.round(parsed.vocrehabXp))
          : 0,
      vocrehabDone: Array.isArray(parsed.vocrehabDone) ? parsed.vocrehabDone.length : 0,
    };
  } catch {
    // Fail-open: rail shows 0 XP when storage is missing or unparsable.
    return { vocrehabXp: 0, vocrehabDone: 0 };
  }
}

function VocrehabProgressRailInner() {
  const [vocrehabProgress] = useState(() =>
    typeof window === "undefined"
      ? { vocrehabXp: 0, vocrehabDone: 0 }
      : vocrehabReadProgress(),
  );
  const xp = vocrehabProgress.vocrehabXp;
  const done = vocrehabProgress.vocrehabDone;
  const total = vocrehabCourseOutline.length;
  return (
    <div className="vocrehab-progress-rail rounded-xl border border-stone-200 bg-white p-4" role="status" aria-label="Course progress">
      <p className="text-sm font-semibold text-stone-900">
        {xp} XP · {done}/{total} lessons done
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label="Lessons completed">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0}%` }} />
      </div>
      <Link href="/vocrehab/course" className="mt-2 inline-block text-sm font-medium text-emerald-700 underline">
        Continue the course
      </Link>
    </div>
  );
}

export default function VocrehabShell() {
  return (
    <div className="vocrehab-shell mx-auto w-full max-w-5xl px-4 py-8">
      <p className="vocrehab-hero text-2xl font-bold text-stone-900 dark:text-stone-50">
        Figure out work at your pace — play first, decide with supports, keep your data.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {SUITES.map((s) => (
          <Link key={s.href} href={s.href} className="vocrehab-suite-card rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:shadow">
            <h2 className="text-lg font-semibold text-stone-900">{s.title}</h2>
            <p className="mt-1 text-sm text-stone-600">{s.blurb}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6">
        <Suspense fallback={<div className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-500">Loading progress…</div>}>
          <VocrehabProgressRailInner />
        </Suspense>
      </div>
      <p className="vocrehab-trust mt-6 text-xs text-stone-500 dark:text-stone-400">
        Teaching sketches only — never a benefits promise or a label. Your runs save only when you ask, and your export is yours to take.
      </p>
    </div>
  );
}
