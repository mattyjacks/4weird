import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { RightsClient } from "./rights-client";

export const metadata: Metadata = {
  title: "My Privacy Rights",
  description: "Download or delete your 4weird Games data. Self-service privacy rights for your own account.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RightsPage() {
  if (!hasEnvVars) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <SiteHeader />
        <section className="mx-auto max-w-4xl px-5 py-20">
          <h1 className="text-4xl font-black">My privacy rights</h1>
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
  if (!data?.claims) redirect("/auth/login?next=/my/rights");

  const email = String(data.claims.email ?? "player");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-5 py-20">
        <h1 className="text-4xl font-black">My privacy rights</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Exercise your rights under New Hampshire and U.S. law and — where applicable — the EU/UK GDPR and other
          global privacy laws: download your data, correct it, or permanently delete your data and account. These
          tools act <strong className="text-white">only on your own signed-in account</strong>; anything else
          (including requests for a deceased loved one’s account) is handled by email with proof of authority, as
          explained below. Full details: <Link className="text-cyan-300 hover:underline" href="/privacy">Privacy Policy</Link>{" "}
          · <Link className="text-cyan-300 hover:underline" href="/terms">Terms of Use</Link>.
        </p>
        <RightsClient email={email} />
        <Link className="mt-10 inline-block text-cyan-300 hover:underline" href="/account">
          Back to your account
        </Link>
      </section>
    </main>
  );
}
