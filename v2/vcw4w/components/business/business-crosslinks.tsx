import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { BUSINESS_APPS } from "@/lib/business";

/**
 * Compact card row linking the 8 business apps. Server component.
 * Pass `exclude` with the current page's href to avoid self-links.
 *
 * Pure static output derived from the BUSINESS_APPS catalog plus the
 * serializable `exclude` prop (part of the cache key), so it is safe to
 * cache; per-user workspace, billing, and file state stay dynamic.
 */
export async function BusinessCrosslinks({ exclude = [] }: { exclude?: string[] }) {
  "use cache";
  cacheLife("hours");
  cacheTag("business-crosslinks");
  const safeExclude = Array.isArray(exclude) ? exclude : [];
  const apps = BUSINESS_APPS.filter((a) => !safeExclude.includes(a.href));
  return (
    <nav
      aria-label="Business suite"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {(Array.isArray(apps) ? apps : []).map((a, i) => (
        <Link
          key={`${String(a.href ?? "")}-${String(a.label ?? "")}` || i}
          href={a.href}
          className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 transition hover:border-cyan-300/40 hover:bg-white/[.07]"
        >
          <span className="block text-sm font-bold">
            {a.emoji} {a.label}
          </span>
          <span className="block text-xs text-slate-400">{a.blurb}</span>
        </Link>
      ))}
    </nav>
  );
}
