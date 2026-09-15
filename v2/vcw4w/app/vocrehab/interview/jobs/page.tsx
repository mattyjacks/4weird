import type { Metadata } from "next";
import Link from "next/link";
import { vocrehabInterviewJobs } from "@/lib/vocrehab-interview-jobs";
import VocrehabJobCard from "@/components/vocrehab/vocrehab-job-card";

export const metadata: Metadata = {
  title: "Job interview sim — VocRehab",
  description:
    "VocRehab live interview sim: 20 real jobs × 3 difficulties. Turn-based or live voice, typing always free, nothing saved unless you tap Save.",
  alternates: { canonical: "/vocrehab/interview/jobs" },
};

export default function Page() {
  return (
    <main className="vocrehab-interview-jobs mx-auto w-full max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/interview">Interview</Link> → Jobs
      </nav>
      <h1 className="text-xl font-bold">Pick a job to rehearse</h1>
      <p className="text-muted-foreground">
        20 real jobs, one shared question frame, role-tailored final question plus
        follow-ups and a curveball. Beginner is always open; Advanced unlocks after
        a Beginner pass, Expert after an Advanced pass — retries unlimited.
      </p>
      <ul className="grid gap-2">
        {vocrehabInterviewJobs.map((job) => (
          <li key={job.id}>
            <VocrehabJobCard job={job} />
          </li>
        ))}
      </ul>
    </main>
  );
}
