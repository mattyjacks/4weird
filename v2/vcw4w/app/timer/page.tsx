import { Metadata } from "next";
import { TimeTracker } from "@/components/time/TimeTracker";
import { GHOST_CASH_DISCLAIMER } from "@/lib/ghost-cash";
import { ShieldCheck, Info } from "lucide-react";

export const metadata: Metadata = {
  title: "Ghost Cash Time Tracker & Work Diary | 4weird",
  description:
    "Accurate time tracker down to the second with Upwork-style screen tracking and Ghost Cash (👻💵) intra-org debt accounting.",
  alternates: {
    canonical: "/timer",
  },
};

export default function TimerPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500 selection:text-black">
      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <TimeTracker />

        {/* Prominent Legal & Functional Notice */}
        <section className="rounded-xl border border-white/10 bg-zinc-950/80 p-5 space-y-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2 text-zinc-200 font-semibold">
            <Info className="h-4 w-4 text-cyan-400" />
            <span>Important Notice: Ghost Cash (👻💵) Terms</span>
          </div>
          <p>{GHOST_CASH_DISCLAIMER}</p>
          <p>
            Ghost Cash is not legal tender, money, cryptocurrency, or a store of value. It has no monetary value, cannot be redeemed for cash or transferred outside 4weird orgs, and confers no equity or claims against MattyJacks LLC. It exists solely as an internal bookkeeping and debt-tracking measurement between participating users and organizations.
          </p>
        </section>
      </main>
    </div>
  );
}
