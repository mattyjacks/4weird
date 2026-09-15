import { fail } from "@/lib/api-respond";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import {
  isDateOnly,
  matchesDerived,
  parseFilters,
  rowsToCsv,
  type FeedbackRow,
} from "@/app/feedback/admin/feedback-admin";

/**
 * GET /api/feedback/admin/export — admin-gated CSV export of the feedback
 * queue. Accepts the same filter query params as /feedback/admin (rating,
 * critique, visibility, source, has-screenshot, has-annotations, q, from,
 * to, status) and returns the matching rows (newest first, 200 cap) as a
 * downloadable CSV. Contact addresses ARE included: this route is
 * admin-only (app_metadata role check, fail-closed) and never cached.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return fail("Login required.", 401);
  const role = (user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== "admin") return fail("Admin access required.", 403);

  const url = new URL(req.url);
  const raw: Record<string, string | undefined> = {};
  url.searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  const f = parseFilters(raw);

  let query = supabase
    .from("feedback_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (f.status && f.status !== "all") query = query.eq("status", f.status);
  if (f.rating && f.rating !== "all") query = query.eq("rating", f.rating);
  if (f.critique && f.critique !== "all") query = query.eq("critique", f.critique);
  if (f.source === "human" || f.source === "bot") {
    query = query.eq("reporter_type", f.source);
  }
  if (f.q) {
    const needle = f.q.replace(/%/g, "").slice(0, 200);
    if (needle) {
      query = query.or(
        `text_body.ilike.%${needle}%,page_url.ilike.%${needle}%`,
      );
    }
  }
  if (f.from && isDateOnly(f.from)) {
    query = query.gte("created_at", `${f.from}T00:00:00Z`);
  }
  if (f.to && isDateOnly(f.to)) {
    query = query.lte("created_at", `${f.to}T23:59:59Z`);
  }

  const { data: rows, error } = await query;
  if (error) return fail("Unable to read feedback.", 500);
  const filtered = ((rows ?? []) as FeedbackRow[]).filter((row) =>
    matchesDerived(row, f),
  );

  return new Response(rowsToCsv(filtered), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="feedback-export.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
