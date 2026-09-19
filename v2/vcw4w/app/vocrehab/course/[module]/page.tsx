import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VocrehabDoneButton } from "@/components/vocrehab/vocrehab-course-card";
import { VocrehabLessonArticle } from "@/components/vocrehab/vocrehab-lesson-article";
import {
  vocrehabCatalogSlugs,
  vocrehabFindCatalogModule,
} from "../vocrehab-course-catalog";
import { GROUP_A_OVERVIEWS } from "../course-overviews/group-a";
import { GROUP_B_OVERVIEWS } from "../course-overviews/group-b";
import { GROUP_C_OVERVIEWS } from "../course-overviews/group-c";
import type { CourseOverview } from "../course-overviews/overview";
import { faqJsonLd, jsonLdScript } from "@/lib/seo";

export function generateStaticParams() {
  return vocrehabCatalogSlugs().map((vocrehabSlug) => ({ module: vocrehabSlug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ module: string }>;
}): Promise<Metadata> {
  const { module } = await params;
  const vocrehabModule = vocrehabFindCatalogModule(module);
  if (!vocrehabModule) return { title: "Lesson not found | VocRehab" };
  return {
    title: `${vocrehabModule.vocrehabTitle} | VocRehab course`,
    description: vocrehabModule.vocrehabExplainer,
    alternates: { canonical: `/vocrehab/course/${vocrehabModule.vocrehabSlug}` },
  };
}

export default async function VocrehabModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const vocrehabModule = vocrehabFindCatalogModule(module);
  if (!vocrehabModule) notFound();
  // Static overview prose (SEO differentiation layer). Server-rendered so the
  // H1, explainer, and lesson context are all in the initial HTML.
  const overview: CourseOverview | undefined = [
    ...GROUP_A_OVERVIEWS,
    ...GROUP_B_OVERVIEWS,
    ...GROUP_C_OVERVIEWS,
  ].find((entry) => entry.slug === vocrehabModule.vocrehabSlug);
  return (
    <main className="vocrehab-module mx-auto w-full max-w-3xl px-4 py-4">
      {overview && overview.faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(
              faqJsonLd(
                overview.faq.map((entry) => [entry.q, entry.a] as [string, string]),
              ),
            ),
          }}
        />
      )}
      <Link href="/vocrehab/course" className="text-sm font-medium text-emerald-700 underline dark:text-emerald-400">
        &larr; All lessons
      </Link>
      <div className="mt-3 rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm sm:p-4">
        <VocrehabLessonArticle vocrehabModule={vocrehabModule}>
          <VocrehabDoneButton vocrehabSlug={vocrehabModule.vocrehabSlug} />
        </VocrehabLessonArticle>
      </div>
      {overview && (
        <section aria-label="About this lesson" className="mt-4 rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm sm:p-4">
          <h2 className="text-lg font-semibold text-stone-900">What this lesson covers</h2>
          {overview.overview.map((paragraph, index) => (
            <p key={index} className="mt-2 text-stone-600">
              {paragraph}
            </p>
          ))}
          {overview.steps.length > 0 && (
            <>
              <h3 className="mt-4 text-base font-semibold text-stone-900">Work through it step by step</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-stone-600">
                {overview.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </>
          )}
          {overview.faq.length > 0 && (
            <>
              <h3 className="mt-4 text-base font-semibold text-stone-900">Lesson questions</h3>
              <div className="mt-2 space-y-2">
                {overview.faq.map((entry) => (
                  <details key={entry.q} className="rounded-lg border border-stone-200 p-3">
                    <summary className="cursor-pointer font-medium text-stone-900">{entry.q}</summary>
                    <p className="mt-1 text-sm text-stone-600">{entry.a}</p>
                  </details>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
