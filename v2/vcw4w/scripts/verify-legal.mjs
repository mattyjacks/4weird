// Verifier: legal docs + cookie consent.
// Terms must carry the zero-liability/no-guarantee/no-refund stance with the
// lawful "fullest extent" qualifier, the full processor + AI list, illegal
// content + courts disclosure, and AI honesty. Privacy must mirror the real
// data flows (processors incl. every AI API, AI inputs, banner + 7-day
// categories, sharing incl. courts, rights). The banner must offer genuine
// options with a strong recommend-all, re-ask every 7 days, and actually gate
// Google Analytics. Run: node scripts/verify-legal.mjs (no keys, no network).
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const fail = (msg) => { console.error(`VERIFY_FAIL: ${msg}`); process.exit(1); };
const assert = (cond, msg) => { if (!cond) fail(msg); };
const has = (file, ...needles) => {
  assert(existsSync(join(root, file)), `missing file ${file}`);
  const src = read(file);
  for (const n of needles) assert(src.includes(n), `${file} missing: ${n}`);
  return src;
};

// 1. Terms: zero liability + no guarantees + no-refund cancel, lawfully qualified.
const terms = has(
  "app/terms/page.tsx",
  "WE GUARANTEE NOTHING",
  "TOTAL AGGREGATE LIABILITY",
  "IS $0",
  "TO THE FULLEST EXTENT",
  "STOP USING",
  "without any obligation to provide a refund",
  "forfeited on",
  "no illegal content of any kind is allowed",
  "U.S. courts",
  "New Hampshire",
);
// Every processor + AI API named (user-facing honesty about who touches data).
for (const name of [
  "Google Analytics", "Vercel", "Cloudflare", "Supabase", "Shopify",
  "OpenAI", "OpenRouter", "DeepSeek", "Google", "Gemini", "Anthropic",
  "Claude", "Meta", "Muse Spark", "ElevenLabs", "fal.ai", "RunPod", "DigitalOcean",
]) {
  assert(terms.includes(name), `terms missing processor: ${name}`);
}
// AI honesty: hallucinations + not advice + availability not promised.
for (const token of ["hallucinated", "Do not rely on it", "AI features (Buddy"]) {
  assert(terms.includes(token), `terms missing AI honesty: ${token}`);
}
// Qualifier present so the stance reads as "fullest extent of the law".
assert(terms.includes("only to the extent permitted by applicable law"), "terms missing lawfulness qualifier");

// 2. Privacy: mirrors real flows.
const privacy = has(
  "app/privacy/page.tsx",
  "AI and voice/camera features",
  "never stored, never logged",
  "only transcripts are sent",
  "cookie choices",
  "7 days",
  "Accept all",
  "Reject non-essential",
  "Customize",
  "Google Analytics loads only after you accept analytics cookies",
  "U.S. courts",
  "court order, subpoena",
  "/my/rights",
);
for (const name of [
  "Vercel", "Cloudflare", "Supabase", "Shopify", "Google Analytics",
  "OpenAI", "OpenRouter", "DeepSeek", "Anthropic", "Meta", "ElevenLabs", "fal.ai", "RunPod",
]) {
  assert(privacy.includes(name), `privacy missing processor: ${name}`);
}

// 3. Banner: every page, 7-day renewal, genuine options, strong recommend.
const banner = has(
  "components/site/cookie-banner.tsx",
  "COOKIE_CONSENT_DAYS = 7",
  "fw-cookie-consent-v1",
  "Accept all (recommended)",
  "strongly recommend accepting all",
  "Reject non-essential",
  "Customize",
  "Essential",
  "Analytics",
  "Functional",
  "Marketing",
  "fw-consent-changed",
  "readCookieConsent",
);
assert(banner.includes("86_400_000"), "banner must expire consent by time");

// 4. GA gated on analytics consent (no load before accept).
has(
  "components/site/google-analytics.tsx",
  "readCookieConsent",
  "categories.analytics",
  "fw-consent-changed",
  "!allowed) return null",
);

// 5. Banner mounted in the root layout (every page).
has("app/layout.tsx", "CookieBanner", "<CookieBanner />");

console.log("VERIFY_OK: terms (0-liability, no-refund, full processor/AI list, courts, AI honesty) + privacy (flows, banner, sharing, rights) + 7-day cookie banner gating GA.");
