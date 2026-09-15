import type { Metadata } from "next";
import { Suspense } from "react";
import { BouncerChecker } from "@/components/bouncer/bouncer-checker";

export const metadata: Metadata = {
  alternates: { canonical: "/bouncer" },
  title: "Email Bouncer",
  description:
    "Paste up to 50 emails and verify deliverability, spam-trap, and toxicity risk via the bouncer API.",
};

export default function BouncerPage() {
  return (
    <main className="bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
            4WEIRD // DELIVERABILITY
          </p>
          <h1 className="truncate text-sm font-black">Email Bouncer</h1>
          <p className="hidden truncate text-[11px] text-slate-400 md:block">
            Up to 50 emails — deliverability, spam-trap &amp; toxicity. Nothing is sent.
          </p>
        </div>
        {/* Workbench frame (uxpass p36): on desktop the checker lives in a
            100vh panel with its own scroll so inputs + scorecard stay in view.
            Inner 45/55 input|results split lives in BouncerChecker (follow-up). */}
        <div className="mt-2 lg:h-[calc(100dvh-96px)] lg:min-h-[420px] lg:overflow-y-auto lg:rounded-2xl">
          {/* Static header streams in the shell; the checker resolves at
              request time and stays defensive if /api/bouncer/* is missing. */}
          <Suspense
            fallback={
              <p
                role="status"
                className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400"
              >
                Loading the email checker…
              </p>
            }
          >
            <BouncerChecker />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
