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
    <main>
      <h1>Donate Personal Seconds</h1>
      <p>Share idle compute and earn Vibe Coins. 100 coins = $1.00 USD.</p>

      <section aria-label="Hardware readout">
        <h2>Hardware readout</h2>
        {showOfflineFallback ? (
          <p>
            Hardware detector unavailable on this device — showing safe
            defaults. Donating stays optional and fail-open.
          </p>
        ) : null}
        <dl>
          <div>
            <dt>CPU cores</dt>
            <dd>{readout.cpuCores}</dd>
          </div>
          <div>
            <dt>Device memory (GB)</dt>
            <dd>{readout.memoryGb}</dd>
          </div>
          <div>
            <dt>GPU renderer</dt>
            <dd>{readout.gpuRenderer}</dd>
          </div>
          <div>
            <dt>WebGPU</dt>
            <dd>{readout.hasWebGPU ? 'supported' : 'not detected'}</dd>
          </div>
          <div>
            <dt>Downlink (Mbps)</dt>
            <dd>{readout.networkDownlinkMbps}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Share controls">
        <h2>Share controls</h2>
        <label>
          CPU share: {cpuShare}%
          <input
            type="range"
            min={0}
            max={100}
            value={cpuShare}
            onChange={(e) => setCpuShare(Number(e.target.value))}
          />
        </label>
        <label>
          GPU share: {gpuShare}%
          <input
            type="range"
            min={0}
            max={100}
            value={gpuShare}
            onChange={(e) => setGpuShare(Number(e.target.value))}
          />
        </label>
      </section>

      <section aria-label="Availability status">
        <h2>Availability</h2>
        <div role="group" aria-label="Status toggle">
          {(['online', 'busy', 'offline'] as DonorStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <p>Current status: {status} (local only, no backend).</p>
      </section>

      <section aria-label="Earned coins">
        <h2>Earned coins</h2>
        <p>0 coins earned this session (placeholder).</p>
        <p>balances quote the coin ledger</p>
      </section>
    </main>
    </RegionGate>
  );
}
