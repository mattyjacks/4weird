import { readFileSync, existsSync } from "node:fs";

const checks = {
  "lib/shadow-it.ts": ["SHADOW_IT_RISKS"],
  "lib/it-command.ts": ["IT_ROLES", "MONITORING_NOTICE"],
  "lib/approved-apps.ts": ["APPROVED_APPS"],
  "lib/it-audit.ts": ["AUDIT"],
  "lib/it-policy.ts": ["POLICY_TEMPLATES", "BLOCKED_CATEGORIES"],
  "lib/it-alerts.ts": ["SUSPICIOUS_SIGNALS", "ALERT"],
  "app/api/it/apps/route.ts": ["GET", "APPROVED_APPS"],
  "app/api/it/requests/route.ts": ["GET", "POST"],
  "app/api/it/audit/route.ts": ["GET"],
  "app/api/it/reports/route.ts": ["GET"],
  "app/api/it/policies/route.ts": ["GET"],
  "app/boss/page.tsx": ["Shadow", "SHADOW_IT"],
  "app/it/page.tsx": ["APPROVED_APPS", "POLICY"],
  "app/work/page.tsx": ["MONITORING_NOTICE", "vault"],
  "app/docs/shadow-it/page.tsx": ["SHADOW_IT_RISKS", "Shadow IT"],
};

let failed = 0;
for (const [file, tokens] of Object.entries(checks)) {
  if (!existsSync(file)) {
    console.log(`FAIL ${file} missing file`);
    failed++;
    continue;
  }
  const src = readFileSync(file, "utf8");
  const hit = tokens.find((t) => src.includes(t));
  if (!hit) {
    console.log(`FAIL ${file} missing one of: ${tokens.join(", ")}`);
    failed++;
    continue;
  }
  console.log(`PASS ${file} (${hit})`);
}

if (failed > 0) {
  console.log(`verify-it-command: ${failed} file(s) failed`);
  process.exit(1);
}
console.log("verify-it-command: all IT Command files present");
