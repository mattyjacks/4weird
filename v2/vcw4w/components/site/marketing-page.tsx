import { SiteHeader } from "@/components/site/site-header";

export function MarketingPage({ title, intro, children }: { title: string; intro: string; children?: React.ReactNode }) {
  return <main className="min-h-screen bg-slate-950 text-white"><SiteHeader /><article className="mx-auto max-w-4xl px-5 py-20"><h1 className="text-5xl font-black tracking-tight">{title}</h1><p className="mt-6 max-w-2xl text-lg text-slate-300">{intro}</p><div className="mt-12 space-y-6 text-slate-300">{children}</div></article></main>;
}
