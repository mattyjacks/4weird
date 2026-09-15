import type { Metadata } from "next";
import { Suspense } from "react";
import { CodeDetail } from "./code-detail";

export const metadata: Metadata = {
  alternates: { canonical: "/code" },
  title: "Code submission | 4weird",
  description: "Beautiful code view with the safety verdict, findings, and audit for your game submission.",
};

// NOTE: no 'use cache' here — per-user submission reads via an authenticated
// API. Static shell prerenders; params + private submission stream in Suspense.
async function CodeBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CodeDetail id={id} />;
}

export default function CodePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl px-4 py-8" aria-busy="true" aria-label="Loading submission">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Code review</p>
          <h1 className="mt-1 text-2xl font-black text-white">Loading submission…</h1>
          <p className="mt-1 text-sm text-slate-400">Verdict, findings, and audit stream in privately.</p>
        </main>
      }
    >
      <CodeBody params={params} />
    </Suspense>
  );
}
