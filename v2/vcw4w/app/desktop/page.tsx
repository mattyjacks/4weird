import type { Metadata } from "next";
import Link from "next/link";
import { DesktopRental } from "@/components/desktop/desktop-rental";

export const metadata: Metadata = {
  alternates: { canonical: "/desktop" },
  title: "Virtual Desktop on RunPod | 4weird Games",
  description:
    "Rent a virtual desktop on RunPod: an Ubuntu GUI desktop streamed to your browser (Kasm on 6901, CPU or GPU), with JupyterLab as a one-click option. Real pods, per-second RunPod billing, no faked provisioning.",
};

export const dynamic = "force-dynamic";

export default function DesktopPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-5 py-16">
        <Link className="text-cyan-300 hover:underline" href="/">
          â† Home
        </Link>
        <p className="mt-4 text-xs font-bold tracking-widest text-cyan-300">4WEIRD CLOUD / VIRTUAL DESKTOP</p>
        <h1 className="mt-2 text-4xl font-black">Rent a virtual desktop</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          A real computer in the cloud, rented by the second on RunPod. Both plans boot an <strong>Ubuntu GUI
          desktop</strong> (Kasm on port 6901, streamed to your browser) by default; pick <strong>CPU</strong> for
          cheap everyday computing or <strong>GPU</strong> (hardware-accelerated) for Blender, CUDA dev, AI art, and
          GPU play. Prefer JupyterLab + SSH? Pick the <strong>Jupyter</strong> interface instead. Booking provisions a
          live pod and hands you a clickable proxy URL; nothing is ever faked.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          RunPod bills the operator&apos;s card <strong>per second</strong> from the first second. Coin figures are
          display equivalents only (100 ðŸª™ = $1.00) â€” direct RunPod spend carries <strong>no Vibe cut</strong> and
          debits no coins. Mirror every dollar on{" "}
          <Link href="/my/usage/" className="text-cyan-300 hover:underline">
            /my/usage/
          </Link>{" "}
          via <code>POST /api/agents/runpod-sync</code>.
        </p>

        <div className="mt-8">
          <DesktopRental />
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="font-bold">💻 CPU Desktop - Ubuntu GUI (Kasm)</h2>
            <p className="mt-2 text-sm text-slate-400">
              <code>runpod/kasm-docker:cuda11</code> (template <code>runpod-desktop</code>) on a cheap CPU pod -
              full graphical desktop streamed on port 6901, software-rendered. JupyterLab + SSH on 8888 is one click
              away (official <code>runpod/base:1.0.2-ubuntu2204</code>).
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-400">
              <li>Cheapest RunPod CPU with stock (cpu3/cpu5 family, 2 vCPU)</li>
              <li>20 GB disk max (RunPod CPU cap), VNC password, SSH per RunPod console</li>
              <li>Best for: browsing, files, notebooks, bots, cron helpers, light dev</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="font-bold">🖥️ GPU Desktop - RunPod Desktop (Kasm)</h2>
            <p className="mt-2 text-sm text-slate-400">
              Official <code>runpod/kasm-docker:cuda11</code> (template <code>runpod-desktop</code>). Full XFCE
              graphical desktop streamed on port 6901; open the link and you are logged into a GPU workstation.
              JupyterLab on a CUDA box is one click away (PyTorch image on 8888).
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-400">
              <li>Cheapest Secure GPU at or under your $/hr max (set 0 for cheapest available)</li>
              <li>60 GB disk, VNC password via VNC_PW (default `password` â€” change it after login)</li>
              <li>Best for: Blender, CUDA, ComfyUI sidecar, GPU testing</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="font-bold">How renting works</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>Sign in, pick CPU or GPU, pick GUI (default) or Jupyter, optionally cap your $/hr max (GPU only).</li>
            <li>
              <code>POST /api/desktop/provision</code> provisions a real RunPod pod â€” cheapest fitting stock, no
              theater. No stock, no key, or over budget comes back as an honest <code>started: false</code> state.
            </li>
            <li>Open the returned proxy URL: Kasm desktop stream (GUI) or JupyterLab (Jupyter).</li>
            <li>Manage it from <Link href="/runpods" className="text-cyan-300 hover:underline">My RunPods</Link>; stop ends billing, terminate deletes the disk.</li>
            <li>
              Sync real spend to{" "}
              <Link href="/my/usage/" className="text-cyan-300 hover:underline">
                /my/usage/
              </Link>{" "}
              with the Sync button (RunPod card spend, no Vibe cut).
            </li>
          </ol>
          <p className="mt-4 text-sm text-slate-400">
            Need an agent instead of a desktop?{" "}
            <Link href="/agents" className="text-cyan-300 hover:underline">
              Rent an AI agent â†’
            </Link>{" "}
            Want a worker to play for you?{" "}
            <Link href="/xonotic" className="text-cyan-300 hover:underline">
              Xonotic autoplay â†’
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
