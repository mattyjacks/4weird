import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log("=== 4WEIRD EASYDNC COMPLIANCE & INTEGRATION VERIFICATION ===");

// 1. Verify Core Files Exist
const requiredFiles = [
  "public/swarm/remastery/EASYDNC_MASTER_IMPLEMENTATION_GUIDE.md",
  "supabase/migrations/20261117000000_easydnc_compliance_ledger.sql",
  "app/api/easydnc/check/route.ts",
  "app/api/easydnc/certificate/route.ts",
  "app/api/crm/contacts/scrub-dnc/route.ts",
  "app/easydnc/page.tsx",
  "components/easydnc/easydnc-checker.tsx",
  "components/crm/dnc-status-badge.tsx",
  "components/crm/dnc-dial-guard-modal.tsx",
  "lib/easydnc.ts",
];

for (const rel of requiredFiles) {
  const full = resolve(root, rel);
  assert(existsSync(full), `File exists: ${rel}`);
}

// 2. Test Normalization Logic
const { normalizePhoneNumber, calculateEasyDncCost, sanitizeCsvCell } = await import("../lib/easydnc.ts");

assert(normalizePhoneNumber("(800) 555-0199") === "8005550199", "Normalizes (800) 555-0199 to 8005550199");
assert(normalizePhoneNumber("1-800-555-0199") === "8005550199", "Strips leading 1 from 11-digit number");
assert(normalizePhoneNumber("555.234.5678") === "5552345678", "Strips dots from 555.234.5678");

let errorCaught = false;
try {
  normalizePhoneNumber("012-345-6789"); // Area code cannot start with 0
} catch {
  errorCaught = true;
}
assert(errorCaught, "Rejects area code starting with 0");

// 3. Test Formula Injection Sanitization
assert(sanitizeCsvCell("=CMD|' /C calc'!A0") === "\"'=CMD|' /C calc'!A0\"", "Defuses = formula prefix");
assert(sanitizeCsvCell("+12345") === "\">'+12345\"", "Defuses + formula prefix");
assert(sanitizeCsvCell("-500") === "\"'-500\"", "Defuses - formula prefix");
assert(sanitizeCsvCell("@SUM(A1:A10)") === "\"'@SUM(A1:A10)\"", "Defuses @ formula prefix");
assert(sanitizeCsvCell("Clean String") === "\"Clean String\"", "Leaves benign strings unaltered");

// 4. Test 25% Platform Cut Arithmetic
const cost100 = calculateEasyDncCost(100);
assert(cost100.grossCoins === 250, "100 checks = 250 Vibe Coins ($2.50 USD)");
assert(cost100.cutCoins === 62.5, "25% Platform cut on 250 coins = 62.5 coins ($0.625 USD)");
assert(cost100.providerCoins === 187.5, "75% Provider share on 250 coins = 187.5 coins ($1.875 USD)");
assert(cost100.cutCoins + cost100.providerCoins === cost100.grossCoins, "Cut + provider share exactly equals gross");

// 5. Verify Legal Copy in Terms of Use (app/terms/page.tsx)
const termsContent = readFileSync(resolve(root, "app/terms/page.tsx"), "utf-8");
assert(termsContent.includes("9A. Telephony Scrubbing, EasyDNC API"), "Terms contains Section 9A heading");
assert(termsContent.includes("25% platform cut"), "Terms states 25% platform cut");
assert(termsContent.includes("NOT LIABLE"), "Terms contains strict caller no-liability disclaimer");
assert(termsContent.includes("sole and absolute discretion"), "Terms contains discretionary evidence clause");
assert(termsContent.includes("31 days"), "Terms quotes FTC 31-day safe harbor rule");
assert(termsContent.includes("weekly"), "Terms recommends weekly scrubbing");
assert(termsContent.includes("51,744"), "Terms quotes FTC TSR $51,744 per call civil fine");
assert(termsContent.includes("500") && termsContent.includes("1,500"), "Terms quotes TCPA $500–$1,500 statutory damages");
assert(termsContent.includes("Outscraper"), "Terms contains Outscraper/scraping lead compliance guidance");

// 6. Verify Legal Copy in Privacy Policy (app/privacy/page.tsx)
const privacyContent = readFileSync(resolve(root, "app/privacy/page.tsx"), "utf-8");
assert(privacyContent.includes("Telephony scrubbing and EasyDNC records"), "Privacy policy Section 2 covers DNC records");
assert(privacyContent.includes("EasyDNC (easydnc.org)"), "Privacy policy Section 5 lists EasyDNC subprocessor");
assert(privacyContent.includes("SHA-256"), "Privacy policy details salted SHA-256 phone hash protection");

// 7. Verify Master Guide (EASYDNC_MASTER_IMPLEMENTATION_GUIDE.md)
const guideContent = readFileSync(resolve(root, "public/swarm/remastery/EASYDNC_MASTER_IMPLEMENTATION_GUIDE.md"), "utf-8");
assert(guideContent.includes("4WEIRD EASYDNC REMASTERY"), "Guide contains master remastery title");
assert(guideContent.includes("CRM & OUTSCRAPER.COM DATA INTEGRATION ARCHITECTURE"), "Guide contains Outscraper/CRM section");
assert(guideContent.includes("process_easydnc_batch_payment"), "Guide contains SQL migration RPC definition");

if (failures > 0) {
  console.error(`\n💥 VERIFICATION FAILED: ${failures} assertions failed.`);
  process.exit(1);
} else {
  console.log("\n🎉 ALL 24 VERIFICATION CHECKS PASSED!");
  process.exit(0);
}
