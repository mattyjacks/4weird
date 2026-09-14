import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { quoteBilling } from "@/lib/mmo-billing";

/**
 * GET /api/mmo/billing/quote?serverId=<id>
 *
 * Coins-per-minute QUOTE for an MMORPG server (MMO-06 slice).
 *
 * - Read-only: only SELECTs (`mmorpg_servers` row + active
 *   `mmorpg_sessions` count). ZERO ledger writes, zero INSERT/UPDATE/DELETE,
 *   zero RPC calls, no new columns. `minutes_billed` is never touched here.
 * - Math lives in `@/lib/mmo-billing` (integer centicentcoins, remainder to
 *   host, host covers all when `host_free` or the room is empty).
 * - The actual debit/credit legs are MMO-07's charge route. LEDGER-PAIRING
 *   HOOK POINT: it must write paired `coin_ledger` entries (player debit
 *   FIFO + host/payout credit) keyed off this quote shape — never a parallel
 *   balance column.
 * - Login required (401 anonymous). Server rows are SELECT-visible to any
 *   authenticated user per `mmorpg_servers_select_all`; the quote carries
 *   `ageBand` so clients keep enforcing the join-time age gate.
 */

const noStore = { "Cache-Control": "private, no-store" };

// Demo mirror (same rows as app/api/mmo/servers/route.ts) used ONLY when
// Supabase is not configured, so the quote stays testable in dev.
const DEMO_SERVERS = [
  { id: "emberhold-kids-1", ageBand: "kids", costPerMin: 0, hostFree: true, players: 12 },
  { id: "emberhold-teens-1", ageBand: "teens", costPerMin: 2, hostFree: false, players: 34 },
  { id: "emberhold-adults-1", ageBand: "adults", costPerMin: 5, hostFree: false, players: 87 },
  { id: "dreadhollow-teens-1", ageBand: "teens", costPerMin: 3, hostFree: false, players: 21 },
  { id: "gravegain4d-teens-1", ageBand: "teens", costPerMin: 7, hostFree: false, players: 15 },
  { id: "gravegain5d-adults-1", ageBand: "adults", costPerMin: 9, hostFree: false, players: 9 },
] as const;

export async function GET(req: Request) {
  const serverId = new URL(req.url).searchParams.get("serverId") ?? "";
  if (serverId.trim() === "") {
    return NextResponse.json(
      { success: false, error: "serverId is required." },
      { status: 400, headers: noStore },
    );
  }

  if (!hasServerSupabase()) {
    const demo = DEMO_SERVERS.find((s) => s.id === serverId);
    if (!demo) {
      return NextResponse.json(
        { success: false, error: "Server not found." },
        { status: 404, headers: noStore },
      );
    }
    const quote = quoteBilling({
      serverCostPerMin: demo.costPerMin,
      playerCount: demo.players,
      hostFree: demo.hostFree,
    });
    return NextResponse.json(
      {
        success: true,
        serverId: demo.id,
        ageBand: demo.ageBand,
        ...quote,
        stub: true,
      },
      { status: 200, headers: noStore },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Login required.", 401);

  const { data: server, error: serverError } = await supabase
    .from("mmorpg_servers")
    .select("id,age_band,host_free,cost_per_min")
    .eq("id", serverId)
    .maybeSingle();
  if (serverError) {
    return NextResponse.json(
      { success: false, error: "Unable to load server." },
      { status: 500, headers: noStore },
    );
  }
  if (!server) {
    return NextResponse.json(
      { success: false, error: "Server not found." },
      { status: 404, headers: noStore },
    );
  }
  const row = server as {
    id: string;
    age_band: string;
    host_free: boolean;
    cost_per_min: number | null;
  };

  // Active headcount: sessions with no leave timestamp (read-only count).
  const { count, error: countError } = await supabase
    .from("mmorpg_sessions")
    .select("id", { count: "exact", head: true })
    .eq("server_id", serverId)
    .is("left_at", null);
  if (countError) {
    return NextResponse.json(
      { success: false, error: "Unable to count players." },
      { status: 500, headers: noStore },
    );
  }

  const quote = quoteBilling({
    serverCostPerMin: row.cost_per_min,
    playerCount: count ?? 0,
    hostFree: row.host_free,
  });
  return ok({
    serverId: row.id,
    ageBand: row.age_band,
    ...quote,
  });
}
