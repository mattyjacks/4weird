import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { clientIp } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import {
  cleanListingName,
  isProviderCode,
  isRuntime,
  normalizeEndpointForProvider,
  parsePriceInput,
} from "@/lib/agent-market";

export const dynamic = "force-dynamic";

/** Public: list available agent listings. Prices shown are gross MAXIMUMS
 *  per hour (include the 25% platform cut); metering bills per second. */
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

/** Host a listing (earn side). Auth required; all writes happen in the
 *  create_listing RPC (client table writes are denied by RLS).
 *
 *  Price is USD/hour gross MAXIMUM (`price_usd_per_hour`, legacy
 *  `price_cents_per_hour` still accepted). RunPod/DigitalOcean listings do
 *  NOT need an endpoint URL — blank means "use the RunPod default endpoint"
 *  (auto-provisioned on booking). Custom listings still need an https URL. */
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
  const price = parsePriceInput(input);
  if (name.length < 1 || !isRuntime(runtime) || !isProviderCode(provider) || !price) {
    return fail(
      "Invalid listing. Need a name (1-80 chars), a runtime (openclaw, nanoclaw, vibecodeworker, xonotic with VibeCodeWorker or self-play, custom), a provider (runpod, digitalocean, custom), and a max price of $0.01-$1000/hour gross (includes 25% platform cut; billed per second).",
      400,
    );
  }
  const { endpoint, error: endpointError } = normalizeEndpointForProvider(
    input.endpoint_url ?? input.endpoint ?? "",
    String(provider),
  );
  if (endpointError) return fail(endpointError, 400);
  const { data: listing, error } = await supabase.rpc("create_listing", {
    p_name: name,
    p_runtime: runtime,
    p_provider: provider,
    p_endpoint: endpoint,
    p_price: price,
  });
  if (error)
    return rpcFail("api/agents", error, (m) => {
      const l = m.toLowerCase();
      if (l.includes("authentication required")) return 401;
      if (l.includes("not authorized")) return 403;
      return 400;
    });
  return ok({
    listing,
    endpointAuto: endpoint === "runpod:auto",
    note:
      endpoint === "runpod:auto"
        ? "RunPod default endpoint: a server is provisioned automatically when someone rents this (up to your max $/hr, billed per second)."
        : undefined,
  });
}
