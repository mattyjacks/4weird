import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { vocrehabInterviewJobFor, vocrehabIsInterviewJobId } from "@/lib/vocrehab-interview-jobs";
import VocrehabInterviewRoom from "@/components/vocrehab/vocrehab-interview-room";

export async function generateMetadata({ params }: { params: Promise<{ job: string }> }): Promise<Metadata> {
  const { job } = await params;
  if (!vocrehabIsInterviewJobId(job)) return { title: "Job not found — VocRehab" };
  const content = vocrehabInterviewJobFor(job);
  return {
    title: `${content.title} rehearsal — VocRehab`,
    description: `Rehearse a ${content.title} interview live: 5 questions + follow-ups, 3 difficulties, typing always free.`,
    alternates: { canonical: `/vocrehab/interview/jobs/${content.id}` },
  };
}

export default async function Page({ params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  if (!vocrehabIsInterviewJobId(job)) notFound();
  const content = vocrehabInterviewJobFor(job);
  return (
    <main className="vocrehab-interview-room-page mx-auto w-full max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/interview">Interview</Link> → <Link href="/vocrehab/interview/jobs">Jobs</Link> → {content.title}
      </nav>
      <h1 className="text-xl font-bold">{content.title} — live rehearsal</h1>
      <p className="text-muted-foreground">
        One question at a time, up to 6 turns, then a report card. Ephemeral by
        default — nothing leaves this tab until you tap Save.
      </p>
      <VocrehabInterviewRoom jobId={content.id} />
    </main>
  );
}
