"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Org = { id: string; slug: string; name: string };
type Company = { id: string; name: string };
type Contact = { id: string; full_name: string; company_id?: string | null };
type DraftLine = { label: string; qty: string; unit_coins: string };
type InvoiceItem = { id?: string; label: string; qty: number; unit_coins: number; line_coins?: number };
type Invoice = {
  id: string;
  org_id: string;
  number: string;
  status: string;
  company_id?: string | null;
  contact_id?: string | null;
  subtotal_coins: number;
  discount_coins?: number;
  tax_coins: number;
  total_coins: number;
  due_date?: string | null;
  notes?: string | null;
  payment_ref?: string | null;
  paid_at?: string | null;
  payment_reference?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: InvoiceItem[];
};

function paymentRefOf(inv: Invoice): string {
  const direct = String(inv.payment_reference ?? "").trim();
  if (direct) return direct;
  const notes = String(inv.notes ?? "");
  const bracket = /\[ref:\s*([^\]]+)\]/i.exec(notes);
  if (bracket?.[1]?.trim()) return bracket[1].trim();
  const prefix = /^\s*Ref:\s*(.+?)(?:\s+·\s+|\s*$)/i.exec(notes);
  return (prefix?.[1] ?? "").trim();
}

function paidAtOf(inv: Invoice): string {
  return String(inv.paid_at ?? inv.updated_at ?? "");
}

const STATUSES = ["draft", "sent", "paid", "void"] as const;

// Forward-only transitions; paid and void are terminal.
const NEXT: Record<string, string[]> = {
  draft: ["sent", "void"],
  sent: ["paid", "void"],
  paid: [],
  void: [],
};

const BADGE: Record<string, string> = {
  draft: "border-slate-400/40 bg-slate-400/10 text-slate-200",
  sent: "border-cyan-300/40 bg-cyan-300/10 text-cyan-200",
  paid: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  void: "border-rose-400/40 bg-rose-400/10 text-rose-200",
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: unknown } & T;
  if (!res.ok || body.success === false) {
    throw new Error(String(body.error ?? `Request failed (${res.status})`));
  }
  return body as T;
}

function listOf<T>(body: Record<string, unknown>, keys: string[]): T[] {
  for (const k of keys) {
    const v = body[k];
    if (Array.isArray(v)) return v as T[];
  }
  return [];
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(inv: Invoice): boolean {
  return Boolean(inv.due_date) && inv.due_date! < todayStr() && inv.status !== "paid" && inv.status !== "void";
}

function coins(n: number): string {
  return `${Number(n ?? 0).toLocaleString()} 🪙`;
}

function usd(n: number): string {
  // USD equiv: coins/100 (100 🪙 = exactly $1.00).
  return `$${(Number(n ?? 0) / 100).toFixed(2)}`;
}

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

const inputCls =
  "min-w-0 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none";
const cardCls = "rounded-2xl border border-white/10 bg-white/[.04] p-5";
const btnCls =
  "min-h-[44px] rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none";
const ghostBtnCls =
  "min-h-[44px] rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none";

/**
 * InvoiceManager: org-scoped coin memoranda. Lists invoices with status
 * badges and coin + USD totals, creates invoices from companies/contacts
 * (select or free text) plus line items, advances draft -> sent -> paid
 * (or voids), and exports client-side CSV / print. Defensive when the
 * /api/crm routes are still deploying: every fetch failure surfaces as an
 * empty state with the reason, never a crash.
 */
export function InvoiceManager() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [apiDown, setApiDown] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [printId, setPrintId] = useState<string | null>(null);

  // Create-form state.
  const [companyId, setCompanyId] = useState("");
  const [companyFree, setCompanyFree] = useState("");
  const [contactId, setContactId] = useState("");
  const [contactFree, setContactFree] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ label: "", qty: "1", unit_coins: "0" }]);
  const [discount, setDiscount] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [invNotes, setInvNotes] = useState("");
  const [payRef, setPayRef] = useState("");
  const [invNumber, setInvNumber] = useState("");
  const activeOrg = orgs.find((o) => o.id === orgId);
  const duplicateNumber =
    invNumber.trim() !== "" &&
    invoices.some((i) => (i.number ?? "").toLowerCase() === invNumber.trim().toLowerCase());

  const loadOrgs = useCallback(async () => {
    try {
      const r = await request<{ orgs: Org[] }>("/api/orgs");
      const list = r.orgs ?? [];
      setOrgs(list);
      if (list.length === 1) setOrgId(list[0].id);
      if (!list.length) setNotice("No orgs yet — create one in /squads first.");
    } catch (e) {
      setOrgs([]);
      setNotice(e instanceof Error ? e.message : "Unable to load orgs.");
    }
  }, []);

  useEffect(() => {
    void loadOrgs();
  }, [loadOrgs]);

  const loadAll = useCallback(async (org: string, opts?: { status?: string; overdue?: boolean }) => {
    if (!org) return;
    setBusy(true);
    setApiDown("");
    const params = new URLSearchParams({ org_id: org });
    if (opts?.status && opts.status !== "all") params.set("status", opts.status);
    if (opts?.overdue) params.set("overdue", "1");
    const q = `?${params.toString()}`;
    const [iv, co, ct] = await Promise.allSettled([
      request<Record<string, unknown>>(`/api/crm/invoices${q}`),
      request<Record<string, unknown>>(`/api/crm/companies${q}`),
      request<Record<string, unknown>>(`/api/crm/contacts${q}`),
    ]);
    const problems: string[] = [];
    if (iv.status === "fulfilled") setInvoices(listOf<Invoice>(iv.value, ["invoices", "rows", "items"]));
    else {
      setInvoices([]);
      problems.push(iv.reason instanceof Error ? iv.reason.message : "Invoices unavailable.");
    }
    if (co.status === "fulfilled") setCompanies(listOf<Company>(co.value, ["companies", "rows", "items"]));
    else setCompanies([]);
    if (ct.status === "fulfilled") setContacts(listOf<Contact>(ct.value, ["contacts", "rows", "items"]));
    else setContacts([]);
    if (problems.length) setApiDown(problems.join(" "));
    setBusy(false);
  }, []);

  useEffect(() => {
    if (orgId) void loadAll(orgId);
  }, [orgId, loadAll]);

  // A focused invoice prints alone: when printId is set, the browser print
  // dialog opens and the print stylesheet shows only .invoice-print-sheet.
  useEffect(() => {
    if (!printId) return;
    const t = window.setTimeout(() => window.print(), 60);
    const clear = () => setPrintId(null);
    window.addEventListener("afterprint", clear);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("afterprint", clear);
    };
  }, [printId]);

  const companyName = useCallback(
    (id?: string | null) => companies.find((c) => c.id === id)?.name ?? "—",
    [companies],
  );
  const contactName = useCallback(
    (id?: string | null) => contacts.find((c) => c.id === id)?.full_name ?? "—",
    [contacts],
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return invoices.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (overdueOnly && !isOverdue(i)) return false;
      if (needle) {
        const hay = `${i.number} ${companyName(i.company_id)} ${contactName(i.contact_id)}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, overdueOnly, search, companyName, contactName]);

  const draftSubtotal = lines.reduce(
    (n, l) => n + Number(l.qty || 0) * Math.floor(Number(l.unit_coins || 0)),
    0,
  );
  const draftDiscount = Math.min(Math.max(Math.floor(Number(discount || 0)), 0), draftSubtotal);
  const draftTaxable = draftSubtotal - draftDiscount;
  const draftRate = Math.min(Math.max(Number(taxRate || 0), 0), 100);
  const draftTax = Math.floor((draftTaxable * draftRate) / 100);
  const draftTotal = draftTaxable + draftTax;
  const outstanding = invoices
    .filter((i) => i.status === "sent")
    .reduce((n, i) => n + Number(i.total_coins ?? 0), 0);
  const overdueCount = invoices.filter(isOverdue).length;

  const printInv = printId ? (invoices.find((i) => i.id === printId) ?? null) : null;

  async function advance(id: string, status: string) {
    if (status === "void") {
      const target = invoices.find((i) => i.id === id);
      const label = target?.number || id.slice(0, 8);
      const okVoid = window.confirm(
        `Void invoice ${label}? Void is terminal and voided invoices stay excluded from unpaid totals.`,
      );
      if (!okVoid) return;
    }
    setNotice("");
    try {
      await request("/api/crm/invoices", {
        method: "PATCH",
        body: JSON.stringify({ id, status, org_id: orgId }),
      });
      setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      setNotice(`Invoice ${status}.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Status change failed.");
    }
  }

  async function saveNote(id: string) {
    setNotice("");
    const notes = (noteDrafts[id] ?? "").trim();
    try {
      const r = await request<{ invoice: Invoice }>("/api/crm/invoices", {
        method: "PATCH",
        body: JSON.stringify({ id, notes, org_id: orgId }),
      });
      setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, notes: r.invoice?.notes ?? notes } : i)));
      setNotice("Payment note saved.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Saving the note failed.");
    }
  }

  async function duplicateInvoice(inv: Invoice) {
    if (!orgId) {
      setNotice("Pick an org first.");
      return;
    }
    setNotice("");
    try {
      const items = (inv.items ?? []).map((it) => ({
        label: it.label,
        qty: Number(it.qty || 0),
        unit_coins: Math.floor(Number(it.unit_coins || 0)),
      }));
      await request("/api/crm/invoices", {
        method: "POST",
        body: JSON.stringify({
          org_id: orgId,
          company_id: inv.company_id || undefined,
          contact_id: inv.contact_id || undefined,
          items: items.length ? items : [{ label: "Copy", qty: 1, unit_coins: 0 }],
          discount_coins: Math.floor(Number(inv.discount_coins ?? 0)),
          tax_coins: Math.floor(Number(inv.tax_coins ?? 0)),
          due_date: inv.due_date || undefined,
          notes: inv.notes || undefined,
        }),
      });
      setNotice(`Duplicated ${inv.number || "invoice"} as a new draft.`);
      void loadAll(orgId);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Duplicate failed.");
    }
  }

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) {
      setNotice("Pick an org first.");
      return;
    }
    const items = lines
      .filter((l) => l.label.trim())
      .map((l) => ({
        label: l.label.trim(),
        qty: Number(l.qty || 0),
        unit_coins: Math.floor(Number(l.unit_coins || 0)),
      }));
    if (!items.length) {
      setNotice("Add at least one labeled line item.");
      return;
    }
    if (duplicateNumber) {
      setNotice("That invoice number is already used in this org — pick a unique sequential number.");
      return;
    }
    if (draftDiscount > draftSubtotal) {
      setNotice("Discount cannot exceed the subtotal.");
      return;
    }
    try {
      await request("/api/crm/invoices", {
        method: "POST",
        body: JSON.stringify({
          org_id: orgId,
          number: invNumber.trim() || undefined,
          company_id: companyId || undefined,
          contact_id: contactId || undefined,
          company_name: !companyId && companyFree.trim() ? companyFree.trim() : undefined,
          contact_name: !contactId && contactFree.trim() ? contactFree.trim() : undefined,
          items,
          discount_coins: draftDiscount,
          tax_rate: draftRate,
          tax_coins: draftTax,
          due_date: dueDate || undefined,
          payment_reference: payRef.trim() || undefined,
          payment_ref: payRef.trim() || undefined,
          notes: invNotes.trim() || undefined,
        }),
      });
      setCompanyId("");
      setCompanyFree("");
      setContactId("");
      setContactFree("");
      setLines([{ label: "", qty: "1", unit_coins: "0" }]);
      setDiscount("0");
      setTaxRate("0");
      setDueDate("");
      setInvNotes("");
      setInvNumber("");
      setPayRef("");
      setNotice("Invoice drafted.");
      void loadAll(orgId);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Create failed.");
    }
  }

  function exportCsv() {
    const rows: string[][] = [
      ["number", "status", "company", "contact", "line_label", "qty", "unit_coins", "line_coins",
        "subtotal_coins", "tax_coins", "total_coins", "usd_total", "due_date", "paid_at", "payment_reference", "created_at"],
    ];
    for (const inv of visible) {
      const items = inv.items?.length ? inv.items : [{ label: "", qty: 0, unit_coins: 0 }];
      for (const it of items) {
        rows.push([
          inv.number, inv.status, companyName(inv.company_id), contactName(inv.contact_id),
          it.label, String(it.qty), String(it.unit_coins),
          String(it.line_coins ?? Number(it.qty || 0) * Number(it.unit_coins || 0)),
          String(inv.subtotal_coins), String(inv.tax_coins), String(inv.total_coins),
          (Number(inv.total_coins ?? 0) / 100).toFixed(2), inv.due_date ?? "", paidAtOf(inv), paymentRefOf(inv), inv.created_at ?? "",
        ]);
      }
    }
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportInvoiceCsv(inv: Invoice) {
    const rows: string[][] = [
      ["line_label", "qty", "unit_coins", "line_coins"],
    ];
    for (const it of inv.items ?? []) {
      rows.push([
        it.label, String(it.qty), String(it.unit_coins),
        String(it.line_coins ?? Number(it.qty || 0) * Number(it.unit_coins || 0)),
      ]);
    }
    rows.push(
      [],
      ["number", inv.number],
      ["status", inv.status],
      ["company", companyName(inv.company_id)],
      ["contact", contactName(inv.contact_id)],
      ["subtotal_coins", String(inv.subtotal_coins)],
      ["discount_coins", String(inv.discount_coins ?? 0)],
      ["tax_coins", String(inv.tax_coins)],
      ["total_coins", String(inv.total_coins)],
      ["usd_total", (Number(inv.total_coins ?? 0) / 100).toFixed(2)],
      ["due_date", inv.due_date ?? ""],
      ["paid_at", paidAtOf(inv)],
      ["payment_ref", paymentRefOf(inv)],
    );
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${inv.number || inv.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <style>{`@media print {
  .invoice-print-sheet { color: #000 !important; background: #fff !important; border-color: #000 !important; }
  .invoice-print-sheet * { color: #000 !important; border-color: #999 !important; background: transparent !important; }
}`}</style>
      <section
        className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4"
        aria-label="Invoice compliance notice"
      >
        <p className="text-sm font-bold text-amber-200">
          👻 These are NOT tax invoices — internal coin accounting only.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
          Coin memoranda in Vibe Coins (100 coins = $1.00). Not VAT/GST invoices, payroll
          records, or receipts — marking one paid moves no coins by itself. Ghost Cash has
          no cash value and can never settle an invoice.
        </p>
      </section>
      {/* Print header: org name + print date + invoice numbers (print only). */}
      <div className="hidden print:block" aria-hidden="true">
        <p className="text-lg font-black text-black">
          {activeOrg ? `${activeOrg.name} — Invoices` : "Invoices"}
        </p>
        <p className="text-xs text-black">
          Printed {new Date().toISOString().slice(0, 10)}
          {visible.length
            ? ` · ${visible.length} invoice${visible.length === 1 ? "" : "s"}: ${visible.map((i) => i.number || i.id.slice(0, 8)).join(", ")}`
            : ""}
        </p>
      </div>
      <section className={cardCls}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-slate-300" htmlFor="inv-org">
            Org
          </label>
          <select
            id="inv-org"
            aria-label="Select organization"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className={`${inputCls} min-h-[44px] max-w-xs`}
          >
            <option value="">Select org…</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.slug})
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="Refresh invoices"
            className={ghostBtnCls}
            onClick={() => {
              void loadOrgs();
              if (orgId) void loadAll(orgId);
            }}
            disabled={busy}
          >
            {busy ? "Loading…" : "Refresh"}
          </button>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number…"
            aria-label="Search invoices by number"
            type="search"
            className={`${inputCls} min-h-[44px] w-full sm:w-48`}
          />
          <label className="ml-auto flex items-center gap-2 text-sm text-slate-300">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputCls}
              aria-label="Filter invoices by status"
            >
              <option value="all">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              aria-label="Show overdue invoices only"
              className="h-4 w-4 accent-cyan-300"
            />
            Overdue only
          </label>
          <button type="button" aria-label="Export visible invoices as CSV" className={ghostBtnCls} onClick={exportCsv} disabled={!visible.length}>
            Export CSV
          </button>
          <button
            type="button"
            aria-label="Print visible invoices"
            className={ghostBtnCls}
            onClick={() => window.print()}
            disabled={!visible.length}
          >
            Print
          </button>
        </div>
        {busy && (
          <div className="mt-3 grid gap-2 sm:grid-cols-3" aria-hidden="true" aria-label="Loading">
            {[0, 1, 2].map((k) => (
              <div key={k} className="h-12 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none" />
            ))}
          </div>
        )}
        {outstanding > 0 && (
          <p className="mt-3 text-sm text-slate-300">
            Outstanding (sent, voided excluded):{" "}
            <strong className="text-white">{coins(outstanding)}</strong>{" "}
            <span className="text-slate-400">≈ {usd(outstanding)}</span>
            {overdueCount > 0 && (
              <span className="ml-2 font-bold text-rose-300">
                · {overdueCount} overdue
              </span>
            )}
          </p>
        )}
        {apiDown && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-sm text-amber-300" role="alert">{apiDown}</p>
            <button type="button" aria-label="Retry loading invoices" className={ghostBtnCls} onClick={() => { if (orgId) void loadAll(orgId); }} disabled={busy || !orgId}>
              {busy ? "Retrying…" : "Retry"}
            </button>
          </div>
        )}
        {notice && <p className="mt-3 text-sm text-cyan-200" role="status">{notice}</p>}
      </section>

      <section className={cardCls} aria-label="New invoice">
        <h2 className="text-lg font-bold">New invoice (draft)</h2>
        <form onSubmit={createInvoice} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-300">
              Company (select)
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} aria-label="Invoice company select" className={`${inputCls} min-h-[44px] w-full`}>
                <option value="">None — use free text</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Company free text
              <input
                value={companyFree}
                onChange={(e) => setCompanyFree(e.target.value)}
                placeholder="Acme Co (created on submit)"
                aria-label="Invoice company free text"
                disabled={!!companyId}
                className={`${inputCls} min-h-[44px] w-full`}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Contact (select)
              <select value={contactId} onChange={(e) => setContactId(e.target.value)} aria-label="Invoice contact select" className={`${inputCls} min-h-[44px] w-full`}>
                <option value="">None — use free text</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Contact free text
              <input
                value={contactFree}
                onChange={(e) => setContactFree(e.target.value)}
                placeholder="Jane Doe (created on submit)"
                aria-label="Invoice contact free text"
                disabled={!!contactId}
                className={`${inputCls} min-h-[44px] w-full`}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-300">
              Invoice number (optional)
              <input
                value={invNumber}
                onChange={(e) => setInvNumber(e.target.value)}
                placeholder="Auto-assigned if blank (e.g. INV-20260101-1234)"
                className={`${inputCls} w-full font-mono`}
                aria-label="Invoice number"
              />
              <span className="block text-xs text-slate-400">
                Numbers must be unique per org — sequential numbering recommended.
              </span>
              {duplicateNumber && (
                <span className="block text-xs font-bold text-rose-300" role="alert">
                  Duplicate number in this org — pick a unique sequential number.
                </span>
              )}
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Payment reference (optional)
              <input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="e.g. checkout #123, wire ref…"
                className={`${inputCls} w-full`}
                aria-label="Payment reference"
              />
              <span className="block text-xs text-slate-400">
                Stored with the invoice; shown once paid.
              </span>
            </label>
          </div>

          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[1fr_80px_110px_44px]">
                <input
                  value={l.label}
                  onChange={(e) =>
                    setLines((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder={`Line ${i + 1} label`}
                  className={`${inputCls} col-span-2 min-h-[44px] sm:col-span-1`}
                  aria-label={`Line ${i + 1} label`}
                />
                <input
                  value={l.qty}
                  onChange={(e) =>
                    setLines((prev) => prev.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))
                  }
                  placeholder="Qty"
                  inputMode="decimal"
                  aria-label={`Line ${i + 1} quantity`}
                  className={`${inputCls} min-h-[44px]`}
                />
                <input
                  value={l.unit_coins}
                  onChange={(e) =>
                    setLines((prev) => prev.map((x, j) => (j === i ? { ...x, unit_coins: e.target.value } : x)))
                  }
                  placeholder="Unit 🪙"
                  inputMode="numeric"
                  aria-label={`Line ${i + 1} unit coins`}
                  className={`${inputCls} min-h-[44px]`}
                />
                <button
                  type="button"
                  className={ghostBtnCls}
                  onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                  disabled={lines.length === 1}
                  aria-label={`Remove line ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              aria-label="Add invoice line item"
              className={ghostBtnCls}
              onClick={() => setLines((prev) => [...prev, { label: "", qty: "1", unit_coins: "0" }])}
            >
              + Add line
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-sm text-slate-300">
              Discount (coins)
              <input value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="numeric" aria-label="Invoice discount in coins" className={`${inputCls} min-h-[44px] w-full`} />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Tax rate (%)
              <input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} inputMode="decimal" aria-label="Invoice tax rate percent" className={`${inputCls} min-h-[44px] w-full`} />
              <span className="block text-xs text-slate-400">≈ {usd(draftTax)} at 100 coins/$1</span>
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Due date
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Invoice due date" className={`${inputCls} min-h-[44px] w-full`} />
            </label>
            <p className="self-end text-sm text-slate-300">
              {coins(draftSubtotal)} − {coins(draftDiscount)} + {coins(draftTax)} ({draftRate}%):{" "}
              <strong className="text-white">{coins(draftTotal)}</strong>{" "}
              <span className="text-slate-400">≈ {usd(draftTotal)}</span>
            </p>
          </div>

          <label className="block space-y-1 text-sm text-slate-300">
            Notes / payment tracking
            <textarea
              value={invNotes}
              onChange={(e) => setInvNotes(e.target.value)}
              placeholder="Payment terms, references…"
              aria-label="Invoice notes"
              rows={2}
              className={`${inputCls} w-full`}
            />
          </label>

          <button type="submit" aria-label="Create draft invoice" className={btnCls} disabled={!orgId || busy}>
            Create draft invoice
          </button>
        </form>
      </section>

      <section className={`space-y-3 ${printId ? "print:hidden" : ""}`} aria-label="Invoices">
        {busy && !visible.length ? (
          <div className="space-y-3" aria-hidden="true" aria-label="Loading invoices">
            {[0, 1].map((k) => (
              <div key={k} className={cardCls}>
                <div className="h-5 w-32 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
                <div className="mt-2 h-4 w-48 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className={cardCls}>
            <p className="text-sm text-slate-400">
              {orgId
                ? statusFilter === "all"
                  ? "No invoices here yet — draft the first one above to bill a client."
                  : `No ${statusFilter} invoices — try a different status filter or draft a new one above.`
                : "Pick an org to load its invoices."}
            </p>
          </div>
        ) : (
          visible.map((inv) => (
            <article key={inv.id} className={cardCls}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-sm font-bold text-white">{inv.number || inv.id.slice(0, 8)}</h3>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${BADGE[inv.status] ?? BADGE.draft}`}
                >
                  {inv.status}
                </span>
                {isOverdue(inv) && (
                  <span className="rounded-full border border-rose-400/50 bg-rose-400/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-rose-200">
                    Overdue
                  </span>
                )}
                <span className="ml-auto text-sm font-bold text-white">{coins(Number(inv.total_coins ?? 0))}</span>
                <span className="text-sm text-slate-400">≈ {usd(Number(inv.total_coins ?? 0))}</span>
              </div>
              <p className="mt-1 text-sm text-slate-300">
                {companyName(inv.company_id)} · {contactName(inv.contact_id)}
                {inv.due_date ? ` · due ${inv.due_date}` : ""}
              </p>
              {(inv.items?.length ?? 0) > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  {inv.items!.map((it, k) => (
                    <li key={it.id ?? k} className="flex justify-between gap-3">
                      <span>
                        {it.label} × {it.qty} @ {coins(Number(it.unit_coins ?? 0))}
                      </span>
                      <span className="text-slate-400">
                        {coins(Number(it.line_coins ?? Number(it.qty || 0) * Number(it.unit_coins || 0)))}{" "}
                        <span className="text-slate-400">
                          ({usd(Number(it.line_coins ?? Number(it.qty || 0) * Number(it.unit_coins || 0)))})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-xs text-slate-400">
                Subtotal {coins(Number(inv.subtotal_coins ?? 0))} ({usd(Number(inv.subtotal_coins ?? 0))})
                {Number(inv.discount_coins ?? 0) > 0 &&
                  ` − discount ${coins(Number(inv.discount_coins ?? 0))} (${usd(Number(inv.discount_coins ?? 0))})`}
                {" "}+ tax {coins(Number(inv.tax_coins ?? 0))} ({usd(Number(inv.tax_coins ?? 0))})
                {inv.notes ? ` · ${inv.notes}` : ""}
              </p>
              {(inv.status === "paid" && paidAtOf(inv)) || paymentRefOf(inv) ? (
                <p className="mt-1 text-xs text-slate-400">
                  {inv.status === "paid" && paidAtOf(inv) ? `Paid ${paidAtOf(inv)}` : ""}
                  {inv.status === "paid" && paidAtOf(inv) && paymentRefOf(inv) ? " · " : ""}
                  {paymentRefOf(inv) ? `Ref: ${paymentRefOf(inv)}` : ""}
                </p>
              ) : null}
              {(NEXT[inv.status]?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {NEXT[inv.status].map((next) => (
                    <button
                      key={next}
                      type="button"
                      aria-label={`${next === "void" ? "Void" : `Mark ${inv.number || inv.id.slice(0, 8)} ${next}`} invoice`}
                      className={next === "void" ? ghostBtnCls : btnCls}
                      onClick={() => advance(inv.id, next)}
                      disabled={busy}
                    >
                      {next === "void" ? "Void" : `Mark ${next}`}
                    </button>
                  ))}
                </div>
              )}
              <label className="mt-3 block space-y-1 text-xs text-slate-300 print:hidden">
                Payment / tracking note
                <span className="flex gap-2">
                  <input
                    value={noteDrafts[inv.id] ?? inv.notes ?? ""}
                    onChange={(e) =>
                      setNoteDrafts((prev) => ({ ...prev, [inv.id]: e.target.value }))
                    }
                    placeholder="e.g. paid via checkout #123, awaiting wire…"
                    className={`${inputCls} min-h-[44px] flex-1`}
                    aria-label={`Payment note for ${inv.number || inv.id.slice(0, 8)}`}
                  />
                  <button type="button" className={ghostBtnCls} onClick={() => void saveNote(inv.id)} disabled={busy}>
                    Save note
                  </button>
                </span>
              </label>
              <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                <button
                  type="button"
                  aria-label={`Duplicate ${inv.number || inv.id.slice(0, 8)} invoice`}
                  className={ghostBtnCls}
                  onClick={() => void duplicateInvoice(inv)}
                  disabled={busy}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  aria-label={`Export ${inv.number || inv.id.slice(0, 8)} lines as CSV`}
                  className={ghostBtnCls}
                  onClick={() => exportInvoiceCsv(inv)}
                >
                  Export lines CSV
                </button>
                <button
                  type="button"
                  aria-label={`Print ${inv.number || inv.id.slice(0, 8)} invoice`}
                  className={ghostBtnCls}
                  onClick={() => setPrintId(inv.id)}
                >
                  Print invoice
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      {printInv && (
        <section className="invoice-print-sheet hidden rounded-2xl border border-black bg-white p-6 text-black print:block" aria-label="Print invoice">
          <h2 className="font-mono text-xl font-black">Invoice {printInv.number || printInv.id.slice(0, 8)}</h2>
          <p className="mt-1 text-sm">
            Status: {printInv.status}
            {isOverdue(printInv) ? " · OVERDUE" : ""}
            {printInv.due_date ? ` · Due ${printInv.due_date}` : ""}
          </p>
          <p className="mt-1 text-sm">
            {companyName(printInv.company_id)} · {contactName(printInv.contact_id)}
          </p>
          <ul className="mt-4 space-y-1 text-sm">
            {(printInv.items ?? []).map((it, k) => (
              <li key={it.id ?? k} className="flex justify-between gap-3 border-b border-neutral-300 py-1">
                <span>{it.label} × {it.qty} @ {coins(Number(it.unit_coins ?? 0))}</span>
                <span>{coins(Number(it.line_coins ?? Number(it.qty || 0) * Number(it.unit_coins || 0)))}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            Subtotal {coins(Number(printInv.subtotal_coins ?? 0))}
            {Number(printInv.discount_coins ?? 0) > 0 && ` − Discount ${coins(Number(printInv.discount_coins ?? 0))}`}{" "}
            + Tax {coins(Number(printInv.tax_coins ?? 0))} ={" "}
            <strong>Total {coins(Number(printInv.total_coins ?? 0))} (≈ {usd(Number(printInv.total_coins ?? 0))})</strong>
          </p>
          {printInv.notes && <p className="mt-2 text-sm">Notes: {printInv.notes}</p>}
          {paymentRefOf(printInv) && <p className="mt-1 text-sm">Payment ref: {paymentRefOf(printInv)}</p>}
        </section>
      )}

      <footer className="rounded-2xl border border-dashed border-white/15 p-4 text-xs leading-relaxed text-slate-400">
        <p className="font-bold text-slate-300">Legal footnote</p>
        <p className="mt-1">
          Invoices here are org memoranda — informal payment reminders between an org and its
          clients. They are NOT tax invoices, VAT/GST invoices, payroll records, or receipts.
          Coin settlement happens only via the existing guarded checkout and ledger flows;
          marking an invoice paid records the memorandum, it never moves coins by itself.
          Ghost Cash (👻) has no cash value and can never settle an invoice.
        </p>
      </footer>
    </div>
  );
}
