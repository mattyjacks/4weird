/**
 * Cached static footer shell for Cache Components / PPR.
 *
 * Server component ONLY — no 'use client' here ('use client' + 'use cache'
 * is illegal). Warms the shared nav cache entry, then renders the existing
 * synchronous <SiteFooter/>. Dynamic/auth UI stays in the client components
 * rendered elsewhere in the layout; this unit is fully static and safe to
 * prerender into the shell.
 */

import { cacheLife, cacheTag } from "next/cache";
import { getSiteNav } from "@/lib/cache";
import { SiteFooter } from "@/components/site/site-footer";

export async function CachedSiteFooter() {
  "use cache";
  cacheLife("days");
  cacheTag("site-footer");
  // Establish the cache dependency on footer/nav metadata so the shell
  // prerenders from cache; SiteFooter renders the same source of truth.
  await getSiteNav();
  return <SiteFooter />;
}
