import Link from "next/link";
import { MarketingPage } from "@/components/site/marketing-page";
export default function Page(){return <MarketingPage title="4weird Academy" intro="Decode your future through interactive lessons, experiments, and games."><div className="flex flex-wrap gap-4"><Link href="/games" className="rounded-full bg-cyan-300 px-5 py-2 font-bold text-slate-950">Learn through games</Link><Link href="/vibecodeworker/docs" className="rounded-full border border-white/20 px-5 py-2">Read the playtest manual</Link></div></MarketingPage>}
