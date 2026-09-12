import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const STATUSES = ["draft", "sent", "paid", "void"] as const;

// Allowed forward transitions. Paid and void are terminal.
const NEXT: Record<string, string[]> = {
  draft: ["sent", "void"],
  sent: ["paid", "void"],
  paid: [],
  void: [],
};

const INVOICE_COLS =
  "id,org_id,owner_id,company_id,contact_id,number,status,subtotal_coins,tax_coins,total_coins,due_date,notes,created_at,updated_at";
const ITEM_COLS = "id,org_id,owner_id,invoice_id,label,qty,unit_coins,line_coins,created_at";

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

function toCoins(v: unknown): number {
  const n = Math.floor(Number(v ?? 0));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, Number.MAX_SAFE_INTEGER) : NaN;
}

function toQty(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 1_000_000) : NaN;
}

function clean(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

function autoNumber(): string {
  const d = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `INV-${d}-${rand}`;
}

// GET /api/crm/invoices?org_id=<uuid> -> { invoices: [{ ...cols, items: [] }] }
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const orgId = isUuid(new URL(req.url).searchParams.get("org_id"));
  let q = supabase
    .from("crm_invoices")
    .select(INVOICE_COLS)
    .order("created_at", { ascending: false })
    .limit(100);
  if (orgId) q = q.eq("org_id", orgId);
  const { data: invoices, error } = await q;
  if (error) return dbFail("GET /api/crm/invoices", error, "Unable to load invoices.");
  const rows = invoices ?? [];
  const ids = rows.map((r) => String(r.id));
  let items: Record<string, unknown>[] = [];
  if (ids.length) {
    const { data: itemRows, error: itemError } = await supabase
      .from("crm_invoice_items")
      .select(ITEM_COLS)
      .in("invoice_id", ids)
      .limit(1000);
    if (itemError) return dbFail("GET /api/crm/invoices items", itemError, "Unable to load invoice items.");
    items = (itemRows ?? []) as Record<string, unknown>[];
  }
  const byInvoice = new Map<string, Record<string, unknown>[]>();
  for (const it of items) {
    const key = String(it.invoice_id);
    const list = byInvoice.get(key) ?? [];
    list.push(it);
    byInvoice.set(key, list);
  }
  return ok({
    invoices: rows.map((r) => ({ ...r, items: byInvoice.get(String(r.id)) ?? [] })),
  });
}

// POST /api/crm/invoices -> { invoice, items } (201)
// Body: { org_id, company_id?, contact_id?, company_name?, contact_name?,
//   number?, items: [{ label, qty, unit_coins }], tax_coins?, due_date?, notes? }
// Free-text company_name/contact_name create the linked rows when no id is given.
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`crm-invoice-create:${u.id}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const orgId = isUuid(input.org_id);
  if (!orgId) return fail("org_id is required.", 400);

  let companyId = isUuid(input.company_id) || null;
  let contactId = isUuid(input.contact_id) || null;
  const companyName = clean(input.company_name, 120);
  const contactName = clean(input.contact_name, 120);
  if (!companyId && companyName) {
    const { data: company, error } = await supabase
      .from("crm_companies")
      .insert({ org_id: orgId, owner_id: u.id, name: companyName })
      .select("id")
      .single();
    if (error) return dbFail("POST /api/crm/invoices company", error, "Unable to create company.");
    companyId = String(company.id);
  }
  if (!contactId && contactName) {
    const { data: contact, error } = await supabase
      .from("crm_contacts")
      .insert({ org_id: orgId, owner_id: u.id, company_id: companyId, full_name: contactName })
      .select("id")
      .single();
    if (error) return dbFail("POST /api/crm/invoices contact", error, "Unable to create contact.");
    contactId = String(contact.id);
  }

  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (!rawItems.length || rawItems.length > 50) return fail("items must hold 1-50 line items.", 400);
  const items = [] as { label: string; qty: number; unit_coins: number; line_coins: number }[];
  for (const raw of rawItems) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const label = clean(r.label, 200);
    const qty = toQty(r.qty);
    const unit = toCoins(r.unit_coins);
    if (!label) return fail("Every line item needs a label.", 400);
    if (Number.isNaN(qty)) return fail("qty must be a non-negative number.", 400);
    if (Number.isNaN(unit)) return fail("unit_coins must be a non-negative integer.", 400);
    items.push({ label, qty, unit_coins: unit, line_coins: Math.floor(qty * unit) });
  }
  const taxCoins = input.tax_coins == null ? 0 : toCoins(input.tax_coins);
  if (Number.isNaN(taxCoins)) return fail("tax_coins must be a non-negative integer.", 400);
  const dueDate = clean(input.due_date, 10) || null;
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return fail("due_date must be YYYY-MM-DD.", 400);
  }
  const number = clean(input.number, 60) || autoNumber();
  const notes = clean(input.notes, 2000) || null;
  const subtotal = items.reduce((n, it) => n + it.line_coins, 0);

  const { data: invoice, error } = await supabase
    .from("crm_invoices")
    .insert({
      org_id: orgId, owner_id: u.id, company_id: companyId, contact_id: contactId,
      number, status: "draft", subtotal_coins: subtotal, tax_coins: taxCoins,
      total_coins: subtotal + taxCoins, due_date: dueDate, notes,
    })
    .select(INVOICE_COLS)
    .single();
  if (error) return dbFail("POST /api/crm/invoices", error, "Unable to create invoice.");
  const { data: savedItems, error: itemsError } = await supabase
    .from("crm_invoice_items")
    .insert(
      items.map((it) => ({
        org_id: orgId, owner_id: u.id, invoice_id: invoice.id,
        label: it.label, qty: it.qty, unit_coins: it.unit_coins, line_coins: it.line_coins,
      })),
    )
    .select(ITEM_COLS);
  if (itemsError) return dbFail("POST /api/crm/invoices items", itemsError, "Invoice saved but items failed.");
  return ok({ invoice, items: savedItems ?? [] }, 201);
}

// PATCH /api/crm/invoices?id=<uuid> (or body { id, status })
// Moves draft -> sent -> paid, or voids draft/sent. Paid and void are terminal.
export async function PATCH(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`crm-invoice-patch:${u.id}`, 60, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const id = isUuid(new URL(req.url).searchParams.get("id")) || isUuid(input.id);
  const status = clean(input.status, 10);
  if (!id) return fail("Invoice id is required.", 400);
  if (!(STATUSES as readonly string[]).includes(status)) {
    return fail("Invalid status (draft, sent, paid, void).", 400);
  }
  const { data: current, error: loadError } = await supabase
    .from("crm_invoices")
    .select("id,status")
    .eq("id", id)
    .single();
  if (loadError) return dbFail("PATCH /api/crm/invoices load", loadError, "Invoice not found.");
  const from = String((current as { status: string }).status);
  if (from !== status && !NEXT[from]?.includes(status)) {
    return fail(`Cannot move invoice from ${from} to ${status}.`, 400);
  }
  const { data: invoice, error } = await supabase
    .from("crm_invoices")
    .update({ status })
    .eq("id", id)
    .select(INVOICE_COLS)
    .single();
  if (error) return dbFail("PATCH /api/crm/invoices", error, "Unable to update invoice.");
  return ok({ invoice });
}
