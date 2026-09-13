import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Unaddressed feedback — admin",
  description: "Admin-only queue of unaddressed player and bot feedback, newest first.",
  robots: { index: false, follow: false },
};

type FeedbackRow = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function pick(row: FeedbackRow, keys: string[]): string | null {
  for (const key of keys) {
    const hit = str(row[key]);
    if (hit) return hit;
  }
  return null;
}

function thumbnailOf(row: FeedbackRow): string | null {
  const url = pick(row, ["thumbnail_url", "screenshot_url", "image_url", "screenshot", "thumbnail"]);
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

function denied(message: string) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-4xl px-5 py-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">4weird.com/feedback/admin</p>
        <h1 className="mt-3 text-4xl font-black">Unaddressed feedback</h1>
        <p className="mt-4 text-slate-300">Admin only — {message}</p>
      </section>
    </main>
  );
}

async function AdminFeedbackBody() {
  if (!hasServerSupabase()) {
    return denied("Supabase is not configured on this deployment yet.");
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return denied("login required.");
  const role = (user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== "admin") return denied("this queue is restricted to site admins.");

  // Primary filter: boolean `addressed` flag (false = unaddressed), newest first.
  // Falls back to a `status = 'unaddressed'` filter for migrations that model
  // the queue as a status string instead of a boolean.
  let rows: FeedbackRow[] | null = null;
  const primary = await supabase
    .from("feedback_reports")
    .select("*")
    .eq("addressed", false)
    .order("created_at", { ascending: false })
    .limit(200);
  if (primary.error) {
    const retry = await supabase
      .from("feedback_reports")
      .select("*")
      .eq("status", "unaddressed")
      .order("created_at", { ascending: false })
      .limit(200);
    if (retry.error) {
      return (
        <main className="min-h-screen bg-slate-950 text-white">
          <section className="mx-auto max-w-4xl px-5 py-20">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">4weird.com/feedback/admin</p>
            <h1 className="mt-3 text-4xl font-black">Unaddressed feedback</h1>
            <p className="mt-4 text-slate-300">
              The feedback store is not provisioned yet (feedback_reports unavailable). The feedback-tables
              migration owns this table; this page needs no changes once it lands.
            </p>
          </section>
        </main>
      );
    }
    rows = (retry.data ?? []) as FeedbackRow[];
  } else {
    rows = (primary.data ?? []) as FeedbackRow[];
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-4xl px-5 py-12">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">4weird.com/feedback/admin</p>
        <h1 className="mt-3 text-4xl font-black">Unaddressed feedback</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Admin-only ingest queue, newest first. Bot-readable variants (JSON and Markdown over{" "}
          <code>GET /api/feedback/unaddressed</code>) are tracked as a QUEUE wiring request for the API lane —
          this page is the human-readable view and creates no API routes.
        </p>
        <p className="mt-2 text-sm text-slate-400" role="status">
          {rows.length === 0 ? "Queue is clear — no unaddressed reports." : `${rows.length} unaddressed report${rows.length === 1 ? "" : "s"}.`}
        </p>
        {rows.length > 0 && (
          <ol className="mt-8 flex flex-col gap-4">
            {rows.map((row, index) => {
              const id = pick(row, ["id"]) ?? `row-${index}`;
              const rating = pick(row, ["rating"]);
              const critique = pick(row, ["critique"]);
              const text = pick(row, ["text", "body", "message", "feedback"]);
              const createdAt = pick(row, ["created_at"]);
              const reporter = pick(row, ["reporter_type", "reporter"]);
              const thumbnail = thumbnailOf(row);
              return (
                <li key={id} className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {rating && (
                      <span className="rounded-full border border-white/20 px-3 py-1 font-semibold">
                        Rating: {rating}
                      </span>
                    )}
                    {critique && (
                      <span className="rounded-full border border-white/20 px-3 py-1 font-semibold">
                        Critique: {critique}
                      </span>
                    )}
                    {reporter && <span className="text-slate-400">via {reporter}</span>}
                    {createdAt && (
                      <time className="ms-auto text-slate-400" dateTime={createdAt}>
                        {createdAt}
                      </time>
                    )}
                  </div>
                  {text && <p className="mt-3 whitespace-pre-wrap text-slate-100">{text}</p>}
                  {thumbnail && (
                    // Plain img: thumbnails are user-supplied remote URLs outside next/image remotePatterns.
                    <img
                      src={thumbnail}
                      alt={`Screenshot attached to feedback ${id}`}
                      loading="lazy"
                      className="mt-3 max-h-64 rounded-xl border border-white/10 object-contain"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}

export default async function FeedbackAdminPage() {
  return <AdminFeedbackBody />;
}
