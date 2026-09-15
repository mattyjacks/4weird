import type { Metadata } from "next";
import Link from "next/link";
import VocrehabRoleplayPanel from "@/components/vocrehab/vocrehab-roleplay-panel";

export const metadata: Metadata = {
  title: "Disclosure + accommodation — VocRehab",
  description:
    "VocRehab disclosure builder: your script, your call — practice the accommodation ask. Not disclosing now is always valid.",
  alternates: { canonical: "/vocrehab/interview/disclosure" },
};

export default function Page() {
  return (
    <main className="vocrehab-interview-disclosure mx-auto w-full max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/interview">Interview</Link> → Disclosure
      </nav>
      <h1 className="text-xl font-bold">Disclosure + accommodation ask</h1>
      <p className="text-muted-foreground">
        You own every word. A strong ask has four lines: two sentences of
        disclosure, one sentence requesting the accommodation, one sentence on
        how it helps you do the role well. Share only what you are comfortable
        sharing.
      </p>
      <p className="rounded-xl border p-3 text-sm">
        <strong>Not disclosing right now is completely valid too.</strong> A
        ready closing line: “I will follow up if a need arises.” Nobody here
        will ever pressure you to disclose.
      </p>
      <VocrehabRoleplayPanel initialScenario="disclosure" />
      <p className="text-sm text-muted-foreground">
        Timing first? Walk the{" "}
        <Link
          href="/vocrehab/decide/disclosure-paths"
          className="underline"
        >
          disclosure decision map
        </Link>{" "}
        before you word the script.
      </p>
    </main>
  );
}
