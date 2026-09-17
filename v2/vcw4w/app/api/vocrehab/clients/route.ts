import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { resolveVocrehabActor } from "@/lib/vocrehab-actor";

export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const actor = await resolveVocrehabActor(req);
  if (!actor) return fail("Sign in with the adult parent/provider account or use your active child session.", 401);
  if (actor.kind === "kid") {
    const { data, error } = await actor.db.from("vocrehab_provider_clients").select("id,kid_id,client_label,consented_at").eq("parent_id", actor.userId).eq("kid_id", actor.kidId).is("revoked_at", null).maybeSingle();
    if (error) return dbFail("vocrehab/clients", error);
    return ok({ actor: "kid", enrollment: data ?? null });
  }

  const [{ data: kids, error: kidsError }, { data: links, error: linksError }] = await Promise.all([
    actor.db.from("kid_accounts").select("id,username,discriminator,age_band,status").eq("parent_id", actor.userId).eq("status", "active").order("created_at"),
    actor.db.from("vocrehab_provider_clients").select("id,kid_id,client_label,consented_at,revoked_at").eq("parent_id", actor.userId).is("revoked_at", null),
  ]);
  if (kidsError || linksError) return dbFail("vocrehab/clients", kidsError ?? linksError);
  return ok({ actor: "provider", kids: kids ?? [], enrollments: links ?? [] });
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const actor = await resolveVocrehabActor(req);
  if (!actor) return fail("Sign in with the adult parent/provider account.", 401);
  if (actor.kind !== "provider") return fail("Only the adult parent/provider account can enable VocRehab features.", 403);
  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return fail("Invalid JSON body.", 400); }
  if (typeof input.kid_id !== "string") return fail("kid_id is required.", 400);
  const { data: kid, error: kidError } = await actor.db.from("kid_accounts").select("id,parent_id,username,discriminator,status").eq("id", input.kid_id).maybeSingle();
  if (kidError) return dbFail("vocrehab/clients", kidError);
  if (!kid || kid.parent_id !== actor.userId || kid.status !== "active") return fail("That child account is not owned by this parent account.", 403);
  const { error: profileError } = await actor.db.from("vocrehab_provider_profiles").upsert({ user_id: actor.userId }, { onConflict: "user_id" });
  if (profileError) return dbFail("vocrehab/clients", profileError);
  const { data, error } = await actor.db.from("vocrehab_provider_clients").upsert({ counselor_id: actor.userId, parent_id: actor.userId, kid_id: kid.id, client_label: typeof input.client_label === "string" ? input.client_label.trim().slice(0, 64) : "" }, { onConflict: "counselor_id,kid_id" }).select("id,kid_id,client_label,consented_at,revoked_at").single();
  if (error || !data) return dbFail("vocrehab/clients", error ?? new Error("No enrollment returned"));
  return ok({ enrollment: data, notice: "The parent account controls this child identity. Enabling the VocRehab extension does not change the child's core account or credentials." }, 201);
}

export async function PATCH(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const actor = await resolveVocrehabActor(req);
  if (!actor) return fail("Sign in with the adult parent/provider account.", 401);
  if (actor.kind !== "provider") return fail("Only the adult parent/provider account can manage VocRehab enrollments.", 403);
  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return fail("Invalid JSON body.", 400); }
  if (typeof input.id !== "string" || typeof input.revoked !== "boolean") return fail("id and revoked are required.", 400);
  const { data, error } = await actor.db.from("vocrehab_provider_clients").update({ revoked_at: input.revoked ? new Date().toISOString() : null }).eq("id", input.id).eq("parent_id", actor.userId).select("id,kid_id,revoked_at").maybeSingle();
  if (error) return dbFail("vocrehab/clients", error);
  if (!data) return fail("Enrollment not found.", 404);
  return ok({ enrollment: data });
}
