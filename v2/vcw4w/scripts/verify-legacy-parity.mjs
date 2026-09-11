import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const oldRoot = join(process.cwd(), "..", "..", "old-v1", "website", "v1");
const desktopRoot = join(process.cwd(), "..", "desktop");
const target = join(process.cwd(), "public");
// The archived v1 site stays byte-identical in public/: vcw still lives in
// old-v1 (research-only archive), while the actively-developed desktop
// frontend lives at v2/desktop/vibecodeworker; never put new work in old-v1.
const pairs = [[join(oldRoot, "vcw"), "vcw"], [join(desktopRoot, "vibecodeworker"), "vibecodeworker-legacy"]];
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
for (const [sourceDir, targetName] of pairs) {
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
