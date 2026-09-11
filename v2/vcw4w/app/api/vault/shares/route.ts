import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOriginOrBotKey } from "@/lib/csrf-bot";
import { keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * POST /api/vault/shares { file_id, expires_hours? }; scoped share link.
 * The token URL downloads ONLY that file (when clean) for the window.
 * Auth: session OR bot key with `vault:share`.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!(await sameOriginOrBotKey(req))) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let userId = data?.user?.id ?? null;
  if (!userId) {
    const bot = await resolveBotKey(req).catch(() => null);
    if (!bot) return fail("Login required.", 401);
    if (!keyHasScope(bot, "vault:share")) return fail("Key lacks scope: vault:share.", 403);
    userId = bot.userId;
  }
  const throttle = rateLimit(`vault-share:${userId}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const fileId = String(input.file_id ?? "");
  if (!isUuid(fileId)) return fail("Invalid file_id.", 400);
  const hours = Math.floor(Number(input.expires_hours ?? 24));
  if (!Number.isInteger(hours) || hours < 1 || hours > 24 * 30) {
    return fail("expires_hours must be 1..720.", 400);
  }

  // Explicit ownership/membership gate (RLS alone over-grants team files
  // on public/internal teams): callers can only share files they own or
  // belong to. Mirrors GET /api/vault/blobs/[id].
  const { data: visible, error: visErr } = await supabase
    .from("vault_files")
    .select("id,quarantined,scope,owner_id,team_id,org_id")
    .eq("id", fileId)
    .maybeSingle();
  if (visErr) return dbFail("api/vault/shares", visErr, "Unable to load file.");
  if (!visible) return fail("File not found.", 404);
  {
    const v = visible as { quarantined: boolean; scope: string; owner_id: string | null; team_id: string | null; org_id: string | null };
    if (v.quarantined) return fail("Quarantined files cannot be shared.", 403);
    let owns = v.scope === "personal" && v.owner_id === userId;
    if (!owns && v.scope !== "personal") {
      try {
        const svc = serviceClient();
        const table = v.scope === "team" ? "team_members" : "org_members";
        const col = v.scope === "team" ? "team_id" : "org_id";
        const scopeKey = String(v.scope === "team" ? v.team_id : v.org_id ?? "");
        const { data: mem } = await svc.from(table).select("user_id").eq(col, scopeKey).eq("user_id", userId).maybeSingle();
        owns = Boolean(mem);
      } catch {
        owns = false;
      }
    }
    if (!owns) return fail("File not found.", 404);
  }

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Vault unavailable.", 503);
  }
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  const { data: share, error } = await svc
    .from("vault_shares")
    .insert({ file_id: fileId, created_by: userId, expires_at: expiresAt })
    .select("id,token,expires_at")
    .single();
  if (error || !share) return dbFail("api/vault/shares", error, "Unable to create link.");
  return ok({ share }, 201);
}
