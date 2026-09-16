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
    <main className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white">
      {/* Slim 40px sticky toolbar: title + context + single auth pill stay visible while browsing */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-10 max-w-6xl items-center gap-3 px-4">
          <Link className="shrink-0 text-cyan-300 hover:underline" href="/games">
            ← Games
          </Link>
          <h1 className="shrink-0 truncate text-base font-black">All Open Lobbies</h1>
          <p className="hidden truncate text-xs text-slate-400 lg:block">
            Join a public game or an open friends-only room — sorted by relay ping, lowest first
          </p>
          <p className="ml-auto flex min-w-0 shrink items-center gap-1 truncate rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            <span className="truncate">Browsing open lobbies —</span>
            <Link className="shrink-0 font-semibold text-cyan-300 hover:underline" href="/auth/login?next=/lobbies">
              sign in
            </Link>
            <span className="hidden truncate xl:inline">only when you join or create.</span>
          </p>
        </div>
      </div>
      <section className="mx-auto max-w-6xl px-4 py-3">
        <p className="text-xs text-slate-400">
          Join a public game or an open friends-only room. Rooms are sorted by relay ping, lowest first;
          private invite rooms never appear here.
        </p>
        <div className="mt-2">
          <Suspense fallback={<p className="text-sm text-slate-400">Loading open lobbies…</p>}>
            <LobbiesBrowser />
          </Suspense>
        </div>
        <div className="mt-2">
          <Suspense fallback={<p className="text-sm text-slate-400">Loading GraveGain party…</p>}>
            <GraveGainLobbies />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
