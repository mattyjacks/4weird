import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VocrehabLessonPlayer } from "@/components/vocrehab/vocrehab-course-card";
import {
  vocrehabCatalogSlugs,
  vocrehabFindCatalogModule,
} from "../vocrehab-course-catalog";

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
  return (
    <main className="vocrehab-module mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/vocrehab/course" className="text-sm font-medium text-emerald-700 underline">
        &larr; All lessons
      </Link>
      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        <VocrehabLessonPlayer vocrehabModule={vocrehabModule} />
      </div>
    </main>
  );
}
