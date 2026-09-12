import { InfoTip } from "@/components/ui/info-tip";

export function MarketingPage({
  title,
  intro,
  children,
  hint,
  titleLabel,
  kicker,
}: {
  title: React.ReactNode;
  intro: React.ReactNode;
  children?: React.ReactNode;
  hint?: React.ReactNode;
  titleLabel?: string;
  kicker?: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-5 sm:py-12">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card px-5 py-8 sm:px-8 sm:py-10">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-glow" aria-hidden="true" />
          <div className="relative">
            {kicker ? <p className="section-kicker">{kicker}</p> : null}
            <h1 className="mt-3 text-3xl font-black tracking-tight text-balance sm:text-4xl">
              <span className="marketing-title-gradient">{title}</span>
              {hint ? (
                <span className="ml-2 inline-flex align-middle">
                  <InfoTip
                    text={hint}
                    label={titleLabel ? `About ${titleLabel}` : "About this page"}
                    side="bottom"
                  />
                </span>
              ) : null}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {intro}
            </p>
          </div>
        </section>
        {children ? (
          <div className="mx-auto mt-6 max-w-3xl space-y-5 text-muted-foreground sm:mt-8 sm:space-y-6">
            {children}
            <p className="money-strip">
              <span className="price-chip" aria-hidden="true">
                100 🪙 = $1.00
              </span>
              <span>25% inside, never on top</span>
              <span aria-hidden="true">·</span>
              <a href="/pricing" className="money-strip-link">
                Get coins →
              </a>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
