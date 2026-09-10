import type { Metadata } from "next";
import Link from "next/link";
import { LobbiesBrowser } from "@/components/lobbies/lobbies-browser";

export const metadata: Metadata = {
  title: "All Open Lobbies | 4weird Games",
  description: "Join a public game or an open friends-only room. Private invite rooms never appear here.",
};

export const dynamic = "force-dynamic";

export default function LobbiesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      
      <section className="mx-auto max-w-4xl px-5 py-20">
        <Link className="text-cyan-300 hover:underline" href="/games">
          ← Games
        </Link>
        <h1 className="mt-4 text-4xl font-black">All Open Lobbies</h1>
        <p className="mt-4 text-slate-300">
          Join a public game or an open friends-only room. Rooms are sorted by relay ping, lowest first;
          private invite rooms never appear here.
        </p>
        <div className="mt-10">
          <LobbiesBrowser />
        </div>
      </section>
    </main>
  );
}
