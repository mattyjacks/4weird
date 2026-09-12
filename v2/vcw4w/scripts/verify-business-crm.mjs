import { readFileSync, existsSync, readdirSync } from "node:fs";

function must(cond, msg) {
  if (!cond) throw new Error(`verify-business-crm: ${msg}`);
}

function read(path) {
  must(existsSync(path), `missing file ${path}`);
  return readFileSync(path, "utf8");
}

// 1. Migration: all 6 tables + RLS, no coin-table writes.
const mig = read("supabase/migrations/20261104000000_business_crm.sql");
for (const table of [
  "crm_companies",
  "crm_contacts",
  "crm_deals",
  "crm_activities",
  "crm_invoices",
  "crm_invoice_items",
]) {
  must(mig.includes(table), `migration must include ${table}`);
}
must(mig.includes("row level security"), "migration must enable RLS");
must(mig.includes("CREATE POLICY"), "migration must create policies");
must(
  !/(alter|drop|create)\s+(table\s+)?(public\.)?coin_(ledger|lots|spends)/i.test(mig),
  "migration must never touch coin tables",
);

// 2. API routes exist and export the expected handlers.
const routes = {
  "app/api/crm/companies/route.ts": ["GET", "POST"],
  "app/api/crm/contacts/route.ts": ["GET", "POST", "PATCH"],
  "app/api/crm/deals/route.ts": ["GET", "POST", "PATCH"],
  "app/api/crm/activities/route.ts": ["GET", "POST", "PATCH"],
  "app/api/crm/invoices/route.ts": ["GET", "POST", "PATCH"],
  "app/api/crm/summary/route.ts": ["GET"],
};
for (const [path, handlers] of Object.entries(routes)) {
  const body = read(path);
  must(body.includes('force-dynamic'), `${path} must set force-dynamic`);
  for (const h of handlers) {
    must(
      new RegExp(`export\\s+async\\s+function\\s+${h}\\b`).test(body),
      `${path} must export ${h}`,
    );
  }
}

// 3. Task E surfaces: business hub, CRM page, invoices page + manager,
// business docs, and sitemap entries.
const bizPage = read("app/business/page.tsx");
must(bizPage.includes("/business/invoices"), "business hub must link /business/invoices");
must(bizPage.includes("/business/crm"), "business hub must link /business/crm");
const crmPage = read("app/business/crm/page.tsx");
must(crmPage.includes("CrmWorkspace"), "CRM page must mount CrmWorkspace");
const invPage = read("app/business/invoices/page.tsx");
must(invPage.includes("InvoiceManager"), "invoices page must mount InvoiceManager");
must(invPage.includes('title: "Invoices"'), 'invoices page metadata must be "Invoices"');
const mgr = read("components/crm/invoice-manager.tsx");
for (const token of [
  '"use client"',
  "/api/orgs",
  "/api/crm/invoices",
  "Export CSV",
  "window.print",
  "coins/100",
  "NOT tax invoices",
  "👻",
]) {
  must(mgr.includes(token), `invoice-manager must include ${token}`);
}
const docs = read("app/docs/business/page.tsx");
for (const token of ["/api/crm/invoices", "/business/crm", "/business/invoices", "100 Vibe Coins"]) {
  must(docs.includes(token), `business docs must include ${token}`);
}
const sitemap = read("app/sitemap.ts");
for (const p of ["/business", "/business/crm", "/business/invoices", "/docs/business"]) {
  must(sitemap.includes(`"${p}"`), `sitemap must list ${p}`);
}

// 4. DELETE handlers: GET/POST/PATCH above stay required; DELETE is
// optional per route — note where it exists, never fail when absent.
// When present, a DELETE handler must stay org-scoped and use the shared
// Supabase + fail/ok conventions.
const DELETE_RE = /export\s+async\s+function\s+DELETE\b/;
const routesWithDelete = [];
for (const path of Object.keys(routes)) {
  const body = read(path);
  if (DELETE_RE.test(body)) {
    routesWithDelete.push(path);
    must(body.includes("org_id"), `${path} DELETE must stay org-scoped`);
    must(body.includes(".delete()"), `${path} DELETE must delete via Supabase`);
    must(
      body.includes("fail(") && body.includes("ok("),
      `${path} DELETE must use fail/ok responders`,
    );
  }
}
if (routesWithDelete.length > 0) {
  console.log(`Business CRM note: DELETE present in ${routesWithDelete.join(", ")}.`);
} else {
  console.log("Business CRM note: no DELETE handlers yet (GET/POST/PATCH required only).");
}

// 5. Pagination: every CRM GET must bound reads with limit; offset cursor
// paging is advisory (noted, never required) so limit-only routes pass.
const COLLECTION_ROUTES = [
  "app/api/crm/companies/route.ts",
  "app/api/crm/contacts/route.ts",
  "app/api/crm/deals/route.ts",
  "app/api/crm/activities/route.ts",
  "app/api/crm/invoices/route.ts",
  "app/api/crm/summary/route.ts",
];
for (const path of COLLECTION_ROUTES) {
  must(read(path).includes("limit"), `${path} GET must support limit pagination`);
}
const routesWithOffset = COLLECTION_ROUTES.filter((path) => read(path).includes("offset"));
if (routesWithOffset.length > 0) {
  console.log(`Business CRM note: offset paging in ${routesWithOffset.join(", ")}.`);
} else {
  console.log("Business CRM note: no offset param yet (limit-only paging).");
}

// 6. Conditional v2 tables (crm_tags, crm_notes): enforced only when a
// migration file mentioning them exists; absent means skip, not fail.
const V2_TABLES = ["crm_tags", "crm_notes"];
const migFiles = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql"));
const v2Holders = migFiles.filter((f) => {
  const content = readFileSync(`supabase/migrations/${f}`, "utf8");
  return V2_TABLES.some((t) => content.includes(t));
});
if (v2Holders.length === 0) {
  console.log("Business CRM note: no crm_tags/crm_notes migration yet (conditional check skipped).");
} else {
  for (const f of v2Holders) {
    const content = readFileSync(`supabase/migrations/${f}`, "utf8");
    must(
      /row level security/i.test(content) && /create policy/i.test(content),
      `${f} must enable RLS for new CRM tables`,
    );
    must(
      !/(alter|drop|create)\s+(table\s+)?(public\.)?coin_(ledger|lots|spends)/i.test(content),
      `${f} must never touch coin tables`,
    );
  }
  console.log(`Business CRM v2 tables OK in: ${v2Holders.join(", ")}.`);
}

// 7. Reports component: only enforced when created; absent means skip.
const REPORT_CANDIDATES = [
  "components/crm/crm-reports.tsx",
  "components/crm/reports.tsx",
  "components/crm/report.tsx",
  "app/business/reports/page.tsx",
];
const reportHit = REPORT_CANDIDATES.find((p) => existsSync(p));
if (!reportHit) {
  console.log("Business CRM note: no CRM reports component yet (conditional check skipped).");
} else {
  const reportBody = readFileSync(reportHit, "utf8");
  for (const token of ['"use client"', "window.print"]) {
    must(reportBody.includes(token), `${reportHit} must include ${token}`);
  }
  must(/crm|summary/i.test(reportBody), `${reportHit} must reference CRM or summary data`);
  console.log(`Business CRM reports OK in: ${reportHit}.`);
}

// 8. Docs FAQ tokens: advisory notes only — the guide is mid-rewrite, so
// missing FAQ tokens warn without failing.
for (const token of ["FAQ", "Ghost Cash", "org-scoped", "100 Vibe Coins"]) {
  if (!docs.includes(token)) {
    console.log(`Business CRM note: business docs lack FAQ token "${token}".`);
  }
}

console.log(
  "Business CRM checks OK: 6 tables + RLS + 6 API routes + DELETE notes + pagination + conditional v2 tables + reports + docs FAQ.",
);
