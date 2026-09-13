import type { Metadata } from "next";
import { Suspense } from "react";
import { ComputeForm } from "./compute-form";

export const metadata: Metadata = {
  title: "Queue a Compute Job — 4weird Games",
  description:
    "Queue a background compute job for your game (render, transcode, bundle, procedural terrain, sprite pack). Offline-safe: jobs wait locally when unreachable.",
  alternates: { canonical: "/games/compute" },
};

export default function ComputePage() {
  // Fully client-rendered form (offline-safe local queue, no server data):
  // nothing static to cache, so the shell streams the fallback instantly.
  // No 'use cache' here (and never inside the 'use client' form).
  return (
    <Suspense fallback={<p className="p-10 text-center text-sm text-slate-400">Loading compute form…</p>}>
      <ComputeForm />
    </Suspense>
  );
}
