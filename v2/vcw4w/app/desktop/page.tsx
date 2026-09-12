import type { Metadata } from "next";
import Link from "next/link";
import { DesktopRental } from "@/components/desktop/desktop-rental";
import { RunpodDashboard } from "@/components/runpod/runpod-dashboard";
import { AgentBotNav } from "@/components/agents/agent-bot-nav";

export const metadata: Metadata = {
  alternates: { canonical: "/desktop" },
  title: "RunPod control pane: desktops, test remotes, images | 4weird",
  description:
    "Your RunPod control pane: rent CPU/GPU desktops or custom container images, test 4weird games on remote Kasm remotes, and manage every pod you created - stop, start, restart, terminate - with idle auto-stop. Only your pods, always.",
};

export const dynamic = "force-dynamic";

export default function DesktopPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-5 py-16">
        <Link className="text-cyan-300 hover:underline" href="/">
          ← Home
        </Link>
        <p className="mt-4 text-xs font-bold tracking-widest text-cyan-300">4WEIRD CLOUD / RUNPOD CONTROL PANE</p>
        <h1 className="mt-2 text-4xl font-black">Your RunPods, one control pane</h1>
        <AgentBotNav current="/desktop" />
        <p className="mt-4 max-w-3xl text-slate-300">
          Rent, open, and manage <strong>only your pods</strong> - Virtual Desktops, web-app test remotes, and custom
          container images - all on real RunPod hardware, billed <strong>per second</strong>. Every pod below was
          created by you; nobody else&apos;s pods ever appear here, and every power button re-checks ownership
          server-side.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          🔔 Idle guard (configurable per pod): <strong>60 min</strong> with no input rings a warning chime in your
          open tab, <strong>15 min</strong> later the pod <strong>stops</strong> (disk kept), and after{" "}
          <strong>24h</strong> untended it <strong>terminates</strong> (disk lost). A server sweep enforces the same
          policy when your browser is closed. Coin figures are display equivalents only (100 🪙 = $1.00) - direct
          RunPod spend carries <strong>no Vibe cut</strong> and debits no coins. Mirror every dollar on{" "}
          <Link href="/my/usage/" className="text-cyan-300 hover:underline">
            /my/usage/
          </Link>{" "}
          via <code>POST /api/agents/runpod-sync</code>.
        </p>

        <nav aria-label="Control pane sections" className="mt-6 flex flex-wrap gap-2 text-sm">
          <a href="#launch" className="rounded-full border border-cyan-300/40 px-4 py-1.5 font-bold text-cyan-200 hover:bg-cyan-300/10">1 · Launch</a>
          <a href="#my-pods" className="rounded-full border border-white/20 px-4 py-1.5 text-slate-200 hover:bg-white/10">2 · My pods</a>
          <a href="#testing" className="rounded-full border border-white/20 px-4 py-1.5 text-slate-200 hover:bg-white/10">3 · Web-app testing</a>
          <a href="#plans" className="rounded-full border border-white/20 px-4 py-1.5 text-slate-200 hover:bg-white/10">4 · Plans & billing</a>
        </nav>

        <div id="launch" className="mt-8 scroll-mt-24">
          <p className="text-xs font-bold tracking-widest text-cyan-300">STEP 1 · LAUNCH</p>
          <h2 className="mt-1 text-2xl font-black">Rent a desktop or custom image</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            CPU is preselected (cheapest). GPU adds hardware acceleration. Advanced dropdown rents any container image.
            Booking provisions a live pod and hands you a clickable proxy URL; nothing is ever faked - no stock, no
            key, or over budget comes back as an honest <code>started: false</code> state with no spend.
          </p>
          <div className="mt-4">
            <DesktopRental />
          </div>
        </div>

        <div id="my-pods" className="mt-12 scroll-mt-24">
          <p className="text-xs font-bold tracking-widest text-cyan-300">STEP 2 · MY PODS (ADMIN)</p>
          <h2 className="mt-1 text-2xl font-black">Control every pod you own</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Desktops, test remotes, rental servers, render workers - each card shows its container image, live pod
            status, last activity, and idle guard, plus <strong>Stop / Start / Restart / Terminate / Delete</strong>.{" "}
            <strong>Stop</strong> ends compute billing (disk kept, storage still bills). <strong>Start</strong> boots a
            stopped pod. <strong>Restart</strong> reboots in place. <strong>Terminate / Delete</strong> ends billing
            permanently (disk lost, asks for confirmation). The same dashboard lives at{" "}
            <Link href="/runpods" className="text-cyan-300 hover:underline">My RunPods</Link>.
          </p>
          <div className="mt-4">
            <RunpodDashboard />
          </div>
        </div>

        <div id="testing" className="mt-12 scroll-mt-24 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-bold tracking-widest text-cyan-300">STEP 3 · WEB-APP TESTING</p>
          <h2 className="mt-1 text-2xl font-black">Test 4weird games on a remote</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Every test remote boots a <strong>Kasm Ubuntu desktop on port 6901</strong> (Chromium inside), so the
            stream link <strong>always loads</strong> once the pod boots - the old remotes pointed at 6901 on images
            with no desktop server, which is why they showed “waiting” forever.
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>Open any game and find the <strong>🎮 VibeCodeWorker autoplay</strong> panel under it (CPU preselected, cheapest).</li>
            <li>Press <strong>Autoplay</strong> - a Kasm remote provisions and a stream link + one-time VNC password appear.</li>
            <li>First boot pulls the desktop image (minutes): a 404/“waiting” page is normal - wait, then Reload.</li>
            <li>Log in with the VNC password, open Chromium in the remote, and go to the locked game URL shown in the panel.</li>
            <li>Play/test there. Keep the 4weird tab open: the idle guard chimes at 60 min, stops 15 min later, terminates after 24h untended.</li>
          </ol>
          <p className="mt-4 text-sm text-slate-400">
            Prefer agents or raw servers?{" "}
            <Link href="/agents" className="text-cyan-300 hover:underline">
              Rent an AI agent →
            </Link>{" "}
            GPU play station:{" "}
            <Link href="/xonotic" className="text-cyan-300 hover:underline">
              Xonotic autoplay →
            </Link>{" "}
            All your remotes:{" "}
            <Link href="/runpods" className="text-cyan-300 hover:underline">
              My RunPods →
            </Link>
          </p>
        </div>

        <div id="plans" className="mt-10 grid gap-4 md:grid-cols-2 scroll-mt-24">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="font-bold">💻 CPU Desktop - Ubuntu GUI (Kasm)</h2>
            <p className="mt-2 text-sm text-slate-400">
              <code>runpod/kasm-docker:cuda11</code> (template <code>runpod-desktop</code>) on a cheap CPU pod -
              full graphical desktop streamed on port 6901, software-rendered. JupyterLab + SSH on 8888 is one click
              away (official <code>runpod/base:1.0.2-ubuntu2204</code>).
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-400">
              <li>Cheapest RunPod CPU with stock (cpu3/cpu5 family, 2 vCPU) - preselected default</li>
              <li>20 GB disk max (RunPod CPU cap), one-time VNC password, SSH per RunPod console</li>
              <li>Best for: browsing, files, notebooks, bots, cron helpers, light dev, cheap game testing</li>
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
              <li>Cheapest Secure GPU at or under your $/hr max (set 0 for cheapest available) - live example shown at launch</li>
              <li>60 GB disk, one-time VNC password (change it after login)</li>
              <li>Best for: Blender, CUDA, ComfyUI sidecar, GPU testing</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="font-bold">How renting works</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>Sign in, pick CPU (default) or GPU, pick GUI (default) or Jupyter, optionally cap your $/hr max (GPU only) or paste a custom image.</li>
            <li>
              <code>POST /api/desktop/provision</code> provisions a real RunPod pod - cheapest fitting stock, no
              theater. No stock, no key, or over budget comes back as an honest <code>started: false</code> state.
            </li>
            <li>Open the returned proxy URL: Kasm desktop stream (GUI) or JupyterLab (Jupyter). Save the one-time VNC password.</li>
            <li>Manage it in <strong>My pods</strong> above (or <Link href="/runpods" className="text-cyan-300 hover:underline">My RunPods</Link>); stop ends billing, terminate deletes the disk.</li>
            <li>
              Idle guard watches every pod: chime at 60 min, stop 15 min later, terminate after 24h untended (per-pod
              timers configurable at launch and on each card). Sync real spend to{" "}
              <Link href="/my/usage/" className="text-cyan-300 hover:underline">
                /my/usage/
              </Link>{" "}
              with the Sync button (RunPod card spend, no Vibe cut).
            </li>
          </ol>
          <p className="mt-4 text-sm text-slate-400">
            Need an agent instead of a desktop?{" "}
            <Link href="/agents" className="text-cyan-300 hover:underline">
              Rent an AI agent →
            </Link>{" "}
            Want a worker to play for you?{" "}
            <Link href="/xonotic" className="text-cyan-300 hover:underline">
              Xonotic autoplay →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
