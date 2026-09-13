"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface EnvInfo {
  webgpu: "checking" | "available" | "unavailable";
  adapterLabel: string;
  cores: number | null;
  deviceMemoryGb: number | null;
}

interface RunResult {
  run: number;
  ms: number;
  mflops: number;
}

const MATRIX_N = 128;
const WARMUP_RUNS = 3;
const MEASURED_RUNS = 7;
const FLOPS_PER_RUN = 2 * MATRIX_N * MATRIX_N * MATRIX_N;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function matmulOnce(a: Float32Array, b: Float32Array, n: number): Float32Array {
  const c = new Float32Array(n * n);
  for (let i = 0; i < n; i += 1) {
    for (let k = 0; k < n; k += 1) {
      const aik = a[i * n + k];
      for (let j = 0; j < n; j += 1) {
        c[i * n + j] += aik * b[k * n + j];
      }
    }
  }
  return c;
}

function randomMatrix(n: number): Float32Array {
  const m = new Float32Array(n * n);
  for (let i = 0; i < m.length; i += 1) {
    m[i] = Math.random() * 2 - 1;
  }
  return m;
}

export function P2pBenchmark() {
  const [env, setEnv] = useState<EnvInfo>({
    webgpu: "checking",
    adapterLabel: "Checking…",
    cores: null,
    deviceMemoryGb: null,
  });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<RunResult[]>([]);
  const [status, setStatus] = useState(
    "Ready. Press “Run benchmark” to measure this device.",
  );
  const cancelRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      const cores =
        typeof navigator !== "undefined" &&
        typeof navigator.hardwareConcurrency === "number"
          ? navigator.hardwareConcurrency
          : null;
      const nav = navigator as Navigator & { deviceMemory?: number };
      const deviceMemoryGb =
        typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;

      let webgpu: EnvInfo["webgpu"] = "unavailable";
      let adapterLabel = "Not detected in this browser";
      try {
        const navGpu = navigator as Navigator & {
          gpu?: { requestAdapter: () => Promise<unknown> };
        };
        if (navGpu.gpu) {
          const adapter = await navGpu.gpu.requestAdapter();
          if (adapter) {
            webgpu = "available";
            adapterLabel = "Available (GPU adapter acquired)";
          }
        }
      } catch {
        webgpu = "unavailable";
        adapterLabel = "Not detected in this browser";
      }
      if (!cancelled) {
        setEnv({ webgpu, adapterLabel, cores, deviceMemoryGb });
      }
    }
    void detect();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  const runBenchmark = useCallback(async () => {
    if (running) return;
    cancelRef.current = false;
    setRunning(true);
    setResults([]);
    setStatus("Warming up…");
    setProgress("Warm-up runs…");

    const a = randomMatrix(MATRIX_N);
    const b = randomMatrix(MATRIX_N);

    for (let w = 0; w < WARMUP_RUNS; w += 1) {
      if (cancelRef.current) {
        setRunning(false);
        setStatus("Benchmark cancelled.");
        return;
      }
      matmulOnce(a, b, MATRIX_N);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const measured: RunResult[] = [];
    for (let r = 1; r <= MEASURED_RUNS; r += 1) {
      if (cancelRef.current) {
        setRunning(false);
        setStatus("Benchmark cancelled.");
        return;
      }
      setProgress(`Measured run ${r} of ${MEASURED_RUNS}…`);
      setStatus(`Running measured pass ${r} of ${MEASURED_RUNS}…`);
      await new Promise((resolve) => setTimeout(resolve, 0));
      const t0 = performance.now();
      matmulOnce(a, b, MATRIX_N);
      const t1 = performance.now();
      const ms = Math.max(t1 - t0, 0.01);
      const mflops = FLOPS_PER_RUN / (ms / 1000) / 1e6;
      measured.push({ run: r, ms, mflops });
      setResults([...measured]);
    }

    const medMs = median(measured.map((m) => m.ms));
    const medMflops = median(measured.map((m) => m.mflops));
    setRunning(false);
    setProgress("");
    setStatus(
      `Done: median ${medMs.toFixed(1)} ms per ${MATRIX_N}×${MATRIX_N} multiply — ${medMflops.toFixed(1)} MFLOPS.`,
    );
  }, [running]);

  const medMs = results.length > 0 ? median(results.map((r) => r.ms)) : null;
  const medMflops =
    results.length > 0 ? median(results.map((r) => r.mflops)) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <h2 className="text-lg font-bold text-white">This device</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              WebGPU
            </dt>
            <dd className="mt-1 font-semibold text-white">
              {env.webgpu === "checking"
                ? "Checking…"
                : env.webgpu === "available"
                  ? "Available"
                  : "Not available"}
            </dd>
            <dd className="mt-1 text-xs text-slate-400">{env.adapterLabel}</dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              CPU cores
            </dt>
            <dd className="mt-1 font-semibold text-white">
              {env.cores === null ? "Unknown" : env.cores}
            </dd>
            <dd className="mt-1 text-xs text-slate-400">
              From your browser (hardware concurrency)
            </dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Device memory
            </dt>
            <dd className="mt-1 font-semibold text-white">
              {env.deviceMemoryGb === null
                ? "Unknown"
                : `About ${env.deviceMemoryGb} GB`}
            </dd>
            <dd className="mt-1 text-xs text-slate-400">
              Reported by Chrome when available
            </dd>
          </div>
        </dl>
        {env.webgpu === "unavailable" && (
          <p className="mt-3 text-sm text-amber-200">
            No WebGPU here — that is fine. The speed test below still runs on
            your CPU.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <h2 className="text-lg font-bold text-white">
          Local speed test ({MATRIX_N}×{MATRIX_N} math)
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Multiplies two {MATRIX_N}×{MATRIX_N} tables of numbers {WARMUP_RUNS}{" "}
          warm-up times plus {MEASURED_RUNS} timed runs, then reports the
          middle (median) result.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void runBenchmark()}
            disabled={running}
            aria-label="Run the local speed benchmark"
            className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? "Running…" : "Run benchmark"}
          </button>
          {running && (
            <button
              type="button"
              onClick={() => {
                cancelRef.current = true;
              }}
              aria-label="Cancel the running benchmark"
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              Cancel
            </button>
          )}
        </div>
        <p aria-live="polite" role="status" className="mt-3 text-sm text-slate-200">
          {running && progress ? progress : status}
        </p>
        {results.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-80 border-collapse text-sm">
              <caption className="pb-2 text-left text-xs text-slate-400">
                Timed runs — bigger MFLOPS means faster. Median:{" "}
                {medMs !== null && medMflops !== null
                  ? `${medMs.toFixed(1)} ms, ${medMflops.toFixed(1)} MFLOPS`
                  : "—"}
              </caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th scope="col" className="border-b border-white/10 px-3 py-2">
                    Run
                  </th>
                  <th scope="col" className="border-b border-white/10 px-3 py-2">
                    Time (ms)
                  </th>
                  <th scope="col" className="border-b border-white/10 px-3 py-2">
                    Speed (MFLOPS)
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.run} className="text-slate-200">
                    <td className="border-b border-white/5 px-3 py-2">
                      {r.run}
                    </td>
                    <td className="border-b border-white/5 px-3 py-2">
                      {r.ms.toFixed(1)}
                    </td>
                    <td className="border-b border-white/5 px-3 py-2">
                      {r.mflops.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <h2 className="text-lg font-bold text-white">Honest note</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          This is a local capability check only: everything runs inside this
          tab and nothing is uploaded, shared, or sent to any peer. The actual
          P2P sharing network is not part of this page — no compute leaves
          your device here.
        </p>
      </div>
    </div>
  );
}
