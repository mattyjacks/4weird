import { readFileSync } from "node:fs";
const generated = readFileSync("app/robots.ts", "utf8");
const staticCopy = readFileSync("public/robots.txt", "utf8");
for (const path of ["/account", "/account.html", "/api/", "/auth/", "/protected", "/v1-legacy/", "/games/html/"]) {
  if (!generated.includes(path) || !staticCopy.includes(`Disallow: ${path}`)) throw new Error(`Missing crawler exclusion: ${path}`);
}
if (!staticCopy.includes("Sitemap: https://4weird.games/sitemap.xml")) throw new Error("Static robots sitemap is not canonical.");
console.log("Robots policy checks OK.");
