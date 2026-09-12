import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
const source = join(process.cwd(), "..", "..", "old-v1", "website", "v1", "games", "html");
const destination = join(process.cwd(), "public", "games", "html");
const ignored = /(?:[\\/]_TEMPLATE(?:[\\/]|$)|[\\/]node_modules(?:[\\/]|$)|[\\/]dist[^\\/]*|[\\/]target(?:[\\/]|$)|[\\/]test-results(?:[\\/]|$)|\.last-run\.json$|\.log$)/;
async function files(root, current = root) { const output = []; for (const entry of await readdir(current, { withFileTypes: true })) { const full = join(current, entry.name); if (ignored.test(full)) continue; if (entry.isDirectory()) output.push(...await files(root, full)); else output.push(relative(root, full).replaceAll("\\", "/")); } return output; }
async function hash(root, name) { return createHash("sha256").update(await readFile(join(root, name))).digest("hex"); }
const [sourceFiles, destinationFiles] = await Promise.all([files(source), files(destination)]);
const legacySourceFiles = sourceFiles.filter((n) => !n.startsWith("platform-wars/"));
const destinationSet = new Set(destinationFiles);
const missing = legacySourceFiles.filter((n) => !destinationSet.has(n));
const mismatched = [];
for (const name of legacySourceFiles) {
  if (destinationSet.has(name) && await hash(source, name) !== await hash(destination, name)) mismatched.push(name);
}
console.log("MISSING " + missing.length);
for (const m of missing) console.log("  miss " + m);
console.log("MISMATCHED " + mismatched.length);
for (const m of mismatched) console.log("  diff " + m);
