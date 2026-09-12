import { InfoTip } from "@/components/ui/info-tip";

export function MarketingPage({ title, intro, children, hint }: { title: string; intro: string; children?: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground">
      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-5 sm:py-10">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          {title}
          {hint ? (
            <span className="ml-2 inline-flex align-middle">
              <InfoTip text={hint} label={`About ${title}`} />
            </span>
          ) : null}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">{intro}</p>
        <div className="mt-6 space-y-4 text-muted-foreground sm:mt-8">{children}</div>
      </article>
    </div>
  );
}
