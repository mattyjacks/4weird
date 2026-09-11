import { FAL_CUT_NOTE, FAL_OPS, falConfigured } from "@/lib/fal";
import { ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

// GET /api/fal/ops — public catalog of the 15 fal.ai media tools.
// Static + honest: prices render without auth; `configured` is a boolean
// only (the key never leaves the server).
export async function GET() {
  return ok({
    ops: FAL_OPS.map((o) => ({
      op: o.op,
      name: o.name,
      unit: o.unit,
      coinsPerUnit: o.coinsPerUnit,
      blurb: o.blurb,
      category: o.category,
      kind: o.kind,
      needsImage: o.needsImage,
      needsPrompt: o.needsPrompt,
    })),
    count: FAL_OPS.length,
    configured: falConfigured(),
    note: FAL_CUT_NOTE,
  });
}
