import { readFileSync } from "node:fs";
const source = readFileSync("public/spaceships.html", "utf8");
// Canonical host is www: production 308s apex -> www at the Vercel edge,
// so an apex canonical would report "Page with redirect" in GSC.
if (!source.includes('canonical" href="https://www.4weird.com/game/spaceships"')) throw new Error("Spaceships canonical URL is stale.");
if (source.includes("https://4weird.com/spaceships.html")) throw new Error("Spaceships metadata contains legacy hostname.");
console.log("Spaceships metadata checks OK.");
