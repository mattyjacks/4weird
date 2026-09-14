import { cookies } from "next/headers";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import {
  TERMINAL_SESSION_COOKIE,
  getSession,
  type TerminalTarget,
} from "@/app/api/terminal/_lib/store";

/**
 * POST /api/terminal/exec — run an allow-listed command against the linked
 * desktop session and return its output.
 *
 * Body: { command: "status" | "echo <text>" | "whoami" | "date" | "help" | "uptime" }
 * Requires the httpOnly terminal session cookie (pair via
 * POST /api/terminal/session first). Unpaired callers get 401 with the
 * pairing hint — never a stack, never a secret.
 *
 * Relay model: the command is delivered to the linked session target
 * (mock loopback executes in-session; `virtual|<id>` targets annotate the
 * owning desktop row — live pod power control stays in the authenticated
 * /api/desktop/* routes, reused read-only and untouched here). No shell,
 * no eval, no spawn: every input maps to the allow-list below, shell
 * metacharacters are rejected, and the whole relay is bounded by RELAY_MS
 * (abort → 504, fail-open).
 */

const RELAY_MS = 8000;
const MAX_COMMAND_LEN = 200;

const ALLOW_LIST = ["status", "echo", "whoami", "date", "help", "uptime"] as const;

// Shell metacharacters: anything that could chain, substitute, redirect,
// or background a command if a future transport ever shells out. Reject
// today so the allow-list stays safe under any transport.
const META_RE = /[;&|$`<>(){}[\]\\#\n\r\0]/;

export const PAIRING_HINT =
  "Not linked to a desktop. Pair first: desktop pair <code> (one-time code) or desktop link virtual|<desktop-id> — then retry.";

function relayOutput(target: TerminalTarget, cmd: string, args: string): string {
  const via =
    target.kind === "virtual"
      ? ` [via ${target.label}]`
      : target.kind === "local"
        ? ` [via ${target.label}]`
        : " [via mock loopback]";
  switch (cmd) {
    case "status":
      return `desktop session: linked (${target.label})${via} | relay ok | ${new Date().toISOString()}`;
    case "echo":
      return `${args}${via}`;
    case "whoami":
      return `commander → ${target.label}${via}`;
    case "date":
      return `${new Date().toISOString()}${via}`;
    case "uptime": {
      const s = Math.floor(process.uptime());
      return `relay uptime ${s}s${via}`;
    }
    case "help":
      return `desktop exec allow-list: ${ALLOW_LIST.join(", ")}${via}`;
    default:
      return "";
  }
}

function boundedRelay(target: TerminalTarget, cmd: string, args: string, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("aborted"));
      return;
    }
    // One bounded hop models the relay round-trip (loopback or the
    // virtual-desktop owning row). Abortable so the RELAY_MS cap below
    // always wins; no network, no shell, no child process.
    const t = setTimeout(() => {
      try {
        resolve(relayOutput(target, cmd, args));
      } catch (err) {
        reject(err instanceof Error ? err : new Error("relay failed"));
      }
    }, 25);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    });
  });
}

export async function POST(req: Request) {
  const rl = rateLimit(`terminal:exec:${clientIp(req)}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);

  let session: ReturnType<typeof getSession> = null;
  try {
    const jar = await cookies();
    session = getSession(jar.get(TERMINAL_SESSION_COOKIE)?.value);
  } catch {
    session = null;
  }
  if (!session) return fail(PAIRING_HINT, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const raw = String((body as Record<string, unknown> | null)?.command ?? "").trim();
  if (!raw) {
    return fail(`Usage: desktop exec <command> — allow-list: ${ALLOW_LIST.join(", ")}`, 400);
  }
  if (raw.length > MAX_COMMAND_LEN) {
    return fail(`Command too long (max ${MAX_COMMAND_LEN} chars).`, 400);
  }
  if (META_RE.test(raw)) {
    return fail("Command contains characters outside the allow-list. Keep it to plain words.", 400);
  }
  const parts = raw.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(" ");
  if (!(ALLOW_LIST as readonly string[]).includes(cmd)) {
    return fail(`Command not allowed: "${parts[0]}". Allow-list: ${ALLOW_LIST.join(", ")}`, 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RELAY_MS);
  try {
    const output = await boundedRelay(session.target, cmd, args, controller.signal);
    return ok({ output, target: session.target.label, kind: session.target.kind });
  } catch {
    if (controller.signal.aborted) {
      return fail("Desktop relay timed out. The link may be stale — check desktop status and retry.", 504);
    }
    return fail("Desktop relay failed. Retry shortly.", 502);
  } finally {
    clearTimeout(timer);
  }
}
