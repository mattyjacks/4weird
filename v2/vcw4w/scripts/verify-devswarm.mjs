import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const exists = (file) => fs.existsSync(new URL(file, import.meta.url));

const fail = (msg) => {
  throw new Error(`verify-devswarm: ${msg}`);
};

const must = (cond, msg) => {
  if (!cond) fail(msg);
};

const SWARM_DIR = fileURLToPath(new URL("../public/swarm/", import.meta.url));
const TASKS_DIR = path.join(SWARM_DIR, "TASKS");

const REQUIRED_FILES = [
  "BRAIN.md",
  "README.md",
  "LANES.md",
  "MEMORY.md",
  "QUEUE.md",
  "FOR-BOTS.md",
  "schema.json",
  "STATUS.json",
];

const ENVELOPE_FIELDS = [
  "id",
  "title",
  "goal",
  "lane",
  "scope",
  "gates",
  "status",
  "owner",
  "created",
  "updated",
  "log",
];
const ID_RE = /^DS-[A-Z0-9-]+$/;
const STATUS_ENUM = ["open", "claimed", "in_progress", "blocked", "done"];
const LANE_ENUM = ["web", "games", "desktop", "economy", "vcw", "docs", "infra"];

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9]{8,}/,
  /bot4weird_[A-Za-z0-9]{16,}/,
  /BEGIN (RSA )?PRIVATE KEY/,
  /client_secret\s*[:=]\s*['"][^'"]{4,}/i,
];

const walk = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
};

const rel = (full) => path.relative(SWARM_DIR, full).replaceAll("\\", "/");

// 1. All 8 required files exist.
for (const name of REQUIRED_FILES) {
  must(exists(`../public/swarm/${name}`), `required file public/swarm/${name} is missing.`);
}

// 2. TASKS/ holds _template.json + README.md + at least the DS-TEST samples.
must(fs.existsSync(TASKS_DIR), "public/swarm/TASKS/ directory is missing.");
must(fs.existsSync(path.join(TASKS_DIR, "_template.json")), "TASKS/_template.json is missing.");
must(fs.existsSync(path.join(TASKS_DIR, "README.md")), "TASKS/README.md is missing.");
const taskFiles = fs.readdirSync(TASKS_DIR).filter((n) => /^DS-.*\.json$/.test(n));
const samples = taskFiles.filter((n) => n.startsWith("DS-TEST-"));
must(samples.length >= 1, "TASKS/ must hold at least one DS-TEST sample envelope.");
must(taskFiles.length >= 1, "TASKS/ must hold at least one DS-*.json envelope.");

// 3. Every TASKS/DS-*.json parses and carries the full envelope v0 shape.
const envelopes = [];
for (const name of taskFiles) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(path.join(TASKS_DIR, name), "utf8"));
  } catch (e) {
    fail(`TASKS/${name} does not parse as JSON: ${e.message}`);
  }
  for (const field of ENVELOPE_FIELDS) {
    must(parsed[field] !== undefined, `TASKS/${name} is missing envelope field '${field}'.`);
  }
  must(ID_RE.test(parsed.id), `TASKS/${name} id '${parsed.id}' must match ^DS-[A-Z0-9-]+$.`);
  must(
    STATUS_ENUM.includes(parsed.status),
    `TASKS/${name} status '${parsed.status}' must be one of ${STATUS_ENUM.join("|")}.`,
  );
  must(
    LANE_ENUM.includes(parsed.lane),
    `TASKS/${name} lane '${parsed.lane}' must be one of ${LANE_ENUM.join("|")}.`,
  );
  envelopes.push(parsed);
}

// 4. STATUS.json counts match actual TASKS envelope statuses.
let statusRaw;
try {
  statusRaw = JSON.parse(read("../public/swarm/STATUS.json"));
} catch (e) {
  fail(`STATUS.json does not parse as JSON: ${e.message}`);
}
const expected = statusRaw.counts ?? statusRaw.statusCounts ?? null;
must(expected !== null && typeof expected === "object", "STATUS.json must carry a counts object.");
const actual = {};
for (const env of envelopes) actual[env.status] = (actual[env.status] ?? 0) + 1;
for (const key of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
  const e = expected[key] ?? 0;
  const a = actual[key] ?? 0;
  must(e === a, `STATUS.json counts mismatch for '${key}': counts says ${e}, TASKS holds ${a}.`);
}

// 5. Secret scan over public/swarm/** (assignment-looking secrets only).
for (const full of walk(SWARM_DIR)) {
  let text;
  try {
    text = fs.readFileSync(full, "utf8");
  } catch {
    continue;
  }
  for (const re of SECRET_PATTERNS) {
    must(!re.test(text), `secret scan hit ${re} in public/swarm/${rel(full)}.`);
  }
}

// 6. No public/swarm/index.html and no *.html under public/swarm at all.
must(!exists("../public/swarm/index.html"), "public/swarm/index.html must not exist.");
const htmlHits = walk(SWARM_DIR).filter((f) => /\.html$/i.test(f));
must(htmlHits.length === 0, `public/swarm must contain no *.html (found ${htmlHits.map(rel).join(", ")}).`);

// 7. Every status-done envelope has a non-empty log (DS-TEST-* skipped).
for (const env of envelopes) {
  if (env.id.startsWith("DS-TEST-")) continue;
  if (env.status === "done") {
    const log = env.log;
    const empty = log == null || (typeof log.length === "number" ? log.length === 0 : true);
    must(!empty, `done envelope ${env.id} must carry a non-empty log.`);
  }
}

const open = actual.open ?? 0;
const claimed = actual.claimed ?? 0;
const done = actual.done ?? 0;
console.log(
  `verify-devswarm OK: ${envelopes.length} tasks (${open} open, ${claimed} claimed, ${done} done), 8 files, no secrets, no html.`,
);
