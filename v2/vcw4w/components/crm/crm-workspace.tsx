"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Org = { id: string; slug: string; name: string };
type Company = { id: string; org_id?: string; name: string; domain?: string | null; notes?: string | null; created_at?: string };
type Contact = { id: string; org_id?: string; company_id?: string | null; name: string; email?: string | null; phone?: string | null; created_at?: string };
type Deal = { id: string; org_id?: string; company_id?: string | null; contact_id?: string | null; title: string; amount_coins: number; stage: string; created_at?: string };
type Activity = { id: string; org_id?: string; deal_id?: string | null; title: string; due_at?: string | null; done: boolean; created_at?: string };
type InvoiceLine = { label: string; qty: number; unit_coins: number };
type Invoice = { id: string; org_id?: string; company_id?: string | null; number: string; status: string; due_at?: string | null; lines?: InvoiceLine[]; total_coins?: number; created_at?: string };
type Summary = { total_pipeline_coins: number; won_coins: number; open_deals: number; overdue_activities: number; unpaid_invoices: number; unpaid_coins: number };

type Tab = "dashboard" | "pipeline" | "contacts" | "companies" | "activities" | "invoices";

const TABS: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "pipeline", label: "Pipeline" },
  { key: "contacts", label: "Contacts" },
  { key: "companies", label: "Companies" },
  { key: "activities", label: "Activities" },
  { key: "invoices", label: "Invoices" },
];

const STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;

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

function friendlyApiError(statusHint: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : "Request failed.";
  if (/\(404\)/.test(msg)) return `${statusHint} API not found (404) — Task B routes may not be deployed yet.`;
  if (/\(503\)/.test(msg)) return `${statusHint} backend unavailable (503) — try again shortly.`;
  return msg;
}

const inputCls = "min-w-0 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500";
const cardCls = "rounded-2xl border border-white/10 bg-white/[.04] p-5";
const btnCls = "rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50";
const ghostBtnCls = "rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50";

export function CrmWorkspace() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [apiDown, setApiDown] = useState("");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [query, setQuery] = useState("");

  // Create-form state
  const [coName, setCoName] = useState("");
  const [coDomain, setCoDomain] = useState("");
  const [ctName, setCtName] = useState("");
  const [ctEmail, setCtEmail] = useState("");
  const [ctCompany, setCtCompany] = useState("");
  const [dlTitle, setDlTitle] = useState("");
  const [dlAmount, setDlAmount] = useState("");
  const [dlCompany, setDlCompany] = useState("");
  const [acTitle, setAcTitle] = useState("");
  const [acDue, setAcDue] = useState("");
  const [invNumber, setInvNumber] = useState("");
  const [invCompany, setInvCompany] = useState("");
  const [invDue, setInvDue] = useState("");
  const [invLines, setInvLines] = useState<InvoiceLine[]>([{ label: "", qty: 1, unit_coins: 0 }]);

  const loadOrgs = useCallback(async () => {
    try {
      const r = await request<{ orgs: Org[] }>("/api/orgs");
      const list = r.orgs ?? [];
      setOrgs(list);
      if (!orgId && list.length) setOrgId(list[0].id);
      if (!list.length) setNotice("No orgs yet — create one in /squads first.");
    } catch (e) {
      setOrgs([]);
      setNotice(e instanceof Error ? e.message : "Unable to load orgs.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadOrgs();
  }, [loadOrgs]);

  const loadAll = useCallback(async (org: string) => {
    if (!org) return;
    setBusy(true);
    setApiDown("");
    const q = `?org_id=${encodeURIComponent(org)}`;
    const [s, co, ct, dl, ac, iv] = await Promise.allSettled([
      request<Partial<Summary> & Record<string, unknown>>(`/api/crm/summary${q}`),
      request<Record<string, unknown>>(`/api/crm/companies${q}`),
      request<Record<string, unknown>>(`/api/crm/contacts${q}`),
      request<Record<string, unknown>>(`/api/crm/deals${q}`),
      request<Record<string, unknown>>(`/api/crm/activities${q}`),
      request<Record<string, unknown>>(`/api/crm/invoices${q}`),
    ]);
    const problems: string[] = [];
    if (s.status === "fulfilled") {
      const b = s.value as Partial<Summary>;
      setSummary({
        total_pipeline_coins: Number(b.total_pipeline_coins ?? 0),
        won_coins: Number(b.won_coins ?? 0),
        open_deals: Number(b.open_deals ?? 0),
        overdue_activities: Number(b.overdue_activities ?? 0),
        unpaid_invoices: Number(b.unpaid_invoices ?? 0),
        unpaid_coins: Number(b.unpaid_coins ?? 0),
      });
    } else {
      setSummary(null);
      problems.push(friendlyApiError("Summary", s.reason));
    }
    if (co.status === "fulfilled") setCompanies(listOf<Company>(co.value, ["companies", "rows", "items"]));
    else { setCompanies([]); problems.push(friendlyApiError("Companies", co.reason)); }
    if (ct.status === "fulfilled") setContacts(listOf<Contact>(ct.value, ["contacts", "rows", "items"]));
    else { setContacts([]); problems.push(friendlyApiError("Contacts", ct.reason)); }
    if (dl.status === "fulfilled") setDeals(listOf<Deal>(dl.value, ["deals", "rows", "items"]));
    else { setDeals([]); problems.push(friendlyApiError("Deals", dl.reason)); }
    if (ac.status === "fulfilled") setActivities(listOf<Activity>(ac.value, ["activities", "rows", "items"]));
    else { setActivities([]); problems.push(friendlyApiError("Activities", ac.reason)); }
    if (iv.status === "fulfilled") setInvoices(listOf<Invoice>(iv.value, ["invoices", "rows", "items"]));
    else { setInvoices([]); problems.push(friendlyApiError("Invoices", iv.reason)); }
    if (problems.length) setApiDown(problems.join(" "));
    setBusy(false);
  }, []);

  useEffect(() => {
    if (orgId) void loadAll(orgId);
  }, [orgId, loadAll]);

  const filteredCompanies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return companies;
    return companies.filter((c) => `${c.name} ${c.domain ?? ""}`.toLowerCase().includes(needle));
  }, [companies, query]);

  const filteredContacts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((c) => `${c.name} ${c.email ?? ""}`.toLowerCase().includes(needle));
  }, [contacts, query]);

  const dealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const s of STAGES) map.set(s, []);
    for (const d of deals) {
      const bucket = map.get(d.stage) ?? [];
      bucket.push(d);
      map.set(d.stage, bucket);
    }
    return map;
  }, [deals]);

  const invDraftTotal = invLines.reduce((n, l) => n + Number(l.qty || 0) * Number(l.unit_coins || 0), 0);
  const companyName = (id?: string | null) => companies.find((c) => c.id === id)?.name ?? "—";

  async function moveDeal(id: string, stage: string) {
    setNotice("");
    try {
      await request(`/api/crm/deals`, { method: "PATCH", body: JSON.stringify({ id, stage, org_id: orgId }) });
      setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage } : d)));
      setNotice(`Deal moved to ${stage}.`);
    } catch (e) {
      setNotice(friendlyApiError("Move deal", e));
    }
  }

  async function toggleActivity(a: Activity) {
    setNotice("");
    try {
      const done = !a.done;
      await request(`/api/crm/activities`, {
        method: "PATCH",
        body: JSON.stringify({ id: a.id, done, status: done ? "done" : "open", org_id: orgId }),
      });
      setActivities((prev) => prev.map((x) => (x.id === a.id ? { ...x, done } : x)));
    } catch (e) {
      setNotice(friendlyApiError("Activity update", e));
    }
  }

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !coName.trim()) { setNotice("Pick an org and name the company."); return; }
    try {
      await request(`/api/crm/companies`, { method: "POST", body: JSON.stringify({ org_id: orgId, name: coName.trim(), domain: coDomain.trim() || undefined }) });
      setCoName(""); setCoDomain(""); setNotice("Company created.");
      void loadAll(orgId);
    } catch (err) { setNotice(friendlyApiError("Create company", err)); }
  }

  async function createContact(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !ctName.trim()) { setNotice("Pick an org and name the contact."); return; }
    try {
      await request(`/api/crm/contacts`, { method: "POST", body: JSON.stringify({ org_id: orgId, name: ctName.trim(), email: ctEmail.trim() || undefined, company_id: ctCompany || undefined }) });
      setCtName(""); setCtEmail(""); setCtCompany(""); setNotice("Contact created.");
      void loadAll(orgId);
    } catch (err) { setNotice(friendlyApiError("Create contact", err)); }
  }

  async function createDeal(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !dlTitle.trim()) { setNotice("Pick an org and title the deal."); return; }
    try {
      await request(`/api/crm/deals`, { method: "POST", body: JSON.stringify({ org_id: orgId, title: dlTitle.trim(), amount_coins: Number(dlAmount || 0), stage: "lead", company_id: dlCompany || undefined }) });
      setDlTitle(""); setDlAmount(""); setDlCompany(""); setNotice("Deal created in Lead.");
      void loadAll(orgId);
    } catch (err) { setNotice(friendlyApiError("Create deal", err)); }
  }

  async function createActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !acTitle.trim()) { setNotice("Pick an org and title the activity."); return; }
    try {
      await request(`/api/crm/activities`, { method: "POST", body: JSON.stringify({ org_id: orgId, title: acTitle.trim(), due_at: acDue || undefined }) });
      setAcTitle(""); setAcDue(""); setNotice("Activity added.");
      void loadAll(orgId);
    } catch (err) { setNotice(friendlyApiError("Create activity", err)); }
  }

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !invNumber.trim()) { setNotice("Pick an org and set an invoice number."); return; }
    const lines = invLines.filter((l) => l.label.trim()).map((l) => ({ label: l.label.trim(), qty: Number(l.qty || 0), unit_coins: Number(l.unit_coins || 0) }));
    if (!lines.length) { setNotice("Add at least one labeled line item."); return; }
    try {
      await request(`/api/crm/invoices`, { method: "POST", body: JSON.stringify({ org_id: orgId, number: invNumber.trim(), company_id: invCompany || undefined, due_at: invDue || undefined, status: "unpaid", lines }) });
      setInvNumber(""); setInvCompany(""); setInvDue(""); setInvLines([{ label: "", qty: 1, unit_coins: 0 }]);
      setNotice("Invoice created.");
      void loadAll(orgId);
    } catch (err) { setNotice(friendlyApiError("Create invoice", err)); }
  }

  return (
    <div className="space-y-6">
      <section className={cardCls}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-slate-300" htmlFor="crm-org">Org</label>
          <select id="crm-org" value={orgId} onChange={(e) => setOrgId(e.target.value)} className={`${inputCls} max-w-xs`}>
            <option value="">Select org…</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name} ({o.slug})</option>
            ))}
          </select>
          <button className={ghostBtnCls} onClick={() => { void loadOrgs(); if (orgId) void loadAll(orgId); }} disabled={busy}>
            {busy ? "Loading…" : "Refresh"}
          </button>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts / companies…" className={`${inputCls} ml-auto w-full sm:w-64`} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="CRM sections">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === t.key ? "bg-cyan-300 text-slate-950" : "border border-white/15 bg-white/5 text-slate-200"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {notice && <p className="mt-3 text-sm text-cyan-200">{notice}</p>}
        {apiDown && <p className="mt-2 text-sm text-amber-300">{apiDown}</p>}
      </section>

      {!orgId && (
        <section className={cardCls}>
          <p className="text-sm text-slate-300">Select an org to open its CRM. Org-scoped data only — nothing crosses orgs.</p>
        </section>
      )}

      {orgId && tab === "dashboard" && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Pipeline coins", value: summary ? String(summary.total_pipeline_coins) : "—" },
            { label: "Won coins", value: summary ? String(summary.won_coins) : "—" },
            { label: "Open deals", value: summary ? String(summary.open_deals) : "—" },
            { label: "Overdue activities", value: summary ? String(summary.overdue_activities) : "—" },
            { label: "Unpaid invoices", value: summary ? `${summary.unpaid_invoices} (${summary.unpaid_coins})` : "—" },
          ].map((k) => (
            <div key={k.label} className={cardCls}>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{k.label}</p>
              <p className="mt-2 text-2xl font-black text-white">{k.value}</p>
            </div>
          ))}
          {!summary && (
            <p className="text-sm text-slate-400 sm:col-span-2 lg:col-span-5">No summary yet — the API may still be deploying. Other tabs work once their routes respond.</p>
          )}
        </section>
      )}

      {orgId && tab === "pipeline" && (
        <section className="grid gap-4 lg:grid-cols-3">
          {STAGES.map((stage) => {
            const rows = dealsByStage.get(stage) ?? [];
            return (
              <div key={stage} className={cardCls}>
                <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-300">{stage} ({rows.length})</h3>
                <div className="mt-3 space-y-3">
                  {rows.length === 0 && <p className="text-sm text-slate-500">No deals here yet.</p>}
                  {rows.map((d) => (
                    <div key={d.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                      <p className="font-semibold text-white">{d.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{d.amount_coins} coins · {companyName(d.company_id)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {STAGES.filter((s) => s !== d.stage).map((s) => (
                          <button key={s} className={ghostBtnCls} onClick={() => void moveDeal(d.id, s)}>→ {s}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <form onSubmit={(e) => void createDeal(e)} className={`${cardCls} lg:col-span-3`}>
            <h3 className="font-bold text-white">New deal</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <input value={dlTitle} onChange={(e) => setDlTitle(e.target.value)} placeholder="Deal title" className={`${inputCls} flex-1`} />
              <input value={dlAmount} onChange={(e) => setDlAmount(e.target.value)} placeholder="Coins" inputMode="numeric" className={`${inputCls} w-28`} />
              <select value={dlCompany} onChange={(e) => setDlCompany(e.target.value)} className={`${inputCls} max-w-xs`}>
                <option value="">No company</option>
                {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <button className={btnCls} type="submit">Add deal</button>
            </div>
          </form>
        </section>
      )}

      {orgId && tab === "contacts" && (
        <section className={`${cardCls} space-y-4`}>
          <form onSubmit={(e) => void createContact(e)} className="flex flex-wrap gap-2">
            <input value={ctName} onChange={(e) => setCtName(e.target.value)} placeholder="Full name" className={`${inputCls} flex-1`} />
            <input value={ctEmail} onChange={(e) => setCtEmail(e.target.value)} placeholder="email@co.com" className={`${inputCls} flex-1`} />
            <select value={ctCompany} onChange={(e) => setCtCompany(e.target.value)} className={`${inputCls} max-w-xs`}>
              <option value="">No company</option>
              {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <button className={btnCls} type="submit">Add contact</button>
          </form>
          {filteredContacts.length === 0
            ? <p className="text-sm text-slate-500">No contacts yet — add the first one above.</p>
            : (
              <ul className="divide-y divide-white/10">
                {filteredContacts.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                    <span className="font-semibold text-white">{c.name}</span>
                    <span className="text-slate-400">{c.email ?? "no email"}</span>
                    <span className="ml-auto text-slate-500">{companyName(c.company_id)}</span>
                  </li>
                ))}
              </ul>
            )}
        </section>
      )}

      {orgId && tab === "companies" && (
        <section className={`${cardCls} space-y-4`}>
          <form onSubmit={(e) => void createCompany(e)} className="flex flex-wrap gap-2">
            <input value={coName} onChange={(e) => setCoName(e.target.value)} placeholder="Acme Inc" className={`${inputCls} flex-1`} />
            <input value={coDomain} onChange={(e) => setCoDomain(e.target.value)} placeholder="acme.com" className={`${inputCls} flex-1`} />
            <button className={btnCls} type="submit">Add company</button>
          </form>
          {filteredCompanies.length === 0
            ? <p className="text-sm text-slate-500">No companies yet — add the first one above.</p>
            : (
              <ul className="divide-y divide-white/10">
                {filteredCompanies.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                    <span className="font-semibold text-white">{c.name}</span>
                    <span className="text-slate-400">{c.domain ?? "no domain"}</span>
                  </li>
                ))}
              </ul>
            )}
        </section>
      )}

      {orgId && tab === "activities" && (
        <section className={`${cardCls} space-y-4`}>
          <form onSubmit={(e) => void createActivity(e)} className="flex flex-wrap gap-2">
            <input value={acTitle} onChange={(e) => setAcTitle(e.target.value)} placeholder="Call Acme about proposal…" className={`${inputCls} flex-1`} />
            <input value={acDue} onChange={(e) => setAcDue(e.target.value)} type="date" className={`${inputCls} w-44`} />
            <button className={btnCls} type="submit">Add activity</button>
          </form>
          {activities.length === 0
            ? <p className="text-sm text-slate-500">Nothing to do — the checklist is clear.</p>
            : (
              <ul className="space-y-2">
                {activities.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
                    <input type="checkbox" checked={a.done} onChange={() => void toggleActivity(a)} aria-label={`Mark ${a.title} done`} className="h-4 w-4 accent-cyan-300" />
                    <span className={a.done ? "text-slate-500 line-through" : "text-white"}>{a.title}</span>
                    <span className="ml-auto text-xs text-slate-400">{a.due_at ? new Date(a.due_at).toLocaleDateString() : "no due date"}</span>
                  </li>
                ))}
              </ul>
            )}
        </section>
      )}

      {orgId && tab === "invoices" && (
        <section className={`${cardCls} space-y-4`}>
          <form onSubmit={(e) => void createInvoice(e)} className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <input value={invNumber} onChange={(e) => setInvNumber(e.target.value)} placeholder="INV-001" className={`${inputCls} w-40`} />
              <select value={invCompany} onChange={(e) => setInvCompany(e.target.value)} className={`${inputCls} max-w-xs`}>
                <option value="">No company</option>
                {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <input value={invDue} onChange={(e) => setInvDue(e.target.value)} type="date" className={`${inputCls} w-44`} />
            </div>
            {invLines.map((l, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <input value={l.label} onChange={(e) => setInvLines((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder={`Item ${i + 1}`} className={`${inputCls} flex-1`} />
                <input value={String(l.qty)} onChange={(e) => setInvLines((prev) => prev.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value || 0) } : x)))} inputMode="numeric" aria-label="Quantity" className={`${inputCls} w-20`} />
                <input value={String(l.unit_coins)} onChange={(e) => setInvLines((prev) => prev.map((x, j) => (j === i ? { ...x, unit_coins: Number(e.target.value || 0) } : x)))} inputMode="numeric" aria-label="Unit coins" className={`${inputCls} w-28`} />
                <button type="button" className={ghostBtnCls} onClick={() => setInvLines((prev) => prev.filter((_, j) => j !== i))} disabled={invLines.length <= 1}>Remove</button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={ghostBtnCls} onClick={() => setInvLines((prev) => [...prev, { label: "", qty: 1, unit_coins: 0 }])}>+ Line item</button>
              <span className="text-sm text-slate-300">Total: <b className="text-white">{invDraftTotal} coins</b></span>
              <button className={`${btnCls} ml-auto`} type="submit">Create invoice</button>
            </div>
          </form>
          {invoices.length === 0
            ? <p className="text-sm text-slate-500">No invoices yet — draft the first one above.</p>
            : (
              <ul className="divide-y divide-white/10">
                {invoices.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                    <span className="font-semibold text-white">{v.number}</span>
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-slate-300">{v.status}</span>
                    <span className="text-slate-400">{companyName(v.company_id)}</span>
                    <span className="ml-auto font-semibold text-cyan-200">{v.total_coins ?? v.lines?.reduce((n, l) => n + Number(l.qty || 0) * Number(l.unit_coins || 0), 0) ?? 0} coins</span>
                  </li>
                ))}
              </ul>
            )}
        </section>
      )}
    </div>
  );
}
