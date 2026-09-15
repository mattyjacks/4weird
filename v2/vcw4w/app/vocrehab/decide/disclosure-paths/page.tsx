import type { Metadata } from "next";
import VocrehabDisclosureTree from "@/components/vocrehab/vocrehab-disclosure-tree";

export const metadata: Metadata = {
  title: "Disclosure paths adventure",
  description: "VocRehab Decide: rehearse when and how to share access needs at work. Your choice, your pace.",
  alternates: { canonical: "/vocrehab/decide/disclosure-paths" },
};

export default function VocrehabDisclosurePathsPage() {
  return (
    <main className="vocrehab-disclosure-page mx-auto w-full max-w-3xl px-4 py-4">
      <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Sharing at work: rehearse first</h1>
      <p className="mt-2 text-stone-700 dark:text-stone-300">
        Sharing disability information is your choice — including the choice not to. Walk each timing branch, try the script starters out
        loud, and bring the branch that felt right to your counselor.
      </p>
      <div className="mt-3">
        <VocrehabDisclosureTree />
      </div>
    </main>
  );
}
