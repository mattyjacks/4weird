import type { Metadata } from "next";
import Link from "next/link";
import VocrehabRoleplayPanel from "@/components/vocrehab/vocrehab-roleplay-panel";

export const metadata: Metadata = {
  title: "Background pivot — VocRehab",
  description:
    "VocRehab background pivot: a short, accountability-forward, growth-framed answer — then rehearse the delivery out loud.",
  alternates: { canonical: "/vocrehab/interview/pivot" },
};

export default function Page() {
  return (
    <main className="vocrehab-interview-pivot mx-auto w-full max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/interview">Interview</Link> → Background pivot
      </nav>
      <h1 className="text-xl font-bold">The background pivot</h1>
      <p className="text-muted-foreground">
        Growth-framed, accountability-forward, short — about 30 to 60 seconds
        spoken. No graphic detail, no legal claims, and it ends on the present:
        your skills, your reliability, your supports. The practice manager asks
        the hard question once, kindly, and never asks for case numbers,
        charges in detail, or court identifiers.
      </p>
      <ol className="list-decimal space-y-2 rounded-xl border p-3 pl-8">
        <li>
          <p className="font-medium">One neutral line about the past.</p>
          <p className="text-sm text-muted-foreground">
            Plain and brief — no detail beyond what a stranger needs.
          </p>
        </li>
        <li>
          <p className="font-medium">What changed.</p>
          <p className="text-sm text-muted-foreground">
            One concrete step: training, steady work, or a support you use.
          </p>
        </li>
        <li>
          <p className="font-medium">What is true now.</p>
          <p className="text-sm text-muted-foreground">
            Reliability, skills, supports — in two sentences, ending forward.
          </p>
        </li>
      </ol>
      <VocrehabRoleplayPanel initialScenario="pivot" />
    </main>
  );
}
