import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s) ? s : "";
}

// GET /api/fundraisers/[id]; public campaign detail + progress.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { id: raw } = await params;
  const id = isUuid(raw);
  if (!id) return fail("Invalid campaign.", 400);
  const supabase = await createClient();
  const { data: campaign, error } = await supabase
    .from("launch_campaigns")
    .select("id,creator_id,clan_id,title,story,use_of_funds,category,goal_coins,status,ends_at,created_at")
    .eq("id", id)
    .eq("moderation", "visible")
    .maybeSingle();
  if (error) return dbFail("api/fundraisers/[id]", error);
  if (!campaign) return fail("Campaign not found.", 404);
  const { data: progress } = await supabase.rpc("launch_campaign_progress", { p_campaign_id: id });
  return ok({ campaign, progress: progress ?? { raised_gross: 0, backers: 0 } });
}
