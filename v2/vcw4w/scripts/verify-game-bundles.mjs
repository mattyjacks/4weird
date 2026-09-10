import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const source = join(process.cwd(), "..", "..", "website", "v1", "games", "html");
const destination = join(process.cwd(), "public", "games", "html");
const ignored = /(?:[\\/]_TEMPLATE(?:[\\/]|$)|[\\/]node_modules(?:[\\/]|$)|[\\/]dist[^\\/]*|[\\/]target(?:[\\/]|$))/;
async function files(root, current = root) { const output = []; for (const entry of await readdir(current, { withFileTypes: true })) { const full = join(current, entry.name); if (ignored.test(full)) continue; if (entry.isDirectory()) output.push(...await files(root, full)); else output.push(relative(root, full).replaceAll("\\", "/")); } return output; }
async function hash(root, name) { return createHash("sha256").update(await readFile(join(root, name))).digest("hex"); }
const [sourceFiles, destinationFiles] = await Promise.all([files(source), files(destination)]);
const sourceSet = new Set(sourceFiles); const destinationSet = new Set(destinationFiles);
const shared = new Set(["game-meta.js", "gravegain_shared_missions.js", "kouzi/index.html", "madi/index.html"]);
const missing = sourceFiles.filter((name) => !destinationSet.has(name)); const extra = destinationFiles.filter((name) => !sourceSet.has(name) && !shared.has(name));
const mismatched = []; for (const name of sourceFiles) if (destinationSet.has(name) && await hash(source, name) !== await hash(destination, name)) mismatched.push(name);
if (missing.length || extra.length || mismatched.length) { console.error(JSON.stringify({ missing, extra, mismatched }, null, 2)); process.exit(1); }
console.log(`Game bundle parity OK: ${sourceFiles.length} files.`);
