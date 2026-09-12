import type { Metadata } from "next";
import Link from "next/link";
import {
  BUSINESS_APPS,
  BUSINESS_BLURB,
  BUSINESS_NAME,
  BUSINESS_TAGLINE,
} from "@/lib/business";

export const metadata: Metadata = {
  alternates: { canonical: "/business" },
  title: "Business & Teams",
  description: `${BUSINESS_NAME} - ${BUSINESS_TAGLINE} ${BUSINESS_BLURB}`,
};

export default function BusinessPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Epic dark hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-500/15 via-cyan-500/10 to-transparent"
        />
        <div className="relative mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-300">
            💼 {BUSINESS_NAME}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
            {BUSINESS_TAGLINE}
          </h1>
          <p className="mt-4 max-w-3xl text-slate-300 sm:text-lg">
            {BUSINESS_BLURB}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/squads"
              className="rounded-full bg-amber-400 px-7 py-3.5 text-center font-bold text-slate-950 shadow-lg shadow-amber-400/30 transition hover:-translate-y-0.5 hover:bg-amber-300"
            >
              Open UnitUnite →
            </Link>
            <Link
              href="/timer"
              className="rounded-full border border-white/20 px-7 py-3.5 text-center font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              Start the timer
            </Link>
            <Link
              href="/vault"
              className="rounded-full border border-white/20 px-7 py-3.5 text-center font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              Open the vault
            </Link>
          </div>
        </div>
      </section>

      {/* App grid */}
      <section className="mx-auto max-w-5xl px-5 pb-14" aria-label="Business apps">
        <div className="grid gap-4 sm:grid-cols-2">
          {BUSINESS_APPS.map((app) => (
            <Link
              key={app.label}
              href={app.href}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-xl hover:shadow-amber-500/10"
            >
              <p className="text-3xl transition group-hover:scale-110" aria-hidden="true">
                {app.emoji}
              </p>
              <h2 className="mt-3 text-lg font-bold">{app.label}</h2>
              <p className="mt-2 text-sm text-slate-300">{app.blurb}</p>
              <p className="mt-3 font-mono text-xs font-bold text-amber-300">
                {app.href} →
              </p>
            </Link>
          ))}
        </div>
        <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
          <Link href="/squads" className="text-amber-300 hover:underline">
            Squads →
          </Link>
          <Link href="/timer" className="text-amber-300 hover:underline">
            Timer →
          </Link>
          <Link href="/vault" className="text-amber-300 hover:underline">
            Vault →
          </Link>
          <Link href="/business/crm" className="text-amber-300 hover:underline">
            CRM →
          </Link>
          <Link href="/business/invoices" className="text-amber-300 hover:underline">
            Invoices →
          </Link>
        </p>
      </section>

      {/* Pricing promise strip */}
      <section className="mx-auto max-w-5xl px-5 pb-16" aria-label="Pricing promise">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white sm:p-10 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black sm:text-3xl">One coin. One promise.</h2>
            <p className="mt-2 text-white/85 sm:text-lg">
              <strong>100 coins = $1.00.</strong> 25% cut already inside, never
              on top. Every invoice, timer tick, and cloud minute itemized on{" "}
              <Link href="/my/usage/" className="font-bold underline">
                /my/usage/
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/pricing"
              className="rounded-full bg-white px-6 py-3 text-center font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-white/90"
            >
              See pricing
            </Link>
            <Link
              href="/squads"
              className="rounded-full border border-white/40 px-6 py-3 text-center font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              See squad cloud
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
