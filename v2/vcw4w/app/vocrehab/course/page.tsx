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
    <main className="vocrehab-course mx-auto w-full max-w-6xl px-3 py-3">
      <h1 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">The course: play your way to work-ready</h1>
      <p className="mt-0.5 max-w-2xl text-[13px] text-stone-700 dark:text-stone-300">
        Four chapters, fourteen bite-size modules. Each one ends in a game, a
        rehearsal, or a decision sketch — plus two reflect questions and XP.
        Guests keep progress on this device; signing in syncs it.
      </p>
      <div className="mt-2">
        <VocrehabCourseShell />
      </div>
    </main>
  );
}
