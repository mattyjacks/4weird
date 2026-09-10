import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

// Legacy bundles were archived to old-v1/website/v1/games/html/; that tree
// stays the byte-identical reference for every bundle it contains. Bundles
// that only exist under public/games/html/ (e.g. v2-native Platform Wars)
// are allowed and reported, not failures.
const source = join(process.cwd(), "..", "..", "old-v1", "website", "v1", "games", "html");
const destination = join(process.cwd(), "public", "games", "html");
const ignored = /(?:[\\/]_TEMPLATE(?:[\\/]|$)|[\\/]node_modules(?:[\\/]|$)|[\\/]dist[^\\/]*|[\\/]target(?:[\\/]|$))/;
async function files(root, current = root) { const output = []; for (const entry of await readdir(current, { withFileTypes: true })) { const full = join(current, entry.name); if (ignored.test(full)) continue; if (entry.isDirectory()) output.push(...await files(root, full)); else output.push(relative(root, full).replaceAll("\\", "/")); } return output; }
async function hash(root, name) { return createHash("sha256").update(await readFile(join(root, name))).digest("hex"); }
const [sourceFiles, destinationFiles] = await Promise.all([files(source), files(destination)]);
// platform-wars/ is v2-native: the archived v1 bundle was its starting point,
// but the live copy carries the single-deploy refactor (same-origin auth
// shim, canonical links), so it is excluded from byte-parity.
const divergedPrefix = "platform-wars/";
const legacySourceFiles = sourceFiles.filter((name) => !name.startsWith(divergedPrefix));
const sourceSet = new Set(sourceFiles); const destinationSet = new Set(destinationFiles);
const shared = new Set(["game-meta.js", "gravegain_shared_missions.js", "kouzi/index.html", "madi/index.html"]);
const missing = legacySourceFiles.filter((name) => !destinationSet.has(name)); const extra = destinationFiles.filter((name) => !sourceSet.has(name) && !shared.has(name));
const mismatched = []; for (const name of legacySourceFiles) if (destinationSet.has(name) && await hash(source, name) !== await hash(destination, name)) mismatched.push(name);
if (missing.length || mismatched.length) { console.error(JSON.stringify({ missing, extra, mismatched }, null, 2)); process.exit(1); }
if (extra.length) console.log(`Note: ${extra.length} v2-native bundle file(s) with no archived v1 source (allowed):\n${extra.join("\n")}`);
console.log(`Game bundle parity OK: ${sourceFiles.length} files.`);
