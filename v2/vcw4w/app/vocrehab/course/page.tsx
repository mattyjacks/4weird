import type { Metadata } from "next";
import VocrehabCourseShell from "./course-shell";

export const metadata: Metadata = {
  title: "VocRehab course — four chapters, fourteen lessons | 4weird",
  description:
    "The VocRehab course: Discover, Tell Your Story, Decide With Confidence, Work With Your Counselor. Bite-size lessons ending in a game or rehearsal, XP and badges, no exams.",
  alternates: { canonical: "/vocrehab/course" },
};

export default function VocrehabCoursePage() {
  return (
    <main className="vocrehab-course mx-auto w-full max-w-6xl px-3 py-2">
      <div className="flex h-8 items-center gap-2">
        <h1 className="truncate text-[15px] font-bold tracking-tight text-stone-900 dark:text-stone-50">The course: play your way to work-ready</h1>
        <span className="shrink-0 rounded-full border border-stone-200 bg-white px-2 py-px text-[11px] font-bold text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
          4 chapters · 14 lessons
        </span>
      </div>
      <p className="max-w-3xl text-xs text-stone-700 dark:text-stone-300">
        Four chapters, fourteen bite-size modules. Each one ends in a game, a
        rehearsal, or a decision sketch — plus two reflect questions and XP.
        Guests keep progress on this device; signing in syncs it.
      </p>
      <div className="mt-1.5">
        <VocrehabCourseShell />
      </div>
    </main>
  );
}
