// Deterministic harness for GraveGain2dB (slug gravegain2dB).
//
// NOT in the npm test chain (no package.json wiring on purpose): this is a
// dev-only helper imported by scripts/verify-gravegain2dB-*.mjs and by hand
// runs. Importing it has no side effects; everything happens via loadSim() /
// runReplay() / bfs().
//
// Contract under test: public/games/gravegain2dB/src/sim.js must expose a
// pure tick core:
//
//   newRun(seed) -> state        (fresh deterministic run state)
//   tick(state, action) -> void  (mutates state; NO document/localStorage/fetch/eval)
//   hash(state) -> string        (stable snapshot hash for replay comparison)
//
// The sim may attach via `module.exports = { newRun, tick, hash }`
// (CommonJS-style) or via `window.GraveGain2DB_Sim = {...}` (browser-style);
// loadSim() accepts either. window/document are minimal stubs so a sim that
// touches the DOM at load time fails LOUDLY instead of hanging the verifier.
//
// Fail-open: if src/sim.js has not landed yet, loadSim() throws a coded
// Error (code "GG2DB_MISSING_SIM") with a clear TODO; verifiers catch it and
// report a TODO instead of crashing.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

export const SIM_REL = "public/games/gravegain2dB/src/sim.js";
export const SIM_API = ["newRun", "tick", "hash"];

// ---- deterministic PRNG (mulberry32) for replay action streams ----
export function mulberry32(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- load the sim source into a sandboxed VM context ----
export function loadSim(root = process.cwd()) {
  const abs = join(root, ...SIM_REL.split("/"));
  if (!existsSync(abs)) {
    const err = new Error(
      `TODO(sim-lane): ${SIM_REL} has not landed yet — ` +
        `land a pure sim exposing { newRun, tick, hash } and re-run. ` +
        `Harness runs fail-open until then.`,
    );
    err.code = "GG2DB_MISSING_SIM";
    throw err;
  }
  const src = readFileSync(abs, "utf8");

  // Minimal browser stubs: present so load-time guards (`typeof window !==
  // "undefined"`) resolve, but hostile to real DOM use — any tick-scope DOM
  // access throws, which is exactly what tick-purity wants.
  const bomb = (name) => () => {
    throw new Error(`GraveGain2dB sim touched stubbed ${name} (tick core must stay pure)`);
  };
  const documentStub = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === Symbol.toPrimitive) return () => "[stub document]";
        return bomb(`document.${String(prop)}`);
      },
    },
  );
  const sandbox = {
    window: {},
    self: {},
    document: documentStub,
    console,
    Math,
    JSON,
    module: { exports: {} },
    exports: {},
  };
  sandbox.window.window = sandbox.window;
  sandbox.self.window = sandbox.window;
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  try {
    vm.runInContext(src, sandbox, { filename: SIM_REL, timeout: 5000 });
  } catch (err) {
    const wrapped = new Error(`TODO(sim-lane): ${SIM_REL} threw at load: ${err.message}`);
    wrapped.code = "GG2DB_SIM_LOAD_FAILED";
    wrapped.cause = err;
    throw wrapped;
  }
  const fromCjs = sandbox.module.exports;
  const fromWindow =
    sandbox.window.GraveGain2DB_Sim || sandbox.window.GraveGain2dBSim || null;
  const api = {};
  for (const key of SIM_API) {
    api[key] =
      (fromCjs && typeof fromCjs[key] === "function" && fromCjs[key]) ||
      (fromWindow && typeof fromWindow[key] === "function" && fromWindow[key]) ||
      null;
  }
  const missing = SIM_API.filter((k) => !api[k]);
  if (missing.length) {
    const err = new Error(
      `TODO(sim-lane): ${SIM_REL} loaded but is missing sim API: ${missing.join(", ")} ` +
        `(saw CJS keys [${Object.keys(fromCjs || {}).join(",")}] ` +
        `window keys [${Object.keys(sandbox.window || {}).join(",")}]).`,
    );
    err.code = "GG2DB_BAD_SIM_API";
    throw err;
  }
  return api;
}

// ---- stable stringify for fallback hashing when sim omits hash() ----
export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(",")}}`;
}

// ---- runReplay(seed, ticks, actionsForTick?) -> end-hash ----
// actionsForTick(t, rng) returns the action object for tick t; defaults to a
// small deterministic action stream ({ dx, jump, fire } derived from rng).
export function runReplay(sim, seed, ticks = 600, actionsForTick = null) {
  const rng = mulberry32(seed);
  const nextAction =
    actionsForTick ||
    ((t, r) => ({ dx: r() < 0.5 ? -1 : 1, jump: r() < 0.06, fire: r() < 0.2 }));
  const state = sim.newRun(seed);
  for (let t = 0; t < ticks; t += 1) {
    sim.tick(state, nextAction(t, rng));
  }
  return typeof sim.hash === "function" ? sim.hash(state) : stableStringify(state);
}

// ---- bfs(start, neighbors, isGoal, maxNodes) ----
// Generic reachability helper for mission-graph checks
// (entry -> objectives -> exit). neighbors(node) returns an array of keys,
// isGoal(node) returns true at the exit.
export function bfs(start, neighbors, isGoal, maxNodes = 10000) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length && seen.size <= maxNodes) {
    const node = queue.shift();
    if (isGoal(node)) return { reachable: true, visited: seen.size };
    for (const next of neighbors(node) || []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return { reachable: false, visited: seen.size };
}
