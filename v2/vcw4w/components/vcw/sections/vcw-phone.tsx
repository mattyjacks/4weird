"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Native remote-control section (replaces the framed phone.html).
 * Same behavior, rewritten as React: connect to a worker API URL with a
 * control token, send key actions, and tap-to-click on a 0–1000 pad.
 * The token lives in component state only — never persisted.
 */
export function VcwPhone() {
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("Not connected.");
  const [busy, setBusy] = useState(false);
  const padRef = useRef<HTMLDivElement>(null);
  const [dot, setDot] = useState<{ x: number; y: number } | null>(null);

  const base = useCallback(() => endpoint.trim().replace(/\/+$/, ""), [endpoint]);

  const api = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const root = base();
      if (!root) throw new Error("Enter the worker API URL first.");
      if (!/^https?:\/\//i.test(root)) throw new Error("Worker API URL must start with http:// or https://.");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token.trim()) headers["X-Vibe-Auth"] = token.trim();
      const res = await fetch(root + path, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data as { success?: boolean }).success === false)
        throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
      return data;
    },
    [base, token],
  );

  const connect = useCallback(async () => {
    setBusy(true);
    try {
      setStatus("Connecting…");
      const data = (await api("/api/status")) as { runtimeMode?: string; activeGame?: string; activeGameUrl?: string };
      setStatus(`Connected\nmode: ${data.runtimeMode || "unknown"}\nactive target: ${data.activeGame || data.activeGameUrl || "none"}`);
    } catch (error) {
      setStatus(`Connection failed: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }, [api]);

  const sendAction = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        const result = await api("/api/game/action", { method: "POST", body: JSON.stringify(body) });
        setStatus(`Sent: ${JSON.stringify(result)}`);
      } catch (error) {
        setStatus(`Action failed: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    },
    [api],
  );

  const sendKey = useCallback(
    (key: string) => {
      void sendAction({ type: "keydown", key }).then(() => sendAction({ type: "keyup", key }));
    },
    [sendAction],
  );

  const onPadTap = useCallback(
    (event: React.PointerEvent) => {
      const el = padRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.round(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * 1000);
      const y = Math.round(Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) * 1000);
      setDot({ x, y });
      void sendAction({ type: "click", x, y });
    },
    [sendAction],
  );

  const btn =
    "min-h-[46px] rounded-xl border border-[#356682] bg-[#102b40] px-3 py-2 font-semibold text-white transition active:scale-[.98] active:bg-[#174564]";

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <p className="text-sm text-slate-300">
        Control the active local or Runpod worker from your phone. The token stays only in this tab.
      </p>
      <section className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
        <label htmlFor="vcw-remote-endpoint" className="block text-xs text-slate-400">
          Worker API URL
        </label>
        <input
          id="vcw-remote-endpoint"
          inputMode="url"
          autoComplete="url"
          placeholder="https://<pod>-42069.proxy.runpod.net"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/15 bg-[#06101b] px-3 py-3 text-white"
        />
        <label htmlFor="vcw-remote-token" className="mt-3 block text-xs text-slate-400">
          Control token
        </label>
        <input
          id="vcw-remote-token"
          type="password"
          autoComplete="off"
          placeholder="VIBE_API_TOKEN"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/15 bg-[#06101b] px-3 py-3 text-white"
        />
        <p className="mt-2 text-xs text-slate-500">
          For a local desktop, use its LAN or tunnel URL — not localhost. Set <code>VIBE_API_TOKEN</code> before
          exposing a worker outside your device.
        </p>
        <button type="button" onClick={connect} disabled={busy} className={`${btn} mt-3 w-full border-[#218c69] bg-[#104c3b]`}>
          {busy ? "Connecting…" : "Connect"}
        </button>
        <output aria-live="polite" className="mt-3 block min-h-14 whitespace-pre-wrap font-mono text-xs text-emerald-100/90">
          {status}
        </output>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
        <p className="font-bold text-white">Agent</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => sendKey("Space")} className={`${btn} border-[#218c69] bg-[#104c3b]`}>Start / act</button>
          <button type="button" onClick={() => sendKey("Escape")} className={btn}>Pause</button>
          <button type="button" onClick={() => sendKey("r")} className={btn}>Restart</button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
        <p className="font-bold text-white">Movement</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <span />
          <button type="button" onClick={() => sendKey("ArrowUp")} className={btn} aria-label="Move up">▲</button>
          <span />
          <button type="button" onClick={() => sendKey("ArrowLeft")} className={btn} aria-label="Move left">◀</button>
          <button type="button" onClick={() => sendKey("Space")} className={btn} aria-label="Action">●</button>
          <button type="button" onClick={() => sendKey("ArrowRight")} className={btn} aria-label="Move right">▶</button>
          <span />
          <button type="button" onClick={() => sendKey("ArrowDown")} className={btn} aria-label="Move down">▼</button>
          <span />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
        <p className="font-bold text-white">Tap target</p>
        <div
          ref={padRef}
          onPointerDown={onPadTap}
          role="button"
          tabIndex={0}
          aria-label="Tap pad: sends a click to the active target"
          onKeyDown={(e) => {
            if (e.key === "Enter") void sendAction({ type: "click", x: 500, y: 500 });
          }}
          className="relative mt-2 h-48 cursor-pointer touch-none overflow-hidden rounded-xl border-2 border-dashed border-[#3a6a86] bg-[#050b12]"
        >
          {dot && (
            <span
              aria-hidden="true"
              className="absolute h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400"
              style={{ left: `${dot.x / 10}%`, top: `${dot.y / 10}%` }}
            />
          )}
          {!dot && (
            <span className="absolute inset-0 grid place-items-center text-xs text-slate-500">
              Tap to send a click to the active target
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Tap maps to the active target at 0–1000 coordinates. Every command is sent as a normal VibeCodeWorker action.
        </p>
      </section>
    </div>
  );
}
