"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface TermLine {
  id: number;
  kind: "cmd" | "ok" | "err" | "motd";
  content: ReactNode;
}

const PROMPT = "4weird$";

const MOTD: ReactNode[] = [
  "▓▓ CryptArt Commander v1.0 — Quake-style terminal for 4weird Games ▓▓",
  "Runs 100% in your browser. No login, no server calls, nothing leaves this tab.",
  "Type \u201chelp\u201d to list commands. Press Up/Down for history, Ctrl+L to clear.",
];

/** Real site routes this terminal may navigate to. Kept in sync with app/ pages. */
const ROUTES: { route: string; blurb: string }[] = [
  { route: "/", blurb: "home" },
  { route: "/games", blurb: "all games" },
  { route: "/games/compute", blurb: "Compute (game)" },
  { route: "/games/fridgesimulator", blurb: "FridgeSimulator (game)" },
  { route: "/games/gravegain4dA/play", blurb: "GraveGain4DA (play)" },
  { route: "/pricing", blurb: "pricing & coins" },
  { route: "/agents", blurb: "agent / GPU rentals" },
  { route: "/tools", blurb: "free tools index" },
  { route: "/tools/counter", blurb: "counter tool" },
  { route: "/docs", blurb: "docs index" },
  { route: "/commander", blurb: "this terminal" },
];

/** Aliases for `open` — every target is a real local route, navigated client-side. */
const OPEN_ALIASES: Record<string, string> = {
  coins: "/pricing",
  pricing: "/pricing",
  gpu: "/agents",
  agents: "/agents",
  rentals: "/agents",
  games: "/games",
  compute: "/games/compute",
  fridge: "/games/fridgesimulator",
  fridgesimulator: "/games/fridgesimulator",
  gravegain: "/games/gravegain4dA/play",
  gravegain4d: "/games/gravegain4dA/play",
  gravegain4da: "/games/gravegain4dA/play",
  tools: "/tools",
  counter: "/tools/counter",
  docs: "/docs",
  commander: "/commander",
  home: "/",
};

/** Split input into command + args, honouring single/double quotes. */
function tokenize(input: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    out.push(m[1] ?? m[2] ?? m[3]);
  }
  return out;
}

function normalizeRoute(raw: string): string {
  let r = raw.trim().toLowerCase();
  if (!r.startsWith("/")) r = `/${r}`;
  if (r.length > 1) r = r.replace(/\/+$/, "");
  return r;
}

export function CommanderTerminal() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [lines, setLines] = useState<TermLine[]>(() =>
    MOTD.map((content, i) => ({ id: i + 1, kind: "motd" as const, content })),
  );
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);
  const idRef = useRef(MOTD.length);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const nextId = useCallback(() => {
    idRef.current += 1;
    return idRef.current;
  }, []);

  const push = useCallback(
    (batch: { kind: TermLine["kind"]; content: ReactNode }[]) => {
      setLines((prev) => [
        ...prev,
        ...batch.map((b) => ({ ...b, id: nextId() })),
      ]);
    },
    [nextId],
  );

  // Autofocus the input on mount (desktop); harmless on mobile.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the newest output in view.
  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const printHelp = useCallback(() => {
    push([
      {
        kind: "ok",
        content: (
          <span>
            Available commands — everything resolves locally, instantly:
            <br />
            {"  help                 list this help"}
            <br />
            {"  echo <text>           print text back"}
            <br />
            {"  date                 show the current date & time"}
            <br />
            {"  whoami               who you are in this terminal"}
            <br />
            {"  banner               reprint the startup message"}
            <br />
            {"  about                what CryptArt Commander is"}
            <br />
            {"  coins                how Coins convert to dollars"}
            <br />
            {"  gpu                  how RTX 4090 rentals work"}
            <br />
            {"  games                list featured games"}
            <br />
            {"  goto <route>         go to a site route (allowlisted)"}
            <br />
            {"  open <alias>         open a docs shortcut (e.g. open coins)"}
            <br />
            {"  theme light|dark     switch the site theme"}
            <br />
            {"  history              show commands you typed this session"}
            <br />
            {"  clear                clear the screen"}
          </span>
        ),
      },
    ]);
  }, [push]);

  const run = useCallback(
    (raw: string, priorHistory: string[]) => {
      // Echo the typed command first.
      push([{ kind: "cmd", content: `${PROMPT} ${raw}` }]);

      const tokens = tokenize(raw);
      if (tokens.length === 0) return;
      const name = tokens[0].toLowerCase();
      const args = tokens.slice(1);

      switch (name) {
        case "help":
          printHelp();
          break;

        case "echo":
          push([{ kind: "ok", content: args.join(" ") || "" }]);
          break;

        case "date": {
          const now = new Date();
          push([
            { kind: "ok", content: `${now.toString()} — ${now.toISOString()}` },
          ]);
          break;
        }

        case "whoami":
          push([
            {
              kind: "ok",
              content:
                "guest@4weird — no login, no account lookup. This terminal runs 100% in your browser.",
            },
          ]);
          break;

        case "banner":
          push(MOTD.map((content) => ({ kind: "motd" as const, content })));
          break;

        case "about":
          push([
            {
              kind: "ok",
              content:
                "CryptArt Commander: a Quake-style in-browser command terminal for 4weird Games. It navigates the site, explains Coins and GPU rentals, and lists games — every command resolves locally with zero network calls.",
            },
          ]);
          break;

        case "coins":
          push([
            {
              kind: "ok",
              content: (
                <span>
                  Coins: 100 Coins = exactly $1.00. Coins buy rentals and
                  unlocks across the site.{" "}
                  <Link href="/pricing" className="underline">
                    See /pricing
                  </Link>
                  .
                </span>
              ),
            },
          ]);
          break;

        case "gpu":
          push([
            {
              kind: "ok",
              content: (
                <span>
                  GPU rentals run on NVIDIA RTX 4090 hosts — pay with Coins,
                  launch from your browser, stop any time.{" "}
                  <Link href="/agents" className="underline">
                    See /agents
                  </Link>
                  .
                </span>
              ),
            },
          ]);
          break;

        case "games":
          push([
            {
              kind: "ok",
              content: (
                <span>
                  Featured games:
                  <br />
                  {"  • "}
                  <Link href="/games/compute" className="underline">
                    Compute
                  </Link>
                  {" — /games/compute"}
                  <br />
                  {"  • "}
                  <Link href="/games/fridgesimulator" className="underline">
                    FridgeSimulator
                  </Link>
                  {" — /games/fridgesimulator"}
                  <br />
                  {"  • "}
                  <Link href="/games/gravegain4dA/play" className="underline">
                    GraveGain4DA
                  </Link>
                  {" — /games/gravegain4dA/play"}
                  <br />
                  {"  All games: "}
                  <Link href="/games" className="underline">
                    /games
                  </Link>
                </span>
              ),
            },
          ]);
          break;

        case "goto": {
          if (args.length === 0) {
            push([
              {
                kind: "err",
                content:
                  "Usage: goto <route> — e.g. goto /games. Allowed routes: " +
                  ROUTES.map((r) => r.route).join(", "),
              },
            ]);
            break;
          }
          const target = normalizeRoute(args[0]);
          const hit = ROUTES.find((r) => r.route === target);
          if (!hit) {
            push([
              {
                kind: "err",
                content: `Unknown route "${args[0]}". I can only take you to real pages: ${ROUTES.map((r) => r.route).join(", ")}. Type "help" for more.`,
              },
            ]);
            break;
          }
          push([{ kind: "ok", content: `Navigating to ${hit.route}…` }]);
          router.push(hit.route);
          break;
        }

        case "open": {
          if (args.length === 0) {
            push([
              {
                kind: "err",
                content: `Usage: open <alias> — aliases: ${Object.keys(OPEN_ALIASES).join(", ")}.`,
              },
            ]);
            break;
          }
          const alias = args[0].toLowerCase();
          const target = OPEN_ALIASES[alias];
          if (!target) {
            push([
              {
                kind: "err",
                content: `Unknown shortcut "${args[0]}". Try: ${Object.keys(OPEN_ALIASES).join(", ")}. Type "help" for more.`,
              },
            ]);
            break;
          }
          push([{ kind: "ok", content: `Opening ${target}…` }]);
          router.push(target);
          break;
        }

        case "theme": {
          const mode = (args[0] ?? "").toLowerCase();
          if (mode !== "light" && mode !== "dark" && mode !== "system") {
            push([
              {
                kind: "err",
                content:
                  'Usage: theme light|dark — e.g. theme dark. ("theme system" also works.)',
              },
            ]);
            break;
          }
          setTheme(mode);
          push([{ kind: "ok", content: `Theme set to ${mode}.` }]);
          break;
        }

        case "history": {
          const all = [...priorHistory, raw];
          if (all.length === 0) {
            push([{ kind: "ok", content: "No commands yet this session." }]);
          } else {
            push([
              {
                kind: "ok",
                content: all
                  .map((h, i) => `  ${i + 1}  ${h}`)
                  .join("\n"),
              },
            ]);
          }
          break;
        }

        case "clear":
          setLines([]);
          break;

        default:
          push([
            {
              kind: "err",
              content: `Unknown command "${name}". Type "help" to see what I can do.`,
            },
          ]);
          break;
      }
    },
    [printHelp, push, router, setTheme],
  );

  const submit = useCallback(
    (raw: string) => {
      const nextHistory = [...history, raw];
      setHistory(nextHistory);
      setHistoryIdx(null);
      run(raw, history);
    },
    [history, run],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const raw = value;
        setValue("");
        submit(raw);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (history.length === 0) return;
        const idx =
          historyIdx === null ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(idx);
        setValue(history[idx]);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIdx === null) return;
        const idx = historyIdx + 1;
        if (idx >= history.length) {
          setHistoryIdx(null);
          setValue("");
        } else {
          setHistoryIdx(idx);
          setValue(history[idx]);
        }
      } else if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        setLines([]);
      }
    },
    [history, historyIdx, submit, value],
  );

  return (
    <div
      onClick={focusInput}
      className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_0_60px_-15px_rgba(34,211,238,0.4)] focus-within:border-cyan-400/60"
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[.03] px-4 py-2.5">
        <span aria-hidden="true" className="h-3 w-3 rounded-full bg-red-500/80" />
        <span aria-hidden="true" className="h-3 w-3 rounded-full bg-yellow-500/80" />
        <span aria-hidden="true" className="h-3 w-3 rounded-full bg-green-500/80" />
        <p className="ml-2 text-xs font-semibold tracking-widest text-slate-400 uppercase">
          CryptArt Commander — 4weird$ terminal
        </p>
      </div>

      <div
        ref={outputRef}
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
        className="h-96 overflow-y-auto px-4 py-3 font-mono text-sm leading-relaxed sm:text-[15px]"
      >
        {lines.length === 0 ? (
          <p className="whitespace-pre-wrap text-slate-500">
            Screen cleared. Type &ldquo;help&rdquo; to list commands.
          </p>
        ) : (
          lines.map((line) => (
            <p
              key={line.id}
              className={
                line.kind === "cmd"
                  ? "font-bold whitespace-pre-wrap text-cyan-300"
                  : line.kind === "err"
                    ? "whitespace-pre-wrap text-red-400"
                    : line.kind === "motd"
                      ? "whitespace-pre-wrap text-emerald-300"
                      : "whitespace-pre-wrap text-slate-200"
              }
            >
              {line.content === "" ? "\u00a0" : line.content}
            </p>
          ))
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-white/10 bg-white/[.02] px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          const raw = value;
          setValue("");
          submit(raw);
        }}
      >
        <label htmlFor="commander-input" className="sr-only">
          Terminal input. Type help for a list of commands.
        </label>
        <span
          aria-hidden="true"
          className="shrink-0 font-mono text-sm font-bold text-emerald-300 sm:text-[15px]"
        >
          {PROMPT}
        </span>
        <input
          ref={inputRef}
          id="commander-input"
          name="command"
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Terminal input. Type help for a list of commands."
          placeholder="type help…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent font-mono text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-[15px]"
        />
      </form>
    </div>
  );
}
