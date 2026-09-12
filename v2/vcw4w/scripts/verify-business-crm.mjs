import { readFileSync, existsSync } from "node:fs";

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
  "app/api/crm/contacts/route.ts": ["GET", "POST"],
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

console.log("Business CRM checks OK: 6 tables + RLS + 6 API routes.");
