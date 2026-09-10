import { readFileSync } from "node:fs";
const source = readFileSync("public/spaceships.html", "utf8");
if (!source.includes('canonical" href="https://4weird.games/spaceships"')) throw new Error("Spaceships canonical URL is stale.");
if (source.includes("https://4weird.com/spaceships.html")) throw new Error("Spaceships metadata contains legacy hostname.");
console.log("Spaceships metadata checks OK.");
