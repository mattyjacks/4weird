import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import type { ReactNode } from "react";

interface ToolShellProps {
  kicker: string;
  title: string;
  blurb: string;
  children: ReactNode;
}

// Shared presentational shell for /tools sub-pages. Server-safe: no browser
// APIs, no state — interactive UI lives in the "use client" components below.
// Cached per props (kicker/title/blurb form the cache key); `children` is a
// pass-through slot, so each page's dynamic editor streams outside this entry.
export async function ToolShell({ kicker, title, blurb, children }: ToolShellProps) {
  "use cache";
  cacheLife("hours");
  cacheTag("tools");
  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-5">
        <Link
          href="/tools"
          className="text-xs font-semibold text-cyan-300 hover:underline"
        >
          &larr; All free tools
        </Link>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300">
            {kicker}
          </p>
          <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">
            {title}
          </h1>
        </div>
        <p className="mt-1.5 max-w-3xl text-sm text-slate-400">{blurb}</p>
        <div className="mt-4">{children}</div>
        <p className="mt-6 max-w-3xl text-[11px] leading-relaxed text-slate-500">
          Free forever, runs 100% in your browser — nothing you type or upload
          leaves this tab. If a browser feature is unavailable, the tool shows a
          notice and keeps the rest of the page working.
        </p>
      </section>
    </div>
  );
}
