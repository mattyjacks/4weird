import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readdir } from "node:fs/promises";
async function files(root, current = root) { const output = []; for (const entry of await readdir(current, { withFileTypes: true })) { const full = join(current, entry.name); if (entry.isDirectory()) output.push(...await files(root, full)); else output.push(full.slice(root.length + 1).replaceAll("\\", "/")); } return output; }
const source = await readFile(join(process.cwd(), "content", "games.ts"), "utf8");
if (!source.includes("/games/html/")) { console.error("Catalog does not define game runtime paths."); process.exit(1); }
const paths = [...source.matchAll(/runtimePath:\s*`([^`]+)`/g)].map((match) => match[1]).filter((path) => !path.includes("${"));
const missing = [];
for (const path of paths) { const file = join(process.cwd(), "public", path.replace(/^\//, "")); try { await readFile(file); } catch { missing.push(path); } }
if (missing.length) { console.error(`Missing catalog runtimes:\n${missing.join("\n")}`); process.exit(1); }
const indexCount = (await files(join(process.cwd(), "public", "games", "html"))).filter((name) => name.endsWith("/index.html")).length;
if (indexCount < 1) { console.error("No static game entrypoints found."); process.exit(1); }
console.log(`Catalog runtime integrity OK: ${indexCount} static entrypoints; ${paths.length} literal paths checked.`);
