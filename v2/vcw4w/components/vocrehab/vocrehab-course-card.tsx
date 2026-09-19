"use client";

import Link from "next/link";
import { useState } from "react";
/** Storage key lives in the caller (per lib/vocrehab-course header), not the lib. */
export const vocrehabCourseStorageKey = "vocrehab-course-progress-v1";
import type { VocrehabCourseModule } from "@/types/vocrehab-course";

function vocrehabReadDoneSlugs(): string[] {
  try {
    const vocrehabRaw = window.localStorage.getItem(vocrehabCourseStorageKey);
    if (!vocrehabRaw) return [];
    const vocrehabParsed: unknown = JSON.parse(vocrehabRaw);
    if (
      typeof vocrehabParsed === "object" &&
      vocrehabParsed !== null &&
      "vocrehabDone" in vocrehabParsed &&
      Array.isArray(
        (vocrehabParsed as { vocrehabDone: unknown }).vocrehabDone,
      )
    ) {
      return (vocrehabParsed as { vocrehabDone: unknown[] }).vocrehabDone.filter(
        (vocrehabSlug): vocrehabSlug is string =>
          typeof vocrehabSlug === "string",
      );
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * VocrehabCourseCard - one chapter/module card with XP + Done state.
 * Done state is read from `vocrehab-course-progress-v1` in an effect
 * (guest-local, zero DB writes) so this card stays SSR-safe.
 */
export function VocrehabCourseCard({
  vocrehabModule,
}: {
  vocrehabModule: VocrehabCourseModule;
}) {
  const [vocrehabDone] = useState(
    () =>
      typeof window !== "undefined" &&
      vocrehabReadDoneSlugs().includes(vocrehabModule.vocrehabSlug),
  );

  return (
    <Link
      href={`/vocrehab/course/${vocrehabModule.vocrehabSlug}`}
      className="vocrehab-course-card block rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:shadow"
      aria-label={`${vocrehabModule.vocrehabTitle}${vocrehabDone ? " (completed)" : ""}`}
    >
      <p className="vocrehab-course-card-kicker text-xs font-medium uppercase tracking-wide text-stone-500">
        Chapter {vocrehabModule.vocrehabChapter} ·{" "}
        {vocrehabModule.vocrehabChapterTitle}
      </p>
      <h3 className="vocrehab-course-card-title mt-1 text-lg font-semibold text-cyan-700">
        {vocrehabModule.vocrehabTitle}
      </h3>
      <p className="vocrehab-course-card-meta mt-1 text-sm text-stone-600">
        <span>{vocrehabModule.vocrehabXp} XP</span>
        <span aria-hidden="true"> · </span>
        <span>Badge: {vocrehabModule.vocrehabBadge}</span>
        {vocrehabDone ? (
          <>
            <span aria-hidden="true"> · </span>
            <span className="vocrehab-course-card-done font-semibold text-emerald-700">Done ✓</span>
          </>
        ) : null}
      </p>
    </Link>
  );
}

/**
 * VocrehabDoneButton - client island for /vocrehab/course/[module].
 * Writes `vocrehab-course-progress-v1` and emits
 * `vocrehab:course:module-done` on the interop bus. Rendered inside the
 * server-rendered VocrehabLessonArticle so the lesson H1/explainer/try-it/
 * reflect markup stays in initial server HTML.
 */
export function VocrehabDoneButton({
  vocrehabSlug,
}: {
  vocrehabSlug: string;
}) {
  const [vocrehabDone, setVocrehabDone] = useState(
    () =>
      typeof window !== "undefined" &&
      vocrehabReadDoneSlugs().includes(vocrehabSlug),
  );

  function vocrehabMarkDone() {
    const vocrehabDoneSlugs = vocrehabReadDoneSlugs();
    if (!vocrehabDoneSlugs.includes(vocrehabSlug)) {
      vocrehabDoneSlugs.push(vocrehabSlug);
    }
    try {
      window.localStorage.setItem(
        vocrehabCourseStorageKey,
        JSON.stringify({
          vocrehabDone: vocrehabDoneSlugs,
          vocrehabUpdatedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Guest storage full or unavailable: still show Done locally.
    }
    setVocrehabDone(true);
    window.dispatchEvent(
      new CustomEvent("vocrehab:course:module-done", {
        detail: { vocrehabSlug },
      }),
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={vocrehabMarkDone}
        disabled={vocrehabDone}
        aria-pressed={vocrehabDone}
        className="vocrehab-lesson-done mt-6 rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {vocrehabDone ? "Done ✓ - nice work" : "Mark lesson done"}
      </button>
      {vocrehabDone ? (
        <p className="vocrehab-lesson-saved mt-2 text-sm text-stone-600" role="status">
          Saved on this device. Sign in to sync it to your account.
        </p>
      ) : null}
    </>
  );
}
