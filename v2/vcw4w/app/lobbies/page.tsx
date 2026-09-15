import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LobbiesBrowser } from "@/components/lobbies/lobbies-browser";
import { GraveGainLobbies } from "@/components/lobbies/gravegain-lobbies";

export const metadata: Metadata = {
  alternates: { canonical: "/lobbies" },
  title: "All Open Lobbies | 4weird Games",
  description: "Join a public game or an open friends-only room. Private invite rooms never appear here.",
};


export default function LobbiesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link className="text-cyan-300 hover:underline" href="/games">
            ← Games
          </Link>
          <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            Browsing open lobbies —{" "}
            <Link className="font-semibold text-cyan-300 hover:underline" href="/auth/login?next=/lobbies">
              sign in
            </Link>{" "}
            only when you join or create.
          </p>
        </div>
        <h1 className="mt-3 text-2xl font-black">All Open Lobbies</h1>
        <p className="mt-1 text-sm text-slate-300">
          Join a public game or an open friends-only room. Rooms are sorted by relay ping, lowest first;
          private invite rooms never appear here.
        </p>
        <div className="mt-3">
          <Suspense fallback={<p className="text-sm text-slate-400">Loading open lobbies…</p>}>
            <LobbiesBrowser />
          </Suspense>
        </div>
        <div className="mt-3">
          <Suspense fallback={<p className="text-sm text-slate-400">Loading GraveGain party…</p>}>
            <GraveGainLobbies />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
