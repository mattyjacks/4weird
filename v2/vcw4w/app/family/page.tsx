import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Family - Kids & Parents on 4weird",
  description:
    "Parents create child accounts and set play, spending, and access controls; kids log in with a username#1234 handle — no email needed.",
  alternates: { canonical: "/family" },
};

export default function FamilyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-2xl px-5 py-20">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Family
        </p>
        <h1 className="mt-2 text-4xl font-black">Play together, safely</h1>
        <p className="mt-4 text-slate-300">
          Parents create child accounts and set play, access, and spending limits against the parent&apos;s coin balance.
          Kids and teens log in with their{" "}
          <span className="font-semibold text-white">username#1234</span>{" "}
          handle and password — no email needed.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/family/login"
            className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-6 hover:border-cyan-300/60"
          >
            <p className="font-bold text-cyan-200">Kid &amp; teen login →</p>
            <p className="mt-1 text-sm text-slate-300">
              Sign in with your handle and password.
            </p>
          </Link>
          <Link
            href="/games"
            className="rounded-2xl border border-white/10 bg-white/[.04] p-6 hover:border-white/25"
          >
            <p className="font-bold">Browse games →</p>
            <p className="mt-1 text-sm text-slate-300">
              See what the family can play.
            </p>
          </Link>
        </div>
        <p className="mt-8 text-sm text-slate-400">
          Grown-ups with their own account use the regular{" "}
          <a className="text-cyan-300 hover:underline" href="/auth/login">
            log in
          </a>{" "}
          page instead.
        </p>
      </section>
    </main>
  );
}
