import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { RightsClient } from "./rights-client";

export const metadata: Metadata = {
  title: "My Privacy Rights",
  description: "Download or delete your 4weird Games data. Self-service privacy rights for your own account.",
  robots: { index: false, follow: false },
};


// NOTE: no 'use cache' here — per-user session + export/delete tools stream
// in Suspense so personal data is never cached.
async function RightsBody() {
  if (!hasEnvVars) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-20">
        <h1 className="text-4xl font-black">My privacy rights</h1>
        <p className="mt-4 text-slate-300">
          Sign-in is not configured on this deployment yet. Add Supabase variables from <code>.env.example</code>.
        </p>
        <Link className="mt-10 inline-block text-cyan-300 hover:underline" href="/games">
          Back to games
        </Link>
      </section>
    );
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/auth/login?next=/my/rights");

  const email = String(data.claims.email ?? "player");

  return (
    <section className="mx-auto max-w-4xl px-5 py-20">
      <h1 className="text-4xl font-black">My privacy rights</h1>
      <p className="mt-4 max-w-2xl text-slate-300">
        Exercise your rights under New Hampshire and U.S. law and; where applicable; the EU/UK GDPR and other
        global privacy laws: download your data, correct it, or permanently delete your data and account. These
        tools act <strong className="text-white">only on your own signed-in account</strong>; anything else
        (including requests for a deceased loved one’s account) is handled by email with proof of authority, as
        explained below. Full details: <Link className="text-cyan-300 hover:underline" href="/privacy">Privacy Policy</Link>{" "}
        · <Link className="text-cyan-300 hover:underline" href="/terms">Terms of Use</Link>.
      </p>
      <Suspense fallback={<p className="mt-10 text-sm text-slate-400">Loading your privacy tools…</p>}>
        <RightsClient email={email} />
      </Suspense>
      <Link className="mt-10 inline-block text-cyan-300 hover:underline" href="/account">
        Back to your account
      </Link>
    </section>
  );
}

export default function RightsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Suspense
        fallback={
          <section className="mx-auto max-w-4xl px-5 py-20" aria-busy="true" aria-label="Loading privacy rights">
            <h1 className="text-4xl font-black">My privacy rights</h1>
            <p className="mt-4 max-w-2xl text-slate-300">Download or delete your own data after sign-in.</p>
            <div className="mt-10 animate-pulse space-y-3">
              <div className="h-32 rounded-xl border border-white/10 bg-white/5" />
              <div className="h-32 rounded-xl border border-white/10 bg-white/5" />
            </div>
          </section>
        }
      >
        <RightsBody />
      </Suspense>
    </main>
  );
}
