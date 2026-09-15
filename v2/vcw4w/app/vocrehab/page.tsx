import type { Metadata } from "next";
import Link from "next/link";
import VocrehabShell from "@/components/vocrehab/vocrehab-shell";

export const metadata: Metadata = {
  title: "VocRehab — Learn Work Skills by Playing | 4weird",
  description:
    "No forms that feel like tests, no scripts you read alone. VocRehab is a playable course: micro-games, AI rehearsal, visual benefits maps, and consent-gated session help.",
  alternates: { canonical: "/vocrehab" },
};

const VOCREHAB_SUITES = [
  { href: "/vocrehab/interview", title: "Interview", blurb: "Rehearse out loud with a practice partner, then keep your script." },
  { href: "/vocrehab/pro", title: "For counselors", blurb: "Paste notes once, review four drafts. Nothing files itself." },
  { href: "/vocrehab/play", title: "Arcade", blurb: "All five micro-games in one place. Practice free, save when you choose." },
  { href: "/docs/vocrehab", title: "Guides", blurb: "Getting started, counselor notes, privacy, and the SSI math explainer." },
] as const;

export default function VocrehabHubPage() {
  return (
    <main className="vocrehab-hub">
      <VocrehabShell />
      <section aria-label="More suites" className="mx-auto w-full max-w-5xl px-4 pb-6">
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {VOCREHAB_SUITES.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:shadow"
            >
              <h2 className="text-lg font-semibold text-stone-900">{s.title}</h2>
              <p className="mt-1 text-sm text-stone-600">{s.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
