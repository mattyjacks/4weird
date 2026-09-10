import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = join(process.cwd(), "..", "..", "old-v1", "website", "v1");
const target = join(process.cwd(), "public");
const pairs = [["vcw", "vcw"], ["vibecodeworker", "vibecodeworker-legacy"]];
async function list(dir, base = dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await list(full, base));
    else out.push(full.slice(base.length + 1));
  }
  return out;
}
async function hash(path) { return createHash("sha256").update(await readFile(path)).digest("hex"); }
const errors = [];
for (const [sourceName, targetName] of pairs) {
  const sourceDir = join(root, sourceName);
  const targetDir = join(target, targetName);
  for (const relative of await list(sourceDir)) {
    const source = join(sourceDir, relative);
    const destination = join(targetDir, relative);
    try {
      if (await hash(source) !== await hash(destination)) errors.push(`${targetName}/${relative} (mismatch)`);
    } catch { errors.push(`${targetName}/${relative} (missing)`); }
  }
}
if (errors.length) { console.error(`Legacy parity failure:\n${errors.join("\n")}`); process.exit(1); }
console.log("Legacy parity OK: vcw and vibecodeworker bundles match v1.");
