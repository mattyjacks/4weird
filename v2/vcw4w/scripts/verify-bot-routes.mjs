import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const exists = (file) => fs.existsSync(new URL(file, import.meta.url));

// The bot clan API lives at /api/bot/bclans/* with the /bot/bclans console.
// The old /api/bot/clans/* endpoints are retired (404, no redirect) and the
// old /bot/clans page redirects to /bot/bclans. This script locks that in so
// a stray re-add or a half-finished rename breaks `npm test` immediately.
const routes = {
  list: read("../app/api/bot/bclans/route.ts"),
  detail: read("../app/api/bot/bclans/[slug]/route.ts"),
  post: read("../app/api/bot/bclans/[slug]/post/route.ts"),
  join: read("../app/api/bot/bclans/join/route.ts"),
  comment: read("../app/api/bot/bclans/post/[id]/comment/route.ts"),
  report: read("../app/api/bot/bclans/report/route.ts"),
};

// 1. All six bclans routes exist; none of the retired clans routes may exist.
for (const dead of [
  "../app/api/bot/clans/route.ts",
  "../app/api/bot/clans/[slug]/route.ts",
  "../app/api/bot/clans/[slug]/post/route.ts",
  "../app/api/bot/clans/join/route.ts",
  "../app/api/bot/clans/post/[id]/comment/route.ts",
  "../app/api/bot/clans/report/route.ts",
]) {
  if (exists(dead)) throw new Error(`Retired bot route still exists: ${dead} (must 404).`);
}
if (exists("../app/bot/clans/page.tsx")) {
  throw new Error("Retired /bot/clans page still exists (next.config must redirect it).");
}
if (!exists("../app/bot/bclans/page.tsx")) throw new Error("Bot console page app/bot/bclans/page.tsx is missing.");

// 2. Slug handling is case-insensitive everywhere a clan slug is accepted.
const validate = read("../lib/bot-validate.ts");
if (!validate.includes("export function botClanSlug")) throw new Error("bot-validate must export botClanSlug.");
for (const [name, src] of [["detail", routes.detail], ["post", routes.post], ["join", routes.join], ["report", routes.report]]) {
  if (!src.includes("botClanSlug")) throw new Error(`${name} route must normalize slugs with botClanSlug.`);
  if (/[^a-zA-Z]isSlug\(/.test(src)) throw new Error(`${name} route must not use case-sensitive isSlug for clan slugs.`);
}

// 3. Every Supabase failure routes through dbFail (server-logged, stable
// public text); raw Postgres text must never reach browsers.
for (const [name, src] of Object.entries(routes)) {
  if (!src.includes("dbFail")) throw new Error(`${name} route must route DB errors through dbFail.`);
  if (/fail\("Unable[^"]*", 500\)/.test(src)) throw new Error(`${name} route swallows DB errors with a raw 500 fail (use dbFail).`);
}

// 4. Clan parity guarantees: membership-gated writes, spam triage, CSAM quarantine.
if (!routes.join.includes('onConflict: "clan_id,user_id"')) throw new Error("Join must be an idempotent clan_members upsert.");
if (!routes.post.includes("Join the clan before posting.") || !routes.comment.includes("Join the clan before commenting.")) {
  throw new Error("Bot post/comment must require clan membership like humans.");
}
if (!routes.post.includes('looksSpammy(title, postBody) ? "pending" : "visible"')) {
  throw new Error("Bot posts must triage spammy content to pending.");
}
if (!routes.comment.includes('post.status !== "visible"')) throw new Error("Bot comments must land on visible posts only.");
if (!routes.post.includes("isOwnClanImageUrl")) throw new Error("Bot posts must enforce the own-upload image rule.");
if (!routes.report.includes('category === "csam"') || !routes.report.includes('status: "hidden"')) {
  throw new Error("Bot reports must quarantine csam post/comment targets immediately.");
}
if (!routes.report.includes("Target not found.")) throw new Error("Bot reports must 404 against missing target rows.");

// 5. Redirects: the UI page moved (/bot/clans -> /bot/bclans) but the retired
// API intentionally has no redirect; it is gone (404).
const config = read("../next.config.ts");
for (const token of ['source: "/bot/clans"', 'destination: "/bot/bclans"', 'source: "/bot/clans/:path*"']) {
  if (!config.includes(token)) throw new Error(`next.config missing bot console redirect ${token}.`);
}
if (config.includes('"/api/bot/clans')) throw new Error("Retired /api/bot/clans/* must have no redirect (gone = 404).");

// 6. No live source may still call the retired API paths (redirect comments
// and "retired" notes are the only allowed mentions).
const allowedOldPathMentions = new Set([
  "../next.config.ts",
  "../app/bot/bclans/bclans-console.tsx",
  "../../../skill.md",
]);
const suspects = [
  "../app/bot/setup/bot-setup.tsx",
  "../app/bot/setup/page.tsx",
  "../app/bot/bclans/page.tsx",
  "../app/bot/bclans/bclans-console.tsx",
  "../components/site/site-header.tsx",
  "../lib/bot-auth.ts",
  "../lib/bot-validate.ts",
  "../public/bot/skill.md",
  "../../../skill.md",
  "../next.config.ts",
];
for (const file of suspects) {
  const src = read(file);
  const hits = src.split("\n").filter((line) => line.includes("/api/bot/clans/") || line.includes('"/bot/clans"') || line.includes("'/bot/clans'") || line.includes("`/bot/clans"));
  // Redirect-table entries (source:/destination:) are the mechanism itself;
  // retired/gone/moved notes are the documentation of the mechanism.
  const legit = hits.filter((line) => /retired|gone \(404\)|moved from|source:|destination:/i.test(line));
  if (hits.length > legit.length && !allowedOldPathMentions.has(file)) {
    throw new Error(`${file} still references a retired /api/bot/clans/* or /bot/clans path.`);
  }
  if (allowedOldPathMentions.has(file) && hits.length !== legit.length) {
    throw new Error(`${file} mentions retired bot paths outside a redirect/retired note.`);
  }
}

// 7. UI + docs all point at the live paths.
const setup = read("../app/bot/setup/bot-setup.tsx");
for (const token of ["/api/bot/bclans?limit=10", "/api/bot/bclans/join", "/api/bot/bclans/game-dev/post"]) {
  if (!setup.includes(token)) throw new Error(`Bot setup snippets must demo ${token}.`);
}
if (!read("../app/bot/setup/page.tsx").includes('href="/bot/bclans"')) throw new Error("Bot setup page must link the /bot/bclans console.");
const consoleClient = read("../app/bot/bclans/bclans-console.tsx");
for (const token of ["/api/bot/bclans?limit=10", "/api/bot/bclans/join", "/api/bot/bclans/report", "/api/bot/me"]) {
  if (!consoleClient.includes(token)) throw new Error(`Bot console must call ${token}.`);
}
if (!read("../components/site/site-header.tsx").includes('href: "/bot/bclans"')) {
  throw new Error("Site header must link the /bot/bclans console.");
}
const auth = read("../lib/bot-auth.ts");
for (const token of ["/api/bot/bclans,", "/api/bot/bclans/[slug]", "/api/bot/bclans/join", "/api/bot/bclans/[slug]/post", "/api/bot/bclans/post/[id]/comment", "/api/bot/bclans/report"]) {
  if (!auth.includes(token)) throw new Error(`bot-auth scope docs must reference ${token}.`);
}
const botSkill = read("../public/bot/skill.md");
for (const token of ["GET /api/bot/bclans", "POST /api/bot/bclans/join", "/api/bot/bclans/game-dev/post", "`csam`"]) {
  if (!botSkill.includes(token)) throw new Error(`public/bot/skill.md missing "${token}".`);
}
const skill = read("../../../skill.md");
for (const token of ["GET /api/bot/bclans", "`/bot/bclans` console", "The old `/api/bot/clans/*` paths are gone (404)"]) {
  if (!skill.includes(token)) throw new Error(`skill.md missing "${token}".`);
}

// 8. Pepper fail-closed: bot key hashes are scrypt(pepper + key) and every
// issuance/auth path denies safely without a configured pepper (JSON
// failure, never an unhandled throw / HTML 500).
if (!auth.includes("export function botPepperConfigured")) throw new Error("bot-auth must export botPepperConfigured.");
if (!auth.includes("BOT_KEY_PEPPER missing or too short")) throw new Error("bot-auth pepper() must fail closed without a >=16-char pepper.");
const keysRoute = read("../app/api/bot/keys/route.ts");
for (const token of ["botPepperConfigured", 'Bot service is not configured.", 503']) {
  if (!keysRoute.includes(token)) throw new Error(`keys route must gate issuance on the pepper (${token}).`);
}
if (/p_key_hash:\s*sha256Hash\(secret\)/.test(keysRoute)) throw new Error("keys route must not hash unguarded (sha256Hash throws without a pepper).");

// 9. Bot login (POST /api/bot/login): API key OR email+password, restricted
// tester session with no profile/destructive powers.
if (!exists("../app/api/bot/login/route.ts")) throw new Error("Bot login route app/api/bot/login/route.ts is missing.");
{
  const login = read("../app/api/bot/login/route.ts");
  for (const token of ["api_key", "BOT_TESTER_COOKIE", "resolveBotKey", "signInWithPassword", "bot_tester", "restrictions"]) {
    if (!login.includes(token)) throw new Error(`bot login route must reference ${token}.`);
  }
  if (!login.includes("not both")) throw new Error("bot login must refuse a body carrying both an API key and email+password.");
  if (!login.includes("export async function DELETE")) throw new Error("bot login must support DELETE (tester logout).");
  // Helpers live in bot-auth (single source of truth for the marker).
  for (const token of ["BOT_TESTER_COOKIE", "export function isBotTester", "export function botTesterBlocked"]) {
    if (!auth.includes(token)) throw new Error(`bot-auth must export ${token}.`);
  }
  // Profile writes + destructive routes refuse tester sessions (403 even in
  // dev, where the BotID gate never fires).
  for (const [file, note] of [
    ["../app/api/me/profile/route.ts", "profile PATCH"],
    ["../app/api/my/rights/route.ts", "rights POST"],
    ["../app/api/bot/identity/route.ts", "bot identity POST"],
    ["../app/api/bot/keys/route.ts", "bot keys POST"],
    ["../app/api/bot/keys/[id]/route.ts", "bot keys PATCH"],
    ["../app/api/bot/keys/[id]/revoke/route.ts", "bot keys revoke"],
  ]) {
    const src = read(file);
    if (!src.includes("isBotTester") || !src.includes("botTesterBlocked")) {
      throw new Error(`${file} must refuse bot tester sessions (${note}).`);
    }
  }
  // Logout clears the marker alongside the Supabase cookies.
  if (!read("../app/api/auth/logout/route.ts").includes("BOT_TESTER_COOKIE")) {
    throw new Error("auth logout must clear the bot tester marker.");
  }
  // Docs stay aligned: both skills + the repo skill document the dual login
  // and the profile/destructive refusal.
  for (const token of ["POST /api/bot/login", "bot_tester", "PATCH /api/me/profile"]) {
    if (!botSkill.includes(token)) throw new Error(`public/bot/skill.md missing "${token}".`);
    if (!skill.includes(token)) throw new Error(`skill.md missing "${token}".`);
  }
}
console.log("Bot route integrity OK.");
