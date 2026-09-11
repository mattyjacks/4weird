import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/csrf";
import { cleanByokLabel, isVcwByokKind } from "@/lib/vcw-byok";

export const dynamic = "force-dynamic";

const MAX_PROVIDERS = 20;

/**
 * BYOK provider refs: routing pointers only, NEVER secrets.
 *
 * The full third-party key is never sent to this API, never stored in
 * public.vcw_byok_providers (kind + label + last4 + endpoint_url only), and
 * never returned. The owner pastes the real key into their own worker env /
 * vault out of band; only the last 4 chars are kept for display.
 * Any body carrying key/token/secret/password fields is refused with 400.
 */

function hasSecretField(input: Record<string, unknown>): boolean {
  return Object.keys(input).some((k) => /key|token|secret|password/i.test(k));
}

function cleanLast4(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return /^[A-Za-z0-9]{4,8}$/.test(raw) ? raw : null;
}

function cleanEndpointUrl(value: unknown): string | null {
  const raw = String(value ?? "").trim().slice(0, 500);
  if (!raw) return "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  return url.toString().slice(0, 500);
}

// GET /api/vcw/gateway/providers; list the caller's refs (no secrets exist).
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:gateway:providers:list:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  try {
    const db = serviceClient();
    const { data: rows, error } = await db
      .from("vcw_byok_providers")
      .select("id,kind,label,last4,endpoint_url,created_at")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false });
    if (error) return dbFail("vcw/gateway/providers list", error, "Unable to load providers.");
    return ok({ providers: rows ?? [] });
  } catch (error) {
    return dbFail("vcw/gateway/providers list", error, "Unable to load providers.");
  }
}

// POST /api/vcw/gateway/providers {kind, label, last4?, endpoint_url?}.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Authentication required.", 401);
  const throttle = rateLimit(`vcw:gateway:providers:add:${data.user.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many attempts. Try again shortly.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  if (hasSecretField(input)) {
    return fail("Never send API keys or secrets to this endpoint (last4 only).", 400);
  }

  const kind = String(input.kind ?? "").trim().toLowerCase();
  if (!isVcwByokKind(kind)) return fail("Invalid kind. Use runpod, openai, fal, meshy, or custom.", 400);
  const label = cleanByokLabel(input.label);
  if (!label) return fail("Label needs 1-80 characters.", 400);
  const last4 = cleanLast4(input.last4 ?? input.last_4 ?? "");
  if (last4 === null) return fail("last4 must be empty or 4-8 letters/digits.", 400);
  const endpointUrl = cleanEndpointUrl(input.endpoint_url ?? input.endpointUrl ?? "");
  if (endpointUrl === null) return fail("endpoint_url must be empty or an https URL (no credentials).", 400);
  if (kind === "custom" && !endpointUrl) {
    return fail("Custom providers need an https endpoint_url.", 400);
  }

  try {
    const db = serviceClient();
    const { count } = await db
      .from("vcw_byok_providers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", data.user.id);
    if ((count ?? 0) >= MAX_PROVIDERS) {
      return fail("Provider limit reached. Delete an old one first.", 409);
    }
    const { data: row, error } = await db
      .from("vcw_byok_providers")
      .insert({ user_id: data.user.id, kind, label, last4, endpoint_url: endpointUrl })
      .select("id,kind,label,last4,endpoint_url,created_at")
      .single();
    if (error) return dbFail("vcw/gateway/providers add", error, "Unable to add provider.");
    return ok({ provider: row }, 201);
  } catch (error) {
    return dbFail("vcw/gateway/providers add", error, "Unable to add provider.");
  }
}
