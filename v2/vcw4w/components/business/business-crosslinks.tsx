import Link from "next/link";
import { BUSINESS_APPS } from "@/lib/business";

/**
 * Compact card row linking the 8 business apps. Server component.
 * Pass `exclude` with the current page's href to avoid self-links.
 */
export function BusinessCrosslinks({ exclude = [] }: { exclude?: string[] }) {
  const apps = BUSINESS_APPS.filter((a) => !exclude.includes(a.href));
  return (
    <nav
      aria-label="Business suite"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {apps.map((a) => (
        <Link
          key={`${a.href}-${a.label}`}
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
