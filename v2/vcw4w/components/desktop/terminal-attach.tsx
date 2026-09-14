"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

type AttachablePod = {
  id: string;
  podId: string | null;
  kind: string | null;
  interface: string | null;
  endpointUrl: string | null;
  gpu: string | null;
  cpu: string | null;
  status: string | null;
  podStatus: string | null;
};

type MineOk = {
  success: boolean;
  desktops?: AttachablePod[];
  error?: string;
};

type AttachState = "disconnected" | "connecting" | "connected";

// Last-attached pod id. Touched only inside effects/handlers so the module
// stays SSR-safe (no window/localStorage at import or render time).
const STORAGE_KEY = "terminal.attach.podId";

function readSavedPodId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function podLabel(p: AttachablePod): string {
  const compute = p.gpu ? `GPU ${p.gpu}` : p.cpu ? `CPU ${p.cpu}` : (p.kind ?? "desktop");
  const live = (p.podStatus ?? "").toUpperCase();
  const flag = live.includes("RUNNING") ? "live" : live ? live.toLowerCase() : "status unknown";
  return `${p.podId ?? p.id} · ${compute} (${flag})`;
}

/**
 * Terminal-to-desktop attach card (companion for the terminal page).
 * Lists your desktop pods (GET /api/desktop/mine), lets you pick one and
 * connect/disconnect, and shows the live connection status. Fail-open: any
 * fetch failure (logged out, DB down, no pods) renders the empty state with
 * a link to rent a desktop — never an error wall. All browser APIs
 * (localStorage, timers) live in effects/handlers only, so the module is
 * SSR-safe.
 */
export function TerminalAttach({ initialPodId }: { initialPodId?: string }) {
  const [pods, setPods] = useState<AttachablePod[] | null>(null);
  const [selectedId, setSelectedId] = useState(initialPodId ?? "");
  const [attachedId, setAttachedId] = useState<string | null>(null);
  const [attach, setAttach] = useState<AttachState>("disconnected");
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const probeRef = useRef(false);

  // Load the pod list (fail-open: failure -> empty list, never a crash).
  // Also restores the last-attached pod id from storage once the list is
  // known (storage read stays inside this async callback — never at
  // module scope or render time, so the module is SSR-safe).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/desktop/mine", { credentials: "include", cache: "no-store" });
        const body = (await res.json().catch(() => null)) as MineOk | null;
        if (cancelled) return;
        const list = body?.success && Array.isArray(body.desktops) ? body.desktops : [];
        setPods(list);
        if (!initialPodId) {
          const saved = readSavedPodId();
          if (saved && list.some((d) => (d.podId ?? d.id) === saved)) setSelectedId(saved);
        }
      } catch {
        if (!cancelled) setPods([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialPodId]);

  // While attached, recheck liveness every 10s via /api/desktop/mine (which
  // carries the live RunPod probe per row). Skips a tick while the previous
  // probe is still in flight so slow probes never stack up.
  useEffect(() => {
    if (!attachedId) return;
    let cancelled = false;
    async function probe() {
      if (probeRef.current) return;
      probeRef.current = true;
      try {
        const res = await fetch("/api/desktop/mine", { credentials: "include", cache: "no-store" });
        const body = (await res.json().catch(() => null)) as MineOk | null;
        if (cancelled || !body?.success || !Array.isArray(body.desktops)) return;
        const row = body.desktops.find((d) => d.podId === attachedId || d.id === attachedId);
        const status = row?.podStatus ?? null;
        if (cancelled) return;
        setLiveStatus(status);
        setAttach(String(status ?? "").toUpperCase().includes("RUNNING") ? "connected" : "connecting");
      } catch {
        // Transient: keep the last known status; the next tick retries.
      } finally {
        probeRef.current = false;
      }
    }
    void probe();
    const id = window.setInterval(() => void probe(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [attachedId]);

  function connect() {
    const target = pods?.find((p) => (p.podId ?? p.id) === selectedId) ?? null;
    if (!target) return;
    const key = target.podId ?? target.id;
    setAttachedId(key);
    setAttach("connecting");
    setLiveStatus(target.podStatus ?? null);
    if (String(target.podStatus ?? "").toUpperCase().includes("RUNNING")) {
      setAttach("connected");
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, selectedId);
    } catch {
      // Private mode / no storage: attachment still works for this session.
    }
  }

  function disconnect() {
    setAttachedId(null);
    setAttach("disconnected");
    setLiveStatus(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clean up.
    }
  }

  const attached = pods?.find((p) => (p.podId ?? p.id) === attachedId) ?? null;

  return (
    <section aria-label="Attach terminal to desktop" className="rounded-2xl border border-cyan-300/30 bg-cyan-300/[.05] p-5">
      <h2 className="text-2xl font-black text-slate-900 dark:text-white">Attach terminal</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Pick one of your desktop pods and attach this terminal to it. Status is claimed{" "}
        <strong>Connected</strong> only when RunPod itself reports the pod running.
      </p>

      <p role="status" aria-live="polite" className="mt-3 rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
        {attach === "connected" ? (
          <>● <strong>Connected</strong>{attached ? ` — ${attached.podId ?? attached.id}` : ""} (pod RUNNING)</>
        ) : attach === "connecting" ? (
          <>
            <Loader2 className="mr-1 inline h-4 w-4 animate-spin" aria-hidden="true" />
            <strong>Connecting…</strong>
            {liveStatus ? ` (pod reports ${liveStatus})` : " (waiting for pod to report RUNNING)"}
          </>
        ) : (
          <>○ <strong>Disconnected</strong> — no terminal attached.</>
        )}
      </p>

      {loading ? (
        <p role="status" className="mt-3 text-xs text-slate-600 dark:text-slate-300">
          <Loader2 className="mr-1 inline h-4 w-4 animate-spin" aria-hidden="true" />
          Loading your desktop pods…
        </p>
      ) : !pods || pods.length === 0 ? (
        <div className="mt-3 rounded-xl border border-white/15 bg-white/[.04] p-4 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-bold text-slate-900 dark:text-white">No desktop pods to attach to</p>
          <p className="mt-1 text-xs">Rent a virtual desktop first, then come back and attach your terminal to it.</p>
          <Link href="/desktop" className="mt-3 inline-block rounded-full bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200">
            Rent a desktop
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <label className="text-xs text-slate-600 dark:text-slate-300">
            Desktop pod
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={attach !== "disconnected"}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-white disabled:opacity-60"
            >
              <option value="">Select a pod…</option>
              {pods.map((p) => {
                const key = p.podId ?? p.id;
                return (
                  <option key={p.id} value={key}>
                    {podLabel(p)}
                  </option>
                );
              })}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            {attach === "disconnected" ? (
              <button
                type="button"
                disabled={!selectedId}
                onClick={connect}
                className="rounded-full bg-cyan-300 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
              >
                Connect
              </button>
            ) : (
              <button
                type="button"
                onClick={disconnect}
                className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-slate-900 dark:text-white hover:bg-white/10"
              >
                Disconnect
              </button>
            )}
          </div>
          {attached?.endpointUrl && attach === "connected" && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Stream it in the browser:{" "}
              <a href={attached.endpointUrl} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
                open desktop
              </a>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default TerminalAttach;
