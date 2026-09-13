import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { ZipSubmitForm } from "@/components/submit/zip-submit-form";
import { SUBMIT_CUT_NOTE } from "@/lib/zip-submit";

export const metadata: Metadata = {
  alternates: { canonical: "/submit" },
  title: "Submit your game (.zip) | 4weird",
  description: `Upload your game as a .zip (50 MB max; every game loads fast) with a project game root. Automatic safety scan: safe, warning, unsafe, or denied. ${SUBMIT_CUT_NOTE}`,
};

// Fully static intro copy ('days'). ZipSubmitForm stays uncached: it is a
// 'use client' upload form with per-user file state + POSTs.
async function CachedSubmitIntro() {
  'use cache';
  cacheLife('days');
  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">Submit · .zip games</p>
      <h1 className="mt-2 text-4xl font-black">📦 Submit your game</h1>
      <p className="mt-4 text-slate-300">
        Zip your game (max <strong>50 MB</strong> - every game on 4weird loads
        fast ⚡), tell us the{" "}
        <strong>game root</strong> inside the .zip (the folder
        where your index.html lives), and our scanner marks it{" "}
        <strong>safe</strong>, <strong>warning</strong>, <strong>unsafe</strong>, or{" "}
        <strong>denied</strong>. Malware, keyloggers, cybercrime tools, and sexual
        content are hard-denied: quarantined, never served, queued for human moderators.
        Storage + audit are metered in coins with the 25% cut included.
      </p>
    </>
  );
}

export default function SubmitPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-3xl px-5 py-16">
        <Suspense fallback={<p className="text-sm text-slate-400">Loading…</p>}>
          <CachedSubmitIntro />
        </Suspense>
        <div className="mt-8">
          <Suspense fallback={<p className="text-sm text-slate-400">Loading form…</p>}>
            <ZipSubmitForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
