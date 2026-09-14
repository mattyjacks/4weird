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
 * VocrehabCourseCard — one chapter/module card with XP + Done state.
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
 * VocrehabLessonPlayer — lesson player for /vocrehab/course/[module].
 * Renders the explainer, the try-it link, two reflect questions, and a
 * Done button that writes `vocrehab-course-progress-v1` and emits
 * `vocrehab:course:module-done` on the interop bus.
 */
export function VocrehabLessonPlayer({
  vocrehabModule,
}: {
  vocrehabModule: VocrehabCourseModule;
}) {
  const [vocrehabDone, setVocrehabDone] = useState(
    () =>
      typeof window !== "undefined" &&
      vocrehabReadDoneSlugs().includes(vocrehabModule.vocrehabSlug),
  );

  function vocrehabMarkDone() {
    const vocrehabDoneSlugs = vocrehabReadDoneSlugs();
    if (!vocrehabDoneSlugs.includes(vocrehabModule.vocrehabSlug)) {
      vocrehabDoneSlugs.push(vocrehabModule.vocrehabSlug);
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
        detail: { vocrehabSlug: vocrehabModule.vocrehabSlug },
      }),
    );
  }

  return (
    <div className="vocrehab-lesson">
      <p className="vocrehab-lesson-kicker text-sm text-stone-500">
        Chapter {vocrehabModule.vocrehabChapter} ·{" "}
        {vocrehabModule.vocrehabChapterTitle} · {vocrehabModule.vocrehabXp} XP ·
        Badge: {vocrehabModule.vocrehabBadge}
      </p>
      <h1 className="vocrehab-lesson-title mt-1 text-2xl font-bold text-cyan-700">{vocrehabModule.vocrehabTitle}</h1>
      <p className="vocrehab-lesson-explainer mt-2 text-stone-600">
        {vocrehabModule.vocrehabExplainer}
      </p>

      <section aria-label="Try it" className="vocrehab-lesson-tryit mt-6">
        <h2 className="vocrehab-lesson-heading text-lg font-semibold text-stone-900">Try it</h2>
        <Link
          href={vocrehabModule.vocrehabTryIt.vocrehabHref}
          className="vocrehab-lesson-tryit-link mt-1 inline-block font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
        >
          {vocrehabModule.vocrehabTryIt.vocrehabLabel} &rarr;
        </Link>
      </section>

      <section aria-label="Reflect" className="vocrehab-lesson-reflect mt-6">
        <h2 className="vocrehab-lesson-heading text-lg font-semibold text-stone-900">Reflect</h2>
        <ol className="vocrehab-lesson-questions mt-2 list-decimal space-y-1 pl-5 text-stone-600">
          {vocrehabModule.vocrehabReflect.map((vocrehabQuestion) => (
            <li key={vocrehabQuestion}>{vocrehabQuestion}</li>
          ))}
        </ol>
        <p className="vocrehab-lesson-note mt-3 text-sm text-stone-600">
          There are no wrong answers. Jot your thoughts anywhere you like —
          nothing here is saved or sent unless you choose to share it.
        </p>
      </section>

      <button
        type="button"
        onClick={vocrehabMarkDone}
        disabled={vocrehabDone}
        aria-pressed={vocrehabDone}
        className="vocrehab-lesson-done mt-6 rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {vocrehabDone ? "Done ✓ — nice work" : "Mark lesson done"}
      </button>
      {vocrehabDone ? (
        <p className="vocrehab-lesson-saved mt-2 text-sm text-stone-600" role="status">
          Saved on this device. Sign in to sync it to your account.
        </p>
      ) : null}
    </div>
  );
}
