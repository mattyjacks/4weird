import { ok } from "@/lib/api-respond";
import { MESHY_CUT_NOTE, MESHY_OPS, meshyConfigured } from "@/lib/meshy";

export const dynamic = "force-dynamic";

// GET /api/meshy/ops — public catalog + configured flag (never the key).
export async function GET() {
  return ok({
    ops: MESHY_OPS,
    configured: meshyConfigured(),
    note: MESHY_CUT_NOTE,
    hint: "Set MESHY_API_KEY on the server to queue real Meshy.ai tasks.",
  });
}
