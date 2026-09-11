import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

// GET /api/code/[id] — owner reads the full submission incl. verdict,
// findings, game root, and (when safe) a short-lived download URL.
// Quarantined rows NEVER include a URL. Powers the beautiful code view.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid submission.", 400);
  const { data: row, error } = await supabase
    .from("code_submissions")
    .select(
      "id,title,status,verdict,quarantined,game_root,zip_bytes,zip_sha256,storage_path,audit_findings,preview_files,audit_coins,storage_coins,created_at,updated_at",
    )
    .eq("id", id)
    .eq("owner_id", u.id)
    .maybeSingle();
  if (error) return dbFail("api/code/[id]", error, "Unable to load project.");
  if (!row) return fail("Project not found.", 404);
  const r = row as Record<string, unknown>;
  let download: string | null = null;
  if (!r.quarantined && typeof r.storage_path === "string" && r.storage_path) {
    try {
      const svc = serviceClient();
      const { data: signed } = await svc.storage
        .from("game-blobs")
        .createSignedUrl(r.storage_path, 3600);
      download = signed?.signedUrl ?? null;
    } catch {
      download = null;
    }
  }
  const { storage_path: _drop, ...rest } = r;
  void _drop;
  return ok({ submission: { ...rest, download } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`code-submit:${u.id}`, 10);
  if (!throttle.allowed) {
    return fail("Too many submissions. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid submission.", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  if ((body as Record<string, unknown> | null)?.submit !== true) return fail("Invalid request.", 400);
  const { data: updated, error } = await supabase
    .from("code_submissions")
    .update({ status: "submitted" })
    .eq("id", id)
    .eq("owner_id", u.id)
    .eq("status", "draft")
    .select("id");
  if (error) return fail("Unable to submit.", 500);
  if (!updated || updated.length === 0) return fail("Project not found.", 404);
  return ok({});
}
