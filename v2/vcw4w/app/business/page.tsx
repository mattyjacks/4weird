import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
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

// Fully static app catalog grid from lib/business ('days' profile).
async function CachedBusinessApps() {
  'use cache';
  cacheLife('days');
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {BUSINESS_APPS.map((app) => (
        <Link
          key={app.label}
          href={app.href}
          className="group rounded-xl border border-white/10 bg-white/5 p-3.5 transition hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-xl hover:shadow-amber-500/10"
        >
          <p className="text-2xl transition group-hover:scale-110" aria-hidden="true">
            {app.emoji}
          </p>
          <h2 className="mt-2 text-base font-bold">{app.label}</h2>
          <p className="mt-1 text-sm text-slate-300">{app.blurb}</p>
          <p className="mt-2 font-mono text-xs font-bold text-amber-300">
            {app.href} →
          </p>
        </Link>
      ))}
    </div>
  );
}

export default function BusinessPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Epic dark hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-500/15 via-cyan-500/10 to-transparent"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">
            💼 {BUSINESS_NAME}
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
            {BUSINESS_TAGLINE}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">
            {BUSINESS_BLURB}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Business overview">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Timers</dt>
              <dd className="text-xs font-bold text-amber-300"><Link href="/timer" className="hover:underline">Live in Timer →</Link></dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Invoices</dt>
              <dd className="text-xs font-bold text-amber-300"><Link href="/business/invoices" className="hover:underline">Live in Invoices →</Link></dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">CRM leads</dt>
              <dd className="text-xs font-bold text-amber-300"><Link href="/business/crm" className="hover:underline">Live in CRM →</Link></dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Squad</dt>
              <dd className="text-xs font-bold text-amber-300"><Link href="/squads" className="hover:underline">Live in Squads →</Link></dd>
            </div>
          </dl>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/squads"
              className="rounded-full bg-amber-400 px-5 py-2 text-center text-sm font-bold text-slate-950 shadow-lg shadow-amber-400/30 transition hover:-translate-y-0.5 hover:bg-amber-300"
            >
              Open UnitUnite →
            </Link>
            <Link
              href="/timer"
              className="rounded-full border border-white/20 px-5 py-2 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              Start the timer
            </Link>
            <Link
              href="/vault"
              className="rounded-full border border-white/20 px-5 py-2 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              Open the vault
            </Link>
          </div>
        </div>
      </section>

      {/* App grid */}
      <section className="mx-auto max-w-5xl px-4 pb-4" aria-label="Business apps">
        <Suspense fallback={<p className="text-sm text-slate-400">Loading apps…</p>}>
          <CachedBusinessApps />
        </Suspense>
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
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
      <section className="mx-auto max-w-5xl px-4 pb-4" aria-label="Pricing promise">
        <div className="flex flex-col items-start justify-between gap-3 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-600 p-3.5 text-white sm:p-4 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h2 className="text-xl font-black">One coin. One promise.</h2>
            <p className="mt-1 text-sm text-white/85">
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
