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
  tax_coins: number;
  total_coins: number;
  due_date?: string | null;
  notes?: string | null;
  created_at?: string;
  items?: InvoiceItem[];
};

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
  "min-w-0 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500";
const cardCls = "rounded-2xl border border-white/10 bg-white/[.04] p-5";
const btnCls =
  "rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50";
const ghostBtnCls =
  "rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50";

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
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [apiDown, setApiDown] = useState("");

  // Create-form state.
  const [companyId, setCompanyId] = useState("");
  const [companyFree, setCompanyFree] = useState("");
  const [contactId, setContactId] = useState("");
  const [contactFree, setContactFree] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ label: "", qty: "1", unit_coins: "0" }]);
  const [tax, setTax] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [invNotes, setInvNotes] = useState("");

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

  const loadAll = useCallback(async (org: string) => {
    if (!org) return;
    setBusy(true);
    setApiDown("");
    const q = `?org_id=${encodeURIComponent(org)}`;
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

  const companyName = (id?: string | null) =>
    companies.find((c) => c.id === id)?.name ?? "—";
  const contactName = (id?: string | null) =>
    contacts.find((c) => c.id === id)?.full_name ?? "—";

  const visible = useMemo(
    () => (statusFilter === "all" ? invoices : invoices.filter((i) => i.status === statusFilter)),
    [invoices, statusFilter],
  );

  const draftSubtotal = lines.reduce(
    (n, l) => n + Number(l.qty || 0) * Math.floor(Number(l.unit_coins || 0)),
    0,
  );
  const draftTotal = draftSubtotal + Math.floor(Number(tax || 0));
  const outstanding = invoices
    .filter((i) => i.status === "sent")
    .reduce((n, i) => n + Number(i.total_coins ?? 0), 0);

  async function advance(id: string, status: string) {
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
    try {
      await request("/api/crm/invoices", {
        method: "POST",
        body: JSON.stringify({
          org_id: orgId,
          company_id: companyId || undefined,
          contact_id: contactId || undefined,
          company_name: !companyId && companyFree.trim() ? companyFree.trim() : undefined,
          contact_name: !contactId && contactFree.trim() ? contactFree.trim() : undefined,
          items,
          tax_coins: Math.floor(Number(tax || 0)),
          due_date: dueDate || undefined,
          notes: invNotes.trim() || undefined,
        }),
      });
      setCompanyId("");
      setCompanyFree("");
      setContactId("");
      setContactFree("");
      setLines([{ label: "", qty: "1", unit_coins: "0" }]);
      setTax("0");
      setDueDate("");
      setInvNotes("");
      setNotice("Invoice drafted.");
      void loadAll(orgId);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Create failed.");
    }
  }

  function exportCsv() {
    const rows: string[][] = [
      ["number", "status", "company", "contact", "line_label", "qty", "unit_coins", "line_coins",
        "subtotal_coins", "tax_coins", "total_coins", "usd_total", "due_date", "created_at"],
    ];
    for (const inv of visible) {
      const items = inv.items?.length ? inv.items : [{ label: "", qty: 0, unit_coins: 0 }];
      for (const it of items) {
        rows.push([
          inv.number, inv.status, companyName(inv.company_id), contactName(inv.contact_id),
          it.label, String(it.qty), String(it.unit_coins),
          String(it.line_coins ?? Number(it.qty || 0) * Number(it.unit_coins || 0)),
          String(inv.subtotal_coins), String(inv.tax_coins), String(inv.total_coins),
          (Number(inv.total_coins ?? 0) / 100).toFixed(2), inv.due_date ?? "", inv.created_at ?? "",
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

  return (
    <div className="space-y-6">
      <section className={cardCls}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-slate-300" htmlFor="inv-org">
            Org
          </label>
          <select
            id="inv-org"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className={`${inputCls} max-w-xs`}
          >
            <option value="">Select org…</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.slug})
              </option>
            ))}
          </select>
          <button
            className={ghostBtnCls}
            onClick={() => {
              void loadOrgs();
              if (orgId) void loadAll(orgId);
            }}
            disabled={busy}
          >
            {busy ? "Loading…" : "Refresh"}
          </button>
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
          <button className={ghostBtnCls} onClick={exportCsv} disabled={!visible.length}>
            Export CSV
          </button>
          <button
            className={ghostBtnCls}
            onClick={() => window.print()}
            disabled={!visible.length}
          >
            Print
          </button>
        </div>
        {outstanding > 0 && (
          <p className="mt-3 text-sm text-slate-300">
            Outstanding (sent): <strong className="text-white">{coins(outstanding)}</strong>{" "}
            <span className="text-slate-400">≈ {usd(outstanding)}</span>
          </p>
        )}
        {apiDown && <p className="mt-3 text-sm text-amber-300">{apiDown}</p>}
        {notice && <p className="mt-3 text-sm text-cyan-200">{notice}</p>}
      </section>

      <section className={cardCls} aria-label="New invoice">
        <h2 className="text-lg font-bold">New invoice (draft)</h2>
        <form onSubmit={createInvoice} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-300">
              Company (select)
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={`${inputCls} w-full`}>
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
                disabled={!!companyId}
                className={`${inputCls} w-full`}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Contact (select)
              <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={`${inputCls} w-full`}>
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
                disabled={!!contactId}
                className={`${inputCls} w-full`}
              />
            </label>
          </div>

          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_110px_32px] items-center gap-2">
                <input
                  value={l.label}
                  onChange={(e) =>
                    setLines((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder={`Line ${i + 1} label`}
                  className={inputCls}
                  aria-label={`Line ${i + 1} label`}
                />
                <input
                  value={l.qty}
                  onChange={(e) =>
                    setLines((prev) => prev.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))
                  }
                  placeholder="Qty"
                  inputMode="decimal"
                  className={inputCls}
                  aria-label={`Line ${i + 1} quantity`}
                />
                <input
                  value={l.unit_coins}
                  onChange={(e) =>
                    setLines((prev) => prev.map((x, j) => (j === i ? { ...x, unit_coins: e.target.value } : x)))
                  }
                  placeholder="Unit 🪙"
                  inputMode="numeric"
                  className={inputCls}
                  aria-label={`Line ${i + 1} unit coins`}
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
              className={ghostBtnCls}
              onClick={() => setLines((prev) => [...prev, { label: "", qty: "1", unit_coins: "0" }])}
            >
              + Add line
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-sm text-slate-300">
              Tax (coins)
              <input value={tax} onChange={(e) => setTax(e.target.value)} inputMode="numeric" className={`${inputCls} w-full`} />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Due date
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${inputCls} w-full`} />
            </label>
            <p className="self-end text-sm text-slate-300">
              Total: <strong className="text-white">{coins(draftTotal)}</strong>{" "}
              <span className="text-slate-400">≈ {usd(draftTotal)}</span>
            </p>
          </div>

          <label className="block space-y-1 text-sm text-slate-300">
            Notes
            <textarea
              value={invNotes}
              onChange={(e) => setInvNotes(e.target.value)}
              placeholder="Payment terms, references…"
              rows={2}
              className={`${inputCls} w-full`}
            />
          </label>

          <button type="submit" className={btnCls} disabled={!orgId || busy}>
            Create draft invoice
          </button>
        </form>
      </section>

      <section className="space-y-3" aria-label="Invoices">
        {visible.length === 0 ? (
          <div className={cardCls}>
            <p className="text-sm text-slate-300">
              {orgId
                ? "No invoices here yet — draft the first one above."
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
                        {coins(Number(it.line_coins ?? Number(it.qty || 0) * Number(it.unit_coins || 0)))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-xs text-slate-400">
                Subtotal {coins(Number(inv.subtotal_coins ?? 0))} + tax {coins(Number(inv.tax_coins ?? 0))}
                {inv.notes ? ` · ${inv.notes}` : ""}
              </p>
              {(NEXT[inv.status]?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {NEXT[inv.status].map((next) => (
                    <button
                      key={next}
                      className={next === "void" ? ghostBtnCls : btnCls}
                      onClick={() => advance(inv.id, next)}
                      disabled={busy}
                    >
                      {next === "void" ? "Void" : `Mark ${next}`}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </section>

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
