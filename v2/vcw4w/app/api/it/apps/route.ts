import { APPROVED_APPS, listByCategory, searchApps } from "@/lib/approved-apps";
import { fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

// GET /api/it/apps?category=&q= — public approved-app catalog, no auth.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = (searchParams.get("category") || "").trim();
    const q = (searchParams.get("q") || "").trim();

    let apps = APPROVED_APPS;
    if (category) apps = listByCategory(category);
    if (q) {
      const hits = new Set(searchApps(q).map((a) => a.slug));
      apps = apps.filter((a) => hits.has(a.slug));
    }

    return ok({ apps, count: apps.length });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to load approved apps.");
  }
}
