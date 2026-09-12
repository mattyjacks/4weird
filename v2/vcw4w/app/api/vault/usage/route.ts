import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { VAULT_COINS_PER_GB_MO, VAULT_FREE_BYTES_PERSONAL, VAULT_MIN_COINS } from "@/lib/blob-vault";

export const dynamic = "force-dynamic";

/**
 * GET /api/vault/usage; storage bytes + file counts per scope the caller can
 * use (personal + member teams/orgs). Trash counts until purge. Auth: login
 * session (personal quota view; bot keys use /api/vault/blobs directly).
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id ?? null;
  if (!userId) return fail("Login required.", 401);

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Vault unavailable.", 503);
  }
  const { data: own, error: ownErr } = await svc
    .from("vault_files")
    .select("bytes")
    .eq("scope", "personal")
    .eq("owner_id", userId)
    .limit(5000);
  if (ownErr) return dbFail("api/vault/usage", ownErr, "Unable to load usage.");
  const personal = {
    bytes: (own ?? []).reduce((n, r) => n + Number((r as { bytes: number }).bytes ?? 0), 0),
    files: (own ?? []).length,
  };

  const { data: teamRows } = await svc.from("team_members").select("team_id").eq("user_id", userId).limit(100);
  const teams: { id: string; bytes: number; files: number }[] = [];
  for (const t of (teamRows ?? []) as { team_id: string }[]) {
    const { data: rows } = await svc.from("vault_files").select("bytes").eq("scope", "team").eq("team_id", t.team_id).limit(5000);
    teams.push({
      id: t.team_id,
      bytes: (rows ?? []).reduce((n, r) => n + Number((r as { bytes: number }).bytes ?? 0), 0),
      files: (rows ?? []).length,
    });
  }
  const { data: orgRows } = await svc.from("org_members").select("org_id").eq("user_id", userId).limit(100);
  const orgs: { id: string; bytes: number; files: number }[] = [];
  for (const o of (orgRows ?? []) as { org_id: string }[]) {
    const { data: rows } = await svc.from("vault_files").select("bytes").eq("scope", "org").eq("org_id", o.org_id).limit(5000);
    orgs.push({
      id: o.org_id,
      bytes: (rows ?? []).reduce((n, r) => n + Number((r as { bytes: number }).bytes ?? 0), 0),
      files: (rows ?? []).length,
    });
  }
  return ok({
    usage: { personal, teams, orgs },
    quota: {
      freeBytesPersonal: VAULT_FREE_BYTES_PERSONAL,
      coinsPerGbMo: VAULT_COINS_PER_GB_MO,
      minCoins: VAULT_MIN_COINS,
    },
  });
}
