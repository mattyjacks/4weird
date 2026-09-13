import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Compliance: invoices here are org memoranda for internal coin accounting
// only (100 coins = $1.00). They are NOT tax invoices, VAT/GST invoices,
// payroll records, or receipts. Marking one paid moves no coins by itself;
// settlement happens only in the guarded checkout and ledger flows. Ghost
// Cash has no cash value and can never settle an invoice. This route never
// touches coin tables.

const STATUSES = ["draft", "sent", "paid", "void"] as const;

// Allowed forward transitions. Paid and void are terminal.
const NEXT: Record<string, string[]> = {
  draft: ["sent", "void"],
  sent: ["paid", "void"],
  paid: [],
  void: [],
};

const INVOICE_COLS =
  "id,org_id,owner_id,company_id,contact_id,number,status,subtotal_coins,discount_coins,tax_coins,total_coins,due_date,notes,payment_ref,paid_at,created_at,updated_at";
const ITEM_COLS = "id,org_id,owner_id,invoice_id,label,qty,unit_coins,line_coins,created_at";

const SORTABLE = ["created_at", "updated_at", "number", "status", "total_coins", "due_date"] as const;
type SortKey = (typeof SORTABLE)[number];

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

// GET /api/crm/invoices?org_id=<uuid>&status=<status>&company_id=<uuid>
//   &overdue=1&q=<text>&limit=<1..100>&offset=<0..10000>&sort=<field>&order=<asc|desc>
// -> { invoices: [{ ...cols, items: [] }], total, limit, offset, sort, order }
// overdue=1 keeps only invoices whose due_date is past and that are neither
// paid nor void.
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const params = new URL(req.url).searchParams;
  const orgRaw = String(params.get("org_id") ?? "").trim();
  if (!orgRaw) return fail("org_id is required.", 400);
  const orgId = isUuid(orgRaw);
  if (!orgId) return fail("Invalid org_id. Expected a UUID.", 400);
  // Membership gate before revealing org invoices (RLS re-checks below).
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();
  if (!membership) return fail("Not a member of this org.", 403);
  const statusRaw = String(params.get("status") ?? "").trim();
  if (statusRaw && !(STATUSES as readonly string[]).includes(statusRaw)) {
    return fail(`Invalid status. Expected one of: ${STATUSES.join(", ")}.`, 400);
  }
  const rawQ = clean(params.get("q"), 120);
  const companyRaw = clean(params.get("company_id"), 36);
  if (companyRaw && !isUuid(companyRaw)) return fail("Invalid company_id. Expected a UUID.", 400);
  const overdueOnly = ["1", "true", "yes"].includes(clean(params.get("overdue"), 5).toLowerCase());
  const limitRaw = Number(params.get("limit") ?? 50);
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 50;
  const offsetRaw = Number(params.get("offset") ?? 0);
  const offset = Number.isFinite(offsetRaw)
    ? Math.min(10000, Math.max(0, Math.floor(offsetRaw)))
    : 0;
  const sortRaw = clean(params.get("sort"), 32);
  if (sortRaw && !(SORTABLE as readonly string[]).includes(sortRaw)) {
    return fail(`Invalid sort. Expected one of: ${SORTABLE.join(", ")}.`, 400);
  }
  const sort: SortKey = sortRaw ? (sortRaw as SortKey) : "created_at";
  const orderRaw = clean(params.get("order"), 8).toLowerCase();
  if (orderRaw && orderRaw !== "asc" && orderRaw !== "desc") {
    return fail("Invalid order. Expected asc or desc.", 400);
  }
  const ascending = orderRaw === "asc";
  // Strip PostgREST `or=` separators (commas, parens), quotes, backslashes,
  // and LIKE wildcards (% _ *) so free text can't break the filter.
  const needle = rawQ.replace(/[%_*,()"'`\\]/g, "").trim().slice(0, 120);
  let q = supabase
    .from("crm_invoices")
    .select(INVOICE_COLS, { count: "exact" })
    .order(sort, { ascending })
    .range(offset, offset + limit - 1);
  q = q.eq("org_id", orgId);
  if (statusRaw) q = q.eq("status", statusRaw);
  if (companyRaw) q = q.eq("company_id", companyRaw);
  if (overdueOnly) {
    const today = new Date().toISOString().slice(0, 10);
    q = q.lt("due_date", today).neq("status", "paid").neq("status", "void");
  }
  if (needle) q = q.or(`number.ilike.%${needle}%,notes.ilike.%${needle}%`);
  const { data: invoices, error, count } = await q;
  if (error) return dbFail("GET /api/crm/invoices", error, "Unable to load invoices.");
  const rows = invoices ?? [];
  const ids = rows.map((r) => String(r.id));
  let items: Record<string, unknown>[] = [];
  if (ids.length) {
    const { data: itemRows, error: itemError } = await supabase
      .from("crm_invoice_items")
      .select(ITEM_COLS)
      .eq("org_id", orgId)
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
    total: count ?? rows.length,
    limit,
    offset,
    sort,
    order: ascending ? "asc" : "desc",
  });
}

// POST /api/crm/invoices -> { invoice, items } (201)
// Body: { org_id, company_id?, contact_id?, company_name?, contact_name?,
//   number?, items (alias: lines): [{ label, qty, unit_coins }],
//   discount_coins?, tax_rate? (0-100 %, wins over tax_coins), tax_coins?,
//   due_date (alias: due_at)?, notes?, payment_ref? }
// Free-text company_name/contact_name create the linked rows when no id is given.
// Totals: total = subtotal - discount + tax.
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
  const orgRaw = clean(input.org_id, 36);
  if (!orgRaw) return fail("org_id is required.", 400);
  const orgId = isUuid(orgRaw);
  if (!orgId) return fail("Invalid org_id. Expected a UUID.", 400);
  // Membership gate before creating anything under this org (RLS re-checks below).
  const { data: postMembership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();
  if (!postMembership) return fail("Not a member of this org.", 403);

  const companyRaw = clean(input.company_id, 36);
  if (companyRaw && !isUuid(companyRaw)) return fail("Invalid company_id. Expected a UUID.", 400);
  const contactRaw = clean(input.contact_id, 36);
  if (contactRaw && !isUuid(contactRaw)) return fail("Invalid contact_id. Expected a UUID.", 400);
  let companyId = isUuid(companyRaw) || null;
  let contactId = isUuid(contactRaw) || null;
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

  // Accept `lines` alias from the invoice manager form.
  const rawItems = Array.isArray(input.items) ? input.items
    : Array.isArray(input.lines) ? input.lines
    : [];
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
  const subtotal = items.reduce((n, it) => n + it.line_coins, 0);
  const discount = input.discount_coins == null ? 0 : toCoins(input.discount_coins);
  if (Number.isNaN(discount)) return fail("discount_coins must be a non-negative integer.", 400);
  if (discount > subtotal) return fail("discount_coins cannot exceed the subtotal.", 400);
  const taxable = subtotal - discount;
  let taxCoins: number;
  const rateGiven = input.tax_rate != null && String(input.tax_rate).trim() !== "";
  if (rateGiven) {
    const rate = Number(input.tax_rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return fail("tax_rate must be a number between 0 and 100.", 400);
    }
    taxCoins = Math.floor((taxable * rate) / 100);
  } else {
    taxCoins = input.tax_coins == null ? 0 : toCoins(input.tax_coins);
    if (Number.isNaN(taxCoins)) return fail("tax_coins must be a non-negative integer.", 400);
  }
  // Accept `due_at` alias from the invoice manager form.
  const dueDate = clean(input.due_date ?? input.due_at, 10) || null;
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return fail("due_date must be YYYY-MM-DD.", 400);
  }
  const number = clean(input.number, 60) || autoNumber();
  // Sequential-number uniqueness per org: reject a client-supplied number
  // that is already used in this org (auto-assigned numbers stay unique by
  // construction, so only explicit duplicates are checked here).
  if (clean(input.number, 60)) {
    const { data: clash, error: clashError } = await supabase
      .from("crm_invoices")
      .select("id")
      .eq("org_id", orgId)
      .eq("number", number)
      .limit(1);
    if (clashError) return dbFail("POST /api/crm/invoices number-check", clashError, "Unable to create invoice.");
    if ((clash ?? []).length) {
      return fail("Invoice number already used in this org — pick a unique sequential number.", 409);
    }
  }
  // Payment reference: accepted as payment_ref / payment_reference, stored on
  // the payment_ref column and mirrored into notes as [ref: ...] so it stays
  // visible on installs where the v2 column has not landed yet.
  const paymentRef = clean(input.payment_ref ?? input.payment_reference, 120);
  const rawNotes = clean(input.notes, 2000);
  const notes = paymentRef
    ? `${rawNotes ? `${rawNotes} ` : ""}[ref: ${paymentRef}]`.slice(0, 2000)
    : rawNotes || null;

  const { data: invoice, error } = await supabase
    .from("crm_invoices")
    .insert({
      org_id: orgId, owner_id: u.id, company_id: companyId, contact_id: contactId,
      number, status: "draft", subtotal_coins: subtotal, discount_coins: discount,
      tax_coins: taxCoins, total_coins: taxable + taxCoins,
      due_date: dueDate, notes, payment_ref: paymentRef || null,
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

// PATCH /api/crm/invoices?id=<uuid>&org_id=<uuid> (or body { id, org_id, status?, notes?, payment_ref? })
// Moves draft -> sent -> paid, or voids draft/sent. Paid and void are terminal.
// notes/payment_ref update the payment-tracking fields without moving status;
// moving to paid stamps paid_at. org_id is required: the caller must be an
// org member and every read + write is scoped to (id, org_id), so one org
// can never flip another org's invoice.
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
  const params = new URL(req.url).searchParams;
  const idRaw = String(params.get("id") ?? input.id ?? "").trim();
  if (!idRaw) return fail("Invoice id is required.", 400);
  const id = isUuid(idRaw);
  if (!id) return fail("Invalid invoice id. Expected a UUID.", 400);
  const status = input.status == null ? "" : clean(input.status, 10);
  const hasNotes = input.notes !== undefined;
  const hasPaymentRef = input.payment_ref !== undefined;
  if (!status && !hasNotes && !hasPaymentRef) {
    return fail("Nothing to update (status, notes, payment_ref).", 400);
  }
  if (status && !(STATUSES as readonly string[]).includes(status)) {
    return fail(`Invalid status. Expected one of: ${STATUSES.join(", ")}.`, 400);
  }
  const orgRaw = String(params.get("org_id") ?? input.org_id ?? "").trim();
  if (!orgRaw) return fail("org_id is required.", 400);
  const orgId = isUuid(orgRaw);
  if (!orgId) return fail("Invalid org_id. Expected a UUID.", 400);
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();
  if (!membership) return fail("Not a member of this org.", 403);
  const { data: current, error: loadError } = await supabase
    .from("crm_invoices")
    .select("id,status")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();
  if (loadError) return dbFail("PATCH /api/crm/invoices load", loadError, "Invoice not found.");
  const from = String((current as { status: string }).status);
  if (status) {
    if (from !== status && !NEXT[from]?.includes(status)) {
      return fail(`Cannot move invoice from ${from} to ${status}.`, 400);
    }
  }
  const update: Record<string, unknown> = {};
  if (status) update.status = status;
  if (status === "paid" && from !== "paid") update.paid_at = new Date().toISOString();
  if (hasNotes) update.notes = clean(input.notes, 2000) || null;
  if (hasPaymentRef) update.payment_ref = clean(input.payment_ref, 120) || null;
  const { data: invoice, error } = await supabase
    .from("crm_invoices")
    .update(update)
    .eq("id", id)
    .eq("org_id", orgId)
    .select(INVOICE_COLS)
    .single();
  if (error) return dbFail("PATCH /api/crm/invoices", error, "Unable to update invoice.");
  return ok({ invoice });
}

// DELETE /api/crm/invoices
// Body (or query): { id, org_id }. Both must be UUIDs; caller must be an
// org member; the delete is scoped to (id, org_id). Line items cascade.
export async function DELETE(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`crm-invoice-delete:${u.id}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const params = new URL(req.url).searchParams;
  const idRaw = String(params.get("id") ?? input.id ?? "").trim();
  const orgRaw = String(params.get("org_id") ?? input.org_id ?? "").trim();
  if (!idRaw) return fail("Invoice id is required.", 400);
  if (!orgRaw) return fail("org_id is required.", 400);
  const id = isUuid(idRaw);
  const orgId = isUuid(orgRaw);
  if (!id) return fail("Invalid invoice id. Expected a UUID.", 400);
  if (!orgId) return fail("Invalid org_id. Expected a UUID.", 400);
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();
  if (!membership) return fail("Not a member of this org.", 403);
  const { data: row, error } = await supabase
    .from("crm_invoices")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId)
    .select("id")
    .maybeSingle();
  if (error) return dbFail("DELETE /api/crm/invoices", error, "Unable to delete invoice.");
  if (!row) return fail("Invoice not found.", 404);
  return ok({ deleted: true, id });
}
