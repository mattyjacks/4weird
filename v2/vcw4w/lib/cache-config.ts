/**
 * Cache Components invalidation for the web shell (Next 16.3).
 *
 * SERVER-ONLY: never import this module from a client component. It holds a
 * Server Action (`refreshSiteTag`), and `'use client'` + `'use cache'` /
 * server-action imports in one file are illegal. Route Handlers and server
 * components/actions only.
 *
 * Which invalidator to use (per
 * node_modules/next/dist/docs/.../functions/updateTag.md and
 * .../functions/revalidateTag.md):
 * - `refreshSiteTag()` (updateTag): Server Actions ONLY. Read-your-own-writes:
 *   the next request waits for fresh data, no stale content served. Use when
 *   a mutation and its visible result happen in the same user flow.
 * - `revalidateSiteTag()` (revalidateTag with profile `"max"`): Server
 *   Actions AND Route Handlers (updateTag throws outside actions).
 *   Stale-while-revalidate: the next request is served stale while fresh data
 *   loads in the background. Used by `POST /api/site-cache`.
 * - Deploys: the cache key includes the build ID, so every deploy already
 *   invalidates all tags. On-demand invalidation below is for content edits
 *   that must go live without waiting for a profile's revalidate window.
 *
 * There is currently NO runtime mutation path in web-owned scopes that
 * writes cached data: every cached fetcher reads static module constants or
 * the `app/docs` directory at build/prerender time (verified: the only
 * `'use server'`-adjacent hit in owned scopes is prose in
 * `lib/supabase/proxy.ts`; per-user writes live in economy/vcw lanes).
 * These helpers are the wired invalidators for the tag registry in
 * `lib/site-content.ts` — call them from a future admin Server Action /
 * Route Handler when a web content mutation lands.
 *
 * Profile guide (prefer these over `export const revalidate`; page-level
 * revalidate is legacy ISR — cacheLife profiles own time semantics here):
 * seconds (real-time) < minutes (feeds) < hours (catalogs, tools) <
 * days (guides, marketing) < weeks (newsletters) < max (legal, archives).
 */

import { revalidateTag, updateTag } from "next/cache";
import { isSiteCacheTag, type SiteCacheTag } from "@/lib/site-content";

/**
 * Server Action: immediately expire a web-shell tag so the next request
 * waits for fresh data. Call from a Server Action after mutating the
 * domain the tag covers.
 */
export async function refreshSiteTag(
  tag: SiteCacheTag,
): Promise<{ refreshed: SiteCacheTag }> {
  "use server";
  if (!isSiteCacheTag(tag)) {
    throw new Error(`refreshSiteTag: unknown web-shell tag: ${String(tag)}`);
  }
  updateTag(tag);
  return { refreshed: tag };
}

/**
 * Stale-while-revalidate a web-shell tag. Safe in Server Actions AND Route
 * Handlers (`POST /api/site-cache` uses this; `updateTag` would throw
 * there). Next request is served stale while fresh data regenerates.
 */
export function revalidateSiteTag(tag: SiteCacheTag): {
  revalidated: SiteCacheTag;
} {
  if (!isSiteCacheTag(tag)) {
    throw new Error(`revalidateSiteTag: unknown web-shell tag: ${String(tag)}`);
  }
  revalidateTag(tag, "max");
  return { revalidated: tag };
}
