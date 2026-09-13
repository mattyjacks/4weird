import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const fail = (msg) => {
  throw new Error(msg);
};

// --- Nav: "Rent Tech", never "Rent Power" ------------------------------------
const nav = read("../lib/site-nav.ts");
if (!nav.includes("Rent Tech")) fail('lib/site-nav.ts must contain "Rent Tech".');
if (nav.includes("Rent Power")) fail('lib/site-nav.ts must not contain "Rent Power".');
const header = read("../components/site/site-header.tsx");
if (!header.includes("Rent Tech")) fail('components/site/site-header.tsx must contain "Rent Tech".');
const footer = read("../components/site/site-footer.tsx");
if (!footer.includes("Rent Tech")) fail('components/site/site-footer.tsx must contain "Rent Tech".');

// --- Rental pages: every page carries the 🌐 kicker --------------------------
for (const slug of ["agents", "runpods", "desktop", "swarm", "blender", "xonotic"]) {
  let src;
  try {
    src = fs.readFileSync(new URL(`../app/${slug}/page.tsx`, import.meta.url), "utf8");
  } catch {
    continue; // Page does not exist yet: skip cleanly, do not fail.
  }
  if (!src.includes("🌐")) fail(`app/${slug}/page.tsx must contain the 🌐 kicker.`);
}

// --- Valley Net: badge carries 👱🏻‍♀️, name stays "Valley Net" ----------------------
// (The clan-page badge assertion already lives in verify-clan-economy.mjs.)
const valleynet = read("../lib/valleynet.ts");
if (!valleynet.includes("👱🏻‍♀️")) fail("lib/valleynet.ts VALLEYNET_BADGE must contain 👱🏻‍♀️.");
if (!valleynet.includes('VALLEYNET_NAME = "Valley Net"')) fail('lib/valleynet.ts VALLEYNET_NAME must equal "Valley Net".');

// --- Guard: no "Rent Power" anywhere in app/components/lib -------------------
// Walks app/**, components/**, lib/** (.tsx/.ts only), excluding public/**,
// *.legacy.* files, and the verify scripts themselves.
const walk = (dirUrl, out) => {
  for (const entry of fs.readdirSync(dirUrl, { withFileTypes: true })) {
    const entryUrl = new URL(`./${entry.name}${entry.isDirectory() ? "/" : ""}`, dirUrl);
    if (entry.isDirectory()) {
      if (entry.name === "public") continue;
      walk(entryUrl, out);
    } else if (
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.includes(".legacy.")
    ) {
      out.push(entryUrl);
    }
  }
};
const roots = ["../app/", "../components/", "../lib/"].map((d) => new URL(d, import.meta.url));
const selfUrl = new URL(import.meta.url);
for (const root of roots) {
  const files = [];
  walk(root, files);
  for (const fileUrl of files) {
    if (fileUrl.href === selfUrl.href) continue;
    if (fs.readFileSync(fileUrl, "utf8").includes("Rent Power")) {
      fail(`"Rent Power" is banned outside public/**: ${fileUrl.href}.`);
    }
  }
}

console.log("Branding integrity OK.");
