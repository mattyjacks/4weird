"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProxyLink } from "@/components/runpod/proxy-link";
import {
  DESKTOP_PLANS,
  desktopUsdToCoins,
  type DesktopInterface,
  type DesktopKind,
} from "@/lib/desktop";

type ProvisionOk = {
  success: boolean;
  started?: boolean;
  kind?: DesktopKind;
  interface?: DesktopInterface;
  desktop?: { id: string } | null;
  connection?: {
    endpointUrl: string;
    podId: string;
    gpu: string | null;
    cpu: string | null;
    hourlyUsd: number;
    coinsPerHour: number;
    port: number;
    image: string;
  };
  provision?: { ok: boolean; code?: string; message?: string };
  billing?: { hourly_usd?: number; coins_per_hour_equiv?: number; note?: string };
  note?: string;
  error?: string;
};

type PlansOk = {
  success: boolean;
  plans?: typeof DESKTOP_PLANS;
  runpod_configured?: boolean;
};

/**
 * Virtual Desktop rental panel. Rents a REAL RunPod pod (CPU Ubuntu or GPU
 * Kasm desktop) through POST /api/desktop/provision and hands back the
 * RunPod default proxy endpoint — never faked. RunPod bills per second;
 * coin figures are display equivalents only.
 */
export function DesktopRental() {
  const [kind, setKind] = useState<DesktopKind>("gpu");
  const [iface, setIface] = useState<DesktopInterface>("gui");
  const [maxUsd, setMaxUsd] = useState("0");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProvisionOk | null>(null);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [runpodReady, setRunpodReady] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/desktop/provision");
        const body = (await res.json()) as PlansOk;
        if (body.success) setRunpodReady(Boolean(body.runpod_configured));
      } catch {
        setRunpodReady(null);
      }
    })();
  }, []);

  const plan = DESKTOP_PLANS.find((p) => p.kind === kind) ?? DESKTOP_PLANS[1];

  async function rent() {
    setBusy(true);
    setError("");
    setNeedsLogin(false);
    setResult(null);
    try {
      const max = Number(maxUsd);
      const res = await fetch("/api/desktop/provision", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          interface: iface,
          max_usd_per_hour: Number.isFinite(max) ? max : 0,
        }),
      });
      const body = (await res.json()) as ProvisionOk;
      if (!body.success) {
        if (res.status === 401 || /authentication required|login required/i.test(body.error ?? "")) {
          setNeedsLogin(true);
          return;
        }
        throw new Error(body.error || `Rent failed (${res.status}).`);
      }
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rent failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Rent a Virtual Desktop" className="rounded-2xl border border-cyan-300/30 bg-cyan-300/[.05] p-5">
      <h2 className="text-2xl font-black text-white">Rent your desktop</h2>
      <p className="mt-2 text-sm text-slate-300">
        Quotes are USD/hour maximums on real RunPod pods — billed <strong>per second</strong> by RunPod, never more
        than the quote. Coin figures (≈ {desktopUsdToCoins(1)} coins per $1) are display equivalents only: direct
        RunPod spend carries <strong>no Vibe cut</strong> and debits no coins.
      </p>
      {runpodReady === false && (
        <p role="status" className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/[.08] px-3 py-2 text-xs text-amber-100">
          RunPod is not configured on the server yet (RUNPOD_API_KEY). You can still try — the API will return the
          honest provision state instead of a faked desktop.
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Desktop plan">
        {DESKTOP_PLANS.map((p) => (
          <label
            key={p.kind}
            className={`cursor-pointer rounded-xl border p-4 transition ${
              kind === p.kind ? "border-cyan-300 bg-cyan-300/10" : "border-slate-700 bg-slate-950 hover:border-slate-500"
            }`}
          >
            <input
              type="radio"
              name="desktop-kind"
              value={p.kind}
              checked={kind === p.kind}
              onChange={() => setKind(p.kind)}
              className="sr-only"
            />
            <p className="font-bold text-white">
              {p.kind === "gpu" ? "🖥️" : "💻"} {p.name}
            </p>
            <p className="mt-1 text-xs text-slate-300">{p.tagline}</p>
            <p className="mt-2 text-[11px] text-slate-500">
              {p.image} · port {p.port} · {p.diskGb} GB disk
            </p>
          </label>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Desktop interface">
        {(["gui", "jupyter"] as const).map((face) => (
          <label
            key={face}
            className={`cursor-pointer rounded-xl border p-4 transition ${
              iface === face ? "border-emerald-300 bg-emerald-300/10" : "border-slate-700 bg-slate-950 hover:border-slate-500"
            }`}
          >
            <input
              type="radio"
              name="desktop-interface"
              value={face}
              checked={iface === face}
              onChange={() => setIface(face)}
              className="sr-only"
            />
            <p className="font-bold text-white">
              {face === "gui" ? "🖥️ Ubuntu GUI desktop (default)" : "📓 JupyterLab + SSH"}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {face === "gui"
                ? `Graphical desktop streamed in the browser (port ${plan.port}). Log in with the VNC password.`
                : `JupyterLab + SSH box (port ${plan.jupyter.port}) for code and notebooks.`}
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              {(face === "gui" ? plan.image : plan.jupyter.image)} · port {(face === "gui" ? plan.port : plan.jupyter.port)} · {plan.diskGb} GB disk
            </p>
          </label>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-300">
          Max $/hour (0 = cheapest available with stock)
          <input
            type="number"
            min={0}
            max={1000}
            step={0.01}
            value={maxUsd}
            onChange={(e) => setMaxUsd(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
          />
          <span className="mt-1 block text-slate-500">
            GPU picks the cheapest Secure GPU at or under this max. CPU always takes the cheapest CPU.
          </span>
        </label>
        <div className="text-xs text-slate-300">
          <p className="font-bold text-slate-200">Selected plan</p>
          <p className="mt-1 text-slate-400">{plan.blurb}</p>
          <ul className="mt-2 flex flex-wrap gap-1">
            {plan.bestFor.map((b) => (
              <li key={b} className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300">
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void rent()}
          className="rounded-full bg-cyan-300 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
        >
          {busy ? "Provisioning on RunPod…" : `Rent ${plan.name} now`}
        </button>
        <Link
          href="/my/usage/"
          className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
        >
          Track spend on /my/usage/
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-300">
          {error}
        </p>
      )}
      {needsLogin && (
        <div role="alert" className="mt-3 rounded-xl border border-cyan-300/40 bg-cyan-300/[.08] p-4 text-sm text-slate-200">
          <p className="font-bold text-white">Login required to rent a desktop</p>
          <p className="mt-1 text-xs text-slate-300">
            Renting provisions a real RunPod pod on your account, so it needs a signed-in session. New accounts get a
            100 🪙 ($1.00) trial.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/auth/login"
              className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200"
            >
              Login
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}
      {result?.success && result.started && result.connection && (
        <div className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-300/[.06] p-4 text-xs text-slate-200">
          <p className="font-bold text-emerald-200">✅ Virtual Desktop live</p>
          <p className="mt-2">
            <ProxyLink href={result.connection.endpointUrl} label="Open desktop" />
          </p>
          <p className="mt-1 text-slate-400">
            Pod {result.connection.podId} ·{" "}
            {result.connection.gpu ? `GPU ${result.connection.gpu}` : `CPU ${result.connection.cpu ?? ""}`} · ~
            ${Number(result.connection.hourlyUsd).toFixed(2)}/hr (≈ {Number(result.connection.coinsPerHour).toFixed(0)}{" "}
            coins/hr equiv), per second
          </p>
          {result.interface === "jupyter" ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-400">
              <li>JupyterLab opens at the link above; SSH per the RunPod console pod details.</li>
              <li>Install anything with apt/uv — disk is {plan.diskGb} GB ephemeral unless you attach storage.</li>
              <li>Manage it from <Link href="/runpods" className="text-cyan-300 hover:underline">My RunPods</Link> — stop ends billing, terminate deletes the disk.</li>
            </ul>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-400">
              <li>Log in with the VNC password (default `password` — change VNC_PW in the RunPod console after first login).</li>
              <li>Your Ubuntu desktop streams in the browser: Chromium, VS Code, terminal{result.kind === "gpu" ? ", Blender-ready GPU" : ""}.</li>
              <li>Manage it from <Link href="/runpods" className="text-cyan-300 hover:underline">My RunPods</Link> — stop ends billing, terminate deletes the disk.</li>
            </ul>
          )}
          <p className="mt-2 text-slate-500">{result.billing?.note ?? result.note ?? ""}</p>
        </div>
      )}
      {result?.success && !result.started && (
        <p role="status" className="mt-3 rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-xs text-slate-300">
          Desktop not started: {result.provision?.message ?? result.note ?? "provisioning deferred."} No spend occurred.
        </p>
      )}
    </section>
  );
}
