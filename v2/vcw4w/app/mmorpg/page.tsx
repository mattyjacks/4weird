import type { Metadata } from "next";
import Link from "next/link";
import { MmorpgBrowser } from "./mmorpg-browser";

export const metadata: Metadata = {
  alternates: { canonical: "/mmorpg" },
  title: "MMORPG Worlds | 4weird Games",
  description:
    "Browse 4weird MMORPG worlds: compare 1D–5D realms by age band with live per-minute rental quotes and host-free play options.",
};

export default function MmorpgPage() {
  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          MMORPG worlds
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Pick your realm. <span className="text-cyan-300">Rally your party.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          Compare every realm by dimension and age band, see the live
          cost-per-minute quote, and spot host-free worlds where the host
          covers the server. When you are ready, rent a private instance for
          your party.
        </p>
        <div className="mt-6">
          <Link
            href="/mmorpg/rent"
            className="inline-block rounded-full bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Rent a realm &rarr;
          </Link>
        </div>
        <div className="mt-10">
          <MmorpgBrowser />
        </div>
      </section>
    </div>
  );
}
