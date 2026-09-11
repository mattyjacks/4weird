import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isBotUsername } from "@/lib/bot-validate";
import { botDeploysAllowed } from "@/lib/clan-types";

export const dynamic = "force-dynamic";

function isClanSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(s) ? s : "";
}

function isHttpsUrl(v: unknown): string {
  const s = String(v ?? "").trim().slice(0, 2048);
  if (!s) return "";
  return s.startsWith("https://") ? s : "";
}

// GET /api/clans/[slug]/bots; public list of bots deployed on this clan.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  const clanId = (clan as { id?: string } | null)?.id;
  if (!clanId) return fail("Clan not found.", 404);
  const { data: bots, error } = await supabase
    .from("clan_bots")
    .select("id,name,created_at")
    .eq("clan_id", clanId)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) return fail("Unable to load clan bots.", 500);
  return ok({ bots: bots ?? [] });
}

// POST /api/clans/[slug]/bots; owner/mod only.
// { action: "deploy", bot_username, webhook_url? }; sclans + bclans only.
// { action: "remove", id }; unplug a deployed bot.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { slug: raw } = await params;
  const slug = isClanSlug(raw);
  if (!slug) return fail("Invalid clan.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`clan-bots:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const action = String(input.action ?? "");
  const { data: clan } = await supabase
    .from("clans")
    .select("id,clan_type")
    .eq("slug", slug)
    .maybeSingle();
  const clanRow = clan as { id?: string; clan_type?: string } | null;
  if (!clanRow?.id) return fail("Clan not found.", 404);

  if (action === "deploy") {
    if (!botDeploysAllowed(String(clanRow.clan_type ?? "sclan"))) {
      return fail("hclans are human-only; bots cannot deploy here.", 403);
    }
    const botUsername = isBotUsername(input.bot_username);
    if (!botUsername) return fail("Invalid bot username (a-z0-9_, 3-24 chars).", 400);
    const webhook = input.webhook_url === undefined ? "" : isHttpsUrl(input.webhook_url);
    if (input.webhook_url && !webhook) return fail("webhook_url must be https.", 400);
    const { data: rpcData, error } = await supabase.rpc("deploy_clan_bot", {
      p_clan_id: clanRow.id,
      p_bot_username: botUsername,
      p_webhook: webhook,
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (/hclans are human-only/i.test(msg)) return fail("hclans are human-only; bots cannot deploy here.", 403);
      if (/not a moderator/i.test(msg)) return fail("Only the owner or mods can deploy bots.", 403);
      if (/bot not found/i.test(msg)) return fail("Bot not found.", 404);
      if (/invalid/i.test(msg)) return fail("Invalid bot deploy.", 400);
      return fail("Unable to deploy bot.", 500);
    }
    return ok({ deployed: rpcData }, 201);
  }

  if (action === "remove") {
    const id = String(input.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Invalid bot id.", 400);
    const { error } = await supabase.rpc("remove_clan_bot", { p_clan_id: clanRow.id, p_bot_id: id });
    if (error) {
      const msg = String(error.message ?? "");
      if (/not a moderator/i.test(msg)) return fail("Only the owner or mods can remove bots.", 403);
      if (/not found|invalid|login/i.test(msg)) return fail("Invalid bot removal.", 400);
      return fail("Unable to remove bot.", 500);
    }
    return ok({ removed: true });
  }

  return fail('Invalid action (deploy, remove).', 400);
}
