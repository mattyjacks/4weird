import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { clampLimit, isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { GAME_AI_CUT_NOTE } from "@/lib/game-ai";
import { runpodUsdToCoins } from "@/lib/runpod";

export const dynamic = "force-dynamic";

type Spend = { gross: number; cut: number; provider: number; turns: number };

const ZERO: Spend = { gross: 0, cut: 0, provider: 0, turns: 0 };

function toSpend(value: unknown): Spend {
  const v = (value ?? {}) as Partial<Spend>;
  return {
    gross: Number(v.gross) || 0,
    cut: Number(v.cut) || 0,
    provider: Number(v.provider) || 0,
    turns: Number(v.turns) || 0,
  };
}

/**
 * GET /api/my/usage?session=<uuid>&limit=25; the full compute-spend ledger
 * behind 4weird.com/my/usage/. Aggregates EVERY way we charge for compute:
 *   - game_ai_usage (game dialogue/director/TTS/RunPod/inference + buddy
 *     chat/voice) via my_compute_usage(): session + total + last hour +
 *     last 24h + by-kind + by-game, each split 25% cut / 75% provider.
 *   - coin_ledger (personal Vibe Coin debits/credits, recent rows).
 *   - compute_usage (agent-rental metered bookings: renter view).
 *   - cloud_usage + platform_compute_cuts (UnitUnite workspace spend the
 *     caller may see via their org permission).
 *   - functions: serverlessFFN-style function runs are the cloud catalog's
 *     serverless-worker / serverless-cron / inference-api provisions; they
 *     appear under workspace rows with service_key + unit so functions spend
 *     is never hidden inside a generic "compute" bucket.
 *   - game_play_usage (game rentals: proportional load fee + per-second
 *     playtime heartbeats) via my_game_play_usage(): total + last hour + last 24h +
 *     by-game + recent, each split 25% cut / 75% provider.
 *   - clan personal spend (post/comment/message server-cost fees at 25% cut,
 *     plus owner funding + member donations at 1:1) via my_clan_usage():
 *     total + last hour + last 24h + by-reason + recent. Without this section
 *     clan fees would hide inside generic coin movements.
 *   - runpod_usage (REAL RunPod spend mirrored via POST /api/agents/runpod-sync
 *     with RUNPOD_API_KEY: pods + serverless + volumes in USD with a Vibe Coin
 *     display equivalent. Billed by RunPod directly; no Vibe cut applies.)
 *
 * Missing tables / unconfigured Supabase degrade to zeros + rows: [] (the
 * page still renders the full breakdown skeleton).
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`usage:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const q = new URL(req.url).searchParams;
  const sessionRaw = q.get("session");
  const session = sessionRaw && isUuid(sessionRaw) ? sessionRaw : null;
  const limit = clampLimit(q.get("limit"), 25, 100);

  // 1. Game AI rollup (session / total / lastHour / last24h / byKind / byGame).
  let gameAi: {
    session: Spend;
    total: Spend;
    lastHour: Spend;
    last24h: Spend;
    byKind: { kind: string; turns: number; gross: number; cut: number; provider: number }[];
    byGame: { game_slug: string; turns: number; gross: number; cut: number; provider: number }[];
  } = { session: ZERO, total: ZERO, lastHour: ZERO, last24h: ZERO, byKind: [], byGame: [] };
  try {
    const { data: rollup, error } = await supabase.rpc("my_compute_usage", { p_session: session });
    if (!error && rollup) {
      const r = rollup as Record<string, unknown>;
      gameAi = {
        session: toSpend(r.session),
        total: toSpend(r.total),
        lastHour: toSpend(r.lastHour),
        last24h: toSpend(r.last24h),
        byKind: Array.isArray(r.byKind) ? (r.byKind as typeof gameAi.byKind) : [],
        byGame: Array.isArray(r.byGame) ? (r.byGame as typeof gameAi.byGame) : [],
      };
    }
  } catch {
    // Table/RPC missing pre-migration: zeros are the honest answer.
  }

  // 2. Recent personal coin movements (all spend, not just compute).
  let coins: { delta: number; reason: string; created_at: string }[] = [];
  try {
    const { data: rows } = await supabase
      .from("coin_ledger")
      .select("delta,reason,created_at")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    coins = (rows ?? []) as typeof coins;
  } catch {
    coins = [];
  }

  // 3. Recent game-AI rows (per-turn detail for the table).
  let recentGameAi: Record<string, unknown>[] = [];
  try {
    let query = supabase
      .from("game_ai_usage")
      .select("game_slug,kind,mode,session_id,qty,gross_coins,cut_coins,provider_coins,source,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (session) query = query.eq("session_id", session);
    const { data: rows } = await query;
    recentGameAi = (rows ?? []) as Record<string, unknown>[];
  } catch {
    recentGameAi = [];
  }

  // 4. Agent-rental compute (renter-visible metered slices).
  const agentCompute: { gross: number; cut: number; provider: number; slices: number } = {
    gross: 0,
    cut: 0,
    provider: 0,
    slices: 0,
  };
  try {
    const { data: bookings } = await supabase.from("rental_bookings").select("id").eq("renter_id", data.user.id);
    const ids = ((bookings ?? []) as { id: string }[]).map((b) => b.id);
    if (ids.length) {
      const { data: slices } = await supabase
        .from("compute_usage")
        .select("gross_cents,cut_cents,provider_cents")
        .in("booking_id", ids.slice(0, 100));
      for (const s of (slices ?? []) as { gross_cents: number; cut_cents: number; provider_cents: number }[]) {
        agentCompute.gross += Number(s.gross_cents) || 0;
        agentCompute.cut += Number(s.cut_cents) || 0;
        agentCompute.provider += Number(s.provider_cents) || 0;
        agentCompute.slices += 1;
      }
    }
  } catch {
    // Pre-migration or RLS: zeros.
  }

  // 5. Workspace cloud spend visible to the caller (functions included:
  //    serverless-worker / serverless-cron / inference-api are function runs).
  const workspace: {
    gross: number;
    cut: number;
    provider: number;
    charges: number;
    functions: { gross: number; cut: number; charges: number };
    byService: { service: string; unit: string; qty: number; gross: number; cut: number; provider: number }[];
  } = { gross: 0, cut: 0, provider: 0, charges: 0, functions: { gross: 0, cut: 0, charges: 0 }, byService: [] };
  try {
    const { data: provisions } = await supabase.from("cloud_provisions").select("id,service_key").limit(200);
    const provRows = (provisions ?? []) as { id: string; service_key: string }[];
    if (provRows.length) {
      const ids = provRows.map((p) => p.id).slice(0, 200);
      const keyById = new Map(provRows.map((p) => [p.id, p.service_key]));
      const { data: usage } = await supabase
        .from("cloud_usage")
        .select("provision_id,qty,coins,cut_coins,provider_coins,created_at")
        .in("provision_id", ids)
        .order("created_at", { ascending: false })
        .limit(limit * 4);
      const byService = new Map<string, { service: string; unit: string; qty: number; gross: number; cut: number; provider: number }>();
      const FUNCTION_KEYS = new Set(["serverless-worker", "serverless-cron", "inference-api", "buddy-chat", "realtime-relay", "job-queue"]);
      for (const u of (usage ?? []) as {
        provision_id: string;
        qty: number;
        coins: number;
        cut_coins: number;
        provider_coins: number;
      }[]) {
        const service = keyById.get(u.provision_id) ?? "unknown";
        workspace.gross += Number(u.coins) || 0;
        workspace.cut += Number(u.cut_coins) || 0;
        workspace.provider += Number(u.provider_coins) || 0;
        workspace.charges += 1;
        if (FUNCTION_KEYS.has(service)) {
          workspace.functions.gross += Number(u.coins) || 0;
          workspace.functions.cut += Number(u.cut_coins) || 0;
          workspace.functions.charges += 1;
        }
        const cur = byService.get(service) ?? { service, unit: "", qty: 0, gross: 0, cut: 0, provider: 0 };
        cur.qty += Number(u.qty) || 0;
        cur.gross += Number(u.coins) || 0;
        cur.cut += Number(u.cut_coins) || 0;
        cur.provider += Number(u.provider_coins) || 0;
        byService.set(service, cur);
      }
      workspace.byService = [...byService.values()].sort((a, b) => b.gross - a.gross);
    }
  } catch {
    // No teams tables / no membership: zeros.
  }

  // 6. Game rentals (proportional load + per-second playtime heartbeats).
  let gameRent: {
    total: Spend;
    lastHour: Spend;
    last24h: Spend;
    byGame: { game_slug: string; sessions: number; gross: number; cut: number; provider: number }[];
    recent: { game_slug: string; gross_coins: number; cut_coins: number; source: string; created_at: string }[];
  } = {
    total: { ...ZERO, turns: 0 },
    lastHour: { ...ZERO, turns: 0 },
    last24h: { ...ZERO, turns: 0 },
    byGame: [],
    recent: [],
  };
  try {
    const { data: rollup, error } = await supabase.rpc("my_game_play_usage");
    if (!error && rollup) {
      const r = rollup as Record<string, unknown>;
      const asSpend = (v: unknown): Spend => {
        const s = toSpend(v);
        const sessions = Number((v as { sessions?: unknown } | null)?.sessions) || 0;
        return { ...s, turns: sessions };
      };
      gameRent = {
        total: asSpend(r.total),
        lastHour: asSpend(r.lastHour),
        last24h: asSpend(r.last24h),
        byGame: Array.isArray(r.byGame) ? (r.byGame as typeof gameRent.byGame) : [],
        recent: Array.isArray(r.recent) ? (r.recent as typeof gameRent.recent) : [],
      };
    }
  } catch {
    // Pre-migration: zeros.
  }

  // 6b. Clan personal spend (post/comment/message fees + funding/donations).
  // Every clan debit lands in coin_ledger with a 'Clan ...' reason, so this
  // aggregates the caller's own rows: no clan is ever a hidden bucket.
  let clan: {
    total: { gross: number; cut: number; charges: number };
    lastHour: { gross: number; cut: number; charges: number };
    last24h: { gross: number; cut: number; charges: number };
    byReason: { label: string; charges: number; gross: number }[];
    recent: { delta: number; reason: string; created_at: string }[];
  } = {
    total: { gross: 0, cut: 0, charges: 0 },
    lastHour: { gross: 0, cut: 0, charges: 0 },
    last24h: { gross: 0, cut: 0, charges: 0 },
    byReason: [],
    recent: [],
  };
  try {
    const { data: rollup, error } = await supabase.rpc("my_clan_usage");
    if (!error && rollup) {
      const r = rollup as Record<string, unknown>;
      const asClan = (v: unknown): { gross: number; cut: number; charges: number } => ({
        gross: Number((v as { gross?: unknown } | null)?.gross) || 0,
        cut: Number((v as { cut?: unknown } | null)?.cut) || 0,
        charges: Number((v as { charges?: unknown } | null)?.charges) || 0,
      });
      clan = {
        total: asClan(r.total),
        lastHour: asClan(r.lastHour),
        last24h: asClan(r.last24h),
        byReason: Array.isArray(r.byReason) ? (r.byReason as typeof clan.byReason) : [],
        recent: Array.isArray(r.recent) ? (r.recent as typeof clan.recent) : [],
      };
    } else {
      // Pre-migration fallback: aggregate the caller's Clan rows directly.
      const { data: rows } = await supabase
        .from("coin_ledger")
        .select("delta,reason,created_at")
        .eq("user_id", data.user.id)
        .ilike("reason", "Clan %")
        .order("created_at", { ascending: false })
        .limit(200);
      const list = (rows ?? []) as { delta: number; reason: string; created_at: string }[];
      const sum = (pred: (row: (typeof list)[number]) => boolean): { gross: number; cut: number; charges: number } => {
        let gross = 0;
        let charges = 0;
        for (const row of list) {
          if (!pred(row)) continue;
          const debit = Math.max(0, -(Number(row.delta) || 0));
          gross += debit;
          charges += 1;
        }
        gross = Math.round(gross * 100) / 100;
        return { gross, cut: Math.round(gross * 25) / 100, charges };
      };
      const hourAgo = Date.now() - 3_600_000;
      const dayAgo = Date.now() - 86_400_000;
      clan = {
        total: sum(() => true),
        lastHour: sum((row) => Date.parse(row.created_at) > hourAgo),
        last24h: sum((row) => Date.parse(row.created_at) > dayAgo),
        byReason: [],
        recent: list.slice(0, limit),
      };
    }
  } catch {
    // Pre-migration or RLS: zeros.
  }
  const clanTotalGross = Number(clan.total.gross) || 0;
  const clanTotalCut = Number(clan.total.cut) || 0;

  // 7b. fal.ai media (30 ops, 25% cut INCLUDED via meter_fal_usage).
  // Pre-migration or RLS: zeros so the page still renders its skeleton.
  const fal: {
    total: { gross: number; cut: number; provider: number; charges: number };
    byOp: { op: string; charges: number; gross: number; cut: number; provider: number }[];
    byGame: { game_slug: string; charges: number; gross: number; cut: number; provider: number }[];
    recent: { game_slug: string; op: string; qty: number; gross_coins: number; cut_coins: number; source: string; created_at: string }[];
  } = { total: { gross: 0, cut: 0, provider: 0, charges: 0 }, byOp: [], byGame: [], recent: [] };
  try {
    const { data: rollup, error } = await supabase.rpc("my_fal_usage");
    if (!error && rollup) {
      const r = rollup as Record<string, unknown>;
      const t = (r.total ?? {}) as { gross?: unknown; cut?: unknown; provider?: unknown; charges?: unknown };
      fal.total = {
        gross: Number(t.gross) || 0,
        cut: Number(t.cut) || 0,
        provider: Number(t.provider) || 0,
        charges: Number(t.charges) || 0,
      };
      if (Array.isArray(r.byOp)) fal.byOp = r.byOp as typeof fal.byOp;
      if (Array.isArray(r.byGame)) fal.byGame = r.byGame as typeof fal.byGame;
      if (Array.isArray(r.recent)) fal.recent = r.recent as typeof fal.recent;
    }
  } catch {
    // Pre-migration: zeros.
  }
  const falTotalGross = Number(fal.total.gross) || 0;
  const falTotalCut = Number(fal.total.cut) || 0;

  // 7c. Game .zip submissions + Weird Vault + Meshy.ai (25% cut INCLUDED).
  // Pre-migration or RLS: zeros so the page still renders its skeleton.
  async function spendRollup(fn: string): Promise<{ gross: number; cut: number; provider: number; turns: number }> {
    try {
      const { data: rollup, error } = await supabase.rpc(fn as "my_fal_usage");
      if (!error && rollup) {
        const r = rollup as Record<string, unknown>;
        return {
          gross: Number(r.gross) || 0,
          cut: Number(r.cut) || 0,
          provider: Number(r.provider) || 0,
          turns: Number(r.turns) || 0,
        };
      }
    } catch {
      // Pre-migration: zeros.
    }
    return { gross: 0, cut: 0, provider: 0, turns: 0 };
  }
  const submissions = await spendRollup("my_submission_spend");
  const meshy = await spendRollup("my_meshy_spend");
  const vault = await spendRollup("my_vault_spend");

  const combined = {
    gross:
      Math.round(
        (gameAi.total.gross + agentCompute.gross + workspace.gross + gameRent.total.gross + clanTotalGross + falTotalGross + submissions.gross + meshy.gross + vault.gross) * 100,
      ) / 100,
    cut:
      Math.round((gameAi.total.cut + agentCompute.cut + workspace.cut + gameRent.total.cut + clanTotalCut + falTotalCut + submissions.cut + meshy.cut + vault.cut) * 100) /
      100,
    provider:
      Math.round(
        (gameAi.total.provider +
          agentCompute.provider +
          workspace.provider +
          gameRent.total.provider +
          (clanTotalGross - clanTotalCut) +
          (falTotalGross - falTotalCut) +
          submissions.provider +
          meshy.provider +
          vault.provider) *
          100,
      ) / 100,
  };

  // 7. RunPod mirror (real spend pulled with RUNPOD_API_KEY; USD, no cut).
  const runpod: {
    totalUsd: number;
    coinsEquivalent: number;
    buckets: number;
    byKind: { kind: string; usd: number }[];
    recent: { kind: string; remote_id: string; time_bucket: string; amount_usd: number; time_billed_ms: number }[];
    lastSync: string | null;
  } = { totalUsd: 0, coinsEquivalent: 0, buckets: 0, byKind: [], recent: [] as typeof runpod.recent, lastSync: null };
  try {
    const { data: rows } = await supabase
      .from("runpod_usage")
      .select("kind,remote_id,time_bucket,amount_usd,time_billed_ms,synced_at")
      .eq("user_id", data.user.id)
      .order("time_bucket", { ascending: false })
      .limit(200);
    const list = (rows ?? []) as {
      kind: string;
      remote_id: string;
      time_bucket: string;
      amount_usd: number;
      time_billed_ms: number;
      synced_at: string;
    }[];
    const sums = new Map<string, number>();
    for (const r of list) {
      const usd = Number(r.amount_usd) || 0;
      runpod.totalUsd += usd;
      runpod.buckets += 1;
      sums.set(r.kind, (sums.get(r.kind) ?? 0) + usd);
      if (!runpod.lastSync || String(r.synced_at) > runpod.lastSync) runpod.lastSync = String(r.synced_at);
    }
    runpod.totalUsd = Math.round(runpod.totalUsd * 10000) / 10000;
    runpod.coinsEquivalent = runpodUsdToCoins(runpod.totalUsd);
    runpod.byKind = [...sums.entries()]
      .map(([kind, usd]) => ({ kind, usd: Math.round(usd * 10000) / 10000 }))
      .sort((a, b) => b.usd - a.usd);
    runpod.recent = list.slice(0, limit).map((r) => ({
      kind: r.kind,
      remote_id: r.remote_id,
      time_bucket: r.time_bucket,
      amount_usd: Number(r.amount_usd) || 0,
      time_billed_ms: Number(r.time_billed_ms) || 0,
    }));
  } catch {
    // Pre-migration: zeros.
  }

  return ok({
    session: session ? { id: session, ...gameAi.session } : gameAi.session,
    total: gameAi.total,
    lastHour: gameAi.lastHour,
    last24h: gameAi.last24h,
    byKind: gameAi.byKind,
    byGame: gameAi.byGame,
    coins,
    recentGameAi,
    agentCompute,
    workspace,
    gameRent,
    clan,
    runpod,
    fal,
    submissions,
    meshy,
    vault,
    combined,
    note: GAME_AI_CUT_NOTE,
  });
}
