export function MarketingPage({ title, intro, children }: { title: string; intro: string; children?: React.ReactNode }) {
  return (
    <div className="bg-slate-950 text-white">
      <article className="mx-auto max-w-4xl px-4 py-14 sm:px-5 sm:py-20">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">{intro}</p>
        <div className="mt-10 space-y-6 text-slate-300 sm:mt-12">{children}</div>
      </article>
    </div>
  );
}
