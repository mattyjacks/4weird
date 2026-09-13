"use client";

/**
 * DonatePersonalSeconds — co-located client (DS-404-02, web lane).
 *
 * Opt-in local compute benchmark. A Blob inline Web Worker (no new file)
 * runs a tight integer-hash loop and reports hashes completed; the main
 * thread derives hashes/sec. A setInterval main-thread loop is the
 * fallback when Workers are unavailable. Donated seconds persist to
 * localStorage. Earnings are an honest illustrative estimate only —
 * nothing uploads, nothing redeems, no ledger writes.
 * SSR-safe ("use client", no browser APIs at module top or during render).
 */

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "dps-donated-seconds";
const COINS_PER_DOLLAR = 100;
// Illustrative rate: 1 vibe coin per donated hour. Estimate only.
const COINS_PER_SECOND = 1 / 3600;
const TICK_MS = 500;
const FALLBACK_BATCH = 20000;

interface WorkerTick {
  type: "tick";
  hashes: number;
}

function isWorkerTick(value: unknown): value is WorkerTick {
  if (typeof value !== "object" || value === null) return false;
  const rec = value as Record<string, unknown>;
  return rec.type === "tick" && typeof rec.hashes === "number";
}

/** Inline worker source: xorshift32 hash loop, posts counts, auto-starts. */
const WORKER_SOURCE = `
let seed = 0x9e3779b9 >>> 0;
let count = 0;
let last = Date.now();
function chunk() {
  for (let i = 0; i < 50000; i++) {
    seed ^= (seed << 13) >>> 0; seed >>>= 0;
    seed ^= seed >>> 17;
    seed ^= (seed << 5) >>> 0; seed >>>= 0;
    count++;
  }
  const now = Date.now();
  if (now - last >= 500) {
    postMessage({ type: "tick", hashes: count });
    count = 0;
    last = now;
  }
  setTimeout(chunk, 0);
}
chunk();
`;

function stepHashes(state: { seed: number }, n: number): void {
  let seed = state.seed >>> 0;
  for (let i = 0; i < n; i += 1) {
    seed ^= (seed << 13) >>> 0;
    seed >>>= 0;
    seed ^= seed >>> 17;
    seed ^= (seed << 5) >>> 0;
    seed >>>= 0;
  }
  state.seed = seed;
}

function readStoredSeconds(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const n = raw === null ? 0 : Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export default function P2pClient() {
  const [mounted, setMounted] = useState(false);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"worker" | "main-thread" | "">("");
  const [hashesPerSec, setHashesPerSec] = useState(0);
  const [totalHashes, setTotalHashes] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [lifetimeSeconds, setLifetimeSeconds] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const workerUrlRef = useRef<string | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const secondTimerRef = useRef<number | null>(null);
  const lastTickAtRef = useRef(0);
  const runningRef = useRef(false);
  const lifetimeRef = useRef(0);

  // Hydration-safe mount: server renders the loading fallback, the client
  // picks up stored seconds on a deferred tick (subscription-style callback,
  // not a synchronous cascading setState).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readStoredSeconds();
      lifetimeRef.current = stored;
      setLifetimeSeconds(stored);
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const persistLifetime = useCallback((seconds: number) => {
    lifetimeRef.current = seconds;
    setLifetimeSeconds(seconds);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(seconds));
    } catch {
      // Fail-open: counter keeps working in memory.
    }
  }, []);

  const stopAll = useCallback(() => {
    runningRef.current = false;
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (workerUrlRef.current !== null) {
      URL.revokeObjectURL(workerUrlRef.current);
      workerUrlRef.current = null;
    }
    if (fallbackTimerRef.current !== null) {
      window.clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (secondTimerRef.current !== null) {
      window.clearInterval(secondTimerRef.current);
      secondTimerRef.current = null;
    }
    setRunning(false);
  }, []);

  const handleTickHashes = useCallback(
    (hashes: number) => {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const prev = lastTickAtRef.current;
      lastTickAtRef.current = now;
      if (prev > 0 && hashes > 0) {
        const dt = Math.max((now - prev) / 1000, 0.01);
        const instant = hashes / dt;
        setHashesPerSec((prevRate) =>
          prevRate === 0 ? instant : prevRate * 0.7 + instant * 0.3,
        );
      }
      setTotalHashes((t) => t + hashes);
    },
    [],
  );

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    lastTickAtRef.current = 0;
    setHashesPerSec(0);
    setTotalHashes(0);
    setSessionSeconds(0);
    setRunning(true);

    // Donated-seconds clock: +1 every wall-clock second while running.
    secondTimerRef.current = window.setInterval(() => {
      if (!runningRef.current) return;
      setSessionSeconds((s) => s + 1);
      persistLifetime(lifetimeRef.current + 1);
    }, 1000);

    // Preferred path: Blob inline worker (no new file needed).
    let startedWorker = false;
    try {
      if (typeof Worker !== "undefined") {
        const blob = new Blob([WORKER_SOURCE], {
          type: "text/javascript",
        });
        const url = URL.createObjectURL(blob);
        const worker = new Worker(url);
        worker.onmessage = (e: MessageEvent) => {
          if (isWorkerTick(e.data)) handleTickHashes(e.data.hashes);
        };
        worker.onerror = () => {
          // Worker failed (CSP blob block etc.): fall back below.
          worker.terminate();
          URL.revokeObjectURL(url);
        };
        workerRef.current = worker;
        workerUrlRef.current = url;
        startedWorker = true;
        setMode("worker");
      }
    } catch {
      startedWorker = false;
    }

    // Fallback path: main-thread interval loop.
    if (!startedWorker) {
      setMode("main-thread");
      const state = { seed: 0x9e3779b9 };
      let pending = 0;
      let last = Date.now();
      fallbackTimerRef.current = window.setInterval(() => {
        if (!runningRef.current) return;
        stepHashes(state, FALLBACK_BATCH);
        pending += FALLBACK_BATCH;
        const now = Date.now();
        if (now - last >= TICK_MS) {
          handleTickHashes(pending);
          pending = 0;
          last = now;
        }
      }, 0);
    }
  }, [handleTickHashes, persistLifetime]);

  const stop = useCallback(() => {
    persistLifetime(lifetimeRef.current);
    stopAll();
  }, [persistLifetime, stopAll]);

  // Teardown on unmount (stopAll is stable via useCallback).
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  if (!mounted) {
    return <p role="status">Loading donate-seconds console…</p>;
  }

  const estimatedCoins = lifetimeSeconds * COINS_PER_SECOND;
  const estimatedUsd = estimatedCoins / COINS_PER_DOLLAR;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: "1rem",
        }}
      >
        <h2 style={{ margin: 0 }}>Donate personal seconds (opt-in)</h2>
        <p>
          Off by default. Press Start to run a local hash benchmark in this
          tab only. Nothing uploads, nothing shares, nothing redeems — the
          earnings figure is an illustrative estimate, not a payout.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {!running ? (
            <button
              type="button"
              onClick={start}
              aria-label="Start the local hash benchmark"
            >
              Start donating seconds
            </button>
          ) : (
            <button
              type="button"
              onClick={stop}
              aria-label="Stop the local hash benchmark"
            >
              Stop
            </button>
          )}
        </div>
        <p role="status" aria-live="polite">
          {running
            ? `Running (${mode === "worker" ? "Web Worker" : "main-thread fallback"}) — ${Math.round(hashesPerSec).toLocaleString()} hashes/sec`
            : "Stopped. Your device is idle."}
        </p>
      </div>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: "1rem",
        }}
      >
        <h2 style={{ margin: 0 }}>Live benchmark</h2>
        <dl>
          <div>
            <dt>Speed</dt>
            <dd>
              {Math.round(hashesPerSec).toLocaleString()} hashes/sec
              {mode === "main-thread" && running
                ? " (main-thread fallback — slower, tab may jank)"
                : ""}
            </dd>
          </div>
          <div>
            <dt>Hashes this run</dt>
            <dd>{totalHashes.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Session donated</dt>
            <dd>{sessionSeconds}s</dd>
          </div>
        </dl>
      </div>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: "1rem",
        }}
      >
        <h2 style={{ margin: 0 }}>Honest estimate</h2>
        <dl>
          <div>
            <dt>Lifetime donated (this browser)</dt>
            <dd>{lifetimeSeconds}s</dd>
          </div>
          <div>
            <dt>Estimated coins</dt>
            <dd>
              {estimatedCoins.toFixed(4)} coins (~${estimatedUsd.toFixed(4)}{" "}
              USD at 100 coins = $1)
            </dd>
          </div>
        </dl>
        <p>
          Rate: 1 coin per donated hour, illustrative only. No ledger writes,
          no redemption — a real payout would need a server-side program that
          does not exist on this page.
        </p>
      </div>
    </div>
  );
}
