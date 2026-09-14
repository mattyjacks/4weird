"use client";

import { useState } from "react";

type HostAction = "start" | "stop" | "restart";

const ACTION_COPY: Record<HostAction, string> = {
  start: "Open the room to players.",
  stop: "Close the room; players see it as offline.",
  restart: "Reboot the room container in place.",
};

/**
 * ServerHostControls — host-only room controls (start/stop/restart).
 *
 * Guests (isHost=false) see a host-only notice — actions never render for
 * non-hosts. Actions POST {action, serverId} to the lobby API and surface
 * the result; when the lobby host-actions API is not live yet they fail
 * open with a pending notice instead of throwing. No ledger writes here.
 */
export function ServerHostControls({ serverId, isHost = false }: { serverId: string; isHost?: boolean }) {
  const [pending, setPending] = useState<HostAction | null>(null);
  const [message, setMessage] = useState("");

  if (!isHost) {
    return (
      <section
        aria-label="Host controls"
        className="rounded-2xl border border-white/10 bg-white/[.04] p-4"
      >
        <h2 className="text-sm font-bold text-white">Host controls</h2>
        <p className="mt-1 text-sm text-slate-400">
          Only the room host can start, stop, or restart this server. Join the room to play.
        </p>
      </section>
    );
  }

  async function run(action: HostAction) {
    setPending(action);
    setMessage("");
    try {
      const response = await fetch("/api/mmo/servers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, serverId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = (body as { error?: unknown }).error;
        setMessage(
          typeof err === "string" && err
            ? `Lobby says: ${err}`
            : "Host actions aren't live on the lobby API yet — your room keeps running. No coins moved.",
        );
        return;
      }
      setMessage(`“${action}” accepted by the lobby. The room list refreshes within a minute.`);
    } catch {
      setMessage("You're offline or the lobby API is down — the action wasn't sent. Your room keeps running.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section
      aria-label="Host controls"
      className="rounded-2xl border border-white/10 bg-white/[.04] p-4"
    >
      <h2 className="text-sm font-bold text-white">Host controls</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(ACTION_COPY) as HostAction[]).map((action) => (
          <button
            key={action}
            type="button"
            title={ACTION_COPY[action]}
            disabled={pending !== null}
            onClick={() => void run(action)}
            className="rounded-lg border border-white/20 px-4 py-2 font-semibold capitalize hover:bg-white/10 disabled:opacity-50"
          >
            {pending === action ? `${action}…` : action}
          </button>
        ))}
      </div>
      {message ? (
        <p role="status" className="mt-3 text-sm text-slate-300">{message}</p>
      ) : (
        <p className="mt-3 text-xs text-slate-500">Host actions apply on the next lobby sync.</p>
      )}
    </section>
  );
}
