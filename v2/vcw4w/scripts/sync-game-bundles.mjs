// Syncs preserved v1 game bundles (public/games/html/<legacyPath>/) into the
// canonical runtime paths the app serves (public/games/<slug>/).
//
// Why this exists: content/games.ts points every game's runtimePath at
// /games/<slug>/index.html, but only public/games/html/** is tracked in git.
// Without this step a fresh clone or a Linux deploy (case-sensitive FS)
// serves 404s inside every /games/<slug>/play iframe. Running the sync as
// `prebuild`/`pretest` keeps the generated dirs reproducible instead of
// committing ~8 MB of duplicated bundles.
//
// Idempotent: destinations are removed and re-copied on every run.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

// slug -> legacy path under public/games/html/
const bundles = [
  ["lastwordszombies", "lastwordszombies"],
  ["venturemechanically", "venturemechanically"],
  ["financialfreedom", "financialfreedom"],
  ["serversavershield", "serversavershield"],
  ["overtake", "overtake"],
  ["assassinanimals", "assassinanimals"],
  ["battlesharks2", "battlesharks2"],
  ["gravegain2d", "gravegain2d"],
  ["gravegain3d", "gravegain3d"],
  ["demolichdom", "demolichdom"],
  ["fridgesimulator", "fridgesimulator"],
  // NOTE: source dir keeps its v1 capitalisation; the destination slug is
  // lowercase so the runtime URL works on case-sensitive filesystems.
  ["discoveramerica", "DiscoverAmerica"],
  ["orbitaldrift", "orbitaldrift"],
  ["aiwhackamole", "aiwhackamole"],
  ["soundpainter2", "soundpainter2"],
  ["soundpainter", "soundpainter"],
  ["friendslop", "friendslop"],
  ["semester-survival", "semester-survival"],
  ["neonbreaker", "kouzi/neonbreaker"],
  ["neoninvaders", "kouzi/neoninvaders"],
  ["neonracer", "kouzi/neonracer"],
  ["neonsnake", "kouzi/neonsnake"],
  ["neonvoidrunner", "kouzi/neonvoidrunner"],
  ["temple-of-lost-revenue", "madi/temple-of-lost-revenue"],
  ["the-ai-expedition", "madi/the-ai-expedition"],
  ["the-cave-of-bottlenecks", "madi/the-cave-of-bottlenecks"],
  ["the-lost-city-of-customers", "madi/the-lost-city-of-customers"],
  ["the-madi-ai-universe", "madi/the-madi-ai-universe"],
  ["the-pipeline-mountain", "madi/the-pipeline-mountain"],
  ["the-revenue-dragon", "madi/the-revenue-dragon"],
  ["the-revenue-jungle", "madi/the-revenue-jungle"],
  ["the-speed-portal", "madi/the-speed-portal"],
  ["treasure-hunters", "madi/treasure-hunters"],
  ["platform-wars", "platform-wars"],
];

const root = process.cwd();
const missing = [];
let synced = 0;

for (const [slug, legacyPath] of bundles) {
  const source = join(root, "public", "games", "html", ...legacyPath.split("/"));
  const dest = join(root, "public", "games", slug);
  if (!existsSync(join(source, "index.html"))) {
    missing.push(`${slug} (no index.html under games/html/${legacyPath}/)`);
    continue;
  }
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(join(root, "public", "games"), { recursive: true });
  cpSync(source, dest, { recursive: true });
  synced += 1;
}

if (missing.length) {
  console.error(`Game bundle sync failed:\n${missing.join("\n")}`);
  process.exit(1);
}

console.log(`Game bundle sync OK: ${synced} canonical slug bundles.`);
