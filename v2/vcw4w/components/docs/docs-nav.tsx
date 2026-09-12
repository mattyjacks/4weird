"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_DATA } from "./docs-data";
import { useDocsProgress } from "@/lib/docs-progress";

/**
 * Docs sidebar. The header counter is driven by the append-only completed
 * set (localStorage, cloud-synced when signed in) — never by the current
 * route — so it only ever goes up until 100%.
 */
export function DocsNav() {
  const pathname = usePathname();
  const { read, isRead, hydrated } = useDocsProgress();
  const done = DOCS_DATA.filter((d) => read.includes(d.href)).length;
  const pct = Math.round((done / DOCS_DATA.length) * 100);
  const complete = done >= DOCS_DATA.length;

  return (
    <nav
      aria-label="Docs navigation"
      className="overflow-hidden rounded-3xl border border-border bg-card"
    >
      <div className="bg-gradient-to-r from-cyan-500/20 via-violet-500/15 to-fuchsia-500/20 p-4">
        <p className="text-base font-black">
          📚 4weird <span className="text-cyan-600 dark:text-cyan-300">Docs</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {!hydrated ? (
            <>{DOCS_DATA.length} guides · pick one below</>
          ) : complete ? (
            <>🎉 {DOCS_DATA.length} of {DOCS_DATA.length} · 100% explored</>
          ) : (
            <>Guide {done} of {DOCS_DATA.length} · {pct}% explored</>
          )}
        </p>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
          role="progressbar"
          aria-label="Guides completed"
          aria-valuenow={hydrated ? pct : 0}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 transition-all"
            style={{ width: `${hydrated ? pct : 0}%` }}
          />
        </div>
        {hydrated && !complete && done > 0 && (
          <p className="mt-1.5 text-[11px] font-bold text-muted-foreground">
            {DOCS_DATA.length - done} to go · progress saves on this device{read.length > 0 ? ", + cloud when signed in" : ""}
          </p>
        )}
      </div>
      <ul className="space-y-1 p-3">
        {DOCS_DATA.map((item) => {
          const active = pathname === item.href;
          const completed = hydrated && isRead(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={`${item.label}${completed ? " (completed)" : ""}`}
                className={`group flex items-start gap-2.5 rounded-2xl border px-3 py-2.5 transition ${
                  active
                    ? "border-cyan-500/50 bg-gradient-to-r from-cyan-500/15 to-violet-500/15"
                    : "border-transparent hover:border-border hover:bg-accent"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg ${item.card} ${
                    active ? "ring-2 ring-cyan-400/60" : "ring-1 ring-black/10 dark:ring-white/10"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-bold ${active ? "text-cyan-600 dark:text-cyan-200" : ""}`}>
                    {item.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{item.blurb}</span>
                </span>
                {completed && (
                  <span
                    aria-hidden="true"
                    title="Completed"
                    className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-black text-emerald-600 dark:text-emerald-300"
                  >
                    ✓
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
