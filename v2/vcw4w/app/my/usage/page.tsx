import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { UsageClient } from "./usage-client";

export const metadata: Metadata = {
  title: "My Compute Usage",
  description:
    "Every Vibe Coin of compute in one place: Gaming Buddy sessions, game AI, agent rentals, UnitUnite workspaces, and function runs — with the 25% cut shown, never hidden.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  if (!hasEnvVars) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto max-w-6xl px-5 py-20">
          <h1 className="text-4xl font-black">My compute usage</h1>
          <p className="mt-4 text-slate-300">
            Sign-in is not configured on this deployment yet. Add Supabase variables from <code>.env.example</code>.
          </p>
          <Link className="mt-10 inline-block text-cyan-300 hover:underline" href="/games">
            Back to games
          </Link>
        </section>
      </main>
    );
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/auth/login?next=/my/usage/");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">4weird.com/my/usage/</p>
        <h1 className="mt-3 text-4xl font-black sm:text-5xl">My compute usage</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Every way we can charge for compute, itemized: Gaming Buddy sessions (current session, total, last 24
          hours, last hour), per-game AI (dialogue bots, AI directors, TTS, rented RunPods, inference APIs),
          function runs (serverless workers, cron, inference endpoints, queues, relays), agent rentals, and
          UnitUnite workspace cloud. 100 coins = $1.00; every gross price already includes the 25% platform cut
          (25% platform / 75% provider) — never added on top.
        </p>
        <UsageClient />
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/buddy" className="rounded-full bg-violet-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-violet-200">
            Open Gaming Buddy
          </Link>
          <Link href="/account" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
            Back to your account
          </Link>
          <Link href="/pricing" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
            Pricing
          </Link>
        </div>
      </section>
    </main>
  );
}
