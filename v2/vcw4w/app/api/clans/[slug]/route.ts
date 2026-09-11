import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import { meterTransfer } from "@/lib/clan-meter";

export const dynamic = "force-dynamic";

function isClanSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(s) ? s : "";
}

// GET /api/clans/[slug] — public clan + visible posts + wallet/upkeep ledger,
// deployed bots, monetization channels, XP leaderboard. Accrues upkeep lazily
// for signed-in readers (anonymous reads skip the write).
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const rl = rateLimit(`clan-get:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data: clan, error } = await supabase
    .from("clans")
    .select("id,slug,name,description,owner_id,created_at,clan_type,upkeep_status,upkeep_grace_until")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !clan) return fail("Clan not found.", 404);
  const row = clan as { id: string } & Record<string, unknown>;
  const { data: auth } = await supabase.auth.getUser();
  // Lazy per-minute upkeep accrual for signed-in readers (best-effort, never
  // blocks). The cron biller (/api/cron/clan-upkeep) covers every clan each
  // minute at :00; this keeps the page fresh between ticks. Anonymous reads
  // skip the write (accrue RPC is authenticated-only).
  if (auth?.user) {
    try {
      await supabase.rpc("accrue_clan_minute_upkeep", { p_clan_id: row.id });
    } catch {
      // Pre-migration or lock contention: the stored status is the answer.
    }
  }
  const { data: posts } = await supabase
    .from("clan_posts")
    .select("id,clan_id,author_id,title,body,image_url,created_at")
    .eq("clan_id", row.id)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(50);
  const { data: members } = await supabase
    .from("clan_members")
    .select("user_id,role")
    .eq("clan_id", row.id)
    .limit(200);
  const [{ data: wallet }, { data: bots }, { data: channels }, { data: ledger }, { data: leaders }] =
    await Promise.all([
      supabase.from("clan_wallets").select("balance,updated_at").eq("clan_id", row.id).maybeSingle(),
      supabase
        .from("clan_bots")
        .select("id,name,created_at")
        .eq("clan_id", row.id)
        .order("created_at", { ascending: true })
        .limit(50),
      supabase
        .from("clan_monetization")
        .select("id,kind,label,target_url,active")
        .eq("clan_id", row.id)
        .eq("active", true)
        .limit(25),
      supabase
        .from("clan_cost_ledger")
        .select("kind,qty,gross,cut,provider,note,created_at")
        .eq("clan_id", row.id)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase.rpc("clan_leaderboard", { p_clan_id: row.id }),
    ]);
  // Discord surfaces: chat channels + custom roles + live per-minute rate.
  // Best-effort (pre-migration rows simply come back empty).
  let chatChannels: unknown[] = [];
  let clanRoles: unknown[] = [];
  let minuteRate: unknown = null;
  try {
    const [{ data: cc }, { data: cr }, { data: mr }] = await Promise.all([
      supabase
        .from("clan_channels")
        .select("id,slug,name,topic,kind,position,readonly")
        .eq("clan_id", row.id)
        .order("position", { ascending: true })
        .limit(50),
      supabase
        .from("clan_roles")
        .select("id,name,color,position")
        .eq("clan_id", row.id)
        .order("position", { ascending: false })
        .limit(50),
      supabase.rpc("clan_minute_rate", { p_clan_id: row.id }),
    ]);
    chatChannels = cc ?? [];
    clanRoles = cr ?? [];
    minuteRate = mr ?? null;
  } catch {
    // Pre-migration: discord surfaces stay empty, the forum still renders.
  }
  let myXp = 0;
  if (auth?.user) {
    try {
      const { data: xpRows } = await supabase
        .from("clan_xp_ledger")
        .select("xp")
        .eq("clan_id", row.id)
        .eq("user_id", auth.user.id)
        .limit(500);
      for (const r of ((xpRows ?? []) as { xp: number }[])) myXp += Number(r.xp) || 0;
    } catch {
      myXp = 0;
    }
  }
  const leadersRaw = (leaders ?? {}) as { leaders?: unknown };
  const payload = {
    clan,
    posts: posts ?? [],
    memberCount: (members ?? []).length,
    members: members ?? [],
    wallet: wallet ?? { balance: 0 },
    bots: bots ?? [],
    channels: channels ?? [],
    chatChannels,
    clanRoles,
    minuteRate,
    ledger: ledger ?? [],
    leaders: Array.isArray(leadersRaw.leaders) ? leadersRaw.leaders : [],
    myXp,
  };
  // Bandwidth accounting: meter the bytes this response serves (best-effort).
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
    void meterTransfer(supabase, row.id, bytes, "page-view");
  } catch {
    // Metering never breaks a read.
  }
  return ok(payload);
}

// POST /api/clans/[slug] with { action: "join" } — join the clan (auth).
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`clan-join:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  const clanId = (clan as { id?: string } | null)?.id;
  if (!clanId) return fail("Clan not found.", 404);
  const { error } = await supabase.rpc("join_clan", { p_clan_id: clanId });
  if (error) return fail("Unable to join clan.", 500);
  return ok({ joined: true });
}
