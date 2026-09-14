import fs from "node:fs";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { readCappedJson } from "@/lib/request-body";

/**
 * GET /api/swarm-runs — read the ss2 file-native run bus (public/swarm/).
 * POST /api/swarm-runs — open a new wave (RUNS/open/<id>.json).
 *
 * Contract: ss2.md (runs are files: RUNS/open|<run>.json, active/, done/).
 * Mode ranges mirror the canonical table v2/vcw4w/lib/swarm-ss2/modes.mjs
 * (cheap 10-30, fast 3-8 scopes). Both use cheap models; FAST ~= 2x CHEAP.
 *
 * GET is public and fail-open (missing file = empty, never throws).
 * POST is login-session only: the Supabase cookie session, same check as
 * other mutating routes. Anonymous -> 401. Bot keys are never accepted
 * for writes — no Authorization-header path exists here by design.
 */

const SWARM_DIR = path.join(process.cwd(), "public", "swarm");
const RUNS_DIR = path.join(SWARM_DIR, "RUNS");
const LOCKS_DIR = path.join(SWARM_DIR, "Locks");
const READY_PATH = path.join(SWARM_DIR, "READY.json");
const ROLLUP_PATH = path.join(SWARM_DIR, "TOKENS-ROLLUP.json");
const STOP_PATH = path.join(SWARM_DIR, "STOP");

// Mirror of MODES.<mode>.agents in lib/swarm-ss2/modes.mjs (canonical).
const MODE_RANGE = { cheap: [10, 30], fast: [3, 8] } as const;
type Mode = keyof typeof MODE_RANGE;
const TARGETS = ["desktop", "cloud-vm"] as const;
type Target = (typeof TARGETS)[number];

const SAFE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/;

function readJsonFile<T>(abs: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8")) as T;
  } catch {
    return null;
  }
}

function listRunDir(sub: string, limit: number): Record<string, unknown>[] {
  const dir = path.join(RUNS_DIR, sub);
  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const rows: Record<string, unknown>[] = [];
  for (const f of files) {
    if (!SAFE_FILE.test(f)) continue;
    const row = readJsonFile<Record<string, unknown>>(path.join(dir, f));
    if (!row || typeof row !== "object") continue;
    // Keep the payload small: phone polls this every 30s.
    if (Array.isArray(row.log)) row.log = row.log.slice(-5);
    rows.push(row);
  }
  rows.sort((a, b) => String(b.updated ?? b.created ?? "").localeCompare(String(a.updated ?? a.created ?? "")));
  return rows.slice(0, limit);
}

function clampAgents(mode: Mode, n: unknown): number {
  const [lo, hi] = MODE_RANGE[mode];
  const v = Number(n);
  if (!Number.isFinite(v)) return hi;
  return Math.min(hi, Math.max(lo, Math.floor(v)));
}

export async function GET() {
  const open = listRunDir("open", 50);
  const active = listRunDir("active", 50);
  const doneRecent = listRunDir("done", 10);

  const readyDoc = readJsonFile<{ ready?: unknown[]; count?: unknown }>(READY_PATH);
  const readyCount = Array.isArray(readyDoc?.ready)
    ? readyDoc.ready.length
    : typeof readyDoc?.count === "number"
      ? readyDoc.count
      : 0;

  let locksLive = 0;
  try {
    locksLive = fs.readdirSync(LOCKS_DIR).filter((f) => f.endsWith(".json")).length;
  } catch {
    locksLive = 0;
  }

  let stopPresent = false;
  try {
    stopPresent = fs.existsSync(STOP_PATH);
  } catch {
    stopPresent = false;
  }

  const tokens = readJsonFile<Record<string, unknown>>(ROLLUP_PATH);

  return ok({
    open,
    active,
    done_recent: doneRecent,
    ready_count: readyCount,
    locks_live: locksLive,
    stop_present: stopPresent,
    tokens: tokens ?? null,
  });
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  // Session-cookie check only. There is intentionally no API/bot-key path:
  // bot keys must never open waves.
  if (!data.user) return fail("Authentication required.", 401);

  const rl = rateLimit(`swarm-runs:open:${data.user.id}`, 10, 60_000);
  if (!rl.allowed) return fail("Too many waves. Try again shortly.", 429, rateLimitHeaders(rl));

  const parsed = await readCappedJson(req, 8 * 1024);
  if ("error" in parsed) return parsed.error;
  const input = (parsed.body ?? {}) as Record<string, unknown>;

  const mode = input.mode === "cheap" || input.mode === "fast" ? (input.mode as Mode) : null;
  if (!mode) return fail("mode must be cheap or fast.", 400);
  const agents = clampAgents(mode, input.agents);
  const goal = typeof input.goal === "string" ? input.goal.trim() : "";
  if (goal.length < 1 || goal.length > 500) return fail("goal must be 1..500 characters.", 400);
  const target = input.target === undefined || input.target === null ? "desktop" : String(input.target);
  if ((TARGETS as readonly string[]).indexOf(target) < 0) {
    return fail("target must be desktop or cloud-vm.", 400);
  }

  const now = new Date().toISOString();
  const id = `RUN-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296)
    .toString(36)
    .toUpperCase()
    .padStart(2, "0")}`;
  const doc = {
    run: "ss2-run.v1",
    id,
    mode,
    agents,
    goal,
    target: target as Target,
    // Never write identity into the public bus: public/swarm/ must hold
    // no logins or private data (ss2.md NEVER). "web" marks the source.
    opened_by: "web",
    status: "open",
    log: [`${now} web: run opened (${mode} x${agents}, target ${target})`],
    created: now,
    updated: now,
  };
  try {
    fs.mkdirSync(path.join(RUNS_DIR, "open"), { recursive: true });
    const dest = path.join(RUNS_DIR, "open", `${id}.json`);
    const tmp = `${dest}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(doc, null, 2) + "\n");
    fs.renameSync(tmp, dest);
  } catch (error) {
    console.error("[api/swarm-runs] write failed", {
      message: String((error as { message?: unknown } | null)?.message ?? error).slice(0, 200),
    });
    return fail("Unable to open a wave. Try again shortly.");
  }
  return ok({ id, mode, agents, target }, 201);
}
