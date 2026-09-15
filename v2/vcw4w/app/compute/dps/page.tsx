'use client';

import { useEffect, useState } from 'react';
import { RegionGate } from '@/components/remastery/region-not-supported';

type DonorStatus = 'online' | 'busy' | 'offline';

interface HardwareReadout {
  cpuCores: number;
  memoryGb: number;
  gpuRenderer: string;
  hasWebGPU: boolean;
  networkDownlinkMbps: number;
}

const FALLBACK_HARDWARE: HardwareReadout = {
  cpuCores: 4,
  memoryGb: 4,
  gpuRenderer: 'Unknown WebGL',
  hasWebGPU: false,
  networkDownlinkMbps: 10,
};

export default function DpsDonorConsolePage() {
  const [mounted, setMounted] = useState(false);
  const [cpuShare, setCpuShare] = useState(80);
  const [gpuShare, setGpuShare] = useState(90);
  const [status, setStatus] = useState<DonorStatus>('offline');
  const [hardware, setHardware] = useState<HardwareReadout | null>(null);
  const [detectorUnavailable, setDetectorUnavailable] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount flag gates the browser-only hardware readout.
    setMounted(true);
    let cancelled = false;

    async function loadHardware() {
      try {
        const mod = await import('../../../lib/dps-hardware');
        if (cancelled || typeof mod.detectHardwareCapabilities !== 'function') {
          if (!cancelled) setDetectorUnavailable(true);
          return;
        }
        const caps = await mod.detectHardwareCapabilities();
        if (!cancelled) {
          setHardware({
            cpuCores: caps.cpuCores ?? FALLBACK_HARDWARE.cpuCores,
            memoryGb: caps.memoryGb ?? FALLBACK_HARDWARE.memoryGb,
            gpuRenderer: caps.gpuRenderer ?? FALLBACK_HARDWARE.gpuRenderer,
            hasWebGPU: caps.hasWebGPU ?? false,
            networkDownlinkMbps:
              caps.networkDownlinkMbps ?? FALLBACK_HARDWARE.networkDownlinkMbps,
          });
        }
      } catch {
        if (!cancelled) setDetectorUnavailable(true);
      }
    }

    loadHardware();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mounted) {
    return (
      <main>
        <h1>Donate Personal Seconds</h1>
        <p>Loading donor console…</p>
      </main>
    );
  }

  const readout: HardwareReadout = hardware ?? FALLBACK_HARDWARE;
  const showOfflineFallback = detectorUnavailable && hardware === null;

  return (
    <RegionGate feature="dps-donate" variant="page">
    <main className="mx-auto w-full max-w-6xl px-5 py-6">
      <h1 className="text-2xl font-black">Donate Personal Seconds</h1>
      <p className="mt-1 text-sm text-slate-400">Share idle compute and earn Vibe Coins. 100 coins = $1.00 USD.</p>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.04] p-5">
        <div className="grid gap-6 md:grid-cols-2">
          <section aria-label="Hardware readout">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Hardware readout</h2>
            {showOfflineFallback ? (
              <p className="mt-2 text-sm text-amber-300">
                Hardware detector unavailable on this device — showing safe
                defaults. Donating stays optional and fail-open.
              </p>
            ) : null}
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">CPU cores</dt>
                <dd className="text-xl font-black">{readout.cpuCores}</dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Memory (GB)</dt>
                <dd className="text-xl font-black">{readout.memoryGb}</dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">GPU model</dt>
                <dd className="truncate text-sm font-bold" title={readout.gpuRenderer}>{readout.gpuRenderer}</dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Downlink (Mbps)</dt>
                <dd className="text-xl font-black">{readout.networkDownlinkMbps}</dd>
              </div>
              <p className="col-span-2 text-xs text-slate-500">
                WebGPU: {readout.hasWebGPU ? 'supported' : 'not detected'}
              </p>
            </dl>
          </section>

          <div className="space-y-5">
            <section aria-label="Share controls">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Share controls</h2>
              <label className="mt-3 block text-sm font-bold">
                CPU share: {cpuShare}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={cpuShare}
                  onChange={(e) => setCpuShare(Number(e.target.value))}
                  className="mt-1 block w-full accent-cyan-400"
                />
              </label>
              <label className="mt-3 block text-sm font-bold">
                GPU share: {gpuShare}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={gpuShare}
                  onChange={(e) => setGpuShare(Number(e.target.value))}
                  className="mt-1 block w-full accent-cyan-400"
                />
              </label>
            </section>

            <section aria-label="Availability status">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Availability</h2>
              <div role="group" aria-label="Status toggle" className="mt-3 inline-flex rounded-full border border-white/15 bg-slate-950 p-1">
                {(['online', 'busy', 'offline'] as DonorStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={status === s}
                    onClick={() => setStatus(s)}
                    className={`rounded-full px-4 py-1.5 text-sm font-bold capitalize ${
                      status === s ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-slate-400">Current status: {status} (local only, no backend).</p>
            </section>
          </div>
        </div>
      </div>

      <section aria-label="Earned coins" className="mt-4 rounded-2xl border border-white/10 bg-white/[.04] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Earned coins</h2>
        <p className="mt-2 text-sm">0 coins earned this session (placeholder).</p>
        <p className="text-sm text-slate-400">balances quote the coin ledger</p>
      </section>
    </main>
    </RegionGate>
  );
}
