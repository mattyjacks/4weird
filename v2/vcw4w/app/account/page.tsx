import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { createClient } from "@/lib/supabase/server";
import { AccountDashboard } from "@/components/account/account-dashboard";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/auth/login?next=/account");
  return <main className="min-h-screen bg-slate-950 text-white"><SiteHeader /><section className="mx-auto max-w-4xl px-5 py-20"><h1 className="text-4xl font-black">Your account</h1><p className="mt-4 text-slate-300">Signed in as {String(data.claims.email ?? "player")}.</p><div className="mt-10"><AccountDashboard /></div><Link className="mt-10 inline-block text-cyan-300 hover:underline" href="/games">Back to games</Link></section><SiteFooter /></main>;
}
