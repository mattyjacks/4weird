import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import { cleanPartyRef, isPartyKind } from "@/lib/parties";

export const dynamic = "force-dynamic";

function statusOf(message: string): number {
  const m = message.toLowerCase();
  if (m.includes("login required")) return 401;
  if (m.includes("forbidden")) return 403;
  if (m.includes("not found")) return 404;
  return 400;
}

// GET /api/parties/resolve?kind=squad|clan|org|individual&ref=<slug|handle|id>
//; unified directory lookup across all four party kinds.
// GET /api/parties/resolve?q=<text> - search all four kinds at once.
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const supabase = await createClient();

  if (q.trim().length >= 2) {
    const rl = rateLimit(`parties-search:${clientIp(req)}`, 60, 60_000);
    if (!rl.allowed) return fail("Rate limited.", 429);
    const { data, error } = await supabase.rpc("party_search", {
      p_query: q.trim().slice(0, 40),
    });
    if (error) return rpcFail("GET /api/parties/resolve", error, statusOf, "Unable to search parties.");
    return ok({ results: data ?? { individuals: [], squads: [], clans: [], orgs: [] } });
  }

  const kind = isPartyKind(url.searchParams.get("kind"));
  const ref = cleanPartyRef(url.searchParams.get("ref"));
  if (!kind || !ref) return fail("kind and ref (or q) are required.", 400);
  const rl = rateLimit(`parties-resolve:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { data, error } = await supabase.rpc("party_resolve", { p_kind: kind, p_ref: ref });
  if (error) {
    const code = String((error as { code?: string }).code ?? "");
    if (code === "P0001" || code === "") {
      const msg = String((error as { message?: string }).message ?? "Party not found.");
      return fail(msg.slice(0, 200) || "Party not found.", statusOf(msg));
    }
    return dbFail("GET /api/parties/resolve", error, "Unable to resolve party.");
  }
  return ok({ party: data });
}
