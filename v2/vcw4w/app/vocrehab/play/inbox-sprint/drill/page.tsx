/**
 * VocRehab inbox-sprint phishing drill page (server component, envelope DS-BUILD2-01).
 *
 * Usage: route `app/vocrehab/play/inbox-sprint/drill/page.tsx`. Server-only:
 * metadata plus canonical, practice-first copy, and the no-test promise;
 * renders the client island `./drill-client` which owns all hook logic and
 * the shared `VocrehabGameFrame` wiring (read-only — owned by C4) via render
 * prop. The C4 inbox-sprint component and its page are never imported or
 * edited here.
 */

import type { Metadata } from "next";
import Link from "next/link";
import DrillClient from "./drill-client";

export const metadata: Metadata = {
  title: "Inbox Phishing Drill — VocRehab Work & Life Practice Games",
  description:
    "Practice 12 mock inbox messages: spot phishing vs legit, then pick the safe action. Flagging is praised, clicking is coached — practice, not a test.",
  alternates: { canonical: "/vocrehab/play/inbox-sprint/drill" },
};

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> →{" "}
        <Link href="/vocrehab/play/inbox-sprint">Inbox Sprint</Link> → Phishing drill
      </nav>
      <p className="text-sm text-muted-foreground">
        A 12-message phishing expansion for Inbox Sprint. Spotting the phish is praised; engaging
        it is coached, never punished. Practice, not a test.
      </p>
      <DrillClient />
    </main>
  );
}
