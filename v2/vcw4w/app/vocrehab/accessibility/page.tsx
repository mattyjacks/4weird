import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VocRehab accessibility — the product, not a setting | 4weird",
  description:
    "VocRehab accessibility: keyboard-complete games, screen-reader live regions, voice input everywhere, high contrast, reduced motion, and extra time with zero penalty.",
  alternates: { canonical: "/vocrehab/accessibility" },
};

const VOCREHAB_A11Y_ROWS = [
  { title: "Keyboard", body: "Every game, slider, adventure node, roleplay composer, and review button works with keyboard alone. Visible focus everywhere." },
  { title: "Screen readers", body: "Live regions announce game results, gauge changes, roleplay replies, and draft arrivals. Nothing is color-, motion-, or icon-only." },
  { title: "Voice", body: "Dictate anywhere text is accepted; spoken output is an opt-in toggle. Voice is an accelerator, never a gate — the text box always stays." },
  { title: "Contrast", body: "High-contrast mode targets 7:1 body text. Gauges and game states always pair color with a label and a pattern." },
  { title: "Motion", body: "Reduced-motion is honored throughout: no autoplay, no shake or flash, nothing flashing above 3Hz ever." },
  { title: "Timing", body: "Every timed game offers untimed practice, one-tap extra time (+60s, zero penalty to your supports), pause, and exit with progress kept." },
  { title: "Language", body: "Plain language throughout, jargon explained inline, no timed reading gates." },
] as const;

export default function VocrehabAccessibilityPage() {
  return (
    <main className="vocrehab-accessibility mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Accessibility is the product</h1>
      <p className="mt-2 text-stone-700 dark:text-stone-300">
        The toolbar pinned above every VocRehab page controls text size,
        contrast, voice, motion, and keyboard hints — applied to this module
        only, remembered on your device only.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {VOCREHAB_A11Y_ROWS.map((r) => (
          <section key={r.title} aria-label={r.title} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900">{r.title}</h2>
            <p className="mt-1 text-sm text-stone-600">{r.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
