import type { Metadata } from "next";
import { Suspense } from "react";
import { DebugPlayClient } from "./debugplay-client";

export const metadata: Metadata = {
  alternates: { canonical: "/gamestudio/debugplay" },
  title: "DebugPlay | Headless Game QA & AI Bug Analyzer | 4weird",
  description:
    "DebugPlay: headless game QA & AI bug analyzer — run a guided local QA pass over real site games and download a markdown bug report.",
};

export default function Page() {
  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-14 sm:px-5">
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
          Create · GameStudio · DebugPlay
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          DebugPlay
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-300">
          Headless game QA &amp; AI bug analyzer — probe a real game page,
          grade the checklist, and take home a bug report. Runs in your
          browser.
        </p>
        <div className="mt-8">
          <Suspense
            fallback={
              <p
                role="status"
                className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400"
              >
                Loading DebugPlay…
              </p>
            }
          >
            <DebugPlayClient />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
