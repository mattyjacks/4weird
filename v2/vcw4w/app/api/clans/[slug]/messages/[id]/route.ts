import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function isClanSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(s) ? s : "";
}

function asUuid(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s) ? s : "";
}

// POST /api/clans/[slug]/messages/[id]; one action per call:
// { action: "react", emoji }; toggle an emoji reaction (members).
// { action: "pin", pinned? }; pin/unpin (owner/mod).
// { action: "edit", body }; edit text (author or mod).
// { action: "delete" }; hide the message (author or mod, row preserved).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const { slug: rawSlug, id: rawId } = await params;
  const slug = isClanSlug(rawSlug);
  const messageId = asUuid(rawId);
  if (!slug || !messageId) return fail("Invalid clan or message.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`clan-msg-act:${u.id}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const action = String(input.action ?? "");
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  if (!(clan as { id?: string } | null)?.id) return fail("Clan not found.", 404);

  if (action === "react") {
    const emoji = String(input.emoji ?? "").trim().slice(0, 32);
    if (!emoji) return fail("Emoji required.", 400);
    const { data: rpcData, error } = await supabase.rpc("toggle_clan_reaction", {
      p_message_id: messageId,
      p_emoji: emoji,
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (/join the clan/i.test(msg)) return fail("Join the clan first.", 403);
      if (/not found/i.test(msg)) return fail("Message not found.", 404);
      return fail("Unable to react.", 500);
    }
    return ok({ reaction: rpcData });
  }

  if (action === "pin") {
    const pinned = input.pinned === undefined ? true : Boolean(input.pinned);
    const { error } = await supabase.rpc("set_clan_message_pin", {
      p_message_id: messageId,
      p_pinned: pinned,
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (/not a moderator/i.test(msg)) return fail("Only owners/mods can pin.", 403);
      if (/not found/i.test(msg)) return fail("Message not found.", 404);
      return fail("Unable to pin.", 500);
    }
    return ok({ pinned });
  }

  if (action === "edit") {
    const text = String(input.body ?? "").trim().slice(0, 2000);
    if (!text) return fail("Message body required.", 400);
    const { error } = await supabase.rpc("edit_clan_message", {
      p_message_id: messageId,
      p_body: text,
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (/not the author/i.test(msg)) return fail("Only the author or a mod can edit.", 403);
      if (/not found/i.test(msg)) return fail("Message not found.", 404);
      return fail("Unable to edit.", 500);
    }
    return ok({ edited: true });
  }

  if (action === "delete") {
    const { error } = await supabase.rpc("delete_clan_message", { p_message_id: messageId });
    if (error) {
      const msg = String(error.message ?? "");
      if (/not the author/i.test(msg)) return fail("Only the author or a mod can delete.", 403);
      if (/not found/i.test(msg)) return fail("Message not found.", 404);
      return fail("Unable to delete.", 500);
    }
    return ok({ deleted: true });
  }

  return fail("Invalid action (react, pin, edit, delete).", 400);
}
