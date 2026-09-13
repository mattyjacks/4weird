"use client";

// Root-layout error boundary: error.tsx does NOT wrap the root layout in the
// same segment (see Next docs on error.js hierarchy), so without this file a
// root-layout crash has no boundary. Must render its own <html>/<body> and
// its own styles/fonts — it replaces the root layout when active. Never
// renders error.message/stack/digest: server errors forward only a generic
// message + digest in production, and even that stays out of the UI.
import "./globals.css";

export default function GlobalError({
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  const recover = retry ?? reset;
  return (
    <html lang="en">
      <body className="antialiased">
        <title>Something went sideways | 4weird Games</title>
        <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-950 px-6 text-center text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">4weird Games</p>
          <h1 className="text-3xl font-black">Something went sideways</h1>
          <p className="max-w-xl text-slate-300">
            The 4weird shell could not finish loading. Your saved game data is preserved.
          </p>
          <div className="flex gap-3">
            {recover ? (
              <button
                type="button"
                onClick={recover}
                className="rounded-full bg-cyan-300 px-6 py-3 font-bold text-slate-950"
              >
                Try again
              </button>
            ) : null}
            {/* Plain button + full reload: global-error replaces the root
                layout, so next/link router context may be gone — a hard
                navigation home is the safe recovery. */}
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="rounded-full border border-white/20 px-6 py-3 font-semibold"
            >
              Go home
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
