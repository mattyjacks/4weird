import Link from "next/link";
import type { VocrehabInterviewJobContent } from "@/lib/vocrehab-interview-jobs";

/**
 * VocrehabJobCard — picker card for one of the 20 interview-sim jobs.
 * Static link only: the live room lives at /vocrehab/interview/jobs/[job].
 */
export default function VocrehabJobCard({ job }: { job: VocrehabInterviewJobContent }) {
  return (
    <Link
      href={`/vocrehab/interview/jobs/${job.id}`}
      className="rounded-xl border p-4 hover:shadow"
    >
      <h2 className="text-lg font-semibold underline">{job.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{job.questions[4]}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        5 questions + follow-ups · turn-based or live · typing always free
      </p>
    </Link>
  );
}
