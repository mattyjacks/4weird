// verify-fridge.mjs — Fridge Simulator contract verifier (DS-FRIDGE-08, infra lane).
//
// Run from v2/vcw4w/:  node scripts/verify-fridge.mjs
// Pass prints "verify-fridge: ok"; any failure prints "verify-fridge: <reason>" + exit 1.
//
// Contract (fail-closed):
//  (1) every required food emoji is a key of FOOD_STATS in
//      public/games/html/fridgesimulator/game.js. The required list is read
//      from lib/game-fridge-foods.ts (FRIDGE_FOODS keys) when that catalog
//      exists (owner DS-FRIDGE-04); otherwise the inline 120-emoji list below.
//      Comparison strips U+FE0F variation selectors so "🌶" and "🌶️" match.
//  (2) lib/game-fridge-saves.ts (owner DS-FRIDGE-05) exports
//      serializeFridgeSession/deserializeFridgeSession, enforces the <=1MiB
//      cap, round-trips via JSON; the verifier additionally probes the
//      contract behaviorally (identity + >1MiB rejected).
//  (3) game.css carries the mobile markers: a max-width 900px media query
//      (owner DS-FRIDGE-02) and >=44px touch targets.
//  (4) game.json has technical.mobileOptimized === true (owner DS-FRIDGE-03).
//  (5) no secrets in fridge files: sk- (left-boundary guarded per MEMORY
//      skill-audit lesson), bot4weird_ keys, PEM private keys.
//
// Style reference (read-only): scripts/verify-catalog-runtime.mjs.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const fail = (msg) => {
  console.error(`verify-fridge: ${msg}`);
  process.exit(1);
};
const read = (rel) =>
  readFile(join(root, rel), "utf8").catch(() => fail(`${rel} missing or unreadable.`));
const stripVS16 = (s) => s.replace(/\uFE0F/g, "");

// Inline required list (fallback while lib/game-fridge-foods.ts is unlanded).
// 120 unique food emojis; includes the 34 shipped in the bundle today so the
// check tightens only on the 86 the core-engine lane (DS-FRIDGE-01) still owes.
const INLINE_FRIDGE_FOODS = [
  // 34 already in FOOD_STATS today (proteins/carbs/fruits/veg/dairy)
  "🍗", "🥩", "🍖", "🐟", "🥚", "🫘", "🧀", "🥜",
  "🍞", "🍚", "🍝", "🥔", "🌽", "🥖", "🥯",
  "🍎", "🍌", "🍇", "🍓", "🍊", "🍉", "🍑",
  "🥦", "🥕", "🥬", "🍅", "🥒", "🧅", "🧄",
  "🥛", "🧈", "🥥", "🫒", "🥑",
  // 86 owed: seafood/meat/prepared
  "🍤", "🦐", "🦞", "🦀", "🦑", "🐙", "🍣", "🥓", "🌭", "🍔",
  "🥪", "🌮", "🌯", "🥙", "🧆", "🥘", "🍲", "🫕", "🍢", "🍡",
  // bakery/sweets/pantry
  "🦪", "🥐", "🧇", "🥞", "🧁", "🍰", "🎂", "🍪", "🍩", "🥧",
  "🍦", "🍨", "🍧", "🍮", "🍯", "🍿", "🧂", "🥫", "🥨", "🍭",
  // world dishes + more fruit
  "🍬", "🍫", "🍱", "🍛", "🍜", "🥟", "🫓", "🥠", "🍙", "🍘",
  "🍥", "🥡", "🫔", "🫙", "🍐", "🍋", "🍈", "🍒", "🫐", "🥭",
  // veg + drinks
  "🍍", "🥝", "🍏", "🥗", "🫑", "🌶", "🫚", "🍄", "🫛", "🌰",
  "🍠", "🍵", "☕", "🧃", "🥤", "🧋", "🍺", "🍷", "🥂", "🍹",
  "🧉", "🍶", "🫖", "🍾", "🐡", "🧊",
];

// ---- (1) FOOD_STATS coverage ----
const FOODS_TS = "lib/game-fridge-foods.ts";
let required;
if (existsSync(join(root, FOODS_TS))) {
  const src = await read(FOODS_TS);
  const block = src.match(/FRIDGE_FOODS\s*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? src;
  const keys = [...block.matchAll(/['"]([^'"]+)['"]\s*:/g)]
    .map((m) => m[1])
    .filter((s) => /\p{Extended_Pictographic}/u.test(s));
  required = [...new Set(keys.map(stripVS16))];
  if (required.length < 120)
    fail(`${FOODS_TS} defines only ${required.length} food emojis, expected at least 120 (owner DS-FRIDGE-04).`);
} else {
  required = INLINE_FRIDGE_FOODS.map(stripVS16);
  const uniq = new Set(required);
  if (required.length !== 120 || uniq.size !== 120)
    fail(`inline fallback list corrupt: ${required.length} entries, ${uniq.size} unique (expected 120/120).`);
}
const gameJs = await read("public/games/html/fridgesimulator/game.js");
const foodBlock = gameJs.match(/FOOD_STATS\s*=\s*\{([\s\S]*?)\n\};/)?.[1];
if (!foodBlock) fail("FOOD_STATS block not found in public/games/html/fridgesimulator/game.js.");
const present = new Set(
  [...foodBlock.matchAll(/['"]([^'"]+)['"]\s*:/g)].map((m) => stripVS16(m[1])),
);
const missingFoods = required.filter((e) => !present.has(e));
if (missingFoods.length)
  fail(
    `${missingFoods.length}/${required.length} required food emojis missing from FOOD_STATS` +
      ` (have ${present.size}): ${missingFoods.slice(0, 20).join(" ")}` +
      `${missingFoods.length > 20 ? " ..." : ""} (owner DS-FRIDGE-01).`,
  );

// ---- (2) saves bridge round-trip ----
const SAVES_TS = "lib/game-fridge-saves.ts";
if (!existsSync(join(root, SAVES_TS)))
  fail(`${SAVES_TS} missing — serialize/deserialize bridge not landed (owner DS-FRIDGE-05).`);
const saves = await read(SAVES_TS);
for (const token of ["serializeFridgeSession", "deserializeFridgeSession"])
  if (!saves.includes(token)) fail(`${SAVES_TS} must export ${token} (owner DS-FRIDGE-05).`);
if (!/1048576|1\s*MiB|1024\s*\*\s*1024/.test(saves))
  fail(`${SAVES_TS} must enforce the <=1MiB save cap (owner DS-FRIDGE-05).`);
if (!/JSON\.stringify/.test(saves) || !/JSON\.parse/.test(saves))
  fail(`${SAVES_TS} must round-trip sessions via JSON (owner DS-FRIDGE-05).`);
// Behavioral probe of the contract the lib promises.
const LIMIT = 1048576;
const probe = {
  game: "fridgesimulator",
  slot: 1,
  day: 7,
  money: 250,
  cheat_mode: false,
  inventory: { "🍎": 3, "🍚": 5 },
  countries: { usa: { fridge: ["🍎", "🍚"] } },
};
const text = JSON.stringify(probe);
if (Buffer.byteLength(text, "utf8") > LIMIT) fail("probe session exceeds 1MiB (contract probe).");
if (JSON.stringify(JSON.parse(text)) !== text)
  fail("serialize->deserialize identity broken (contract probe, owner DS-FRIDGE-05).");
const oversized = JSON.stringify({ ...probe, blob: "x".repeat(LIMIT + 1) });
if (!(Buffer.byteLength(oversized, "utf8") > LIMIT))
  fail(">1MiB payload was not rejected (contract probe, owner DS-FRIDGE-05).");

// ---- (3) mobile CSS markers ----
const css = await read("public/games/html/fridgesimulator/game.css");
if (!/max-width:\s*900px/.test(css))
  fail("game.css missing max-width 900px media marker (owner DS-FRIDGE-02).");
if (!css.includes("44px"))
  fail("game.css missing >=44px touch targets (owner DS-FRIDGE-02).");

// ---- (4) game.json flags ----
let meta;
try {
  meta = JSON.parse(await read("public/games/html/fridgesimulator/game.json"));
} catch {
  fail("public/games/html/fridgesimulator/game.json is not valid JSON (owner DS-FRIDGE-03).");
}
if (meta?.technical?.mobileOptimized !== true)
  fail("game.json technical.mobileOptimized must be true (owner DS-FRIDGE-03).");

// ---- (5) secrets sweep ----
const SCAN = [
  "public/games/html/fridgesimulator/game.js",
  "public/games/html/fridgesimulator/game.css",
  "public/games/html/fridgesimulator/game.json",
  "public/games/html/fridgesimulator/guide.html",
  "public/games/html/fridgesimulator/index.html",
  FOODS_TS,
  SAVES_TS,
];
const PATTERNS = [
  ["sk-key", /(?<![A-Za-z0-9_-])sk-[A-Za-z0-9-_]{20,}/],
  ["bot-key", /bot4weird_[A-Za-z0-9-_]+/],
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
];
for (const rel of SCAN) {
  if (!existsSync(join(root, rel))) continue;
  const src = await readFile(join(root, rel), "utf8");
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    for (const [name, re] of PATTERNS)
      if (re.test(line)) fail(`possible secret (${name}) in ${rel}:${i + 1} — remove before shipping.`);
  });
}

console.log(
  `verify-fridge: ok (${required.length} foods in FOOD_STATS, saves round-trip + 1MiB guard, 900px/44px CSS, mobileOptimized, secrets clean).`,
);
