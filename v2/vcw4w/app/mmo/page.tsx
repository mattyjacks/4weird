import type { Metadata } from "next";
import Link from "next/link";
import { MmoBrowser } from "./mmo-browser";

export const metadata: Metadata = {
  alternates: { canonical: "/mmo" },
  title: "MMORPG Worlds | 4weird Games",
  description:
    "Browse 4weird MMORPG worlds: compare 1D–5D realms by age band with live per-minute rental quotes and host-free play options.",
};

export default function MmorpgPage() {
  return (
    <div className="bg-slate-950 text-white">
      {/* 44px unified sticky toolbar: title + Rent Realm CTA pinned;
          Game/Age filters + dense grid/table live in MmoBrowser row below
          (component-owned — see QUEUE handoff, never stretched scope) */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex h-11 max-w-7xl items-center gap-3 px-4 sm:px-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300">
            MMORPG worlds
          </p>
          <h1 className="truncate text-sm font-black tracking-tight">
            Pick your realm. <span className="text-cyan-300">Rally your party.</span>
          </h1>
          <Link
            href="/mmo/rent"
            className="ml-auto shrink-0 rounded-full bg-cyan-300 px-4 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Rent a realm &rarr;
          </Link>
        </div>
      </div>
      <section className="mx-auto max-w-7xl px-4 py-2 sm:px-5">
        <p className="text-xs text-slate-400">
          Compare realms by dimension and age band with live coins/min quotes — host-free worlds are free to join.
        </p>
        <div className="mt-2">
          <MmoBrowser />
        </div>
      </section>
    </div>
  );
}
