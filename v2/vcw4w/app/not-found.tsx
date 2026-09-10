import Link from "next/link";

export const metadata = {
  title: "Lost in the void | 4weird Games",
  description: "This page drifted somewhere strange.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">4weird Games</p>
      <h1 className="mt-4 text-6xl font-black">404</h1>
      <p className="mt-4 max-w-md text-lg text-slate-300">
        This page drifted somewhere strange. The game you are looking for does not exist here.
      </p>
      <div className="mt-8 flex gap-4">
        <Link className="rounded-full bg-cyan-300 px-6 py-3 font-bold text-slate-950" href="/games">
          Browse the arcade
        </Link>
        <Link className="rounded-full border border-white/20 px-6 py-3 font-semibold" href="/">
          Go home
        </Link>
      </div>
    </main>
  );
}
