import type { Metadata } from "next";
import VocrehabSsiSlider from "@/components/vocrehab/vocrehab-ssi-slider";

export const metadata: Metadata = {
  title: "SSI sketch slider",
  description: "VocRehab Decide: sketch how earnings could shift an SSI check. Teaching math only, never a determination.",
  alternates: { canonical: "/vocrehab/decide/ssi" },
};

export default function VocrehabSsiPage() {
  return (
    <main className="vocrehab-ssi-page mx-auto w-full max-w-3xl px-4 py-4">
      <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">What could work do to my check?</h1>
      <p className="mt-2 text-stone-700 dark:text-stone-300">
        Move the sliders to sketch it out. This is teaching math based on long-standing exclusion rules — your real determination comes
        from SSA, and your counselor or WIPA can walk your exact situation with you.
      </p>
      <div className="mt-3">
        <VocrehabSsiSlider />
      </div>
    </main>
  );
}
