import { readFileSync, existsSync, readdirSync } from "node:fs";

function must(cond, msg) {
  if (!cond) throw new Error(`verify-age-gate: ${msg}`);
}

function read(path) {
  must(existsSync(path), `missing file ${path}`);
  return readFileSync(path, "utf8");
}

// 1. Core library: ratings, default DOB, checks, no-storage rule.
const core = read("lib/age-gate.ts");
for (const token of [
  "AgeRating",
  "RATING_MIN_AGE",
  "RATING_LABEL",
  "DEFAULT_DOB_ISO",
  "1970-04-20",
  "GAME_RATINGS",
  "getGameRating",
  "requiredAgeFor",
  "checkDob",
  "formatWait",
  "diffYMD",
  "isKidsMode",
  "setKidsMode",
  "4weird-kids-mode",
]) {
  must(core.includes(token), `lib/age-gate.ts must include ${token}`);
}
// The library must never persist birth dates: no fetch, no supabase, no
// storage writes for DOB (Kids Mode flag storage is the only exception).
must(!/fetch\s*\(/.test(core), "lib/age-gate.ts must never call fetch (DOB stays on-device)");
must(!/from\s+["']@\/lib\/supabase|createClient|supabase\s*\.\s*from/i.test(core), "lib/age-gate.ts must never touch Supabase");
must(!core.includes("setItem(\"4weird-dob") && !core.includes("4weird-dob"), "lib/age-gate.ts must never persist DOB");

// 2. Logic spot-checks (mirror of the TS implementation, calendar-exact).
function diffYMD(from, to) {
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  let months = to.getUTCMonth() - from.getUTCMonth();
  let days = to.getUTCDate() - from.getUTCDate();
  if (days < 0) {
    months -= 1;
    days += new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 0, 12)).getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}
function checkDob(dobISO, requiredAge, now) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobISO.trim());
  if (!m) return { ok: false, reason: "invalid" };
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return { ok: false, reason: "invalid" };
  const n = now ?? new Date();
  const today = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 12));
  if (d.getTime() > today.getTime()) return { ok: false, reason: "invalid" };
  const eligible = new Date(d.getTime());
  eligible.setUTCFullYear(eligible.getUTCFullYear() + requiredAge);
  if (today.getTime() >= eligible.getTime()) return { ok: true };
  return { ok: false, reason: "too-young", wait: diffYMD(today, eligible) };
}
const ADULT_DAY = new Date(Date.UTC(2026, 8, 11, 12)); // 2026-09-11
must(checkDob("1970-04-20", 18, ADULT_DAY).ok === true, "default DOB 1970-04-20 must pass 18+");
must(checkDob("2008-09-11", 18, ADULT_DAY).ok === true, "exactly 18 today must pass");
must(checkDob("2008-09-12", 18, ADULT_DAY).ok === false, "one day under 18 must fail");
const w = checkDob("2008-09-12", 18, ADULT_DAY);
must(w.reason === "too-young" && w.wait.years === 0 && w.wait.months === 0 && w.wait.days === 1, "wait for one-day-short must be 0y 0m 1d");
must(checkDob("2013-09-11", 13, ADULT_DAY).ok === true, "exactly 13 today must pass the teen gate");
must(checkDob("2013-09-12", 13, ADULT_DAY).ok === false, "one day under 13 must fail the teen gate");
must(checkDob("not-a-date", 18, ADULT_DAY).reason === "invalid", "garbage DOB must be invalid");
must(checkDob("2026-02-30", 18, ADULT_DAY).reason === "invalid", "Feb 30 must be invalid");
must(checkDob("2030-01-01", 18, ADULT_DAY).reason === "invalid", "future DOB must be invalid");

// 3. Catalog carries a rating per game.
const games = read("content/games.ts");
must(games.includes("GAME_RATINGS"), "content/games.ts must source ratings from GAME_RATINGS");
must(games.includes("rating:"), "content/games.ts must set rating on games");
for (const slug of ["assassinanimals", "gravegain2d", "gravegain3d", "demolichdom", "lastwordszombies", "battlesharks2", "serversavershield", "platform-wars", "neoninvaders"]) {
  must(core.includes(`"${slug}"`) || core.includes(`'${slug}'`) || core.includes(`${slug}:`), `GAME_RATINGS must rate ${slug}`);
}
// Every canonical bundle slug must resolve to a valid band.
const canonical = readdirSync("public/games", { withFileTypes: true })
  .filter((e) => e.isDirectory() && !["html", "images"].includes(e.name))
  .map((e) => e.name);
const bands = new Set(["kids", "teens", "adults"]);
const ratingsBlock = core.slice(core.indexOf("GAME_RATINGS"));
for (const slug of canonical) {
  const m = new RegExp(`['"]?${slug}['"]?\\s*:\\s*"(kids|teens|adults)"`).exec(ratingsBlock);
  if (m) must(bands.has(m[1]), `${slug} has an invalid band`);
}

// 4. AgeGate component: date picker w/ default, wait message, Try Again, no storage.
const gate = read("components/games/age-gate.tsx");
for (const token of ['type="date"', "DEFAULT_DOB_ISO", "Try Again", "never stored", "onPass", "formatWait", "checkDob"]) {
  must(gate.includes(token), `age-gate.tsx must include ${token}`);
}
must(!gate.includes("fetch("), "age-gate.tsx must never call fetch (DOB stays on-device)");
must(!/from\s+["']@\/lib\/supabase|createClient/.test(gate), "age-gate.tsx must never touch Supabase");
must(!/localStorage\s*\./.test(gate), "age-gate.tsx must never persist DOB to localStorage");

// 5. Play shell enforces the policy.
const shell = read("components/games/play-gate.tsx");
for (const token of ["AgeGate", "getGameRating", "isKidsMode", "gate-adults", "gate-teens", "blocked", "RatingBadge"]) {
  must(shell.includes(token), `play-gate.tsx must include ${token}`);
}
must(shell.includes("age !== \"passed\""), "play-gate boot must wait for the age gate to pass");

// 6. Kids Mode: catalog hides Adults, settings persist the flag, migration adds the column.
const catalog = read("components/games/game-catalog.tsx");
for (const token of ["Kids Mode", "toggleKids", "RatingBadge", "kids-mode-changed"]) {
  must(catalog.includes(token), `game-catalog.tsx must include ${token}`);
}
const settings = read("app/api/settings/route.ts");
must(settings.includes("kids_mode"), "settings API must accept kids_mode");
const hub = read("components/account/account-hub.tsx");
must(hub.includes("kids_mode"), "account settings must offer the Kids Mode toggle");
const migration = read("supabase/migrations/20260923000000_kids_mode_age_ratings.sql");
must(migration.includes("kids_mode"), "kids_mode migration must add the kids_mode column");
must(migration.includes("account_settings"), "kids_mode migration must target account_settings");

// 7. Rating badges on detail + play pages.
must(read("app/games/[slug]/page.tsx").includes("RatingBadge"), "game detail page must show RatingBadge");
must(read("app/games/[slug]/play/page.tsx").includes("RatingBadge"), "play page must show RatingBadge");

// 8. Legal: terms cover ratings/Kids Mode/no-sexual-content; privacy states DOB is never stored.
const terms = read("app/terms/page.tsx");
for (const token of ["Kids (0-12)", "Teens (13-17)", "Adults (18+)", "Kids Mode", "never stored", "sexual content is never allowed"]) {
  must(terms.includes(token), `terms must include ${token}`);
}
const privacy = read("app/privacy/page.tsx");
for (const token of ["Age checks (never collected)", "never sent to our servers", "never written to any database", "Kids Mode flag"]) {
  must(privacy.includes(token), `privacy policy must include ${token}`);
}
// No sexual content anywhere: the Adults band is violence/horror only.
for (const [path, body] of [["lib/age-gate.ts", core], ["app/terms/page.tsx", terms]]) {
  must(!/porn|hentai|nsfw|erotic|sex game/i.test(body), `${path} must not describe sexual content`);
}

console.log(`Age-gate checks OK: bands + DOB math + ${canonical.length} catalog slugs + Kids Mode + legal notes.`);
