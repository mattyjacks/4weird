import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { clientIp, isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// POST /api/clans/report — anonymous allowed, strict rate limit.
// { target_type: post|comment|image, target_id: uuid, category: csam|other, details? }
// category=csam => file_report RPC hides the target immediately (quarantine;
// content preserved for the NCMEC CyberTipline procedure — see migration header).
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const throttle = rateLimit(`clan-report:${clientIp(req)}`, 5, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const targetType = String(input.target_type ?? "");
  const targetId = String(input.target_id ?? "");
  const category = String(input.category ?? "");
  const details = String(input.details ?? "").trim().slice(0, 1000);
  if (!["post", "comment", "image"].includes(targetType)) return fail("Invalid target.", 400);
  if (!isUuid(targetId)) return fail("Invalid target.", 400);
  if (!["csam", "other"].includes(category)) return fail("Invalid category.", 400);

  // Same client works logged-in or logged-out: the RPC is granted to both
  // anon and authenticated, and reporter_id is null when logged out.
  const supabase = await createClient();
  const { data: rpcData, error } = await supabase.rpc("file_report", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_category: category,
    p_details: details,
  });
  if (error) {
    const msg = String(error.message ?? "");
    if (/not found/i.test(msg)) return fail("Target not found.", 404);
    if (/invalid/i.test(msg)) return fail("Invalid report.", 400);
    return fail("Unable to file report.", 500);
  }
  const id = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as string;
  return ok(
    {
      id,
      hidden: category === "csam" && targetType !== "image",
      message:
        category === "csam"
          ? "Content quarantined and preserved for authorities."
          : "Report received for review.",
    },
    201,
  );
}
