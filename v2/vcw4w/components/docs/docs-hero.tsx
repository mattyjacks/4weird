import Link from "next/link";

export type HeroTheme = {
  /** section background */
  bg: string;
  border: string;
  /** eyebrow chip */
  chip: string;
  /** gradient text for the highlighted title span */
  title: string;
};

export function DocsHero({
  eyebrow,
  title,
  lede,
  stats,
  glyph,
  theme,
  crumb,
  art,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede: React.ReactNode;
  stats?: [string, string][];
  glyph: string;
  theme: HeroTheme;
  crumb: string;
  art?: React.ReactNode;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border ${theme.border} ${theme.bg}`}
    >
      {/* blueprint grid */}
      <div aria-hidden="true" className="docs-grid-bg absolute inset-0 opacity-70" />
      {/* glow orbs */}
      <div aria-hidden="true" className="docs-orb-a absolute -left-20 -top-24 h-72 w-72 rounded-full blur-3xl" />
      <div aria-hidden="true" className="docs-orb-b absolute -bottom-28 -right-16 h-80 w-80 rounded-full blur-3xl" />
      {/* giant watermark glyph */}
      <div
        aria-hidden="true"
        className="docs-float pointer-events-none absolute -right-4 top-2 hidden select-none text-[10rem] leading-none opacity-20 sm:block lg:text-[13rem]"
      >
        {glyph}
      </div>

      <div className="relative p-6 sm:p-10">
        <p className="text-xs font-semibold text-muted-foreground">
          <Link href="/docs" className="hover:underline">Docs</Link>
          <span aria-hidden="true"> / </span>
          <span className="text-foreground">{crumb}</span>
        </p>
        <p className={`mt-4 inline-block rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] ${theme.chip}`}>
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {lede}
        </p>
        {stats && stats.length > 0 && (
          <dl className="mt-7 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(([v, l]) => (
              <div
                key={l}
                className="rounded-2xl border border-black/10 bg-white/60 px-3 py-3 backdrop-blur dark:border-white/15 dark:bg-black/40"
              >
                <dt className={`text-lg font-black sm:text-xl ${theme.title}`}>{v}</dt>
                <dd className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        )}
        {art && <div className="relative mt-8 max-w-3xl">{art}</div>}
      </div>
    </section>
  );
}
