import type { Metadata } from "next";
import { VocrehabCourseCard } from "@/components/vocrehab/vocrehab-course-card";
import { vocrehabCourseCatalog } from "./vocrehab-course-catalog";

export const metadata: Metadata = {
  title: "VocRehab course — four chapters, fourteen lessons | 4weird",
  description:
    "The VocRehab course: Discover, Tell Your Story, Decide With Confidence, Work With Your Counselor. Bite-size lessons ending in a game or rehearsal, XP and badges, no exams.",
  alternates: { canonical: "/vocrehab/course" },
};

const VOCREHAB_CHAPTERS = [
  { vocrehabChapter: 1, vocrehabTitle: "Discover" },
  { vocrehabChapter: 2, vocrehabTitle: "Tell Your Story" },
  { vocrehabChapter: 3, vocrehabTitle: "Decide With Confidence" },
  { vocrehabChapter: 4, vocrehabTitle: "Work With Your Counselor" },
] as const;

export default function VocrehabCoursePage() {
  return (
    <main className="vocrehab-course mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">The course: play your way to work-ready</h1>
      <p className="mt-2 max-w-2xl text-stone-700 dark:text-stone-300">
        Four chapters, fourteen bite-size modules. Each one ends in a game, a
        rehearsal, or a decision sketch — plus two reflect questions and XP.
        Guests keep progress on this device; signing in syncs it.
      </p>
      {VOCREHAB_CHAPTERS.map((c) => (
        <section key={c.vocrehabChapter} aria-label={`Chapter ${c.vocrehabChapter}: ${c.vocrehabTitle}`} className="mt-8">
          <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50">
            Chapter {c.vocrehabChapter} — {c.vocrehabTitle}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {vocrehabCourseCatalog
              .filter((m) => m.vocrehabChapter === c.vocrehabChapter)
              .map((m) => (
                <VocrehabCourseCard key={m.vocrehabSlug} vocrehabModule={m} />
              ))}
          </div>
        </section>
      ))}
    </main>
  );
}
