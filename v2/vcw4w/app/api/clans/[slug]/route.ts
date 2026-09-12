import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import { meterTransfer } from "@/lib/clan-meter";
import { normalizeBoard, normalizeFlair, normalizeSort, sortClanPosts } from "@/lib/clan-forum";

export const dynamic = "force-dynamic";

function isClanSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(s) ? s : "";
}

// GET /api/clans/[slug]; public clan + visible posts + wallet/upkeep ledger,
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
  // member_count falls back to the legacy column set on a pre-migration DB
  // (the scale migration adds it); the roster RPC call below degrades to
  // the legacy pull in the same case.
  let clan: Record<string, unknown> | null = null;
  {
    const full = await supabase
      .from("clans")
      .select("id,slug,name,description,owner_id,created_at,clan_type,upkeep_status,upkeep_grace_until,member_count")
      .eq("slug", slug)
      .maybeSingle();
    if (!full.error) {
      clan = (full.data ?? null) as Record<string, unknown> | null;
    } else if (/member_count/i.test(String(full.error.message ?? ""))) {
      const legacy = await supabase
        .from("clans")
        .select("id,slug,name,description,owner_id,created_at,clan_type,upkeep_status,upkeep_grace_until")
        .eq("slug", slug)
        .maybeSingle();
      if (legacy.error || !legacy.data) return fail("Clan not found.", 404);
      clan = legacy.data as Record<string, unknown>;
    } else {
      return fail("Clan not found.", 404);
    }
  }
  if (!clan) return fail("Clan not found.", 404);
  const row = clan as { id: string; member_count?: number } & Record<string, unknown>;
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
  // Forum feed: sortable (hot/new/top) + flair-filterable. New vote/flair
  // columns fall back to legacy ones on a pre-migration DB so the board
  // keeps rendering (scores zeroed) until the migration lands.
  const url = new URL(req.url);
  const sort = normalizeSort(url.searchParams.get("sort"));
  const flairFilter = normalizeFlair(url.searchParams.get("flair"));
  const boardFilter = normalizeBoard(url.searchParams.get("board"));
  type PostRow = Record<string, unknown> & { id: string; created_at: string; score: number; board: string };
  let postRows: PostRow[] = [];
  {
    let query = supabase
      .from("clan_posts")
      .select("id,clan_id,author_id,title,body,image_url,flair,board,score,upvotes,downvotes,comment_count,created_at")
      .eq("clan_id", row.id)
      .eq("status", "visible");
    if (boardFilter) query = query.eq("board", boardFilter);
    const { data, error: postError } = await query
      .order("created_at", { ascending: false })
      .limit(100);
    if (!postError) {
      postRows = ((data ?? []) as PostRow[]).map((p) => ({
        ...p,
        flair: typeof p.flair === "string" ? p.flair : "",
        board: typeof p.board === "string" && p.board ? p.board : "s",
        score: Number(p.score) || 0,
        upvotes: Number(p.upvotes) || 0,
        downvotes: Number(p.downvotes) || 0,
        comment_count: Number(p.comment_count) || 0,
      }));
    } else if (/flair|board|score|upvotes|downvotes|comment_count/i.test(String(postError.message ?? ""))) {
      const legacy = await supabase
        .from("clan_posts")
        .select("id,clan_id,author_id,title,body,image_url,created_at")
        .eq("clan_id", row.id)
        .eq("status", "visible")
        .order("created_at", { ascending: false })
        .limit(100);
      if (legacy.error) return dbFail("api/clans/[slug] GET", legacy.error, "Unable to load posts.");
      postRows = ((legacy.data ?? []) as unknown as PostRow[]).map((p) => ({
        ...p,
        flair: "",
        board: "s",
        score: 0,
        upvotes: 0,
        downvotes: 0,
        comment_count: 0,
      }));
    } else {
      return dbFail("api/clans/[slug] GET", postError, "Unable to load posts.");
    }
  }
  const filtered = flairFilter ? postRows.filter((p) => p.flair === flairFilter) : postRows;
  const posts = sortClanPosts(filtered, sort).slice(0, 50);
  // The signed-in reader's own post votes (powers the highlight).
  let myPostVotes: Record<string, number> = {};
  if (auth?.user && posts.length > 0) {
    try {
      const { data: votes } = await supabase
        .from("clan_votes")
        .select("target_id,value")
        .eq("target_type", "post")
        .eq("user_id", auth.user.id)
        .in("target_id", posts.map((p) => p.id));
      for (const v of ((votes ?? []) as { target_id: string; value: number }[])) {
        myPostVotes[v.target_id] = Number(v.value) || 0;
      }
    } catch {
      myPostVotes = {};
    }
  }
  // Member sidebar stays O(1): cached total + first roster page (100).
  // The old limit-200 pull both capped memberCount at 200 and dragged 200
  // rows on every page view - exactly what breaks at 100k members.
  let members: Array<{ user_id: string; role: string }> = [];
  {
    const { data: rosterPage, error: rosterError } = await supabase.rpc("clan_roster_page", {
      p_clan: row.id,
      p_limit: 100,
      p_cursor: null,
      p_cursor_id: null,
    });
    if (!rosterError) {
      const rosterRows = (rosterPage as { members?: Array<{ user_id: string; role: string }> } | null)?.members ?? [];
      members = rosterRows.slice(0, 100).map((m) => ({ user_id: m.user_id, role: m.role }));
    } else {
      // Pre-migration DB: legacy capped pull (memberCount caps at 200 there).
      const { data: legacyMembers } = await supabase
        .from("clan_members")
        .select("user_id,role")
        .eq("clan_id", row.id)
        .limit(200);
      members = ((legacyMembers ?? []) as Array<{ user_id: string; role: string }>);
    }
  }
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
  // Clan chat surfaces: chat channels + custom roles + live per-minute rate.
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
    // Pre-migration: chat surfaces stay empty, the forum still renders.
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
    posts,
    sort,
    flair: flairFilter,
    board: boardFilter,
    myPostVotes,
    memberCount: Number(row.member_count) || members.length,
    members,
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

// POST /api/clans/[slug] with { action: "join" }; join the clan (auth).
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
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
  if (error) {
    if (/member limit reached/i.test(String(error.message ?? ""))) {
      return fail("This clan is full (member limit reached).", 409);
    }
    return fail("Unable to join clan.", 500);
  }
  return ok({ joined: true });
}
