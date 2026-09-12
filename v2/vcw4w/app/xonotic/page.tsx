import type { Metadata } from "next";
import Link from "next/link";
import { VcwAutoplay } from "@/components/games/vcw-autoplay";
import { VCW_DESKTOP_PATH, XONOTIC_WEB_URL } from "@/lib/vcw-autoplay";

export const metadata: Metadata = {
  alternates: { canonical: "/xonotic" },
  title: "Xonotic Autoplay (GPU Boosted, Off-Site) | 4weird Games",
  description:
    "VibeCodeWorker plays Xonotic for you on a GPU-boosted RunPod remote. Off-site mode needs the desktop VibeCodeWorker installed.",
};

export default function XonoticPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-4xl px-5 py-14">
        <Link className="text-cyan-300 hover:underline" href="/agents">
          ← Rent servers
        </Link>
        <p className="mt-4 text-xs font-bold tracking-widest text-cyan-300">4WEIRD / XONOTIC AUTOPLAY</p>
        <h1 className="mt-2 text-4xl font-black">Xonotic, played by VibeCodeWorker</h1>
        <p className="mt-4 text-slate-300">
          Xonotic is the one game with <b className="text-white">off-site mode on</b>: a GPU-boosted RunPod remote
          renders the arena on real GPUs and drives it with vision. That mode needs the desktop VibeCodeWorker
          installed -{" "}
          <a href={VCW_DESKTOP_PATH} className="font-bold text-cyan-300 hover:underline">
            install it from {VCW_DESKTOP_PATH}
          </a>{" "}
          first, then tick “Installed” below.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-400">
          <li>
            GPU boosted only - the remote uses RunPod GPUs (fastest vision, Xonotic&apos;s native client is GPL-3.0+).
          </li>
          <li>
            Off-site target is fixed: <span className="break-all text-cyan-300">{XONOTIC_WEB_URL}</span> plus the
            native client on the pod. No other URL can be driven.
          </li>
          <li>4weird catalog games stay on-site only - this page never unlocks off-site for them.</li>
          <li>Self-terminates after 55 min. RunPod bills per second; coin quotes include the 25% cut.</li>
        </ul>
        <div className="mt-6">
          <VcwAutoplay gameSlug="xonotic" gameTitle="Xonotic" />
        </div>
        <p className="mt-6 text-sm text-slate-400">
          Prefer to play yourself, or manage long-lived servers?{" "}
          <Link href="/agents" className="text-cyan-300 hover:underline">
            Rent an agent / Xonotic server →
          </Link>
        </p>
      </section>
    </main>
  );
}
