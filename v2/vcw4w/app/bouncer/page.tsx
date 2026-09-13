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
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-5 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
          4WEIRD // DELIVERABILITY
        </p>
        <h1 className="mt-2 text-4xl font-black">Email Bouncer</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Paste a list of up to 50 emails to check deliverability, spam-trap
          hits, and toxicity risk. Results export to CSV. Nothing is sent —
          this only verifies.
        </p>
        <div className="mt-10">
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
