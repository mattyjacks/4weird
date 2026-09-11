import { readFileSync, existsSync } from "node:fs";

function must(cond, msg) {
  if (!cond) throw new Error(`verify-quantum-hardening: ${msg}`);
}

function read(path) {
  must(existsSync(path), `missing file ${path}`);
  return readFileSync(path, "utf8");
}

// 1. Bot keys: 32-char issuance, N=32768, dual-verify, rehash, dummy KDF.
const bot = read("lib/bot-auth.ts");
must(bot.includes("BOT_KEY_SUFFIX_LEN = 32"), "bot keys must issue 32 chars");
must(bot.includes("BOT_KEY_SUFFIX_LEN_LEGACY"), "legacy 20-char length must be documented");
must(bot.includes("N: 32768"), "bot KDF must be N=32768");
must(bot.includes("hashBotKeyV1LegacyCostForPepper") || bot.includes("sha256HashLegacyCost"), "legacy N=16384 verify path must exist");
must(bot.includes("needsRehash"), "opportunistic rehash must exist");
must(bot.includes("scryptSync(randomBytes(16)"), "dummy KDF must exist for timing parity");
must(bot.includes("botPepperQuantumReady"), "pepper PQ-margin helper must exist");
// 1b. State-actor grade: memorable-pepper rejection, rotation, per-prefix salt, format gate.
must(bot.includes("BOT_KEY_PEPPER_PREVIOUS"), "pepper rotation (PREVIOUS) must exist");
must(bot.includes("botPepperIssuanceReady"), "issuance pepper-strength gate must exist");
must(bot.includes("isStrongPepper"), "memorable-pepper rejection must exist");
must(bot.includes("bot4weird-v2$"), "per-prefix v2 salt must exist");
must(bot.includes("isValidBotKeyFormat"), "strict key-format gate must exist");
must(bot.includes("allPeppers"), "multi-pepper verify must exist");
const gwAuth = read("lib/vcw-gateway-auth.ts");
must(gwAuth.includes("vcw-gateway-v2$"), "gateway domain separation must exist");
must(gwAuth.includes("hashNewGatewayKey"), "gateway issuance hasher must exist");
must(gwAuth.includes("isValidGatewayKeyFormat"), "gateway format gate must exist");
must(gwAuth.includes("botPepperConfigured"), "gateway must keep pepper fail-closed");
const botKeys = read("app/api/bot/keys/route.ts");
must(botKeys.includes("botPepperIssuanceReady"), "bot issuance must gate on pepper strength");

// 2. Kid sessions: 7d, 32-byte salt, pinned cost, peppered tokens, sliding refresh.
const fam = read("lib/family.ts");
must(fam.includes("KID_SESSION_DAYS = 7"), "kid sessions must be 7 days");
const kid = read("lib/kid-session.ts");
must(kid.includes("randomBytes(32).toString"), "kid password salt must be 32 bytes");
must(kid.includes("N: 32768"), "kid password cost must be pinned N=32768");
must(kid.includes("kidTokenPepper"), "kid token pepper must exist");
must(kid.includes("hashKidTokenLegacy"), "legacy token fallback must exist");
must(kid.includes("48 * 3600 * 1000"), "sliding refresh window must exist");
const login = read("app/api/family/kid-login/route.ts");
must(login.includes("dummyKidPasswordVerify"), "kid-login must burn dummy KDF on miss");
must(login.includes("KID_SESSION_DAYS"), "kid-login expiry must use KID_SESSION_DAYS");

// 3. Key hygiene: 180d default + nightly cron wired.
const keys = read("app/api/bot/keys/route.ts");
must(keys.includes("180 * 24 * 3600 * 1000"), "bot keys must default to 180d expiry");
const vercel = read("vercel.json");
for (const path of ["/api/cron/scale-sweep", "/api/cron/clan-tribute", "/api/cron/key-hygiene"]) {
  must(vercel.includes(path), `vercel.json must schedule ${path}`);
}
must(existsSync("app/api/cron/key-hygiene/route.ts"), "key-hygiene cron route must exist");

// 4. Vault: per-scope dedup, prefix check, shares membership gate.
const vpost = read("app/api/vault/blobs/route.ts");
must(!vpost.includes('onConflict: "sha256"'), "global sha256 upsert must be gone");
must(vpost.includes("never repoint another scope"), "per-scope dedup comment must exist");
const vget = read("app/api/vault/blobs/[id]/route.ts");
must(vget.includes("expectedPrefix"), "scope-prefix check must exist");
const shares = read("app/api/vault/shares/route.ts");
must(shares.includes("Explicit ownership/membership gate"), "shares membership gate must exist");

// 5. Play metering: kid-row guard + beat cap.
const sess = read("app/api/games/session/route.ts");
must(sess.includes("isKidRow"), "adult heartbeat/end must guard kid rows");
must(sess.includes("HEARTBEAT_BEAT_CAP"), "per-beat ceiling must exist");
const guest = read("app/api/games/guest-pass/route.ts");
must(guest.includes("verifyGuestAdToken"), "guest ad-token verifier must exist");
must(guest.includes("createHmac"), "guest ad-token must be HMAC");

// 6. Quests: scoped completions + no self-mint (API + SQL).
const quests = read("app/api/love/quests/route.ts");
must(quests.includes('.in("quest_id", questIds)'), "completions must be scoped in SQL");
must(quests.includes("not yourself"), "self-completion guard must exist");
const mig = read("supabase/migrations/20261021000000_quantum_hardening.sql");
must(mig.includes("7 days"), "migration must default kid sessions to 7d");
must(mig.includes("quests reward other members"), "migration must guard self-mint");

// 7. Uploads + vendor bases + VNC + transport.
const up = read("app/api/clans/upload/route.ts");
must(up.includes("Polyglot guard"), "image polyglot guard must exist");
must(vpost.includes("javascript"), "vault JS mime block must exist");
const runpod = read("lib/runpod.ts");
must(runpod.includes("RUNPOD_API_BASE_ALLOW"), "runpod base allowlist must exist");
const compute = read("lib/compute.ts");
must(!compute.includes('VNC_PW: "password"'), "hardcoded VNC password must be gone");
must(compute.includes("vncPassword"), "per-pod VNC password must be threaded through");
const next = read("next.config.ts");
must(next.includes("Strict-Transport-Security"), "HSTS must exist");
const mesh = read("app/api/meshy/webhook/route.ts");
must(mesh.includes("COMPARE_KEY = randomBytes(32)"), "per-boot compare key must exist");

console.log("verify-quantum-hardening: ok");
