"use client";

/**
 * CryptArt Commander — co-located client (DS-404-02, web lane).
 *
 * In-browser terminal modeled on the allow-listed local-commands pattern
 * from app/terminal/page.tsx: a FIXED command table, no eval, no fetch,
 * no server calls. Every input maps to a TypeScript handler below.
 * SSR-safe ("use client", no browser APIs at module top or during render).
 */

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_HISTORY_LINES = 500;
const MAX_INPUT_CHARS = 500;
const COINS_PER_DOLLAR = 100;
const COMMANDER_VERSION = "0.2.0";

interface TermLine {
  id: number;
  kind: "input" | "output" | "error";
  text: string;
}

type Theme = "dark" | "light";

let lineId = 0;
function pushLine(
  setLines: React.Dispatch<React.SetStateAction<TermLine[]>>,
  kind: TermLine["kind"],
  text: string,
) {
  lineId += 1;
  const line: TermLine = { id: lineId, kind, text };
  setLines((prev) => {
    const next = [...prev, line];
    return next.length > MAX_HISTORY_LINES
      ? next.slice(next.length - MAX_HISTORY_LINES)
      : next;
  });
}

const WHOAMI_JOKES = [
  "commander (local, unauthenticated — no session, no server, just vibes)",
  "you are the captain now. Still local. Still unauthenticated. Still legend.",
  "uid=1000(you) gid=1000(local-only) groups=1000(no-servers-were-harmed)",
];

function formatCoinsQuote(n: number): string {
  const usd = n / COINS_PER_DOLLAR;
  const creator = Math.floor(n * 0.75);
  const platform = n - creator;
  return `${n} coins = $${usd.toFixed(2)} USD (100 coins = $1) — 75/25 split: ${creator} creator / ${platform} platform`;
}

/** Tiny safe expression parser: numbers, + - * / % ^, parens. No eval. */
function safeCalc(source: string): number {
  if (!/^[0-9+\-*/%^().\s]+$/.test(source) || !source.trim()) {
    throw new Error("only digits, spaces and + - * / % ^ ( ) are allowed");
  }
  const found = source.match(/(\d+(?:\.\d+)?|[+\-*/%^()])/g);
  if (!found) throw new Error("empty expression");
  const tokens: string[] = found;
  // Reject anything the tokenizer skipped (e.g. ".." or stray dots).
  if (tokens.join("").replace(/\s+/g, "") !== source.replace(/\s+/g, "")) {
    throw new Error("could not parse expression");
  }
  let pos = 0;

  function peek(): string | undefined {
    return tokens[pos];
  }
  function next(): string | undefined {
    return tokens[pos++];
  }

  function parseExpr(): number {
    let value = parseTerm();
    for (;;) {
      const op = peek();
      if (op === "+" || op === "-") {
        next();
        const rhs = parseTerm();
        value = op === "+" ? value + rhs : value - rhs;
      } else return value;
    }
  }

  function parseTerm(): number {
    let value = parseFactor();
    for (;;) {
      const op = peek();
      if (op === "*" || op === "/" || op === "%") {
        next();
        const rhs = parseFactor();
        if (op === "*") value *= rhs;
        else if (op === "/") {
          if (rhs === 0) throw new Error("division by zero");
          value /= rhs;
        } else {
          if (rhs === 0) throw new Error("modulo by zero");
          value %= rhs;
        }
      } else return value;
    }
  }

  // ^ is right-associative: 2^3^2 = 2^(3^2).
  function parseFactor(): number {
    const base = parseUnary();
    if (peek() === "^") {
      next();
      return Math.pow(base, parseFactor());
    }
    return base;
  }

  function parseUnary(): number {
    if (peek() === "-") {
      next();
      return -parseUnary();
    }
    if (peek() === "+") {
      next();
      return parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = next();
    if (tok === undefined) throw new Error("unexpected end of expression");
    if (tok === "(") {
      const value = parseExpr();
      if (next() !== ")") throw new Error("missing closing parenthesis");
      return value;
    }
    const n = Number(tok);
    if (!Number.isFinite(n)) throw new Error(`unexpected token "${tok}"`);
    return n;
  }

  const result = parseExpr();
  if (pos < tokens.length) throw new Error(`unexpected token "${tokens[pos]}"`);
  if (!Number.isFinite(result)) throw new Error("result is not finite");
  return result;
}

const HELP_TEXT = [
  "Available commands (local only — nothing leaves this tab):",
  '  help               show this list',
  '  echo <text>        print text back',
  "  date               print local date/time",
  "  time               print UTC time (ISO)",
  "  calc <expr>        safe math: + - * / % ^ and ( ) — no code runs",
  "  coins <n>          quote n vibe coins in USD (100 coins = $1, 75/25 split)",
  "  usd <dollars>      convert dollars to vibe coins (100 coins = $1)",
  "  theme [dark|light] toggle or set the terminal theme",
  "  history            list commands entered this session",
  "  version            print commander version",
  "  whoami             show local identity (now with jokes)",
  "  status             show local session status",
  "  banner             reprint the welcome banner",
  "  about              what this terminal is",
  "  clear              clear scrollback",
].join("\n");

const MOTD = `CryptArt Commander v${COMMANDER_VERSION} — local sandbox. Type "help". (No server exec; offline-safe.)`;

const THEME_STYLES: Record<Theme, { bg: string; fg: string; dim: string }> = {
  dark: { bg: "#0a0a0a", fg: "#d7ffd7", dim: "#9adcff" },
  light: { bg: "#f4f4f0", fg: "#1a2b1a", dim: "#0b5cad" },
};

export default function CommanderClient() {
  const [lines, setLines] = useState<TermLine[]>([
    { id: 0, kind: "output", text: MOTD },
  ]);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const inputRef = useRef<HTMLInputElement>(null);
  const jokeRef = useRef(0);

  // Read persisted theme after mount (deferred so the read acts like a
  // subscription callback, not a cascading synchronous setState).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem("commander-theme");
        if (saved === "dark" || saved === "light") {
          setTheme(saved);
        }
      } catch {
        // Fail-open: private mode / no storage still gets a terminal.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const applyTheme = useCallback((next: Theme) => {
    setTheme(next);
    try {
      window.localStorage.setItem("commander-theme", next);
    } catch {
      // Fail-open.
    }
  }, []);

  const run = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      pushLine(setLines, "input", `> ${trimmed || "(empty)"}`);
      if (!trimmed) return;
      setHistory((prev) => [...prev.slice(-99), trimmed]);
      setHistoryIndex(null);

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
        case "date":
          print(new Date().toString());
          break;
        case "time":
          print(new Date().toISOString());
          break;
        case "calc": {
          const expr = args.join(" ");
          if (!expr) {
            printError("Usage: calc <expression> — e.g. calc (2 + 3) * 4 ^ 2");
          } else {
            try {
              const result = safeCalc(expr);
              print(`${expr} = ${Number(result.toPrecision(12)).toString()}`);
            } catch (err) {
              printError(
                `calc failed: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          }
          break;
        }
        case "coins": {
          const n = Number(args[0]);
          if (!args[0] || !Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
            printError(
              "Usage: coins <non-negative integer> — quote only, no ledger writes.",
            );
          } else {
            print(formatCoinsQuote(n));
          }
          break;
        }
        case "usd": {
          const dollars = Number(args[0]);
          if (!args[0] || !Number.isFinite(dollars) || dollars < 0) {
            printError("Usage: usd <non-negative number> — quote only.");
          } else {
            const coins = Math.round(dollars * COINS_PER_DOLLAR);
            print(
              `$${dollars.toFixed(2)} USD = ${coins} coins (100 coins = $1) — quote only, no ledger writes.`,
            );
          }
          break;
        }
        case "theme": {
          const arg = (args[0] ?? "").toLowerCase();
          if (!arg) {
            const next: Theme = theme === "dark" ? "light" : "dark";
            applyTheme(next);
            print(`theme: ${theme} → ${next} (saved locally)`);
          } else if (arg === "dark" || arg === "light") {
            applyTheme(arg);
            print(`theme: ${arg} (saved locally)`);
          } else {
            printError('Usage: theme [dark|light] — bare "theme" toggles.');
          }
          break;
        }
        case "history":
          if (history.length === 0) print("(no commands yet this session)");
          else
            print(
              history.map((h, i) => `  ${i + 1}. ${h}`).join("\n"),
            );
          break;
        case "version":
          print(
            `CryptArt Commander v${COMMANDER_VERSION} — allow-listed local commands only. No eval, no fetch, no server.`,
          );
          break;
        case "whoami": {
          const joke = WHOAMI_JOKES[jokeRef.current % WHOAMI_JOKES.length];
          jokeRef.current += 1;
          print(joke);
          break;
        }
        case "status": {
          const online =
            typeof navigator !== "undefined" ? navigator.onLine : true;
          print(
            `status: local sandbox | ${online ? "online" : "offline (fail-open)"} | ${new Date().toISOString()} | history cap ${MAX_HISTORY_LINES}`,
          );
          break;
        }
        case "banner":
          print(MOTD);
          break;
        case "about":
          print(
            "CryptArt Commander: a friendly in-browser terminal. ~15 fixed local commands, command history with up/down arrows, and zero network calls.",
          );
          break;
        case "clear":
          setLines([]);
          break;
        default:
          printError(
            `Unknown command: "${cmd}". Nothing was executed. Type "help" to see local commands.`,
          );
          break;
      }
    },
    [applyTheme, history, theme],
  );

  const palette = THEME_STYLES[theme];

  return (
    <div
      aria-live="polite"
      onClick={() => inputRef.current?.focus()}
      style={{
        background: palette.bg,
        color: palette.fg,
        borderRadius: 8,
        padding: "1rem",
        minHeight: 320,
        maxHeight: 480,
        overflowY: "auto",
        fontFamily: "monospace",
      }}
    >
      {lines.map((l) => (
        <div
          key={l.id}
          style={{
            color:
              l.kind === "error"
                ? "#ff9d9d"
                : l.kind === "input"
                  ? palette.dim
                  : palette.fg,
            whiteSpace: "pre-wrap",
          }}
        >
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
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              if (history.length === 0) return;
              const nextIndex =
                historyIndex === null
                  ? history.length - 1
                  : Math.max(0, historyIndex - 1);
              setHistoryIndex(nextIndex);
              setValue(history[nextIndex]);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              if (historyIndex === null) return;
              const nextIndex = historyIndex + 1;
              if (nextIndex >= history.length) {
                setHistoryIndex(null);
                setValue("");
              } else {
                setHistoryIndex(nextIndex);
                setValue(history[nextIndex]);
              }
            } else if (e.key === "l" && e.ctrlKey) {
              e.preventDefault();
              setLines([]);
            }
          }}
          aria-label="Commander command input"
          placeholder='Type "help"'
          maxLength={MAX_INPUT_CHARS}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "inherit",
            font: "inherit",
          }}
        />
      </form>
    </div>
  );
}
