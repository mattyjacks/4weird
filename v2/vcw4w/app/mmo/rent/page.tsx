import type { Metadata } from "next";
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
      <section className="mx-auto max-w-3xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          Realm rental
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          Rent a realm <span className="text-cyan-300">for your party.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          Pick a dimension, an age band, and how many hours you need. You get a
          live quote before anything is booked.
        </p>
        <div className="mt-10">
          <RentForm />
        </div>
      </section>
    </div>
  );
}
