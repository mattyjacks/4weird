"use client";
import Link from "next/link";
// Segment error boundary. Must stay a Client Component per Next docs, and
// must never render error.message/stack/digest (server errors forward a
// generic message in production to avoid leaking internals — the digest
// matches server logs). Uses the stable `retry` prop (Next 16.3+) with a
// `reset` fallback for older runtimes.
export default function GlobalError({ retry, reset }: { error: Error & { digest?: string }; retry?: () => void; reset?: () => void }) { const recover = retry ?? reset; return <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-950 px-6 text-center text-white"><h1 className="text-3xl font-black">Something went sideways</h1><p className="max-w-xl text-slate-300">The 4weird page could not finish loading. Your saved game data is preserved.</p><div className="flex gap-3">{recover ? <button type="button" onClick={recover} className="rounded-full bg-cyan-300 px-6 py-3 font-bold text-slate-950">Try again</button> : null}<Link href="/" className="rounded-full border border-white/20 px-6 py-3 font-semibold">Go home</Link></div></main>; }
