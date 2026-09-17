import { checkAuthenticatedVendorEligibility } from "@/lib/vendor-eligibility";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { requireHuman } from "@/lib/botid";
import { rpcStatus } from "@/lib/agent-market";

/**
 * POST /api/outscraper/search; run one op from the 4 Outscraper vendor
 * modules (outscraper-maps, outscraper-reviews, outscraper-search,
 * outscraper-leads).
 * Body: { op, query, location?, game_slug?, source? }.
 *
 * Conventions copied from POST /api/fal/generate: Supabase gate, same-origin
 * CSRF shield, signed-in human (botid), per-user rate limit, honest
 * started:false + quote when the server key is missing, balance pre-check
 * (402 when short), 20s upstream abort, sliced upstream error text, and the
 * server key never leaves the server (sent as X-API-KEY, never echoed).
 *
 * Economy: quotes are gross Vibe Coins with the 25% platform cut INCLUDED
 * (same rule as fal). Debit-first metering via the meter_outscraper_usage
 * RPC lands BEFORE the upstream fetch, mirroring meter_fal_usage in
 * /api/fal/generate (a failed meter fails the run so provider spend can
 * never leak free). The balance pre-check below stays; the RPC re-checks
 * under its spend lock.
 */

const OUTSCRAPER_BASE = "https://api.app.outscraper.com";
const FALLBACK_API_PATH = "/google-search-v3";
const CUT_PCT = 25;

// Hidden from static analysis on purpose: Turbopack treats even a variable
// `await import(specifier)` as a resolvable dependency and fails the build
// while a sibling vendor module is absent. `new Function` keeps the
// specifier opaque while the try/catch below preserves fail-soft.
type DynamicImporter = (spec: string) => Promise<unknown>;
const dynImport: DynamicImporter = new Function(
  "s",
  "return import(s)",
) as DynamicImporter;

type OpDef = {
  op: string;
  name: string;
  unit: string;
  coinsPerUnit: number;
  blurb: string;
  api: string;
  vendor: string;
};

function normalizeOps(raw: unknown, vendor: string): OpDef[] {
  if (!Array.isArray(raw)) return [];
  const out: OpDef[] = [];
  for (const item of raw as Record<string, unknown>[]) {
    if (!item || typeof item.op !== "string" || !item.op) continue;
    out.push({
      op: item.op,
      name: String(item.name ?? item.op),
      unit: String(item.unit ?? "search"),
      coinsPerUnit: Number(item.coinsPerUnit ?? 0) || 0,
      blurb: String(item.blurb ?? ""),
      api: String(item.api ?? ""),
      vendor,
    });
  }
  return out;
}

function opsFromModule(mod: Record<string, unknown>, vendor: string): OpDef[] {
  const candidates = [
    mod.OPS,
    mod.OP_DEFS,
    mod.OUTSCRAPER_MAPS_OPS,
    mod.OUTSCRAPER_REVIEWS_OPS,
    mod.OUTSCRAPER_SEARCH_OPS,
    mod.OUTSCRAPER_LEADS_OPS,
  ];
  for (const c of candidates) {
    const ops = normalizeOps(c, vendor);
    if (ops.length > 0) return ops;
  }
  const keys = mod.OP_KEYS;
  if (Array.isArray(keys)) {
    const lookup =
      (mod.opsByKey as ((op: string) => Record<string, unknown>) | undefined) ??
      (mod.OP_MAP as Record<string, Record<string, unknown>> | undefined);
    const out: OpDef[] = [];
    for (const k of keys as unknown[]) {
      if (typeof k !== "string" || !k) continue;
      let def: Record<string, unknown> | undefined;
      try {
        if (typeof lookup === "function") def = lookup(k) as Record<string, unknown>;
        else if (lookup && typeof lookup === "object") def = lookup[k];
      } catch {
        def = undefined;
      }
      out.push({
        op: k,
        name: String(def?.name ?? k),
        unit: String(def?.unit ?? "search"),
        coinsPerUnit: Number(def?.coinsPerUnit ?? 0) || 0,
        blurb: String(def?.blurb ?? ""),
        api: String(def?.api ?? ""),
        vendor,
      });
    }
    if (out.length > 0) return out;
  }
  return [];
}

async function loadRegistry(): Promise<Map<string, OpDef>> {
  const registry = new Map<string, OpDef>();
  const pairs: [string, string][] = [
    ["@/lib/outscraper-maps", "outscraper-maps"],
    ["@/lib/outscraper-reviews", "outscraper-reviews"],
    ["@/lib/outscraper-search", "outscraper-search"],
    ["@/lib/outscraper-leads", "outscraper-leads"],
  ];
  for (const [specifier, vendor] of pairs) {
    try {
      const mod = (await dynImport(specifier)) as Record<
        string,
        unknown
      >;
      for (const def of opsFromModule(mod, vendor)) {
        if (!registry.has(def.op)) registry.set(def.op, def);
      }
    } catch {
      // Missing sibling module: skip; validated below as catalog unavailable.
    }
  }
  return registry;
}

function quoteSplit(coinsPerUnit: number, qty: number): { gross: number; cut: number; provider: number } {
  const gross = Math.max(1, Math.ceil((Number(coinsPerUnit) || 0) * qty));
  const cut = Math.round(((gross * CUT_PCT) / 100) * 100) / 100;
  return { gross, cut, provider: Math.round((gross - cut) * 100) / 100 };
}

function cleanGameSlug(value: unknown): string {
  return String(value ?? "lobby").trim().toLowerCase().slice(0, 64) || "lobby";
}

function outscraperKey(): string {
  return String(process.env.OUTSCRAPER_API_KEY ?? "").trim();
}

type Db = Awaited<ReturnType<typeof createClient>>;

/** usage_id from a meter_* receipt; null when the receipt is missing-shaped. */
function meterUsageId(meter: unknown): string | null {
  if (!meter || typeof meter !== "object") return null;
  const id = (meter as Record<string, unknown>).usage_id;
  return typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}

/**
 * Credit a metered charge back after a provider failure. Returns true when
 * the refund landed; false keeps the debit and must be surfaced honestly
 * (support reconciles from the usage row + ledger, never silently).
 */
async function refundUsage(
  supabase: Db,
  route: string,
  family: string,
  usageId: string | null,
): Promise<boolean> {
  if (!usageId) {
    console.error(`[${route}] no usage_id to refund; debit stands.`);
    return false;
  }
  try {
    const { error } = await supabase.rpc("refund_vendor_usage", {
      p_family: family,
      p_usage_id: usageId,
    });
    if (error) {
      const msg = (error as { message?: unknown }).message;
      console.error(`[${route}] usage refund failed`, String(msg ?? error).slice(0, 200));
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      `[${route}] usage refund threw`,
      String(error instanceof Error ? error.message : error).slice(0, 200),
    );
    return false;
  }
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return fail(
      "Authentication required. Sign in to run Outscraper tools; the catalog + quotes on /outscraper/ops are free without login.",
      401,
    );
  const vendorAge = await checkAuthenticatedVendorEligibility(supabase, data.user.id, "outscraper");
  if (!vendorAge.allowed) return fail(vendorAge.reason, 403);
  const botBlock = await requireHuman(req, "POST /api/outscraper/search", {
    allowAuthenticated: true,
  });
  if (botBlock) return botBlock;
  const rl = rateLimit(`outscraper:search:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;

  const registry = await loadRegistry();
  const opRaw = String(input.op ?? "");
  const def = registry.get(opRaw);
  if (registry.size === 0) {
    return fail(
      "Outscraper vendor catalog unavailable (lib modules not yet present). Try again after the vendor libs land.",
      503,
    );
  }
  if (!def) {
    const known = [...registry.keys()].sort().join(", ");
    return fail(`Invalid op. Pick one of: ${known.slice(0, 180)}.`, 400);
  }

  const query = String(input.query ?? "").trim().slice(0, 500);
  if (query.length < 2) return fail(`${def.name} needs a query (2+ chars).`, 400);
  const location =
    typeof input.location === "string" ? input.location.trim().slice(0, 200) : "";

  const game = cleanGameSlug(input.game_slug ?? input.game ?? "lobby");
  if (!/^[a-z0-9-]{1,64}$/.test(game)) return fail("Invalid game_slug.", 400);

  const sourceRaw = String(input.source ?? "outscraper-studio");
  const source =
    sourceRaw === "vcw"
      ? "vcw"
      : sourceRaw === "api"
        ? "api"
        : sourceRaw === "manual"
          ? "manual"
          : "outscraper-studio";

  const qty = 1;
  const quote = quoteSplit(def.coinsPerUnit, qty);

  const key = outscraperKey();
  if (!key) {
    return ok({
      started: false,
      configured: false,
      op: opRaw,
      vendor: def.vendor,
      quote,
      note: `Includes ${CUT_PCT}% platform cut; never added on top.`,
      hint: "Set OUTSCRAPER_API_KEY on the server to queue real Outscraper runs.",
    });
  }

  // Balance pre-check (402 when short), then the debit lands BEFORE the
  // upstream fetch: metering gates the goods.
  try {
    const { data: bal, error: balError } = await supabase.rpc("get_my_coin_balance");
    if (balError) return dbFail("api/outscraper/search", balError, "Unable to check balance.");
    if ((Number(bal) || 0) < quote.gross) return fail("Insufficient Vibe Coin balance.", 402);
  } catch (error) {
    return dbFail("api/outscraper/search", error, "Unable to check balance.");
  }

  // Debit-first: the meter RPC re-checks balance under its spend lock, so a
  // race that empties the wallet between check and debit still fails closed
  // (insufficient -> 402 via rpcStatus) with no upstream request submitted.
  let meter: unknown = null;
  try {
    const { data: result, error } = await supabase.rpc("meter_outscraper_usage", {
      p_vendor: def.vendor,
      p_game: game,
      p_op: opRaw,
      p_qty: qty,
      p_source: source,
    });
    if (error)
      return rpcFail("api/outscraper/search", error, rpcStatus, "Unable to meter this Outscraper run.");
    meter = result;
  } catch (error) {
    return dbFail("api/outscraper/search", error, "Unable to meter this Outscraper run.");
  }

  // Refund-on-failure: the debit above already landed, so every provider
  // failure below attempts refund_vendor_usage (full gross back, row marked
  // refunded). A failed refund keeps the debit and is said out loud.
  const usageId = meterUsageId(meter);

  const apiPath = def.api && def.api.startsWith("/") ? def.api : FALLBACK_API_PATH;
  const params = new URLSearchParams({ query });
  if (location) params.set("location", location);
  const url = `${OUTSCRAPER_BASE}${apiPath}?${params.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "X-API-KEY": key,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        console.error(
          `[api/outscraper/search] Outscraper rejected the server key (HTTP ${res.status}, op ${opRaw}).`,
        );
        const refunded = await refundUsage(
          supabase,
          "api/outscraper/search",
          "outscraper",
          usageId,
        );
        return fail(
          `Outscraper key rejected (HTTP ${res.status}).${refunded ? " Charge refunded." : " Charge NOT refunded — contact support."}`,
          502,
        );
      }
      const refunded = await refundUsage(
        supabase,
        "api/outscraper/search",
        "outscraper",
        usageId,
      );
      return fail(
        `Outscraper HTTP ${res.status}: ${text.slice(0, 110)}.${refunded ? " Charge refunded." : " Charge NOT refunded — contact support."}`,
        502,
      );
    }
    const upstream = (await res.json()) as unknown;
    return ok(
      {
        started: true,
        configured: true,
        op: opRaw,
        vendor: def.vendor,
        game,
        source,
        quote,
        meter,
        result: upstream,
        note: `Includes ${CUT_PCT}% platform cut; never added on top.`,
      },
      201,
    );
  } catch (error) {
    console.error(
      "[api/outscraper/search] provider fetch failed",
      String(error instanceof Error ? error.message : error).slice(0, 200),
    );
    const refunded = await refundUsage(
      supabase,
      "api/outscraper/search",
      "outscraper",
      usageId,
    );
    return fail(
      `Outscraper request failed.${refunded ? " Charge refunded." : " Charge NOT refunded — contact support."}`,
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}
