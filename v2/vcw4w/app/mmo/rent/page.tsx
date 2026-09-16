import type { Metadata } from "next";
import Link from "next/link";
import { RentForm } from "./rent-form";

export const metadata: Metadata = {
  alternates: { canonical: "/mmo/rent" },
  title: "Rent an MMORPG Realm | 4weird Games",
  description:
    "Rent a private 1D–5D MMORPG realm by the hour for kids, teens, or adults — with live rental quotes and host-free options.",
};

export default function MmorpgRentPage() {
  return (
    <div className="bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-2 sm:px-5">
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300">
            Realm rental
          </p>
          <h1 className="truncate text-sm font-black tracking-tight">
            Rent a realm <span className="text-cyan-300">for your party.</span>
          </h1>
        </div>
        <div className="mt-2 grid gap-2.5 lg:h-[calc(100dvh-96px)] lg:min-h-[480px] lg:grid-cols-[55%_45%]">
          <div className="lg:min-h-0 lg:overflow-y-auto">
            <RentForm />
          </div>
          {/* Guide accordion: static explainer only — the live quote
              itself renders inside RentForm, so no state is duplicated.
              <details> collapses the notes without displacing controls. */}
          <details
            open
            className="flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-white/[.03] p-3.5 text-sm lg:min-h-0 lg:overflow-y-auto"
          >
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              How it works
            </summary>
            <ol className="grid gap-2 text-[13px] text-slate-300">
              <li className="flex gap-2">
                <span className="font-black text-cyan-300">1.</span>
                Configure your realm — game, dimension, age band, host-free mode, hours.
              </li>
              <li className="flex gap-2">
                <span className="font-black text-cyan-300">2.</span>
                Hit “Get live quote” — live pricing when the API is up, instant offline
                estimate when it isn’t.
              </li>
              <li className="flex gap-2">
                <span className="font-black text-cyan-300">3.</span>
                Host-free on means players join free — you cover server, load, and rental.
              </li>
            </ol>
            <p className="rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] p-3 text-xs text-slate-300">
              Billed per minute in coins, scaled by dimension and age band. Your quote stays
              on screen next to these notes — no scrolling needed.
            </p>
            <Link
              href="/mmo"
              className="mt-auto text-xs font-semibold text-cyan-300 hover:underline"
            >
              ← Browse realms before you rent
            </Link>
          </details>
        </div>
      </div>
    </div>
  );
}
