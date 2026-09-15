/**
 * VocRehab Inbox Sprint game page (client composition boundary).
 *
 * Usage: route `app/vocrehab/play/inbox-sprint/page.tsx`. Client component
 * composing the shared `VocrehabGameFrame` with its game via render prop.
 * Practice-first copy and the no-test promise render above the frame.
 * Follow-up for lead: route metadata + canonical until a server layout
 * covers this route (client components cannot export metadata).
 */

"use client";

import Link from "next/link";
import VocrehabGameFrame from "@/components/vocrehab/vocrehab-game-frame";
import VocrehabGameInboxSprint from "@/components/vocrehab/vocrehab-game-inbox-sprint";

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Practice arcade</Link> → Inbox Sprint
      </nav>
      <p className="text-sm text-muted-foreground">
        Start with the untimed practice rep. Flagging the phishing-ish message is praised; opening
        its link is coached, never punished. Practice, not a test — nothing here grades you.
      </p>
      <VocrehabGameFrame
        vocrehabGameId="inbox-sprint"
        vocrehabTitle="Inbox Sprint"
        vocrehabInstructions="Triage 8 mock messages: reply now, schedule, file, or flag. One message needs a short careful reply from a starter sentence."
        vocrehabPracticeSteps={[
          "Read each message and pick reply, schedule, file, or flag.",
          "Flag anything that looks like phishing — flagging is always safe.",
          "Write the one careful reply from the sentence starter.",
        ]}
        vocrehabTimeLimitSec={180}
        vocrehabExitHref="/vocrehab/play"
      >
        {(run) => <VocrehabGameInboxSprint {...run} />}
      </VocrehabGameFrame>
    </main>
  );
}
