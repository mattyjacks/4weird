import Link from "next/link";
import { MarketingPage } from "@/components/site/marketing-page";
import { PackCatalog } from "@/components/coins/pack-catalog";

export default function Page(){return <MarketingPage title="Vibe Coins" intro="100 Vibe Coins cost exactly $1.00 — every price already includes the 25% platform service cut, never added on top. New accounts start with a free 100-coin trial."><PackCatalog /><div className="mt-8 flex flex-wrap gap-4"><Link href="/account" className="rounded-full bg-cyan-300 px-5 py-2 font-bold text-slate-950">Open account</Link><Link href="/leaderboards" className="rounded-full border border-white/20 px-5 py-2">Leaderboards</Link><Link href="/vibecodeworker/docs" className="rounded-full border border-white/20 px-5 py-2">Read the manual</Link></div></MarketingPage>}
