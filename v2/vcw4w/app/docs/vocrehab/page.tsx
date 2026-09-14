import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "VocRehab guides",
  description:
    "Plain-language VocRehab guides: getting started, counselor workflow, privacy and safety, and the 2026 SSI math explainer.",
  alternates: { canonical: "/docs/vocrehab" },
};

// /docs/vocrehab — guides hub (server, plain language).
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">VocRehab guides</h1>
      <p className="text-sm text-muted-foreground">
        Plain-language guides to practicing work skills, sketching SSI math, and working with a
        counselor. VocRehab is practice and preparation — never an eligibility decision.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <Link
            href="/docs/vocrehab/getting-started"
            className="block rounded-xl border border-white/15 p-5 hover:bg-white/5"
          >
            <span className="font-bold">Getting started</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              The short tour: courses, games, rehearsals, and the decide tools.
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/docs/vocrehab/counselors"
            className="block rounded-xl border border-white/15 p-5 hover:bg-white/5"
          >
            <span className="font-bold">For counselors</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              The approval workflow, and why nothing auto-files or auto-sends.
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/docs/vocrehab/privacy-safety"
            className="block rounded-xl border border-white/15 p-5 hover:bg-white/5"
          >
            <span className="font-bold">Privacy and safety</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Consent first, redaction by default, your export and deletion rights.
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/docs/vocrehab/ssi-math"
            className="block rounded-xl border border-white/15 p-5 hover:bg-white/5"
          >
            <span className="font-bold">SSI math, dated 2026</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              How the sketch works, what it leaves out, and why it is not advice.
            </span>
          </Link>
        </li>
      </ul>
    </main>
  );
}
