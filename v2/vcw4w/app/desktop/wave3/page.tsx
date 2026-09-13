import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import {
  PARITY_MODEL,
  WAVE3_PARITY_ROUTES,
} from "./parity";

export const metadata: Metadata = {
  alternates: { canonical: "/desktop/wave3" },
  title: "Remastery Wave-3 desktop parity board | 4weird",
  description:
    "Desktop parity status for every Remastery Wave-3 route: native vs authenticated-webview-fallback with offline behavior notes.",
};


/**
 * Static parity board — route list is a build-time constant from
 * ./parity.ts, no request-time reads. Cached (`hours` + tag `desktop`).
 */
async function CachedParityBoard() {
  "use cache";
  cacheLife("hours");
  cacheTag("desktop");
  return (
    <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-slate-900 text-xs uppercase tracking-widest text-slate-400">
            <th className="px-4 py-3">Group</th>
            <th className="px-4 py-3">Route</th>
            <th className="px-4 py-3">Web path</th>
            <th className="px-4 py-3">Desktop posture</th>
            <th className="px-4 py-3">Offline behavior</th>
          </tr>
        </thead>
        <tbody>
          {WAVE3_PARITY_ROUTES.map((route) => (
            <tr
              key={`${route.group}:${route.label}`}
              className="border-t border-slate-800 align-top"
            >
              <td className="px-4 py-3 font-bold text-cyan-200">
                {route.group}
              </td>
              <td className="px-4 py-3 font-semibold text-white">
                {route.label}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-300">
                {route.webRoute}
              </td>
              <td className="px-4 py-3">
                <span className="inline-block rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-0.5 text-xs font-bold text-amber-300">
                  {route.posture === "native"
                    ? "native"
                    : "authenticated webview fallback"}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-300">{route.offline}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Wave3ParityPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-5 py-16">
        <Link className="text-cyan-300 hover:underline" href="/desktop">
          ← Desktop control pane
        </Link>
        <p className="mt-4 text-xs font-bold tracking-widest text-cyan-300">
          🖥️ DESKTOP / REMASTERY WAVE 3
        </p>
        <h1 className="mt-2 text-4xl font-black">
          Wave-3 parity board
        </h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Every Remastery Wave-3 route, graded against the desktop parity
          model: <strong>{PARITY_MODEL}</strong>. Wave-3 scope per the
          envelope goal — studio video/image, terminal, luck, plugins,
          studio docs, recordings API, plus studio render quotes — mapped
          onto the creative-studio lanes: Media Mogul video NLE, DictatePic
          canvas editor, Commander terminal, Luck Factory, sandboxed
          mod/plugin loader, studio guides, DemoRecorder capture pipeline,
          and render metering.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Posture today is <strong>authenticated webview fallback</strong>{" "}
          for all Wave-3 routes: the desktop shell loads the signed-in web
          route in an authenticated view; dedicated native implementations
          have not landed yet. No secrets on this page; auth stays in the
          session, never in markup.
        </p>

        <CachedParityBoard />

        <p className="mt-4 text-sm text-slate-400">
          Coverage: {WAVE3_PARITY_ROUTES.length} Wave-3 routes listed across
          all groups — studio video, studio image, terminal, luck, plugins,
          studio docs, recordings API, studio render quotes. Native
          upgrades, when they land, flip individual rows without changing
          this board&apos;s shape.
        </p>
      </section>
    </main>
  );
}
