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
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-14 sm:px-5">
        <Link
          href="/tools"
          className="text-sm font-semibold text-cyan-300 hover:underline"
        >
          &larr; All free tools
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
          {kicker}
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-300">{blurb}</p>
        <div className="mt-8">{children}</div>
        <p className="mt-10 max-w-2xl text-xs leading-relaxed text-slate-500">
          Free forever, runs 100% in your browser — nothing you type or upload
          leaves this tab. If a browser feature is unavailable, the tool shows a
          notice and keeps the rest of the page working.
        </p>
      </section>
    </div>
  );
}
