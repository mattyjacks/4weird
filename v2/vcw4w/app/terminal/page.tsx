"use client";

/**
 * Commander terminal (Remastery Feature 07, Wave 3).
 *
 * Quake-style power-user CLI: allow-listed LOCAL commands only.
 * No server exec, no fetch, no eval — every input maps to a TypeScript
 * handler below. Every command publishes an interopBus event (axiom 5).
 * Fail-open offline; SSR-safe ("use client", no browser APIs at module top).
 */

import { useCallback, useRef, useState } from "react";
import { interopBus } from "@/lib/interop";
import { fnv1aHex } from "@/lib/remastery/luck-factory";

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
].join("\n");

export default function TerminalPage() {
  const [lines, setLines] = useState<HistoryLine[]>([
    { id: 0, kind: "output", text: "CryptArt Commander v0.1 — local sandbox. Type \"help\". (No server exec; offline-safe.)" },
  ]);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
        default:
          printError(`Command not found: "${cmd}". Type "help" for available commands.`);
          break;
      }

      emitCommand(cmd);
    },
    [],
  );

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem", fontFamily: "monospace" }}>
      <h1>CryptArt Commander</h1>
      <p style={{ fontFamily: "sans-serif" }}>
        Local power-user terminal. Allow-listed commands only — no server execution, works offline.
      </p>
      <div
        aria-live="polite"
        onClick={() => inputRef.current?.focus()}
        style={{ background: "#0a0a0a", color: "#d7ffd7", borderRadius: 8, padding: "1rem", minHeight: 320, maxHeight: 480, overflowY: "auto" }}
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
    </main>
  );
}
