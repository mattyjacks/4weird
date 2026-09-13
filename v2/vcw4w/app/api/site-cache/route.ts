/**
 * On-demand revalidation for web-shell cache tags (Cache Components).
 *
 * - GET: list the invalidatable tags (registry from `lib/site-content.ts`).
 * - POST { tag }: stale-while-revalidate that tag via
 *   `revalidateTag(tag, "max")` (Route Handlers cannot use `updateTag` —
 *   Server Actions only — so SWR semantics apply: the next request is served
 *   stale while fresh data regenerates).
 *
 * Guard: same-origin POST only (`lib/csrf.ts` `sameOrigin`), fail-closed.
 * There is no per-user data behind these tags (static catalogs, guides,
 * marketing, legal), so the risk of a same-origin caller is limited to
 * extra regeneration work, never data exposure.
 */

import { revalidateSiteTag } from "@/lib/cache-config";
import { SITE_CACHE_TAGS, isSiteCacheTag } from "@/lib/site-content";
import { sameOrigin } from "@/lib/csrf";

export async function GET() {
  return Response.json({ tags: [...SITE_CACHE_TAGS] });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return Response.json(
      { error: "forbidden: same-origin POST only" },
      { status: 403 },
    );
  }
  let tag: unknown;
  try {
    tag = (await req.json())?.tag;
  } catch {
    tag = undefined;
  }
  if (!isSiteCacheTag(tag)) {
    return Response.json(
      { error: "unknown tag", tags: [...SITE_CACHE_TAGS] },
      { status: 400 },
    );
  }
  return Response.json(revalidateSiteTag(tag));
}
