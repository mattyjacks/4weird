import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { getKidSession, hashKidToken, type KidSession } from "@/lib/kid-session";
import { canKidUseFeature } from "@/lib/family";
import type { SupabaseClient } from "@supabase/supabase-js";

export type VocrehabActor =
  | { kind: "provider"; userId: string; db: SupabaseClient }
  | { kind: "kid"; userId: string; kidId: string; kid: KidSession["kid"]; controls: KidSession["controls"]; tokenHash: string; db: SupabaseClient };

/** Shared child-side game permission check for every VocRehab API surface. */
export function canVocrehabActorUseGame(actor: VocrehabActor, gameId: string): boolean {
  if (actor.kind !== "kid") return true;
  const allowlist = Array.isArray(actor.controls?.allowed_games) ? actor.controls.allowed_games : [];
  return !(allowlist.length > 0 && !allowlist.includes(gameId)) && canKidUseFeature(actor.controls, `game:${gameId}`);
}

function readKidSessionCookie(header: string): { present: boolean; token: string | null } {
  const values = header.split(";").flatMap((part) => {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== "kid_session") return [];
    try {
      return [decodeURIComponent(part.slice(separator + 1).trim())];
    } catch {
      return [null];
    }
  });
  if (values.length === 0) return { present: false, token: null };
  // Ambiguous or malformed auth cookies must never select an arbitrary child.
  if (values.length !== 1 || typeof values[0] !== "string" || !values[0]) return { present: true, token: null };
  return { present: true, token: values[0] };
}

/** Resolve a real adult parent account or its existing kid_session. Kid
 * identities remain in kid_accounts; this helper never creates credentials. */
export async function resolveVocrehabActor(req: Request): Promise<VocrehabActor | null> {
  if (!hasServerSupabase()) return null;
  const kidCookie = readKidSessionCookie(req.headers.get("cookie") ?? "");
  if (kidCookie.present) {
    if (!kidCookie.token) return null;
    const db = serviceClient();
    const session = await getKidSession(db, kidCookie.token);
    if (!session) return null;
    return { kind: "kid", userId: session.kid.parent_id, kidId: session.kid.id, kid: session.kid, controls: session.controls, tokenHash: hashKidToken(kidCookie.token), db };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // Provider/counselor capabilities are adult-only, even when a teen account
  // retains a valid Supabase session cookie on the same browser.
  const db = serviceClient();
  const { data: profile, error } = await db.from("profiles").select("age_band").eq("id", user.id).maybeSingle();
  if (error || profile?.age_band !== "adult") return null;
  return { kind: "provider", userId: user.id, db };
}

/** Child access to this extension always requires the explicit active link. */
export async function hasActiveVocrehabEnrollment(actor: VocrehabActor): Promise<{ allowed: boolean; error?: unknown }> {
  if (actor.kind !== "kid") return { allowed: true };
  const { data, error } = await actor.db
    .from("vocrehab_provider_clients")
    .select("id")
    .eq("parent_id", actor.userId)
    .eq("kid_id", actor.kidId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) return { allowed: false, error };
  return { allowed: Boolean(data) };
}
