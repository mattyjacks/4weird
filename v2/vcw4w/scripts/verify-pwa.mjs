import fs from "node:fs";
import path from "node:path";
const manifest = fs.readFileSync(new URL("../app/manifest.ts", import.meta.url), "utf8");
if (!manifest.includes('start_url: "/"')) throw new Error("PWA start URL must be root.");
const icon = manifest.match(/src: "([^"]+)"/u)?.[1];
if (!icon || !fs.existsSync(path.join(process.cwd(), "public", icon.replace(/^\//u, "")))) throw new Error(`PWA icon is missing: ${icon ?? "none"}`);
if (!manifest.includes('type: "image/png"')) throw new Error("PWA icon type must be PNG.");
console.log("PWA manifest integrity OK.");
