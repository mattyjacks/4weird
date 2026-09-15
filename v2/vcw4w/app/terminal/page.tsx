"use client";

/**
 * Commander terminal (Remastery Feature 07, Wave 3).
 *
 * Quake-style power-user CLI: allow-listed LOCAL commands only.
 * No server exec, no eval — every input maps to a TypeScript
 * handler below. Every command publishes an interopBus event (axiom 5).
 * Fail-open offline; SSR-safe ("use client", no browser APIs at module top).
 * DS-DTOP-03 panel below the terminal is the one exception: it GETs
 * /api/desktop/mine (read-only list) and POSTs stop/detach actions on
 * explicit button press — terminal commands themselves never fetch.
 * DS-OCT-04 adds the `desktop pair|link|exec|status|unlink` relay family:
 * explicit user-typed commands that POST to NEW /api/terminal/* routes
 * (pairing codes, httpOnly session, allow-listed exec with timeout).
 * All other commands stay local-only; everything fails open offline.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { interopBus } from "@/lib/interop";
import { fnv1aHex } from "@/lib/remastery/luck-factory";
import { desktopDeepLink, desktopTerminalGuide, opencodeDesktopGuide } from "@/lib/terminal-desktop";
import DesktopStatus, { DESKTOP_CHANGED_EVENT } from "@/components/terminal/desktop-status";

const MAX_HISTORY_LINES = 500;
const COINS_PER_DOLLAR = 100;

interface HistoryLine {
  id: number;
  kind: "input" | "output" | "error";
  text: string;
}

let lineId = 0;
function pushLine(setLines: React.Dispatch<React.SetStateAction<HistoryLine[]>>, kind: HistoryLine["kind"], text: string) {
  lineId += 1;
  const line: HistoryLine = { id: lineId, kind, text };
  setLines((prev) => {
    const next = [...prev, line];
    return next.length > MAX_HISTORY_LINES ? next.slice(next.length - MAX_HISTORY_LINES) : next;
  });
}

function emitCommand(cmd: string) {
  try {
    interopBus.emit("tools:used", { tool: "commander-terminal", action: cmd });
  } catch {
    // Fail-open: bus delivery is best-effort, never bricks the terminal.
  }
}

function formatCoinsQuote(n: number): string {
  const usd = n / COINS_PER_DOLLAR;
  const creator = Math.floor(n * 0.75);
  const platform = n - creator;
  return `${n} coins = $${usd.toFixed(2)} USD (100 coins = $1) — 75/25 split: ${creator} creator / ${platform} platform`;
}

const HELP_TEXT = [
  "Available commands (local only — nothing leaves this tab):",
  "  help               show this list",
  "  echo <text>        print text back",
  "  status             show local session status",
  "  coins <n>          quote n vibe coins in USD (100 coins = $1, 75/25 split)",
  "  luck <intention>   preview deterministic FNV-1a hex of an intention (display only)",
  "  clear              clear scrollback",
  "  whoami             show local identity",
  "  desktop [virtual|local|opencode]  print desktop guidance + deep-link to /desktop",
  "  opencode           print OpenCode → desktop bridge guidance",
  "  pods               list your virtual-desktop pods (GET /api/desktop/mine, fail-open)",
  "  attach <n|id>      attach the pod panel below to a pod stream (local selection only)",
  "  detach             detach the pod panel (local selection only)",
  "  desktop pair <code>           pair a desktop via one-time code (desktop pair issue mints a test code)",
  "  desktop link virtual|<id>     link an owned virtual desktop (desktop link virtual lists yours)",
  "  desktop exec <cmd>            run an allow-listed command on the linked desktop",
  "  desktop status                show desktop link state",
  "  desktop unlink                drop the desktop link",
].join("\n");

// DS-DTOP-03: virtual-desktop pod attach flow (additive — local commands above untouched).
// Read-only list via GET /api/desktop/mine (Supabase session cookies, same-origin;
// bot x-bot-key convention from lib/bot-auth is server-side and not needed here).
// Any fetch failure renders the fail-open empty state; the local sandbox keeps working.
interface DesktopPod {
  id: string;
  podId: string | null;
  kind: string;
  interface: string;
  endpointUrl: string | null;
  gpu: string | null;
  cpu: string | null;
  hourlyUsd: number;
  status: string;
  podStatus: string | null;
}

type PodsState = "loading" | "ready" | "unavailable";

const POD_POLL_MS = 20000;
const ATTACH_HEARTBEAT_MS = 5 * 60 * 1000;

function isDesktopPod(v: unknown): v is DesktopPod {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === "string" && typeof r.status === "string";
}

function describePod(p: DesktopPod): string {
  const live = p.podStatus ?? "?";
  const compute = p.gpu ?? p.cpu ?? "cpu";
  return `${p.kind}/${p.interface} status=${p.status} live=${live} ${compute} $${p.hourlyUsd.toFixed(2)}/hr id=${p.id}`;
}

// DS-OCT-04: `desktop pair|link|exec|status|unlink` relay client (additive).
// Fetch-backed, fail-open offline, SSR-safe (fetch only inside handlers).
type RelayPrint = (t: string) => void;

interface TerminalSessionBody {
  success: boolean;
  linked?: boolean;
  target?: string;
  kind?: string;
  linkedAt?: string;
  error?: string;
}

interface TerminalPairBody {
  success: boolean;
  code?: string;
  expiresInSec?: number;
  target?: string;
  error?: string;
}

interface TerminalExecBody {
  success: boolean;
  output?: string;
  error?: string;
}

interface MineRow {
  id: string;
  kind: string;
  status: string;
  podStatus: string | null;
}

interface MineBody {
  success: boolean;
  desktops?: MineRow[];
  error?: string;
}

function notifyDesktopChanged() {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(DESKTOP_CHANGED_EVENT));
    }
  } catch {
    // best-effort: the status card re-checks on its own refresh.
  }
}

function relayOffline(): boolean {
  try {
    return typeof navigator !== "undefined" && !navigator.onLine;
  } catch {
    return false;
  }
}

const RELAY_OFFLINE_MSG = "offline (fail-open): local commands still work — retry the desktop relay when back online.";

/** Fetch-backed `desktop` relay subcommands. Never throws: every failure prints. */
async function runDesktopAsync(args: string[], print: RelayPrint, printError: RelayPrint): Promise<void> {
  const sub = (args[0] ?? "").toLowerCase();
  const rest = args.slice(1);

  if (sub === "status") {
    if (relayOffline()) {
      print(RELAY_OFFLINE_MSG);
      return;
    }
    try {
      const res = await fetch("/api/terminal/session", { cache: "no-store" });
      const body = (await res.json()) as TerminalSessionBody;
      if (body.linked) {
        print(`desktop: linked (${body.target ?? body.kind ?? "desktop"})${body.linkedAt ? ` since ${body.linkedAt}` : ""}`);
      } else {
        print("desktop: not paired. Run: desktop pair <code>  (mint a test code: desktop pair issue)");
      }
    } catch {
      print(RELAY_OFFLINE_MSG);
    }
    return;
  }

  if (sub === "unlink") {
    if (relayOffline()) {
      print(RELAY_OFFLINE_MSG);
      return;
    }
    try {
      const res = await fetch("/api/terminal/session", { method: "DELETE" });
      const body = (await res.json()) as TerminalSessionBody;
      if (res.ok && body.success) {
        print("desktop: unlinked. Local commands still work.");
        notifyDesktopChanged();
      } else {
        printError(body.error ?? "Unlink failed. Retry shortly.");
      }
    } catch {
      print(RELAY_OFFLINE_MSG);
    }
    return;
  }

  if (sub === "pair") {
    const code = rest.join(" ").trim();
    if (!code) {
      print("Usage: desktop pair <code>  — one-time code from your desktop app (or mint a test code: desktop pair issue)");
      return;
    }
    if (relayOffline()) {
      print(RELAY_OFFLINE_MSG);
      return;
    }
    if (code.toLowerCase() === "issue") {
      try {
        const res = await fetch("/api/terminal/pair", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ target: "mock" }),
        });
        const body = (await res.json()) as TerminalPairBody;
        if (res.ok && body.success && body.code) {
          print(`test pairing code (mock loopback, expires in ${body.expiresInSec ?? 600}s): ${body.code}\nRun: desktop pair ${body.code}`);
        } else {
          printError(body.error ?? "Could not issue a code. Retry shortly.");
        }
      } catch {
        print(RELAY_OFFLINE_MSG);
      }
      return;
    }
    try {
      const res = await fetch("/api/terminal/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = (await res.json()) as TerminalSessionBody;
      if (res.ok && body.linked) {
        print(`desktop: paired (${body.target ?? "desktop"}). Try: desktop exec status`);
        notifyDesktopChanged();
      } else {
        printError(body.error ?? "Pairing failed. Issue a fresh code and retry.");
      }
    } catch {
      print(RELAY_OFFLINE_MSG);
    }
    return;
  }

  if (sub === "link") {
    const target = rest.join(" ").trim();
    if (relayOffline()) {
      print(RELAY_OFFLINE_MSG);
      return;
    }
    if (!target || target.toLowerCase() === "virtual") {
      // List owned virtual desktops (read-only reuse of /api/desktop/mine).
      try {
        const res = await fetch("/api/desktop/mine", { cache: "no-store" });
        const body = (await res.json()) as MineBody;
        const rows = Array.isArray(body.desktops) ? body.desktops : [];
        if (!res.ok || body.success === false) {
          print(`Could not list virtual desktops (${body.error ?? `HTTP ${res.status}`}). Link directly: desktop link virtual|<desktop-id>`);
          return;
        }
        if (rows.length === 0) {
          print("No virtual desktops yet. Provision one at /desktop, then: desktop link virtual|<desktop-id>");
          return;
        }
        const lines = rows.slice(0, 5).map((d) => `  ${d.id}  (${d.kind}, ${d.status}${d.podStatus ? `, pod ${d.podStatus}` : ""})`);
        print(`Your virtual desktops:\n${lines.join("\n")}\nLink one: desktop link virtual|<desktop-id>`);
      } catch {
        print(RELAY_OFFLINE_MSG);
      }
      return;
    }
    const normalized = /^mock$/i.test(target) ? "mock" : target;
    try {
      const res = await fetch("/api/terminal/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: normalized }),
      });
      const body = (await res.json()) as TerminalSessionBody;
      if (res.ok && body.linked) {
        print(`desktop: linked (${body.target ?? normalized}). Try: desktop exec status`);
        notifyDesktopChanged();
      } else {
        printError(body.error ?? "Link failed. Check the id and retry.");
      }
    } catch {
      print(RELAY_OFFLINE_MSG);
    }
    return;
  }

  if (sub === "exec") {
    const command = rest.join(" ").trim();
    if (!command) {
      print("Usage: desktop exec <command> — allow-list: status, echo <text>, whoami, date, help, uptime");
      return;
    }
    if (relayOffline()) {
      print(RELAY_OFFLINE_MSG);
      return;
    }
    try {
      const res = await fetch("/api/terminal/exec", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ command }),
      });
      const body = (await res.json()) as TerminalExecBody;
      if (res.ok && body.success && typeof body.output === "string") {
        print(body.output);
      } else {
        printError(body.error ?? "Desktop relay failed. Retry shortly.");
      }
    } catch {
      print(RELAY_OFFLINE_MSG);
    }
    return;
  }

  // Not a relay subcommand: the caller falls back to guidance.
  print("Usage: desktop [pair <code> | link virtual|<id> | exec <cmd> | status | unlink | virtual | local | opencode]");
}

export default function TerminalPage() {
  const [lines, setLines] = useState<HistoryLine[]>([
    { id: 0, kind: "output", text: "CryptArt Commander v0.1 — local sandbox. Type \"help\". (No server exec; offline-safe.)" },
  ]);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // DS-DTOP-03 pod-attach state (panel below the local terminal).
  const [pods, setPods] = useState<DesktopPod[]>([]);
  const [podsState, setPodsState] = useState<PodsState>("loading");
  const [podsError, setPodsError] = useState<string | null>(null);
  const [attachedId, setAttachedId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionNote, setActionNote] = useState<string | null>(null);

  const fetchPods = useCallback(async (silent: boolean) => {
    if (!silent) {
      setPodsState("loading");
      setPodsError(null);
    }
    try {
      const res = await fetch("/api/desktop/mine", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { success?: boolean; desktops?: unknown };
      const list = Array.isArray(body.desktops) ? body.desktops.filter(isDesktopPod) : [];
      setPods(list);
      setPodsState("ready");
      if (!silent) setPodsError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPodsError(msg);
      // Fail-open: a silent poll never blows away a good list, and the
      // first load degrades to the empty state instead of erroring the page.
      if (!silent) setPodsState("unavailable");
    }
  }, [setPods, setPodsError, setPodsState]);

  const attachByToken = useCallback(
    (token: string): boolean => {
      const t = token.trim().toLowerCase();
      if (!t) return false;
      const idx = Number(t);
      const found =
        Number.isInteger(idx) && idx >= 1 && idx <= pods.length
          ? pods[idx - 1]
          : pods.find((p) => p.id.toLowerCase() === t || (p.podId ?? "").toLowerCase() === t);
      if (!found) return false;
      setAttachedId(found.id);
      setActionNote(null);
      pushLine(setLines, "output", `attached: ${describePod(found)}`);
      if (found.endpointUrl) pushLine(setLines, "output", `stream: ${found.endpointUrl}`);
      emitCommand("attach");
      return true;
    },
    [pods],
  );

  const detachPod = useCallback(() => {
    setAttachedId((prev) => {
      if (prev) pushLine(setLines, "output", "detached: pod panel parked (local selection only).");
      return null;
    });
    setActionNote(null);
    emitCommand("detach");
  }, []);

  const stopAttached = useCallback(async () => {
    const pod = pods.find((p) => p.id === attachedId) ?? null;
    if (!pod || actionBusy) return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Stop pod ${pod.podId ?? pod.id}? Compute billing ends; disk is kept.`,
      );
      if (!confirmed) return;
    }
    setActionBusy(true);
    setActionNote(null);
    try {
      const res = await fetch(`/api/desktop/${pod.id}/pod`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      const body = (await res.json()) as { success?: boolean; error?: unknown; podStatus?: unknown };
      if (!res.ok || body.success === false) {
        throw new Error(typeof body.error === "string" ? body.error : `HTTP ${res.status}`);
      }
      const live = typeof body.podStatus === "string" ? body.podStatus : "updating";
      setActionNote(`stop sent (live: ${live}). Refreshing…`);
      pushLine(setLines, "output", `stop sent for ${pod.podId ?? pod.id} (live: ${live}).`);
      emitCommand("stop");
      await fetchPods(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionNote(`stop failed: ${msg} — retry or manage it at /desktop.`);
      pushLine(setLines, "error", `stop failed: ${msg}`);
    } finally {
      setActionBusy(false);
    }
  }, [pods, attachedId, actionBusy, fetchPods]);

  const run = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      pushLine(setLines, "input", `> ${trimmed || "(empty)"}`);
      if (!trimmed) return;
      const parts = trimmed.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      const print = (t: string) => pushLine(setLines, "output", t);
      const printError = (t: string) => pushLine(setLines, "error", t);

      switch (cmd) {
        case "help":
          print(HELP_TEXT);
          break;
        case "echo":
          print(args.join(" ") || "");
          break;
        case "status": {
          const online = typeof navigator !== "undefined" ? navigator.onLine : true;
          print(`status: local sandbox | ${online ? "online" : "offline (fail-open)"} | ${new Date().toISOString()} | history cap ${MAX_HISTORY_LINES}`);
          break;
        }
        case "coins": {
          const n = Number(args[0]);
          if (!args[0] || !Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
            printError("Usage: coins <non-negative integer> — quote only, no ledger writes.");
          } else {
            print(formatCoinsQuote(n));
          }
          break;
        }
        case "luck": {
          const intention = args.join(" ");
          if (!intention) {
            printError("Usage: luck <intention> — display only, no draw is recorded.");
          } else {
            try {
              print(`intention "${intention}" → seed hex ${fnv1aHex(intention)} (deterministic preview)`);
            } catch (err) {
              printError(`Seed preview failed: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
          break;
        }
        case "clear":
          setLines([]);
          break;
        case "whoami":
          print("commander (local, unauthenticated — no session, no server)");
          break;
        case "desktop": {
          const sub = (args[0] ?? "").toLowerCase();
          if (sub === "pair" || sub === "link" || sub === "exec" || sub === "status" || sub === "unlink") {
            // DS-OCT-04 relay subcommands (fetch-backed, fail-open offline).
            // Fire-and-forget: results print when the relay answers.
            void runDesktopAsync(args, print, printError).catch(() => {
              printError("Desktop relay failed unexpectedly. Local commands still work.");
            });
            break;
          }
          const kind = (args[0] ?? "virtual").toLowerCase();
          if (kind === "virtual" || kind === "local" || kind === "opencode") {
            print(desktopTerminalGuide() + `\nSelected: ${desktopDeepLink(kind)}`);
          } else {
            printError(`Usage: desktop [pair <code> | link virtual|<id> | exec <cmd> | status | unlink | virtual | local | opencode] — try: ${desktopDeepLink("virtual")}`);
          }
          break;
        }
        case "opencode":
          print(opencodeDesktopGuide());
          break;
        case "pods": {
          if (podsState === "loading") {
            print("pods: loading…");
          } else if (podsState === "unavailable") {
            printError(
              `pods: unavailable (${podsError ?? "offline or signed out"}) — local commands still work. Rent one at /desktop.`,
            );
          } else if (pods.length === 0) {
            print("pods: none yet — rent one at /desktop, then `attach`.");
          } else {
            print(pods.map((p, i) => `  ${i + 1}. ${describePod(p)}`).join("\n"));
          }
          break;
        }
        case "attach": {
          if (!args[0]) {
            printError("Usage: attach <n|id> — see `pods` for the list.");
          } else if (podsState === "unavailable") {
            printError(`attach: pod list unavailable (${podsError ?? "offline or signed out"}).`);
          } else if (pods.length === 0) {
            printError("attach: no pods yet — rent one at /desktop.");
          } else if (!attachByToken(args[0])) {
            printError(`attach: no pod matches "${args[0]}". See \`pods\`.`);
          }
          break;
        }
        case "detach":
          detachPod();
          break;
        default:
          printError(`Command not found: "${cmd}". Type "help" for available commands.`);
          break;
      }

      emitCommand(cmd);
    },
    [pods, podsState, podsError, attachByToken, detachPod],
  );

  // DS-DTOP-03: initial list load (fail-open) + live-status poll while attached.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount necessarily populates state.
    void fetchPods(false);
  }, [fetchPods]);

  useEffect(() => {
    if (!attachedId) return;
    const timer = setInterval(() => {
      void fetchPods(true);
    }, POD_POLL_MS);
    return () => clearInterval(timer);
  }, [attachedId, fetchPods]);

  // dtop-03: while attached, tend the pod idle clock (best-effort POST to the
  // existing heartbeat route; failures stay silent so the panel never bricks).
  useEffect(() => {
    if (!attachedId) return;
    const beat = () => {
      void fetch(`/api/desktop/${attachedId}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }).catch(() => {});
    };
    beat();
    const timer = setInterval(beat, ATTACH_HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [attachedId]);

  const attached = pods.find((p) => p.id === attachedId) ?? null;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1rem 1rem 2rem", fontFamily: "monospace" }}>
      <h1 style={{ margin: "0.25rem 0" }}>CryptArt Commander</h1>
      <p style={{ fontFamily: "sans-serif", margin: "0 0 0.75rem" }}>
        Local power-user terminal. Allow-listed commands only — no server execution, works offline.
        Desktop relay (<code>pair</code>/<code>link</code>/<code>exec</code>) is opt-in and allow-listed.
      </p>
      <div style={{ background: "#2b2b2b", borderRadius: "8px 8px 0 0", padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span aria-hidden="true" style={{ display: "flex", gap: "0.35rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e", display: "inline-block" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
        </span>
        <span style={{ color: "#e8e8e8", fontSize: "0.85rem", whiteSpace: "nowrap" }}>commander — local sandbox</span>
        <span style={{ flex: 1, minWidth: 0, marginBottom: "-0.75rem" }}>
          <DesktopStatus />
        </span>
      </div>
      <div
        aria-live="polite"
        onClick={() => inputRef.current?.focus()}
        style={{ background: "#0a0a0a", color: "#d7ffd7", borderRadius: "0 0 8px 8px", padding: "1rem", height: "calc(100vh - 120px)", minHeight: 320, overflowY: "auto" }}
      >
        {lines.map((l) => (
          <div key={l.id} style={{ color: l.kind === "error" ? "#ff9d9d" : l.kind === "input" ? "#9adcff" : "#d7ffd7", whiteSpace: "pre-wrap" }}>
            {l.text}
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(value);
            setValue("");
          }}
          style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}
        >
          <span aria-hidden="true">&gt;</span>
          <input
            ref={inputRef}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Commander command input"
            placeholder='Type "help"'
            maxLength={500}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "inherit", font: "inherit" }}
          />
        </form>
      </div>
      <section aria-label="Virtual desktop pods" style={{ fontFamily: "sans-serif", marginTop: "0.75rem" }}>
        <details>
          <summary style={{ fontFamily: "monospace", cursor: "pointer" }}>Virtual desktop pods</summary>
        {podsState === "loading" && pods.length === 0 ? (
          <p>Loading your pods…</p>
        ) : pods.length === 0 ? (
          <p>
            {podsState === "unavailable"
              ? `No pod data right now (${podsError ?? "offline or signed out"}) — the local terminal above still works. `
              : "No virtual desktops yet — the local terminal above still works. "}
            <Link href="/desktop">Rent one at /desktop</Link>, then come back and attach.
          </p>
        ) : attached ? (
          <div style={{ border: "1px solid #333", borderRadius: 8, padding: "1rem" }}>
            <p>
              <strong>Attached:</strong> {describePod(attached)}
            </p>
            {attached.endpointUrl ? (
              <div>
                <p>
                  <a href={attached.endpointUrl} target="_blank" rel="noreferrer">
                    Open pod stream ↗
                  </a>{" "}
                  <span style={{ color: "#666" }}>(desktop/Jupyter stream; live status refreshes every 20s)</span>
                </p>
                {attached.endpointUrl.startsWith("https://") ? (
                  <iframe
                    src={attached.endpointUrl}
                    title={`Terminal stream for ${attached.kind}/${attached.interface} pod ${attached.podId ?? attached.id}`}
                    style={{ width: "100%", height: 420, border: "1px solid #333", borderRadius: 8, background: "#000" }}
                  />
                ) : (
                  <p style={{ color: "#666" }}>Stream embed needs an https endpoint URL — use the link above.</p>
                )}
              </div>
            ) : (
              <p style={{ color: "#666" }}>No stream URL yet — the pod may still be provisioning.</p>
            )}
            {actionNote ? <p aria-live="polite">{actionNote}</p> : null}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" onClick={detachPod} disabled={actionBusy}>
                Detach
              </button>
              <button type="button" onClick={() => void stopAttached()} disabled={actionBusy}>
                {actionBusy ? "Stopping…" : "Stop pod"}
              </button>
              <button type="button" onClick={() => void fetchPods(true)} disabled={actionBusy}>
                Refresh status
              </button>
            </div>
          </div>
        ) : (
          <div>
            <ul>
              {pods.map((p, i) => (
                <li key={p.id} style={{ marginBottom: "0.5rem" }}>
                  {i + 1}. {describePod(p)}{" "}
                  <button type="button" onClick={() => attachByToken(String(i + 1))} disabled={actionBusy}>
                    Attach
                  </button>
                </li>
              ))}
            </ul>
            {podsError ? <p style={{ color: "#666" }}>Last refresh hiccup: {podsError} (showing cached list).</p> : null}
            <p>
              <button type="button" onClick={() => void fetchPods(false)} disabled={actionBusy}>
                Refresh
              </button>{" "}
              <Link href="/desktop">Manage at /desktop</Link>
            </p>
          </div>
        )}
        </details>
      </section>
    </main>
  );
}
