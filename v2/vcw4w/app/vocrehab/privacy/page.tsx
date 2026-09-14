import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "VocRehab privacy — your data, your call | 4weird",
  description:
    "How VocRehab handles your data: consent-gated everything, own-data-only storage, one-tap export, no silent recording, and deletion through your account rights.",
  alternates: { canonical: "/vocrehab/privacy" },
};

export default function VocrehabPrivacyPage() {
  return (
    <main className="vocrehab-privacy mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Privacy: your data, your call</h1>
      <div className="mt-4 space-y-4 text-stone-700 dark:text-stone-300">
        <p>
          Guests play everything with zero database writes — progress lives on
          your device only. Signed-in saves happen only when you tap save,
          send-to-profile, or export.
        </p>
        <p>
          Roleplay rehearsals are ephemeral by default and persist only on
          explicit save. Counselor sessions need per-session consent, are
          redacted before drafting, and every draft needs approval before it
          counts. Nothing auto-records, auto-files, or auto-sends.
        </p>
        <p>
          You only ever see your own rows. Download everything anytime at{" "}
          <Link href="/vocrehab/export" className="font-medium text-emerald-700 underline">
            your export page
          </Link>
          , and delete through your existing account data-rights surface —
          VocRehab tables clear with your account.
        </p>
        <p>
          VocRehab never asks for Social Security numbers, claim numbers, or
          birth dates. If you paste something sensitive, you get a warning and
          a one-tap redact pass first.
        </p>
      </div>
    </main>
  );
}
