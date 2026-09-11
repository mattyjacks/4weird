import Link from "next/link";
import { DOCS_DATA } from "./docs-data";

/** Numbered section heading with kicker chip. */
export function SectionHead({
  index,
  kicker,
  title,
  body,
}: {
  index: string;
  kicker: string;
  title: string;
  body?: React.ReactNode;
}) {
  return (
    <div className="mt-12">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-muted-foreground">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-[13px] font-black text-white"
        >
          {index}
        </span>
        {kicker}
      </p>
      <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
      {body && <p className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">{body}</p>}
    </div>
  );
}

const CALLOUT_STYLES: Record<string, string> = {
  gold: "border-amber-400/60 bg-gradient-to-r from-amber-400/15 to-yellow-400/5",
  cyan: "border-cyan-400/60 bg-gradient-to-r from-cyan-400/15 to-sky-400/5",
  rose: "border-rose-400/60 bg-gradient-to-r from-rose-400/15 to-pink-400/5",
  violet: "border-violet-400/60 bg-gradient-to-r from-violet-400/15 to-fuchsia-400/5",
  emerald: "border-emerald-400/60 bg-gradient-to-r from-emerald-400/15 to-teal-400/5",
};

const CALLOUT_ICON: Record<string, string> = {
  gold: "🪙",
  cyan: "💡",
  rose: "⚠️",
  violet: "🔮",
  emerald: "✅",
};

export function Callout({
  tone = "cyan",
  title,
  children,
}: {
  tone?: keyof typeof CALLOUT_STYLES;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <aside className={`mt-5 rounded-2xl border p-5 ${CALLOUT_STYLES[tone]}`}>
      <p className="font-black">
        <span aria-hidden="true" className="mr-2">{CALLOUT_ICON[tone]}</span>
        {title}
      </p>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </aside>
  );
}

/** Fake app-window chrome for CSS-only product mockups. */
export function MockWindow({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-black/10 bg-slate-950 text-slate-200 shadow-2xl dark:border-white/15">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <i className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <i className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <p className="ml-2 truncate text-xs font-bold text-slate-300">{title}</p>
        {badge && (
          <span className="ml-auto rounded-full bg-cyan-300/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-cyan-300">
            {badge}
          </span>
        )}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

/** Vertical timeline steps. */
export function Steps({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <ol className="mt-6 space-y-0">
      {items.map(([title, body], i) => (
        <li key={title} className="relative flex gap-4 pb-6 last:pb-0">
          <div className="flex flex-col items-center" aria-hidden="true">
            <span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-black text-white shadow-lg">
              {i + 1}
            </span>
            {i < items.length - 1 && <span className="w-0.5 flex-1 bg-gradient-to-b from-cyan-400/60 to-violet-500/30" />}
          </div>
          <div className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-4">
            <h3 className="font-bold">{title}</h3>
            <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** 25/75 split bar. */
export function SplitBar({ leftLabel = "75% provider", rightLabel = "25% platform" }: { leftLabel?: string; rightLabel?: string }) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-border">
      <div className="flex h-14 text-sm font-black">
        <div className="flex w-3/4 items-center justify-center bg-gradient-to-r from-cyan-400 to-emerald-300 text-slate-950">
          {leftLabel}
        </div>
        <div className="flex w-1/4 items-center justify-center bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
          {rightLabel}
        </div>
      </div>
      <p className="bg-card px-4 py-3 text-xs text-muted-foreground">
        Example: a 400-coin ($4.00) job → 300 coins provider credits, 100 coins platform. You only ever see the gross 400. All credits are on-site only (cloud compute, game credits, other on-site services); never cash-out, never withdrawable.
      </p>
    </div>
  );
}

/** Prev / next guide cards. */
export function Pager({ current }: { current: string }) {
  const i = DOCS_DATA.findIndex((d) => d.href === current);
  const prev = DOCS_DATA[(i - 1 + DOCS_DATA.length) % DOCS_DATA.length];
  const next = DOCS_DATA[(i + 1) % DOCS_DATA.length];
  return (
    <nav aria-label="More guides" className="mt-12 grid gap-3 sm:grid-cols-2">
      {[
        { d: prev, k: "← Previous guide" },
        { d: next, k: "Next guide →" },
      ].map(({ d, k }) => (
        <Link
          key={d.href}
          href={d.href}
          className={`group rounded-2xl border border-border bg-gradient-to-br p-5 transition hover:border-cyan-500/50 ${d.card}`}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">{k}</p>
          <p className="mt-1 text-lg font-black">
            <span aria-hidden="true" className="mr-2">{d.icon}</span>
            {d.label}
          </p>
          <p className="text-sm text-muted-foreground">{d.blurb}</p>
        </Link>
      ))}
    </nav>
  );
}
