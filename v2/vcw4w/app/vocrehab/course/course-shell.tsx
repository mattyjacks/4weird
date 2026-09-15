"use client";

import Link from "next/link";
import { useState } from "react";
import { vocrehabCourseCatalog } from "./vocrehab-course-catalog";

const CHAPTERS = [
  { id: 1, title: "Discover" },
  { id: 2, title: "Tell Your Story" },
  { id: 3, title: "Decide With Confidence" },
  { id: 4, title: "Work With Your Counselor" },
] as const;

function chapterXp(chapter: number): number {
  return vocrehabCourseCatalog
    .filter((m) => m.vocrehabChapter === chapter)
    .reduce((sum, m) => sum + m.vocrehabXp, 0);
}

export default function VocrehabCourseShell() {
  const [activeChapter, setActiveChapter] = useState<number>(1);
  const [drawerSlug, setDrawerSlug] = useState<string | null>(null);
  const lessons = vocrehabCourseCatalog.filter(
    (m) => m.vocrehabChapter === activeChapter,
  );
  const drawerLesson =
    vocrehabCourseCatalog.find((m) => m.vocrehabSlug === drawerSlug) ?? null;

  return (
    <div className="flex min-h-[60vh] flex-col gap-3 lg:h-[calc(100vh-240px)] lg:flex-row lg:overflow-hidden">
      {/* Left rail (30%): chapter progression tree */}
      <aside
        aria-label="Chapter progression"
        className="w-full shrink-0 overflow-y-auto rounded-xl border border-stone-200 bg-white p-2.5 lg:w-[30%]"
      >
        <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
          Chapters
        </p>
        <ol className="mt-1.5 space-y-1">
          {CHAPTERS.map((c) => {
            const active = c.id === activeChapter;
            const count = vocrehabCourseCatalog.filter(
              (m) => m.vocrehabChapter === c.id,
            ).length;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveChapter(c.id)}
                  aria-current={active ? "true" : undefined}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ${
                    active
                      ? "bg-cyan-50 ring-1 ring-cyan-200"
                      : "hover:bg-stone-50"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                      active
                        ? "border-cyan-600 text-cyan-700"
                        : "border-stone-300 text-stone-400"
                    }`}
                  >
                    {c.id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-stone-900">
                      {c.title}
                    </span>
                    <span className="block text-[11px] text-stone-500">
                      {count} lessons
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">
                    {chapterXp(c.id)} XP
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      {/* Right panel (70%): active chapter lesson matrix, dense 48px rows */}
      <section
        aria-label={`Chapter ${activeChapter} lessons`}
        className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white lg:w-[70%]"
      >
        <div className="shrink-0 border-b border-stone-100 px-3 py-2">
          <h2 className="truncate text-sm font-semibold text-stone-900">
            Chapter {activeChapter} —{" "}
            {CHAPTERS.find((c) => c.id === activeChapter)?.title}
          </h2>
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-stone-100 overflow-y-auto">
          {lessons.map((m) => (
            <li key={m.vocrehabSlug}>
              <div className="flex h-12 items-center gap-2 px-3">
                <button
                  type="button"
                  onClick={() => setDrawerSlug(m.vocrehabSlug)}
                  title={`Preview ${m.vocrehabTitle}`}
                  className="shrink-0 rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 hover:bg-stone-100"
                >
                  {m.vocrehabKind}
                </button>
                <Link
                  href={`/vocrehab/course/${m.vocrehabSlug}`}
                  className="min-w-0 flex-1 truncate text-[13px] font-medium text-stone-900 hover:text-cyan-700 hover:underline"
                >
                  {m.vocrehabTitle}
                </Link>
                <span className="hidden shrink-0 text-[11px] text-stone-500 sm:inline">
                  Badge: {m.vocrehabBadge}
                </span>
                <span className="hidden shrink-0 rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 md:inline">
                  {m.vocrehabXp} XP
                </span>
                <Link
                  href={`/vocrehab/course/${m.vocrehabSlug}`}
                  className="shrink-0 rounded-md bg-cyan-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-cyan-800"
                >
                  Start Lesson →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Quick simulator drawer: preview without leaving the syllabus */}
      {drawerLesson ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={`Preview ${drawerLesson.vocrehabTitle}`}
          className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-stone-200 bg-white shadow-xl"
        >
          <div className="flex items-center gap-2 border-b border-stone-100 px-3 py-2">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-900">
              {drawerLesson.vocrehabTitle}
            </p>
            <button
              type="button"
              onClick={() => setDrawerSlug(null)}
              className="shrink-0 rounded-md border border-stone-200 px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50"
            >
              Close ✕
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
              Chapter {drawerLesson.vocrehabChapter} ·{" "}
              {drawerLesson.vocrehabChapterTitle} · {drawerLesson.vocrehabXp} XP
              · Badge: {drawerLesson.vocrehabBadge}
            </p>
            <p className="mt-1.5 text-[13px] text-stone-600">
              {drawerLesson.vocrehabExplainer}
            </p>
            <p className="mt-2 text-[11px] text-stone-500">
              Simulator: {drawerLesson.vocrehabTryIt.vocrehabLabel}
            </p>
          </div>
          <div className="flex shrink-0 gap-2 border-t border-stone-100 px-3 py-2">
            <Link
              href={drawerLesson.vocrehabTryIt.vocrehabHref}
              className="flex-1 rounded-md border border-emerald-700 px-2 py-1.5 text-center text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              {drawerLesson.vocrehabTryIt.vocrehabLabel} →
            </Link>
            <Link
              href={`/vocrehab/course/${drawerLesson.vocrehabSlug}`}
              className="flex-1 rounded-md bg-cyan-700 px-2 py-1.5 text-center text-xs font-semibold text-white hover:bg-cyan-800"
            >
              Start Lesson →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
