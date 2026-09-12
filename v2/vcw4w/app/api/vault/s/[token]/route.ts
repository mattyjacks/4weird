import { NextResponse } from "next/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { fail } from "@/lib/api-respond";
import { VAULT_BUCKET } from "@/lib/blob-vault";

export const dynamic = "force-dynamic";

/**
 * GET /api/vault/s/[token]; redeem a share link (public, no login).
 * Enforces expiry + quarantine + trash at redeem time, then 302s to a
 * short-lived (5 min) signed URL for exactly that file. Unknown -> 404,
 * expired/revoked -> 410.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) return fail("Link not found.", 404);

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Vault unavailable.", 503);
  }
  const { data: share } = await svc.from("vault_shares").select("file_id,expires_at").eq("token", token).maybeSingle();
  const s = share as { file_id: string; expires_at: string | null } | null;
  if (!s) return fail("Link not found.", 404);
  if (s.expires_at && new Date(s.expires_at).getTime() <= Date.now()) return fail("Link expired.", 410);

  const { data: file } = await svc
    .from("vault_files")
    .select("scope,owner_id,team_id,org_id,path,quarantined,sha256,deleted_at")
    .eq("id", s.file_id)
    .maybeSingle();
  const f = file as {
    scope: string;
    owner_id: string | null;
    team_id: string | null;
    org_id: string | null;
    path: string;
    quarantined: boolean;
    sha256: string;
    deleted_at: string | null;
  } | null;
  if (!f || f.deleted_at) return fail("Link not found.", 404);
  if (f.quarantined) return fail("Link not found.", 404);

  const { data: blob } = await svc.from("vault_blobs").select("storage_path").eq("sha256", f.sha256).maybeSingle();
  const storagePath = (blob as { storage_path?: string } | null)?.storage_path;
  const scopeId = String(f.scope === "personal" ? f.owner_id : f.scope === "team" ? f.team_id : f.org_id ?? "");
  if (!storagePath || !storagePath.startsWith(`${f.scope}/${scopeId}/`)) return fail("Link not found.", 404);

  const { data: signed } = await svc.storage.from(VAULT_BUCKET).createSignedUrl(storagePath, 300, {
    download: f.path.split("/").pop() ?? "download",
  });
  if (!signed?.signedUrl) return fail("Vault unavailable.", 503);
  return NextResponse.redirect(signed.signedUrl, 302);
}
