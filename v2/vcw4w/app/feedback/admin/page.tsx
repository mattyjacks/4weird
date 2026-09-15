import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Suspense } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  hasServerSupabase,
  serviceClient,
  supabaseUrl,
} from "@/lib/supabase/service";
import {
  annotationsOf,
  contactOf,
  filtersToQuery,
  hasScreenshot,
  isDateOnly,
  isFeedbackStatus,
  matchesDerived,
  parseFilters,
  pick,
  str,
  textOf,
  thumbnailOf,
  visibilityOf,
  type FeedbackFilters,
  type FeedbackRow,
} from "./feedback-admin";
import { CopyEmailButton } from "./copy-email-button";
import { AiSignalButtons } from "@/components/feedback/ai-signal-buttons";

export const metadata: Metadata = {
  title: "Feedback queue — admin",
  description:
    "Admin-only feedback triage queue: filter, inspect, address, and audit player and bot feedback.",
  robots: { index: false, follow: false },
};

const SCREENSHOT_BUCKET = "feedback-screenshots";
const ROW_LIMIT = 200;
const MAX_ADMIN_NOTE = 2000;
const MAX_EVENT_NOTE = 1000;

type FilterQuery = {
  rating?: string;
  critique?: string;
  visibility?: string;
  source?: string;
  "has-screenshot"?: string;
  "has-annotations"?: string;
  q?: string;
  from?: string;
  to?: string;
  status?: string;
};

/* ------------------------------------------------------------------ */
/* Query                                                               */
/* ------------------------------------------------------------------ */

async function fetchFiltered(
  client: SupabaseClient,
  f: FeedbackFilters,
): Promise<FeedbackRow[]> {
  let query = client
    .from("feedback_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);
  if (f.status && f.status !== "all") query = query.eq("status", f.status);
  if (f.rating && f.rating !== "all") query = query.eq("rating", f.rating);
  if (f.critique && f.critique !== "all") {
    query = query.eq("critique", f.critique);
  }
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
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as FeedbackRow[]).filter((row) =>
    matchesDerived(row, f),
  );
}

/** Signed preview URL for a stored screenshot (detail drawer only). */
async function signedScreenshotUrl(
  path: string,
): Promise<string | null> {
  try {
    const svc = serviceClient();
    const { data, error } = await svc.storage
      .from(SCREENSHOT_BUCKET)
      .createSignedUrl(path, 3600);
    if (error) return null;
    return typeof data?.signedUrl === "string" ? data.signedUrl : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Server actions (status flip + admin note + bulk address)             */
/* ------------------------------------------------------------------ */

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  const role = (user?.app_metadata as Record<string, unknown> | null)?.role;
  if (!user || role !== "admin") redirect("/feedback/admin?error=forbidden");
  return user.id;
}

function filtersFromForm(formData: FormData): FeedbackFilters {
  const get = (key: string): string => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  return parseFilters({
    rating: get("rating"),
    critique: get("critique"),
    visibility: get("visibility"),
    source: get("source"),
    "has-screenshot": get("has-screenshot"),
    "has-annotations": get("has-annotations"),
    q: get("q"),
    from: get("from"),
    to: get("to"),
    status: get("status"),
  });
}

function backTo(filters: FeedbackFilters, selected?: string): never {
  const qs = filtersToQuery(filters);
  const extra = selected ? `${qs ? "&" : ""}selected=${encodeURIComponent(selected)}` : "";
  redirect(`/feedback/admin${qs || extra ? `?${qs}${extra}` : ""}`);
}

/** Single-row save: status flip (writes a feedback_events audit row on
 * change) and/or admin_note edit. Fail-closed to the admin gate. */
async function updateFeedback(formData: FormData): Promise<void> {
  "use server";
  const actor = await requireAdmin();
  const filters = filtersFromForm(formData);
  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" ? idRaw.trim() : "";
  const toStatusRaw = formData.get("to_status");
  const adminNoteRaw = formData.get("admin_note");
  const noteRaw = formData.get("note");
  if (!id) backTo(filters);
  if (typeof toStatusRaw !== "string" || !isFeedbackStatus(toStatusRaw)) {
    redirect(`/feedback/admin?${filtersToQuery(filters)}&error=invalid`);
  }
  const adminNote =
    typeof adminNoteRaw === "string" && adminNoteRaw.trim()
      ? adminNoteRaw.trim().slice(0, MAX_ADMIN_NOTE)
      : null;
  const note =
    typeof noteRaw === "string" && noteRaw.trim()
      ? noteRaw.trim().slice(0, MAX_EVENT_NOTE)
      : null;

  let svc: SupabaseClient;
  try {
    svc = serviceClient();
  } catch {
    redirect(`/feedback/admin?${filtersToQuery(filters)}&error=store-missing`);
  }

  const { data: current, error: readErr } = await svc
    .from("feedback_reports")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (readErr || !current) {
    redirect(`/feedback/admin?${filtersToQuery(filters)}&error=update-failed`);
  }
  const fromStatus = isFeedbackStatus(
    (current as Record<string, unknown>)["status"],
  )
    ? ((current as Record<string, unknown>)["status"] as string)
    : "unaddressed";

  // Update the row. Older DBs without the admin_note column answer
  // PGRST204/42703 — retry status-only instead of failing the triage.
  const full = await svc
    .from("feedback_reports")
    .update({ status: toStatusRaw, admin_note: adminNote })
    .eq("id", id);
  if (full.error) {
    const code = String(
      (full.error as { code?: unknown }).code ?? "",
    );
    if (code === "PGRST204" || code === "42703") {
      const slim = await svc
        .from("feedback_reports")
        .update({ status: toStatusRaw })
        .eq("id", id);
      if (slim.error) {
        redirect(
          `/feedback/admin?${filtersToQuery(filters)}&error=update-failed`,
        );
      }
    } else {
      redirect(
        `/feedback/admin?${filtersToQuery(filters)}&error=update-failed`,
      );
    }
  }

  // Audit: exactly one event per status change, never on note-only saves.
  if (toStatusRaw !== fromStatus) {
    const { error: eventErr } = await svc.from("feedback_events").insert({
      feedback_id: id,
      actor,
      from_status: fromStatus,
      to_status: toStatusRaw,
      note,
    });
    if (eventErr) {
      const code = String((eventErr as { code?: unknown }).code ?? "");
      const missing =
        code === "42P01" || code === "PGRST205" || code === "42703";
      if (!missing) {
        console.error("[admin] feedback event write failed", {
          code: code.slice(0, 32),
        });
        redirect(
          `/feedback/admin?${filtersToQuery(filters)}&selected=${encodeURIComponent(id)}&error=event-failed`,
        );
      }
      console.error(
        "[admin] feedback_events table missing — status saved without audit row",
      );
    }
  }

  revalidatePath("/feedback/admin");
  backTo(filters, id);
}

/** Bulk address: every currently filtered row that is not yet addressed
 * flips to addressed, one audit event per row. */
async function bulkAddress(formData: FormData): Promise<void> {
  "use server";
  const actor = await requireAdmin();
  const filters = filtersFromForm(formData);

  let svc: SupabaseClient;
  try {
    svc = serviceClient();
  } catch {
    redirect(`/feedback/admin?${filtersToQuery(filters)}&error=store-missing`);
  }

  let rows: FeedbackRow[];
  try {
    rows = await fetchFiltered(svc, filters);
  } catch {
    redirect(`/feedback/admin?${filtersToQuery(filters)}&error=bulk-failed`);
  }
  const actionable = rows.filter(
    (row) => pick(row, ["status"]) !== "addressed" && pick(row, ["id"]),
  );
  for (const row of actionable) {
    const rowId = pick(row, ["id"]) as string;
    const from = pick(row, ["status"]) ?? "unaddressed";
    const fromStatus = isFeedbackStatus(from) ? from : "unaddressed";
    const { error: upErr } = await svc
      .from("feedback_reports")
      .update({ status: "addressed" })
      .eq("id", rowId);
    if (upErr) {
      redirect(`/feedback/admin?${filtersToQuery(filters)}&error=bulk-failed`);
    }
    const { error: evErr } = await svc.from("feedback_events").insert({
      feedback_id: rowId,
      actor,
      from_status: fromStatus,
      to_status: "addressed",
      note: "bulk address",
    });
    if (evErr) {
      console.error("[admin] bulk feedback event write failed", {
        id: rowId.slice(0, 16),
      });
      // Status already flipped — audit gap is logged, queue keeps moving.
    }
  }

  revalidatePath("/feedback/admin");
  backTo(filters);
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers (server-rendered)                      */
/* ------------------------------------------------------------------ */

function denied(message: string) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-4xl px-5 py-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
          4weird.com/feedback/admin
        </p>
        <h1 className="mt-3 text-4xl font-black">Feedback queue</h1>
        <p className="mt-4 text-slate-300">Admin only — {message}</p>
      </section>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/20 px-3 py-1 font-semibold">
      {children}
    </span>
  );
}

const inputCls =
  "rounded-lg border border-white/15 bg-slate-900 px-2 py-1.5 text-sm text-white";
const labelCls = "flex flex-col gap-1 text-xs font-semibold text-slate-300";

function FilterFields({ f }: { f: FeedbackFilters }) {
  return (
    <>
      <label className={labelCls}>
        Status
        <select name="status" defaultValue={f.status} className={inputCls}>
          <option value="unaddressed">unaddressed</option>
          <option value="addressing">addressing</option>
          <option value="addressed">addressed</option>
          <option value="all">all</option>
        </select>
      </label>
      <label className={labelCls}>
        Rating
        <select name="rating" defaultValue={f.rating} className={inputCls}>
          <option value="">all</option>
          <option value="good">good</option>
          <option value="okay">okay</option>
          <option value="bad">bad</option>
        </select>
      </label>
      <label className={labelCls}>
        Critique
        <select name="critique" defaultValue={f.critique} className={inputCls}>
          <option value="">all</option>
          <option value="positive">positive</option>
          <option value="negative">negative</option>
        </select>
      </label>
      <label className={labelCls}>
        Visibility
        <select
          name="visibility"
          defaultValue={f.visibility}
          className={inputCls}
        >
          <option value="">all</option>
          <option value="unset">unset</option>
          <option value="public">public</option>
          <option value="private">private</option>
          <option value="internal">internal</option>
        </select>
      </label>
      <label className={labelCls}>
        Source
        <select name="source" defaultValue={f.source} className={inputCls}>
          <option value="">all</option>
          <option value="human">human</option>
          <option value="bot">bot</option>
        </select>
      </label>
      <label className={labelCls}>
        Screenshot
        <select
          name="has-screenshot"
          defaultValue={f.hasScreenshot}
          className={inputCls}
        >
          <option value="">all</option>
          <option value="yes">has screenshot</option>
          <option value="no">no screenshot</option>
        </select>
      </label>
      <label className={labelCls}>
        Annotations
        <select
          name="has-annotations"
          defaultValue={f.hasAnnotations}
          className={inputCls}
        >
          <option value="">all</option>
          <option value="yes">has annotations</option>
          <option value="no">no annotations</option>
        </select>
      </label>
      <label className={labelCls}>
        Text search
        <input
          type="search"
          name="q"
          defaultValue={f.q}
          placeholder="text or page URL…"
          maxLength={200}
          className={inputCls}
        />
      </label>
      <label className={labelCls}>
        From
        <input type="date" name="from" defaultValue={f.from} className={inputCls} />
      </label>
      <label className={labelCls}>
        To
        <input type="date" name="to" defaultValue={f.to} className={inputCls} />
      </label>
    </>
  );
}

/** Hidden inputs so server actions redirect back to the same filtered view. */
function FilterHidden({ f }: { f: FeedbackFilters }) {
  return (
    <>
      <input type="hidden" name="rating" value={f.rating} />
      <input type="hidden" name="critique" value={f.critique} />
      <input type="hidden" name="visibility" value={f.visibility} />
      <input type="hidden" name="source" value={f.source} />
      <input type="hidden" name="has-screenshot" value={f.hasScreenshot} />
      <input type="hidden" name="has-annotations" value={f.hasAnnotations} />
      <input type="hidden" name="q" value={f.q} />
      <input type="hidden" name="from" value={f.from} />
      <input type="hidden" name="to" value={f.to} />
      <input type="hidden" name="status" value={f.status} />
    </>
  );
}

function ErrorBanner({ code }: { code: string }) {
  const messages: Record<string, string> = {
    forbidden: "That action needs a site admin login.",
    invalid: "Invalid status — pick unaddressed, addressing, or addressed.",
    "update-failed": "Could not save that report. Try again shortly.",
    "event-failed":
      "Status saved, but the audit event failed to write — check the trail before retrying.",
    "bulk-failed": "Bulk address stopped partway — review the queue before retrying.",
    "store-missing": "Feedback store is not configured on this deployment.",
  };
  const text = messages[code] ?? "Something went wrong.";
  return (
    <p
      role="alert"
      className="mt-4 rounded-xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100"
    >
      {text}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

// NOTE: no 'use cache' here — per-user session (cookies via createClient)
// + searchParams stream inside <Suspense> so admin/personal data is never
// cached. Matches app/account/page.tsx, app/my/usage/page.tsx,
// app/my/rights/page.tsx. Under cacheComponents, awaiting cookies() or
// searchParams at the top level of the default export blocks the static
// shell (blocking-prerender-runtime); the Body split keeps the shell
// prerenderable while the queue streams at request time.
async function FeedbackAdminBody({
  searchParams,
}: {
  searchParams?: Promise<FilterQuery & { selected?: string; error?: string }>;
}) {
  if (!hasServerSupabase()) {
    return denied("Supabase is not configured on this deployment yet.");
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return denied("login required.");
  const role = (user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== "admin") {
    return denied("this queue is restricted to site admins.");
  }

  const sp = (await searchParams) ?? {};
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    flat[k] = Array.isArray(v) ? v[0] : v;
  }
  const f = parseFilters(flat);
  const selectedId = (flat["selected"] ?? "").trim() || null;
  const errorCode = (flat["error"] ?? "").trim() || null;

  let rows: FeedbackRow[];
  try {
    rows = await fetchFiltered(supabase, f);
  } catch {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto max-w-4xl px-5 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
            4weird.com/feedback/admin
          </p>
          <h1 className="mt-3 text-4xl font-black">Feedback queue</h1>
          <p className="mt-4 text-slate-300">
            The feedback store is not provisioned yet (feedback_reports
            unavailable). The feedback-tables migration owns this table; this
            page needs no changes once it lands.
          </p>
        </section>
      </main>
    );
  }

  const selected = selectedId
    ? (rows.find((row) => pick(row, ["id"]) === selectedId) ?? null)
    : null;

  // Detail-drawer data: resolved screenshot preview + audit trail.
  let previewUrl: string | null = null;
  let previewPath: string | null = null;
  let trail: FeedbackRow[] = [];
  let trailUnavailable = false;
  if (selected) {
    const direct = thumbnailOf(selected);
    const stored = pick(selected, ["screenshot_path"]);
    previewPath = stored;
    if (direct) {
      previewUrl = direct;
    } else if (stored) {
      previewUrl = await signedScreenshotUrl(stored);
    }
    const { data: events, error: eventsErr } = await supabase
      .from("feedback_events")
      .select("id,feedback_id,actor,from_status,to_status,note,created_at")
      .eq("feedback_id", selectedId as string)
      .order("created_at", { ascending: false })
      .limit(50);
    if (eventsErr) {
      trailUnavailable = true;
    } else {
      trail = (events ?? []) as FeedbackRow[];
    }
  }

  const actionable = rows.filter(
    (row) => pick(row, ["status"]) !== "addressed",
  );
  const exportQuery = filtersToQuery(f);
  const baseQuery = exportQuery;
  const detailHref = (id: string) =>
    `/feedback/admin?${baseQuery ? `${baseQuery}&` : ""}selected=${encodeURIComponent(id)}`;
  const drawerCloseHref = `/feedback/admin${baseQuery ? `?${baseQuery}` : ""}`;
  const pageUrl = selected ? pick(selected, ["page_url"]) : null;
  const pageHref =
    pageUrl && (/^https?:\/\//i.test(pageUrl) || pageUrl.startsWith("/"))
      ? pageUrl
      : null;
  const selectedAnnotations = selected ? annotationsOf(selected) : [];
  const selectedContact = selected ? contactOf(selected) : null;
  const selectedText = selected ? textOf(selected) : null;
  const selectedAdminNote = selected ? str(selected["admin_note"]) : null;
  // AI enrichment stub (FBOV-09): ai_* columns are written by the bot-runner
  // enrich route / the fire-and-forget submit hook — never by human edits.
  const aiCategory = selected ? str(selected["ai_category"]) : null;
  const aiSeverity = selected ? str(selected["ai_severity"]) : null;
  const aiSummary = selected ? str(selected["ai_summary"]) : null;
  const aiCluster = selected ? str(selected["ai_cluster"]) : null;
  const aiProcessedAt = selected ? str(selected["ai_processed_at"]) : null;
  const selectedStatus = selected
    ? (pick(selected, ["status"]) ?? "unaddressed")
    : "unaddressed";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-5 py-12">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
          4weird.com/feedback/admin
        </p>
        <h1 className="mt-3 text-4xl font-black">Feedback queue</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Admin-only triage queue, newest first. Filter to a slice, open a
          row for the full report, flip its status — every flip lands an
          append-only row in <code>feedback_events</code>. Nothing is ever
          deleted.
        </p>
        {errorCode && <ErrorBanner code={errorCode} />}

        <form
          method="get"
          action="/feedback/admin"
          className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:grid-cols-3 lg:grid-cols-5"
        >
          <FilterFields f={f} />
          <div className="col-span-full flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-200"
            >
              Apply filters
            </button>
            <Link
              href="/feedback/admin"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              Reset
            </Link>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-400" role="status">
            {rows.length === 0
              ? "No reports match these filters."
              : `${rows.length} report${rows.length === 1 ? "" : "s"} match${rows.length === 1 ? "es" : ""} (${actionable.length} not yet addressed).`}
          </p>
          <span className="ms-auto inline-flex flex-wrap gap-2">
            <Link
              href={`/api/feedback/admin/export${exportQuery ? `?${exportQuery}` : ""}`}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              Export CSV
            </Link>
          </span>
        </div>

        {actionable.length > 0 && (
          <form action={bulkAddress} className="mt-3">
            <FilterHidden f={f} />
            <button
              type="submit"
              className="rounded-xl border border-emerald-300/40 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-100 hover:bg-emerald-300/20"
            >
              Mark all {actionable.length} as addressed
            </button>
          </form>
        )}

        {rows.length > 0 && (
          <ol className="mt-6 flex flex-col gap-4">
            {rows.map((row, index) => {
              const id = pick(row, ["id"]) ?? `row-${index}`;
              const rating = pick(row, ["rating"]);
              const critique = pick(row, ["critique"]);
              const status = pick(row, ["status"]) ?? "unaddressed";
              const reporter = pick(row, ["reporter_type", "reporter"]);
              const createdAt = pick(row, ["created_at"]);
              const excerpt = (textOf(row) ?? "").slice(0, 280);
              const shot = hasScreenshot(row);
              const annCount = annotationsOf(row).length;
              const visibility = visibilityOf(row);
              return (
                <li
                  key={id}
                  className="rounded-2xl border border-white/10 bg-white/[.04] p-5"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge>status: {status}</Badge>
                    {rating && <Badge>rating: {rating}</Badge>}
                    {critique && <Badge>critique: {critique}</Badge>}
                    {reporter && (
                      <span className="text-slate-400">via {reporter}</span>
                    )}
                    {visibility && (
                      <span className="text-slate-400">
                        visibility: {visibility}
                      </span>
                    )}
                    {shot && (
                      <span className="text-slate-400">has screenshot</span>
                    )}
                    {annCount > 0 && (
                      <span className="text-slate-400">
                        {annCount} annotation{annCount === 1 ? "" : "s"}
                      </span>
                    )}
                    {str(row["admin_note"]) && (
                      <span className="text-amber-200">has admin note</span>
                    )}
                    {createdAt && (
                      <time
                        className="ms-auto text-slate-400"
                        dateTime={createdAt}
                      >
                        {createdAt}
                      </time>
                    )}
                  </div>
                  {excerpt && (
                    <p className="mt-3 whitespace-pre-wrap text-slate-100">
                      {excerpt}
                      {(textOf(row) ?? "").length > 280 ? "…" : ""}
                    </p>
                  )}
                  <div className="mt-3">
                    <Link
                      href={detailHref(id)}
                      className="text-sm font-semibold text-cyan-300 hover:underline"
                    >
                      Open detail →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Feedback detail"
        >
          <aside className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black">Report detail</h2>
              <Link
                href={drawerCloseHref}
                className="ms-auto rounded-full border border-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/10"
              >
                Close ✕
              </Link>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge>status: {selectedStatus}</Badge>
              {pick(selected, ["rating"]) && (
                <Badge>rating: {pick(selected, ["rating"])}</Badge>
              )}
              {pick(selected, ["critique"]) && (
                <Badge>critique: {pick(selected, ["critique"])}</Badge>
              )}
              {pick(selected, ["reporter_type"]) && (
                <Badge>source: {pick(selected, ["reporter_type"])}</Badge>
              )}
              {visibilityOf(selected) && (
                <Badge>visibility: {visibilityOf(selected)}</Badge>
              )}
            </div>

            {(aiCategory || aiSeverity || aiSummary || aiCluster) && (
              <div className="mt-4 rounded-xl border border-violet-300/20 bg-violet-300/[.06] p-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
                  AI enrichment
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {aiCategory && <Badge>AI category: {aiCategory}</Badge>}
                  {aiSeverity && <Badge>AI severity: {aiSeverity}</Badge>}
                </div>
                {aiSummary && (
                  <p className="mt-2 text-sm text-slate-100">{aiSummary}</p>
                )}
                {aiCluster && (
                  <p className="mt-1 text-xs text-slate-400">Why: {aiCluster}</p>
                )}
                {aiProcessedAt && (
                  <p className="mt-1 text-xs text-slate-500">
                    Processed: {aiProcessedAt}
                  </p>
                )}
                <AiSignalButtons feedbackId={selectedId as string} />
              </div>
            )}

            {selectedText && (
              <p className="mt-4 whitespace-pre-wrap text-slate-100">
                {selectedText}
              </p>
            )}

            {pageHref ? (
              <p className="mt-3 text-sm">
                <span className="text-slate-400">Page: </span>
                <a
                  href={pageHref}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-cyan-300 hover:underline"
                >
                  {pageUrl}
                </a>
              </p>
            ) : (
              pageUrl && (
                <p className="mt-3 break-all text-sm text-slate-400">
                  Page: {pageUrl}
                </p>
              )
            )}

            <div className="mt-4">
              <h3 className="text-sm font-bold text-slate-200">Screenshot</h3>
              {previewUrl ? (
                <div className="relative mt-2 overflow-hidden rounded-xl border border-white/10">
                  {/* Plain img: screenshots are user-supplied remote/signed URLs
                      outside next/image remotePatterns. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={`Screenshot attached to feedback ${selectedId}`}
                    loading="lazy"
                    className="block max-h-96 w-full object-contain"
                  />
                  {selectedAnnotations.length > 0 && (
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      aria-label={`${selectedAnnotations.length} annotations overlaid`}
                      role="img"
                    >
                      {selectedAnnotations.map((a, i) =>
                        a.kind === "rect" ? (
                          <rect
                            key={i}
                            x={a.x}
                            y={a.y}
                            width={a.w}
                            height={a.h}
                            fill="rgba(255,59,48,0.15)"
                            stroke="#ff3b30"
                            strokeWidth={1}
                            vectorEffect="non-scaling-stroke"
                          />
                        ) : (
                          <g key={i}>
                            <circle
                              cx={a.x}
                              cy={a.y}
                              r={3}
                              fill="none"
                              stroke="#ffd60a"
                              strokeWidth={1}
                              vectorEffect="non-scaling-stroke"
                            />
                            <circle cx={a.x} cy={a.y} r={0.8} fill="#ffd60a" />
                          </g>
                        ),
                      )}
                    </svg>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400">
                  {previewPath
                    ? "Screenshot is stored but the preview is unavailable on this deployment."
                    : "No screenshot attached to this report."}
                </p>
              )}
              {selectedAnnotations.length > 0 && (
                <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm text-slate-300">
                  {selectedAnnotations.map((a, i) => (
                    <li key={i}>
                      {a.kind} at ({a.x.toFixed(1)}, {a.y.toFixed(1)}
                      {a.kind === "rect"
                        ? `, ${a.w.toFixed(1)}×${a.h.toFixed(1)}`
                        : ""}
                      ){a.label ? ` — ${a.label}` : ""}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-bold text-slate-200">Contact</h3>
              {selectedContact ? (
                <details className="mt-2 rounded-xl border border-white/10 bg-white/[.03] p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-cyan-300">
                    Reveal contact
                  </summary>
                  <p className="mt-2 break-all text-sm text-slate-100">
                    {selectedContact}
                  </p>
                  <div className="mt-2">
                    <CopyEmailButton email={selectedContact} />
                  </div>
                </details>
              ) : (
                <p className="mt-2 text-sm text-slate-400">
                  No contact attached to this report.
                </p>
              )}
            </div>

            <form
              action={updateFeedback}
              className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/[.03] p-4"
            >
              <h3 className="text-sm font-bold text-slate-200">
                Triage this report
              </h3>
              <FilterHidden f={f} />
              <input type="hidden" name="id" value={selectedId as string} />
              <fieldset>
                <legend className="text-xs font-semibold text-slate-300">
                  Status
                </legend>
                <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label="Status">
                  {(["unaddressed", "addressing", "addressed"] as const).map(
                    (s) => (
                      <label
                        key={s}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold ${selectedStatus === s ? "border-cyan-300 bg-cyan-300/15 text-cyan-200" : "border-white/15 text-slate-300"}`}
                      >
                        <input
                          type="radio"
                          name="to_status"
                          value={s}
                          defaultChecked={selectedStatus === s}
                          className="me-1"
                        />
                        {s}
                      </label>
                    ),
                  )}
                </div>
              </fieldset>
              <label className="block text-xs font-semibold text-slate-300">
                Change note (written into the audit event)
                <input
                  type="text"
                  name="note"
                  maxLength={MAX_EVENT_NOTE}
                  placeholder="e.g. fixed in deploy #123, wont-fix: by design"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 px-2 py-1.5 text-sm font-normal text-white"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Admin note (kept on the report)
                <textarea
                  name="admin_note"
                  rows={3}
                  maxLength={MAX_ADMIN_NOTE}
                  defaultValue={selectedAdminNote ?? ""}
                  placeholder="Internal context for the next admin…"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 px-2 py-1.5 text-sm font-normal text-white"
                />
              </label>
              <button
                type="submit"
                className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-200"
              >
                Save
              </button>
            </form>

            <div className="mt-4">
              <h3 className="text-sm font-bold text-slate-200">
                Audit trail
              </h3>
              {trailUnavailable ? (
                <p className="mt-2 text-sm text-slate-400">
                  Audit history is unavailable (feedback_events not
                  provisioned yet).
                </p>
              ) : trail.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">
                  No status changes recorded yet.
                </p>
              ) : (
                <ol className="mt-2 space-y-2">
                  {trail.map((ev, i) => (
                    <li
                      key={pick(ev, ["id"]) ?? `ev-${i}`}
                      className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-sm"
                    >
                      <p className="text-slate-100">
                        {pick(ev, ["from_status"]) ?? "—"} →{" "}
                        {pick(ev, ["to_status"]) ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {(() => {
                          const actor = pick(ev, ["actor"]);
                          const at = pick(ev, ["created_at"]);
                          const note = str(ev["note"]);
                          return (
                            <>
                              {actor && <span>by {actor} </span>}
                              {at && (
                                <time dateTime={at}>
                                  {actor ? `· ${at}` : at}
                                </time>
                              )}
                              {note && <span> · {note}</span>}
                            </>
                          );
                        })()}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Deploy: {supabaseUrl() ? "supabase configured" : "no supabase"} ·
              signed previews expire after 1 hour.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}

export default function FeedbackAdminPage({
  searchParams,
}: {
  searchParams?: Promise<FilterQuery & { selected?: string; error?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-white">
          <section
            className="mx-auto max-w-5xl px-5 py-12"
            aria-busy="true"
            aria-label="Loading feedback queue"
          >
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
              4weird.com/feedback/admin
            </p>
            <h1 className="mt-3 text-4xl font-black">Feedback queue</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Admin-only triage queue loads privately after sign-in.
            </p>
            <div className="mt-6 animate-pulse space-y-3">
              <div className="h-24 rounded-2xl border border-white/10 bg-white/[.04]" />
              <div className="h-24 rounded-2xl border border-white/10 bg-white/[.04]" />
            </div>
          </section>
        </main>
      }
    >
      <FeedbackAdminBody searchParams={searchParams} />
    </Suspense>
  );
}
