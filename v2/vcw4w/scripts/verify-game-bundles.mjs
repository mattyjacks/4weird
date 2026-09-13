import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

// Legacy bundles were archived to old-v1/website/v1/games/html/; that tree
// stays the byte-identical reference for every bundle it contains. Bundles
// that only exist under public/games/html/ (e.g. v2-native Platform Wars)
// are allowed and reported, not failures.
const source = join(process.cwd(), "..", "..", "old-v1", "website", "v1", "games", "html");
const destination = join(process.cwd(), "public", "games", "html");
// Test-run byproducts (Playwright test-results/, run logs) are not product
// source: they must neither ship in the deploy nor break parity.
const ignored = /(?:[\\/]_TEMPLATE(?:[\\/]|$)|[\\/]node_modules(?:[\\/]|$)|[\\/]dist[^\\/]*|[\\/]target(?:[\\/]|$)|[\\/]test-results(?:[\\/]|$)|\.last-run\.json$|\.log$)/;
async function files(root, current = root) { const output = []; for (const entry of await readdir(current, { withFileTypes: true })) { const full = join(current, entry.name); if (ignored.test(full)) continue; if (entry.isDirectory()) output.push(...await files(root, full)); else output.push(relative(root, full).replaceAll("\\", "/")); } return output; }
async function hash(root, name) { return createHash("sha256").update(await readFile(join(root, name))).digest("hex"); }
const [sourceFiles, destinationFiles] = await Promise.all([files(source), files(destination)]);
// platform-wars/ is v2-native: the archived v1 bundle was its starting point,
// but the live copy carries the single-deploy refactor (same-origin auth
// shim, canonical links), so it is excluded from byte-parity. The slugs below
// have likewise intentionally diverged from the archived v1 reference through
// committed v2 work (rethemes, gameplay fixes, a11y, metadata, fx layers) and
// are now owned in v2 — reverting them to satisfy this check would destroy
// that work, so byte-parity is waived for them (existence is still enforced:
// a missing diverged file still fails). Every other bundle stays byte-locked.
const divergedPrefixes = [
  "platform-wars/", // single-deploy refactor (same-origin auth shim, canonical links)
  "lastwordszombies/", // zombie retheme v3.2.0 (was cyberpunk v2.0.0) + a11y + spawn-budget fixes
  "assassinanimals/", // fx-layer + copy evolution
  "orbitaldrift/", // ship-select metadata (CubeSat/Dart/Station) + tags
  "serversavershield/", // tuning/balance evolution (+ v2-native js/quality.js)
  "gravegain2d/", // aaa/campaign/epic layers
  "gravegain3d/", // enemy variants/blood, dungeon/hub evolution
  "madi/", // fourweird-fullscreen-patch wave (button/F/dblclick toggles, webkit fallbacks, canvas refit, sizing CSS) + DOM null-guards
  "kouzi/", // neon fullscreen/guard hardening wave (same patch family as madi)
  "aiwhackamole/", // fullscreen/guard hardening wave
  "battlesharks2/", // fullscreen/guard hardening wave
  "DiscoverAmerica/", // fullscreen/guard hardening wave
  "demolichdom/", // storage-guard hardening (private-mode/sandbox localStorage crashes)
];
// Root-level shared files with intentional v2 divergence.
const divergedFiles = new Set([
  "gravegain_shared_missions.js", // finale enrichment (par/bonus/secondary/boss phases)
]);
const isDiverged = (name) => divergedFiles.has(name) || divergedPrefixes.some((p) => name.startsWith(p));
const diverged = sourceFiles.filter(isDiverged);
const legacySourceFiles = sourceFiles.filter((name) => !isDiverged(name));
const sourceSet = new Set(sourceFiles); const destinationSet = new Set(destinationFiles);
const shared = new Set(["game-meta.js", "gravegain_shared_missions.js", "kouzi/index.html", "madi/index.html"]);
const missing = legacySourceFiles.filter((name) => !destinationSet.has(name)); const extra = destinationFiles.filter((name) => !sourceSet.has(name) && !shared.has(name));
const divergedMissing = diverged.filter((name) => !destinationSet.has(name));
const mismatched = []; for (const name of legacySourceFiles) if (destinationSet.has(name) && await hash(source, name) !== await hash(destination, name)) mismatched.push(name);
if (missing.length || divergedMissing.length || mismatched.length) { console.error(JSON.stringify({ missing, divergedMissing, extra, mismatched }, null, 2)); process.exit(1); }
if (extra.length) console.log(`Note: ${extra.length} v2-native bundle file(s) with no archived v1 source (allowed):\n${extra.join("\n")}`);
if (diverged.length) console.log(`Note: ${diverged.length} intentionally-diverged v2-owned file(s) waived from byte-parity (existence enforced):\n${diverged.join("\n")}`);
console.log(`Game bundle parity OK: ${sourceFiles.length} archived files (${legacySourceFiles.length} byte-locked, ${diverged.length} diverged, ${extra.length} v2-native extra).`);
