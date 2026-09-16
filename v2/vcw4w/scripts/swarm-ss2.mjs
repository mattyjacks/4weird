#!/usr/bin/env node
/**
 * swarm-ss2 — file-native swarm engine (Plan B).
 *
 * Boot canonical: public/swarm/ss3.md §Boot. Mode numbers imported from
 * lib/swarm-ss2/modes.mjs (single source of truth — never copy them here).
 *
 * Subcommands (all run from v2/vcw4w/):
 *   ready [--out PATH]                 Rank open envelopes -> READY.json (lead-manual per wave)
 *   pack <id> [--full]                 Build Packs/<id>.json sidecar (hashes + acceptance + excerpts?)
 *   verify-pack <id>                   Compare pack hashes to disk (0 = fresh, 1 = drifted, lists files)
 *   claim <id> [--owner TAG]           Exclusive-create lockfile (atomic; failure = held, take next)
 *   heartbeat <id> --owner TAG         Refresh your lockfile seq (3 min FAST / 10 min CHEAP)
 *   release <id> --owner TAG            Delete your lockfile at close
 *   run --mode <cheap|fast> --agents N --goal "..." [--target desktop|cloud-vm]
 *                                      Write a RUNS/open/<run>.json intent (phone/desktop/VM pickup)
 *   pickup <run> --owner TAG           Move RUNS/open -> RUNS/active (lead loop or daemon, later)
 *   tokens-note <id> <model> <in> <out> Append one JSONL line to TOKENS.jsonl (estimates or real usage)
 *   tokens-report [--run X] [--mode M] Aggregate TOKENS.jsonl -> stdout (+ TOKENS-ROLLUP.json on --rollup)
 *
 * Conventions: CWD = v2/vcw4w. PowerShell-safe (no pipes, no $() needed).
 * Exit codes: 0 ok, 1 usage/validation error, 2 conflict (claim held / stale pack).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { MODES as CANON, clampAgents as clampCanon } from "../lib/swarm-ss2/modes.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)); // scripts/
const ROOT = path.resolve(HERE, ".."); // v2/vcw4w/
const SWARM = path.join(ROOT, "public", "swarm");
const TASKS = path.join(SWARM, "TASKS");
const LOCKS = path.join(SWARM, "Locks");
const PACKS = path.join(SWARM, "Packs");
const RUNS = path.join(SWARM, "RUNS");
const READY_PATH = path.join(SWARM, "READY.json");
const TOKENS = path.join(SWARM, "TOKENS.jsonl");
const ROLLUP = path.join(SWARM, "TOKENS-ROLLUP.json");

const MODES = {
  cheap: { agents: CANON.cheap.agents, pack: CANON.cheap.pack, heartbeatMin: CANON.cheap.heartbeatMin },
  fast: { agents: CANON.fast.agents, pack: CANON.fast.pack, heartbeatMin: CANON.fast.heartbeatMin },
};
// Agent-range clamping lives canonically in lib/swarm-ss2/modes.mjs
// (clampCanon, used by cmdRun below) — never re-implement ranges here.

function fail(msg, code = 1) {
  console.error(`swarm-ss2: ${msg}`);
  process.exit(code);
}
function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function writeJsonAtomic(p, obj) {
  const tmp = `${p}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n");
  fs.renameSync(tmp, p);
}
function sha1File(abs) {
  try {
    return crypto.createHash("sha1").update(fs.readFileSync(abs)).digest("hex").slice(0, 12);
  } catch {
    return null;
  }
}
function listEnvelopes() {
  return fs
    .readdirSync(TASKS)
    .filter((f) => /^DS-.+\.json$/.test(f) && !f.startsWith("DS-TEST"))
    .map((f) => {
      try {
        const j = readJson(path.join(TASKS, f));
        return { file: f, id: j.id || f.replace(/\.json$/, ""), ...j };
      } catch {
        return { file: f, id: f, status: "PARSE-FAIL" };
      }
    });
}
function lockHolders() {
  if (!fs.existsSync(LOCKS)) return {};
  const held = {};
  for (const f of fs.readdirSync(LOCKS)) {
    const m = f.match(/^(.+)\.(.+)\.json$/);
    if (!m) continue;
    try {
      held[m[1]] = readJson(path.join(LOCKS, f));
    } catch {
      /* torn lock, treat as unheld */
    }
  }
  return held;
}
function utc() {
  return new Date().toISOString();
}

function cmdReady(args) {
  const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : READY_PATH;
  const held = lockHolders();
  const ready = listEnvelopes()
    .filter((e) => e.status === "open" && !held[e.id])
    .sort((a, b) => String(a.created || "").localeCompare(String(b.created || "")))
    .map((e) => ({
      id: e.id,
      lane: e.lane || null,
      goal_1line: String(e.goal || "").slice(0, 220),
      scope: e.scope || e.scope_paths || [],
      gates: e.gates || [],
      pack: `Packs/${e.id}.json`,
      created: e.created || null,
    }));
  writeJsonAtomic(out, { fresh_as_of: utc(), count: ready.length, ready });
  console.log(`swarm-ss2 ready: ${ready.length} claimable -> ${path.relative(ROOT, out)}`);
}

function expandScope(scope) {
  // Scope entries are repo-relative globs like v2/vcw4w/<path>. We resolve
  // literal paths; entries with * are recorded unexpanded (agent lists them).
  const files = [];
  for (const entry of scope || []) {
    const rel = String(entry).replace(/^v2\/vcw4w\//, "");
    if (/[*?[\]{}]/.test(rel)) {
      files.push({ path: rel, hash: null, note: "glob — list at claim time" });
      continue;
    }
    files.push({ path: rel, hash: sha1File(path.join(ROOT, rel)) });
  }
  return files;
}

function cmdPack(args) {
  const id = args[0];
  if (!id) fail("usage: pack <ENVELOPE-ID> [--full]");
  const env = listEnvelopes().find((e) => e.id === id);
  if (!env) fail(`envelope ${id} not found`);
  const full = args.includes("--full");
  fs.mkdirSync(PACKS, { recursive: true });
  const pack = {
    pack: "ss2-pack.v1",
    envelope: id,
    goal_1line: String(env.goal || "").slice(0, 300),
    scope: env.scope || env.scope_paths || [],
    gates: env.gates || [],
    target_hashes: expandScope(env.scope || env.scope_paths || []),
    excerpts: full ? [] : undefined,
    tried: [],
    fresh_as_of: utc(),
  };
  if (full) pack.note = "excerpts: lead appends the 2-3 grounding excerpts at dispatch (or re-run with --excerpts <file>)";
  writeJsonAtomic(path.join(PACKS, `${id}.json`), pack);
  console.log(`swarm-ss2 pack: ${id} (${full ? "full" : "snapshot"}) -> Packs/${id}.json`);
}

function cmdVerifyPack(args) {
  const id = args[0];
  if (!id) fail("usage: verify-pack <ENVELOPE-ID>");
  const p = path.join(PACKS, `${id}.json`);
  if (!fs.existsSync(p)) fail(`no pack for ${id} (run: pack ${id})`, 2);
  const pack = readJson(p);
  const drifted = (pack.target_hashes || [])
    .filter((t) => t.hash)
    .map((t) => ({ ...t, disk: sha1File(path.join(ROOT, t.path)) }))
    .filter((t) => t.disk !== t.hash);
  if (drifted.length === 0) {
    console.log(`swarm-ss2 verify-pack: ${id} FRESH`);
    return;
  }
  console.log(`swarm-ss2 verify-pack: ${id} DRIFTED:`);
  for (const d of drifted) console.log(`  ${d.path} (pack ${d.hash} vs disk ${d.disk})`);
  process.exit(2);
}

function cmdClaim(args) {
  const id = args[0];
  if (!id) fail("usage: claim <ENVELOPE-ID> [--owner TAG]");
  const oi = args.indexOf("--owner");
  const owner = oi >= 0 && args[oi + 1] ? args[oi + 1] : `lead-${crypto.randomUUID().slice(0, 8)}`;
  fs.mkdirSync(LOCKS, { recursive: true });
  const lockPath = path.join(LOCKS, `${id}.${owner}.json`);
  try {
    fs.writeFileSync(lockPath, JSON.stringify({ envelope: id, owner, seq: 1, claimed_at: utc() }) + "\n", { flag: "wx" });
  } catch {
    fail(`envelope ${id} already held (take the next READY entry)`, 2);
  }
  // Second holder check: another owner file for the same envelope?
  const rivals = fs.readdirSync(LOCKS).filter((f) => f.startsWith(`${id}.`) && f !== `${id}.${owner}.json`);
  if (rivals.length > 0) {
    fs.rmSync(lockPath, { force: true });
    fail(`envelope ${id} already held by ${rivals.join(",")} (take the next READY entry)`, 2);
  }
  console.log(`swarm-ss2 claim: ${id} held by ${owner}`);
}

function cmdHeartbeat(args) {
  const id = args[0];
  const oi = args.indexOf("--owner");
  const owner = oi >= 0 ? args[oi + 1] : null;
  if (!id || !owner) fail("usage: heartbeat <ENVELOPE-ID> --owner TAG");
  const lockPath = path.join(LOCKS, `${id}.${owner}.json`);
  if (!fs.existsSync(lockPath)) fail(`no lock ${id}.${owner} (re-claim or stand down)`, 2);
  const lock = readJson(lockPath);
  lock.seq = (lock.seq || 1) + 1;
  lock.heartbeat_at = utc();
  writeJsonAtomic(lockPath, lock);
  console.log(`swarm-ss2 heartbeat: ${id} seq ${lock.seq}`);
}

function cmdRelease(args) {
  const id = args[0];
  const oi = args.indexOf("--owner");
  const owner = oi >= 0 ? args[oi + 1] : null;
  if (!id || !owner) fail("usage: release <ENVELOPE-ID> --owner TAG");
  fs.rmSync(path.join(LOCKS, `${id}.${owner}.json`), { force: true });
  console.log(`swarm-ss2 release: ${id} (${owner})`);
}

function cmdRun(args) {
  const g = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };
  const mode = g("--mode") || "cheap";
  if (!MODES[mode]) fail(`--mode must be cheap|fast (got ${mode})`);
  const goal = g("--goal");
  if (!goal) fail(`usage: run --mode <cheap|fast> --agents N --goal "..." [--target desktop|cloud-vm]`);
  let agents = clampCanon(mode, g("--agents"));
  const target = g("--target") || "desktop";
  const id = `RUN-${Date.now().toString(36).toUpperCase()}`;
  fs.mkdirSync(path.join(RUNS, "open"), { recursive: true });
  writeJsonAtomic(path.join(RUNS, "open", `${id}.json`), {
    run: "ss2-run.v1",
    id,
    mode,
    agents,
    goal,
    target,
    opened_by: "manual",
    status: "open",
    log: [`${utc()} lead: run opened (${mode} x${agents}, target ${target})`],
    created: utc(),
    updated: utc(),
  });
  console.log(`swarm-ss2 run: ${id} (${mode} x${agents}) -> RUNS/open/${id}.json`);
}

function cmdPickup(args) {
  const run = args[0];
  const oi = args.indexOf("--owner");
  const owner = oi >= 0 ? args[oi + 1] : null;
  if (!run || !owner) fail("usage: pickup <RUN-ID> --owner TAG");
  const src = path.join(RUNS, "open", `${run}.json`);
  if (!fs.existsSync(src)) fail(`run ${run} not open`);
  if (fs.existsSync(path.join(SWARM, "STOP"))) fail("STOP file present — pickup refused");
  fs.mkdirSync(path.join(RUNS, "active"), { recursive: true });
  const r = readJson(src);
  r.status = "active";
  r.owner = owner;
  r.updated = utc();
  r.log.push(`${r.updated} ${owner}: picked up`);
  writeJsonAtomic(path.join(RUNS, "active", `${run}.json`), r);
  fs.rmSync(src, { force: true });
  console.log(`swarm-ss2 pickup: ${run} active (${owner})`);
}

function cmdTokensNote(args) {
  const [id, model, inp, outp] = args;
  if (!id || !model || inp === undefined || outp === undefined) {
    fail("usage: tokens-note <ENVELOPE-ID> <model> <in> <out> [--run X] [--mode M]");
  }
  const g = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };
  const line = JSON.stringify({
    t: "ss2-token.v1",
    at: utc(),
    task: id,
    run: g("--run"),
    mode: g("--mode"),
    model,
    est_in: Number(inp),
    est_out: Number(outp),
    api_in: null,
    api_out: null,
  });
  fs.appendFileSync(TOKENS, line + "\n");
  console.log("swarm-ss2 tokens-note: logged");
}

function cmdTokensReport(args) {
  const g = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };
  const runF = g("--run");
  const modeF = g("--mode");
  if (!fs.existsSync(TOKENS)) {
    console.log("swarm-ss2 tokens-report: no data yet");
    return;
  }
  let n = 0;
  let tin = 0;
  let tout = 0;
  const byMode = {};
  for (const line of fs.readFileSync(TOKENS, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      continue; // quarantined bad line, keep the good ones
    }
    if (runF && r.run !== runF) continue;
    if (modeF && r.mode !== modeF) continue;
    n += 1;
    tin += Number(r.est_in) || 0;
    tout += Number(r.est_out) || 0;
    const m = r.mode || "unknown";
    byMode[m] = byMode[m] || { tasks: 0, in: 0, out: 0 };
    byMode[m].tasks += 1;
    byMode[m].in += Number(r.est_in) || 0;
    byMode[m].out += Number(r.est_out) || 0;
  }
  console.log(`swarm-ss2 tokens-report: tasks=${n} est_in=${tin} est_out=${tout}`);
  for (const [m, s] of Object.entries(byMode)) {
    console.log(`  ${m}: tasks=${s.tasks} in=${s.in} out=${s.out}`);
  }
  if (args.includes("--rollup")) {
    writeJsonAtomic(ROLLUP, { rollup: "ss2-rollup.v1", at: utc(), tasks: n, est_in: tin, est_out: tout, byMode });
    console.log("swarm-ss2 tokens-report: TOKENS-ROLLUP.json written");
  }
}

const [sub, ...rest] = process.argv.slice(2);
const cmds = { ready: cmdReady, pack: cmdPack, "verify-pack": cmdVerifyPack, claim: cmdClaim, heartbeat: cmdHeartbeat, release: cmdRelease, run: cmdRun, pickup: cmdPickup, "tokens-note": cmdTokensNote, "tokens-report": cmdTokensReport };
if (!cmds[sub]) {
  console.error("swarm-ss2: subcommand must be ready|pack|verify-pack|claim|heartbeat|release|run|pickup|tokens-note|tokens-report");
  process.exit(1);
}
cmds[sub](rest);
