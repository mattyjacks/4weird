import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const lib = readFileSync("lib/vendor-eligibility.ts", "utf8");
assert.match(lib, /normalizeVendorAgeBand/);
assert.match(lib, /checkVendorEligibility/);
const adultOnlyVendors = lib.match(/ADULT_ONLY_VENDORS = \[([^\]]+)\]/)?.[1] ?? "";
for (const vendor of ["openrouter", "fal", "runpod", "gemini-api", "shopify-checkout", "easydnc", "elevenlabs", "opencode"]) {
  assert.ok(adultOnlyVendors.includes(`"${vendor}"`), `${vendor} must remain in the adult-only vendor gate`);
}
assert.ok(readFileSync("../desktop/code/lib/opencode_bridge.js", "utf8").includes("assertProviderEligible('opencode')"), "OpenCode must check account eligibility before integrated coding calls");
const legacyFal = readFileSync("public/vibecodeworker-legacy/modules/fal_key.js", "utf8");
assert.match(legacyFal, /vendor-eligibility\?vendor=fal/, "legacy public Fal client must call the shared eligibility endpoint");
assert.ok(legacyFal.indexOf("await requireFalEligibility()") < legacyFal.indexOf("fetch(`${FAL_QUEUE_BASE}"), "legacy Fal actions must check eligibility before provider traffic");
const publicAiLlm = readFileSync("public/ai/vibecodeworker/lib/brain/llm_caller.js", "utf8");
assert.match(publicAiLlm, /await assertProviderEligible\(provider, \{ model: modelName \}\)/, "served public AI workspace must gate direct LLM calls");
const publicAiRunpod = readFileSync("public/ai/vibecodeworker/lib/runpod_cloud.js", "utf8");
assert.match(publicAiRunpod, /await assertProviderEligible\('runpod'\)/, "served public AI workspace must gate direct RunPod calls");
assert.match(readFileSync("app/terms/page.tsx", "utf8"), /OpenCode.*Adult-band only/);
assert.match(readFileSync("app/privacy/page.tsx", "utf8"), /raw\.githubusercontent\.com/);
assert.match(lib, /CONSENT_REQUIRED_VENDORS = \["outscraper", "digitalocean", "meshy", "openai", "bouncer", "pexels", "deepseek", "meta-api"\]/);
assert.match(lib, /checkAuthenticatedVendorEligibility/);
assert.match(lib, /if \(normalizeVendorAgeBand\(value\) === "adult"\)/, "only adult band can pass this gate");
assert.match(lib, /getKidSession\(serviceClient\(\), rawKidToken\)/, "child overlays must resolve their own account age");
assert.match(lib, /checkVendorEligibility\(vendor, kidSession\.kid\.age_band\)/, "a disabled adult child account may pass by its own age band");
assert.match(lib, /canKidUseFeature\(kidSession\.controls, feature\)/, "parent feature controls must also apply to child sessions");
assert.match(lib, /if \(\(ADULT_ONLY_VENDORS as readonly string\[\]\)\.includes\(vendor\)\)/, "adult-only vendors must be rejected during every active child session");
assert.match(lib, /unavailable during a child session because its terms require adult users/, "a parent profile or adult-band child account must not override the active child session for adult-only vendors");
assert.match(readFileSync("app/api/fal/generate/route.ts", "utf8"), /checkAuthenticatedVendorEligibility\(supabase, data\.user\.id, "fal"\)/);
assert.match(readFileSync("app/api/openrouter-vendor/generate/route.ts", "utf8"), /checkAuthenticatedVendorEligibility\(supabase, data\.user\.id, "openrouter"\)/);
const openrouterGenerate = readFileSync("app/api/openrouter-vendor/generate/route.ts", "utf8");
assert.match(openrouterGenerate, /isGoogleGeminiModel\(model\)/, "caller-selected Gemini model IDs must be rejected");
assert.ok(openrouterGenerate.indexOf("Google Gemini models are unavailable") < openrouterGenerate.indexOf('supabase.rpc("meter_openrouter_usage"'), "Google/Gemini is rejected before vendor metering or upstream submission");
assert.match(readFileSync("app/api/openrouter-plays/route.ts", "utf8"), /checkAuthenticatedVendorEligibility\(supabase, data\.user\.id, "openrouter"\)/);
assert.match(readFileSync("app/api/openrouter-plays/route.ts", "utf8"), /isGoogleGeminiModel\(selectedModel\)/);
assert.match(readFileSync("app/api/buddy/chat/route.ts", "utf8"), /isGoogleGeminiModel\(openrouterModel\)/);
assert.match(readFileSync("app/api/swarm/sessions/[id]/chat/route.ts", "utf8"), /isGoogleGeminiModel\(openrouterModel\)/);
assert.match(readFileSync("app/api/vcw/debug-play/route.ts", "utf8"), /checkAuthenticatedVendorEligibility\(serviceClient\(\), caller\.userId, "openrouter"\)/);
for (const route of [
  "app/api/game-ai/meter/route.ts", "app/api/buddy/presence/route.ts",
  "app/api/buddy/session/route.ts", "app/api/openrouter-vendor/usage/route.ts",
]) {
  assert.match(readFileSync(route, "utf8"), /kid_session/, `${route} must fail closed during an active child session until child-scoped billing/usage exists`);
}
assert.match(readFileSync("app/api/fal/status/route.ts", "utf8"), /checkAuthenticatedVendorEligibility\(supabase, data\.user\.id, "fal"\)/);
assert.match(readFileSync("app/api/vcw/runs/[id]/actions/route.ts", "utf8"), /checkAuthenticatedVendorEligibility\(supabase, data\.user\.id, "fal"\)/);
assert.match(readFileSync("app/api/vcw/runs/[id]/actions/batch/route.ts", "utf8"), /checkAuthenticatedVendorEligibility\(supabase, data\.user\.id, "fal"\)/);
assert.match(readFileSync("app/api/pexels/curated/route.ts", "utf8"), /checkAuthenticatedVendorEligibility\(supabase, data\.user\.id, "pexels"\)/);
assert.match(readFileSync("app/api/easydnc/certificate/route.ts", "utf8"), /\.eq\("user_id", auth\.user\.id\)/);
assert.match(readFileSync("app/api/coins/checkout/route.ts", "utf8"), /checkAuthenticatedVendorEligibility\(supabase, data\.user\.id, "shopify-checkout"\)/, "coin checkout enforces the Adult-only purchase rule server-side");
const desktopGuard = readFileSync("../desktop/code/lib/vendor_eligibility.js", "utf8");
assert.match(desktopGuard, /api\/bot\/vendor-eligibility/);
for (const file of ["../desktop/code/lib/brain/llm_caller.js", "../desktop/code/lib/core.js"]) {
  assert.match(readFileSync(file, "utf8"), /assertProviderEligible\(provider,\s*\{ model:/, `${file} checks eligibility and selected model before direct provider calls`);
}
assert.match(readFileSync("../desktop/code/lib/elevenlabs.js", "utf8"), /assertProviderEligible\('elevenlabs'\)/, "desktop ElevenLabs calls check eligibility");
assert.match(readFileSync("../desktop/code/app/main.js", "utf8"), /assertProviderEligible\('elevenlabs'\)/, "desktop commentary TTS checks ElevenLabs eligibility");
assert.match(readFileSync("../desktop/code/app/main.js", "utf8"), /assertProviderEligible\('openai'\)/, "desktop OpenAI commentary TTS checks eligibility");
assert.match(readFileSync("../desktop/code/lib/runpod_cloud.js", "utf8"), /assertProviderEligible\('runpod'\)/, "desktop RunPod cloud calls check eligibility");
assert.match(readFileSync("../desktop/code/lib/openrouter_plays.js", "utf8"), /\(opts\.assertProviderEligible \|\| assertProviderEligible\)\('openrouter'/, "desktop OpenRouter plays check eligibility before external calls");
const desktopFal = readFileSync("../desktop/code/frontend/modules/fal_key.js", "utf8");
assert.match(desktopFal, /vendor-eligibility\?vendor=fal/);
assert.equal((desktopFal.match(/await assertFalEligible\(\)/g) ?? []).length, 2, "Fal key verification and paid generation both gate before provider calls");
assert.match(readFileSync("app/api/crm/contacts/scrub-dnc/route.ts", "utf8"), /checkAuthenticatedVendorEligibility\(supabase, u\.id, "easydnc"\)/, "CRM DNC scrub uses the EasyDNC age gate");
const travelRoute = readFileSync("app/api/vocrehab/travel/route.ts", "utf8");
assert.doesNotMatch(travelRoute, /maps\.googleapis\.com|new Map|cache\.(?:get|set)/i, "travel estimates stay offline and do not cache Maps content");
for (const route of ["app/api/easydnc/check/route.ts", "app/api/crm/contacts/scrub-dnc/route.ts"]) {
  const source = readFileSync(route, "utf8");
  assert.match(source, /method: "POST"/, `${route} uses EasyDNC POST`);
  assert.match(source, /Authorization.*Bearer/, `${route} keeps the EasyDNC key out of the URL`);
  assert.doesNotMatch(source, /encodeURIComponent\((?:activeApiKey|apiKey|activeKey)\)/, `${route} must not put the EasyDNC key in a URL`);
}
assert.match(readFileSync("app/api/agents/runpod-run/route.ts", "utf8"), /checkAuthenticatedVendorEligibility\(supabase, data\.user\.id, "runpod"\)/);
assert.match(readFileSync("app/api/agents/runpod-jobs/route.ts", "utf8"), /checkAuthenticatedVendorEligibility\(supabase, data\.user\.id, "runpod"\)/);
for (const route of [
  "app/api/agents/runpod-endpoints/route.ts", "app/api/agents/runpod-gpus/route.ts",
  "app/api/agents/runpod-templates/route.ts", "app/api/agents/runpod-volumes/route.ts",
  "app/api/agents/runpod-status/route.ts", "app/api/agents/runpod-sync/route.ts",
  "app/api/desktop/provision/route.ts", "app/api/vcw/autoplay/route.ts",
  "app/api/blender/jobs/route.ts", "app/api/agents/[id]/book/route.ts",
]) assert.match(readFileSync(route, "utf8"), /checkAuthenticatedVendorEligibility/ , `${route} must enforce provider age eligibility`);
const vendorRoutes = [
  ["app/api/easydnc/check/route.ts", '"easydnc"'],
  ["app/api/outscraper/search/route.ts", '"outscraper"'],
  ["app/api/agents/digitalocean-sync/route.ts", '"digitalocean"'],
  ["app/api/agents/digitalocean-status/route.ts", '"digitalocean"'],
  ["app/api/bouncer/status/route.ts", '"bouncer"'],
  ["app/api/bouncer/check/route.ts", '"bouncer"'],
  ["app/api/bouncer/batch/route.ts", '"bouncer"'],
  ["app/api/crm/contacts/verify-bouncer/route.ts", '"bouncer"'],
  ["app/api/meshy/generate/route.ts", '"meshy"'],
  ["app/api/meshy/status/route.ts", '"meshy"'],
  ["app/api/pexels/search/route.ts", '"pexels"'],
  ["app/api/buddy/chat/route.ts", '"openai"'],
  ["app/api/buddy/tts/route.ts", '"openai"'],
  ["app/api/code/[id]/audit/route.ts", '"openai"'],
  ["app/api/feedback/[id]/enrich/route.ts", '"openai"'],
  ["app/api/swarm/sessions/[id]/chat/route.ts", '"openai"'],
  ["app/api/vocrehab/roleplay/route.ts", '"openai"'],
  ["app/api/search/route.ts", '"openai"'],
];
for (const [route, vendor] of vendorRoutes) {
  const source = readFileSync(route, "utf8");
  assert.match(source, /checkAuthenticatedVendorEligibility/, `${route} must check vendor age eligibility`);
  assert.ok(source.includes(vendor), `${route} must check ${vendor}`);
}
assert.match(readFileSync("lib/valleynet.ts", "utf8"), /checkAuthenticatedVendorEligibility\(serviceClient\(\), options\.userId, "openai"\)/);
assert.match(readFileSync("lib/moderation.ts", "utf8"), /options\.allowExternalAi !== true/);
for (const file of ["public/games/index.html", "public/games/html/madi/index.html", "public/components.js"]) {
  assert.doesNotMatch(readFileSync(file, "utf8"), /googletagmanager\.com\/gtag\/js|G-KZ03RW8P96/, `${file} must not load the unconditional legacy Google Analytics tag`);
}
assert.match(readFileSync("app/privacy/page.tsx", "utf8"), /DeepSeek.*China/);
assert.match(readFileSync("app/terms/page.tsx", "utf8"), /Google Gemini \(disabled in/);
const analyticsPrivacy = readFileSync("components/site/privacy-analytics.tsx", "utf8");
for (const prefix of ["/account", "/auth", "/bot", "/social", "/parties", "/profile", "/users"]) {
  assert.ok(analyticsPrivacy.includes(`"${prefix}"`), `Vercel Analytics suppresses private path ${prefix}`);
}
assert.match(analyticsPrivacy, /url: `\$\{parsed\.origin\}\$\{parsed\.pathname\}`/, "Vercel Analytics strips all query-string values");
console.log("vendor eligibility checks passed");
