"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProxyLink } from "@/components/runpod/proxy-link";
import { gameSlugs } from "@/content/games";
import {
  AUTOPLAY_RATES,
  VCW_DESKTOP_INSTALLER,
  VCW_DESKTOP_PATH,
  isXonoticSlug,
  resolveAutoplayPlan,
  type AutoplayCompute,
  type AutoplaySiteMode,
} from "@/lib/vcw-autoplay";

type StartOk = {
  success: boolean;
  started?: boolean;
  plan?: { game_slug: string; compute: string; site_mode: string; target_url: string };
  connection?: {
    endpointUrl: string;
    podId: string;
    kind: string;
    gpu: string | null;
    cpu: string | null;
    hourlyUsd: number;
    port: number;
  };
  provision?: { ok: boolean; code?: string; message?: string };
  quote?: { minutes: number; gross_coins: number; max_run_usd: number };
  note?: string;
  error?: string;
};

/**
 * VibeCodeWorker autoplay panel. A RunPod CPU/GPU remote plays the game
 * by controlling the browser; locked on-site to 4weird games only.
 * Xonotic is the single exception: GPU boosted + off-site + desktop app.
 */
export function VcwAutoplay({ gameSlug, gameTitle }: { gameSlug: string; gameTitle: string }) {
  const slug = gameSlug.toLowerCase();
  const isXonotic = isXonoticSlug(slug);
  const [compute, setCompute] = useState<AutoplayCompute>(isXonotic ? "gpu-boosted" : "cpu");
  const [siteMode, setSiteMode] = useState<AutoplaySiteMode>(isXonotic ? "off-site" : "on-site");
  const [desktopInstalled, setDesktopInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StartOk | null>(null);
  const [error, setError] = useState("");

  const plan = useMemo(
    () =>
      resolveAutoplayPlan({
        gameSlug: slug,
        compute,
        siteMode,
        desktopInstalled,
        catalogSlugs: gameSlugs,
      }),
    [slug, compute, siteMode, desktopInstalled],
  );

  async function start() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/vcw/autoplay", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_slug: slug,
          compute,
          site_mode: siteMode,
          desktop_installed: desktopInstalled,
        }),
      });
      const body = (await res.json()) as StartOk;
      if (!body.success) throw new Error(body.error || `Start failed (${res.status}).`);
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="VibeCodeWorker autoplay" className="mt-4 rounded-2xl border border-cyan-300/30 bg-cyan-300/[.05] p-4">
      <p className="text-sm font-black text-cyan-200">🎮 VibeCodeWorker autoplay - RunPod remote plays for you</p>
      <p className="mt-1 text-xs text-slate-300">
        {isXonotic ? (
          <>
            Xonotic runs <b className="text-white">off-site in GPU boosted mode</b> (RunPod GPUs render + see the game).
            The desktop VibeCodeWorker must be installed -{" "}
            <Link href={VCW_DESKTOP_PATH} className="font-bold text-cyan-300 hover:underline">
              get it at {VCW_DESKTOP_PATH}
            </Link>{" "}
            ({VCW_DESKTOP_INSTALLER}).
          </>
        ) : (
          <>
            A CPU or GPU remote controls <b className="text-white">this browser tab only</b>, playing {gameTitle} on-site.
            Browser control is locked to 4weird games; off-site mode stays off here (it exists only for Xonotic,
            GPU boosted + desktop app).
          </>
        )}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-slate-300">
          Remote
          <select
            value={compute}
            onChange={(e) => setCompute(e.target.value as AutoplayCompute)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
          >
            {AUTOPLAY_RATES.map((r) => (
              <option key={r.compute} value={r.compute}>
                {r.compute} - {r.coinsPerMinute} coins/min
              </option>
            ))}
          </select>
          <span className="mt-1 block text-slate-500">
            {AUTOPLAY_RATES.find((r) => r.compute === compute)?.blurb ?? ""}
          </span>
        </label>
        <fieldset className="text-xs text-slate-300">
          <legend className="text-slate-300">Site mode</legend>
          <div className="mt-1 flex gap-2">
            <label className={`flex-1 rounded-md border px-2 py-1.5 ${siteMode === "on-site" ? "border-cyan-300 bg-cyan-300/10 text-white" : "border-slate-700 text-slate-400"}`}>
              <input
                type="radio"
                name={`vcw-site-${slug}`}
                checked={siteMode === "on-site"}
                onChange={() => setSiteMode("on-site")}
                disabled={isXonotic}
                className="mr-1"
              />
              On-site
            </label>
            <label className={`flex-1 rounded-md border px-2 py-1.5 ${siteMode === "off-site" ? "border-cyan-300 bg-cyan-300/10 text-white" : "border-slate-700 text-slate-400"}`}>
              <input
                type="radio"
                name={`vcw-site-${slug}`}
                checked={siteMode === "off-site"}
                onChange={() => setSiteMode("off-site")}
                disabled={!isXonotic}
                className="mr-1"
              />
              Off-site
            </label>
          </div>
          <span className="mt-1 block text-slate-500">
            {isXonotic ? "Xonotic is off-site only." : "4weird games are on-site only."}
          </span>
        </fieldset>
        <div className="text-xs text-slate-300">
          <p className="font-bold text-slate-200">Desktop app {isXonotic ? "(required)" : "(not needed)"}</p>
          <label className="mt-1 flex items-center gap-2 rounded-md border border-slate-700 px-2 py-1.5">
            <input
              type="checkbox"
              checked={desktopInstalled}
              onChange={(e) => setDesktopInstalled(e.target.checked)}
            />
            <span>Installed ({VCW_DESKTOP_INSTALLER})</span>
          </label>
          <Link href={VCW_DESKTOP_PATH} className="mt-1 inline-block text-cyan-300 hover:underline">
            Open {VCW_DESKTOP_PATH} →
          </Link>
        </div>
      </div>

      {!plan.ok && (
        <p role="alert" className="mt-2 rounded-lg border border-amber-300/40 bg-amber-300/[.08] px-3 py-2 text-xs text-amber-100">
          {plan.error}{" "}
          {plan.needsDesktop && (
            <Link href={VCW_DESKTOP_PATH} className="font-bold text-cyan-300 hover:underline">
              Install the desktop app first →
            </Link>
          )}
        </p>
      )}
      {plan.ok && (
        <p className="mt-2 text-xs text-slate-400">
          Remote will drive <span className="break-all text-cyan-300">{plan.targetUrl}</span> ({plan.compute}, {plan.siteMode}).
          Self-terminates after 55 min. RunPod bills per second; coin quote includes the 25% cut.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !plan.ok}
          onClick={() => void start()}
          className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
        >
          {busy ? "Starting remote…" : `Autoplay ${gameTitle} on ${compute}`}
        </button>
        <Link
          href="/agents"
          className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold hover:bg-white/10"
        >
          Rent / manage servers
        </Link>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
      {result?.success && result.started && result.connection && (
        <div className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-300/[.06] p-3 text-xs text-slate-200">
          <p className="font-bold text-emerald-200">✅ Autoplay remote live</p>
          <p className="mt-1">
            <ProxyLink href={result.connection.endpointUrl} label="Open stream" />
          </p>
          <p className="mt-1 text-slate-400">
            Pod {result.connection.podId} · {result.connection.kind === "cpu" ? `CPU ${result.connection.cpu}` : `GPU ${result.connection.gpu}`} ·
            ~${Number(result.connection.hourlyUsd).toFixed(2)}/hr, per second
            {result.quote ? ` · max ~$${Number(result.quote.max_run_usd).toFixed(2)} / ${result.quote.minutes} min · ${result.quote.gross_coins} coins gross` : ""}.
          </p>
          <p className="mt-1 text-slate-400">Watch the stream above; the worker is driving the locked game URL only.</p>
        </div>
      )}
      {result?.success && !result.started && (
        <p role="status" className="mt-2 rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-xs text-slate-300">
          Remote not started: {result.provision?.message ?? result.note ?? "provisioning deferred."}
        </p>
      )}
    </section>
  );
}
