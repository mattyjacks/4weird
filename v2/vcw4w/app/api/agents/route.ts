import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { clientIp } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import {
  cleanListingName,
  isHttpsEndpoint,
  isPriceCentsPerHour,
  isProviderCode,
  isRuntime,
  rpcStatus,
} from "@/lib/agent-market";

export const dynamic = "force-dynamic";

/** Public: list available agent listings. Prices shown are gross and already
 *  include the 25% platform cut. */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const rl = rateLimit(`agents:list:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const q = new URL(req.url).searchParams;
  const runtime = q.get("runtime") ?? "";
  const provider = q.get("provider") ?? "";
  if (runtime && !isRuntime(runtime)) return fail("Invalid runtime.", 400);
  if (provider && !isProviderCode(provider))
    return fail("Invalid provider.", 400);
  const supabase = await createClient();
  let query = supabase
    .from("agent_listings")
    .select("id,owner_id,name,runtime,provider_code,price_cents_per_hour,status,created_at")
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(100);
  if (runtime) query = query.eq("runtime", runtime);
  if (provider) query = query.eq("provider_code", provider);
  const { data, error } = await query;
  if (error) return fail("Unable to load listings.", 500);
  return ok({ listings: data ?? [] });
}

/** Create a listing. Auth required; all writes happen in the create_listing
 *  RPC (client table writes are denied by RLS). */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`agents:create:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const name = cleanListingName(input.name);
  const runtime = input.runtime;
  const provider = (input.provider_code ?? input.provider) as unknown;
  const endpoint = (input.endpoint_url ?? input.endpoint) as unknown;
  const price = isPriceCentsPerHour(
    input.price_cents_per_hour ?? input.price,
  );
  if (
    name.length < 1 ||
    !isRuntime(runtime) ||
    !isProviderCode(provider) ||
    !isHttpsEndpoint(endpoint) ||
    !price
  ) {
    return fail(
      "Invalid listing. Need name (1-80 chars), runtime openclaw|nanoclaw|custom, provider runpod|digitalocean|custom, https endpoint, price 1..100000 cents/hour gross (includes 25% platform cut).",
      400,
    );
  }
  const { data: listing, error } = await supabase.rpc("create_listing", {
    p_name: name,
    p_runtime: runtime,
    p_provider: provider,
    p_endpoint: String(endpoint),
    p_price: price,
  });
  if (error) return fail(error.message || "Unable to create listing.", rpcStatus(error.message));
  return ok({ listing });
}
