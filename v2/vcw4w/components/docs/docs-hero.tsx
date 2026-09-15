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
      className={`docs-hero docs-hero-sheen relative overflow-hidden rounded-2xl border ${theme.border} ${theme.bg}`}
    >
      {/* blueprint grid */}
      <div aria-hidden="true" className="docs-grid-bg docs-grid-pan absolute inset-0 opacity-70" />
      {/* glow orbs */}
      <div aria-hidden="true" className="docs-orb-a docs-orb-drift-a absolute -left-20 -top-24 h-40 w-40 rounded-full blur-3xl" />
      <div aria-hidden="true" className="docs-orb-b docs-orb-drift-b absolute -bottom-28 -right-16 h-48 w-48 rounded-full blur-3xl" />
      {/* orbit ring + sparkles around the glyph */}
      <div aria-hidden="true" className="docs-hero-ring absolute -right-10 top-0 hidden h-32 w-32 sm:block lg:h-40 lg:w-40" />
      <span aria-hidden="true" className="docs-twinkle right-[12%] top-[18%] hidden h-3 w-3 sm:block" />
      <span aria-hidden="true" className="docs-twinkle right-[26%] top-[64%] hidden h-2 w-2 sm:block" style={{ animationDelay: "0.9s" }} />
      <span aria-hidden="true" className="docs-twinkle right-[6%] top-[52%] hidden h-2.5 w-2.5 sm:block" style={{ animationDelay: "1.7s" }} />
      {/* giant watermark glyph */}
      <div
        aria-hidden="true"
        className="docs-float pointer-events-none absolute -right-2 top-0 hidden select-none text-6xl leading-none opacity-20 sm:block lg:text-7xl"
      >
        {glyph}
      </div>

      <div className="relative p-4 sm:p-5">
        <p className="docs-rise text-xs font-semibold text-muted-foreground">
          <Link href="/docs" className="hover:underline">Docs</Link>
          <span aria-hidden="true"> / </span>
          <span className="text-foreground">{crumb}</span>
        </p>
        <p className={`docs-rise docs-d1 docs-hero-eyebrow mt-2 inline-block rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] ${theme.chip}`}>
          {eyebrow}
        </p>
        <h1 className="docs-rise docs-d2 mt-2 max-w-3xl text-2xl font-black leading-[1.05] tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="docs-rise docs-d3 mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {lede}
        </p>
        {stats && stats.length > 0 && (
          <dl className="mt-3 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map(([v, l], i) => (
              <div
                key={l}
                className="docs-rise rounded-xl border border-black/10 bg-white/60 px-2.5 py-2 backdrop-blur transition-transform hover:-translate-y-0.5 dark:border-white/15 dark:bg-black/40"
                style={{ animationDelay: `${0.28 + i * 0.08}s` }}
              >
                <dt className={`text-base font-black ${theme.title}`}>{v}</dt>
                <dd className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        )}
        {art && <div className="docs-rise docs-d5 relative mt-4 max-w-3xl">{art}</div>}
      </div>
    </section>
  );
}
