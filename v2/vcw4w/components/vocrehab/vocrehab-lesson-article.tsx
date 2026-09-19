import Link from "next/link";
import type { ReactNode } from "react";
import type { VocrehabCourseModule } from "@/types/vocrehab-course";

/**
 * VocrehabLessonArticle - server-rendered lesson content for
 * /vocrehab/course/[module]. Kicker, H1, explainer, try-it link, and
 * reflect questions render in initial server HTML so crawlers see the
 * full lesson. The Done button stays a client island (see
 * VocrehabDoneButton in vocrehab-course-card.tsx) passed in as children.
 */
export function VocrehabLessonArticle({
  vocrehabModule,
  children,
}: {
  vocrehabModule: VocrehabCourseModule;
  children?: ReactNode;
}) {
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
          There are no wrong answers. Jot your thoughts anywhere you like -
          nothing here is saved or sent unless you choose to share it.
        </p>
      </section>

      {children}
    </div>
  );
}
