import type { Metadata } from "next";
import Link from "next/link";
import VocrehabExportButton from "@/components/vocrehab/vocrehab-export-button";

export const metadata: Metadata = {
  title: "Export your data",
  description: "VocRehab export: download your own allowlisted data as JSON or CSV. Your file, your rights.",
  alternates: { canonical: "/vocrehab/export" },
};

export default function VocrehabExportPage() {
  return (
    <main className="vocrehab-export-page mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Your data, to take with you</h1>
      <p className="mt-2 text-stone-700 dark:text-stone-300">
        Download your own VocRehab rows — progress, runs, assessments, and drafts — as JSON or CSV. Only allowlisted tables leave the
        module, spreadsheet-risky cells are guarded, and every download is logged to your own history.
      </p>
      <div className="mt-6">
        <VocrehabExportButton />
      </div>
      <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">
        Know your rights: <Link href="/vocrehab/privacy" className="font-medium text-emerald-700 underline dark:text-emerald-400">consent, retention, and deletion</Link>.
      </p>
    </main>
  );
}
