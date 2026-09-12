import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { readCappedJson } from "@/lib/request-body";
import { isUuid } from "@/lib/validate";
import {
  SWARM_DOCS_MAX,
  cleanDocContent,
  cleanDocName,
  retrieveTxtChunks,
  type BrainDoc,
} from "@/lib/swarm-brain";

export const dynamic = "force-dynamic";

function missingBrainTables(msg: string): boolean {
  return msg.includes("swarm_docs") && (msg.includes("does not exist") || msg.includes("schema"));
}

/**
 * GET /api/swarm/docs; list my .txt docs (id, name, chars, created_at).
 * GET /api/swarm/docs?q=; preview RAG retrieval: top scored chunks for q
 * across my docs (proves what the brain will see, costs nothing).
 * POST /api/swarm/docs { name, content }; upload one .txt doc (≤20 KB,
 * ≤20 docs per user). DELETE /api/swarm/docs?id=; remove one of my docs.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 500);
  try {
    const { data: rows, error } = await supabase
      .from("swarm_docs")
      .select("id,name,content,created_at")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false })
      .limit(SWARM_DOCS_MAX);
    if (error) {
      if (missingBrainTables(String((error as { message?: string }).message ?? ""))) {
        return fail("Swarm brain tables are not migrated yet; apply supabase/migrations/20261022000100_swarm_brain.sql.", 503);
      }
      return dbFail("api/swarm/docs:list", error, "Unable to load docs.");
    }
    const docs = (rows ?? []) as { id: string; name: string; content: string; created_at: string }[];
    const list = docs.map((d) => ({ id: d.id, name: d.name, chars: d.content.length, created_at: d.created_at }));
    if (!q) return ok({ docs: list });
    const chunks = retrieveTxtChunks(
      q,
      docs.map((d): BrainDoc => ({ id: d.id, name: d.name, content: d.content })),
    );
    return ok({ docs: list, query: q, chunks });
  } catch (error) {
    return dbFail("api/swarm/docs:list", error, "Unable to load docs.");
  }
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`swarm:docs:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  // Capped body (32 KB): docs top out at 20 KB text + JSON overhead.
  // Unbounded parsing would let one upload burn disproportionate CPU/RAM.
  const parsed = await readCappedJson(req, 32 * 1024);
  if ("error" in parsed) return parsed.error;
  const input = (parsed.body ?? {}) as Record<string, unknown>;
  const name = cleanDocName(input.name);
  const content = cleanDocContent(input.content);
  if (!name) return fail("name must be 1..80 chars.", 400);
  if (!content) return fail("content must be plain .txt text, 1 char..20 KB (no binaries, no data URLs).", 400);
  try {
    const { count, error: countError } = await supabase
      .from("swarm_docs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", data.user.id);
    if (countError) {
      if (missingBrainTables(String((countError as { message?: string }).message ?? ""))) {
        return fail("Swarm brain tables are not migrated yet; apply supabase/migrations/20261022000100_swarm_brain.sql.", 503);
      }
      return dbFail("api/swarm/docs:count", countError, "Unable to upload the doc.");
    }
    if ((count ?? 0) >= SWARM_DOCS_MAX) return fail(`Doc limit reached (${SWARM_DOCS_MAX} .txt files per user). Delete one first.`, 409);
    const { data: row, error } = await supabase
      .from("swarm_docs")
      .insert({ user_id: data.user.id, name, content })
      .select("id,name,created_at")
      .single();
    if (error) return dbFail("api/swarm/docs:upload", error, "Unable to upload the doc.");
    return ok({ doc: { ...row, chars: content.length } }, 201);
  } catch (error) {
    return dbFail("api/swarm/docs:upload", error, "Unable to upload the doc.");
  }
}

export async function DELETE(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`swarm:docs:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!isUuid(id)) return fail("Invalid doc id.", 400);
  try {
    const { data: row, error } = await supabase
      .from("swarm_docs")
      .delete()
      .eq("id", id)
      .eq("user_id", data.user.id)
      .select("id")
      .maybeSingle();
    if (error) return dbFail("api/swarm/docs:delete", error, "Unable to delete the doc.");
    if (!row) return fail("Doc not found.", 404);
    return ok({ deleted: id });
  } catch (error) {
    return dbFail("api/swarm/docs:delete", error, "Unable to delete the doc.");
  }
}
