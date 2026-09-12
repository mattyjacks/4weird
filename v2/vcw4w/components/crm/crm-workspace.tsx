"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CrmReports } from "./crm-reports";

type Org = { id: string; slug: string; name: string };
type Company = { id: string; org_id?: string; name: string; domain?: string | null; industry?: string | null; size?: string | null; website?: string | null; notes?: string | null; created_at?: string };
type Contact = { id: string; org_id?: string; owner_id?: string | null; company_id?: string | null; name?: string | null; full_name?: string | null; email?: string | null; phone?: string | null; title?: string | null; status?: string | null; notes?: string | null; created_at?: string; updated_at?: string };
type Deal = { id: string; org_id?: string; owner_id?: string | null; company_id?: string | null; contact_id?: string | null; title: string; amount_coins?: number; value_coins?: number; stage: string; probability?: number | null; expected_close?: string | null; expected_close_date?: string | null; lost_reason?: string | null; notes?: string | null; created_at?: string };
type Activity = { id: string; org_id?: string; deal_id?: string | null; contact_id?: string | null; company_id?: string | null; title?: string | null; body?: string | null; kind?: string | null; due_at?: string | null; done: boolean; created_at?: string };
type InvoiceLine = { label: string; qty: number; unit_coins: number };
type Invoice = { id: string; org_id?: string; company_id?: string | null; number: string; status: string; due_at?: string | null; due_date?: string | null; lines?: InvoiceLine[]; items?: InvoiceLine[]; total_coins?: number; notes?: string | null; created_at?: string };
type StageStat = { count: number; coins: number };
type Summary = { total_pipeline_coins: number; won_coins: number; open_deals: number; overdue_activities: number; unpaid_invoices: number; unpaid_coins: number; stage_breakdown?: Record<string, StageStat>; weighted_coins?: number; win_rate?: number; avg_deal_coins?: number; activity_total?: number; activity_done?: number; activity_completion_pct?: number };

type Tab = "dashboard" | "pipeline" | "contacts" | "companies" | "activities" | "invoices" | "reports";

const TABS: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "pipeline", label: "Pipeline" },
  { key: "contacts", label: "Contacts" },
  { key: "companies", label: "Companies" },
  { key: "activities", label: "Activities" },
  { key: "invoices", label: "Invoices" },
  { key: "reports", label: "Reports" },
];

const STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;

// Auto-default win probability per stage (mirrors the deals API fallback).
const STAGE_DEFAULT_PROBABILITY: Record<string, number> = {
  lead: 10,
  qualified: 25,
  proposal: 50,
  negotiation: 75,
  won: 100,
  lost: 0,
};

// Short lost-reason codes for the pipeline dropdown (API also passes through
// short free text).
const LOST_REASONS = ["price", "timing", "competitor", "fit", "ghosted", "other"] as const;

type DealSortKey = "value_desc" | "value_asc" | "close_asc" | "close_desc" | "newest";

function dealProbability(d: Deal): number {
  const raw = Number(d.probability);
  if (Number.isFinite(raw)) return Math.min(100, Math.max(0, Math.floor(raw)));
  return STAGE_DEFAULT_PROBABILITY[d.stage] ?? 10;
}

function dealCloseDate(d: Deal): string {
  return String(d.expected_close ?? d.expected_close_date ?? "").slice(0, 10);
}

// 100 Vibe Coins = $1 USD (matches docs + invoice-manager convention).
function coinsToUsd(coins: number): string {
  return `$${(Number(coins || 0) / 100).toFixed(2)}`;
}

function weightedDealValue(d: Deal): number {
  return Math.round((dealAmount(d) * dealProbability(d)) / 100);
}

const RECENT_SEARCH_KEY = "crm-recent-searches";
const MAX_RECENT_SEARCHES = 5;

function normalizedNeedle(query: string): string {
  return query.trim().toLowerCase();
}

function matchesNeedle(haystack: (string | number | null | undefined)[], needle: string): boolean {
  if (!needle) return true;
  const hay = haystack.filter((v) => v !== null && v !== undefined && String(v) !== "").join(" ").toLowerCase();
  return hay.includes(needle);
}

function companyNameOf(companies: { id: string; name: string }[], id?: string | null): string {
  return companies.find((c) => c.id === id)?.name ?? "—";
}

function Highlight({ text, needle }: { text: string; needle: string }) {
  const q = needle.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const target = q.toLowerCase();
  const parts: { chunk: string; match: boolean }[] = [];
  let i = 0;
  for (;;) {
    const at = lower.indexOf(target, i);
    if (at === -1) {
      parts.push({ chunk: text.slice(i), match: false });
      break;
    }
    if (at > i) parts.push({ chunk: text.slice(i, at), match: false });
    parts.push({ chunk: text.slice(at, at + target.length), match: true });
    i = at + target.length;
    if (i >= text.length) break;
  }
  return (
    <>
      {parts.map((p, idx) =>
        p.match ? (
          <mark key={idx} className="rounded bg-cyan-300/80 px-0.5 text-slate-950">{p.chunk}</mark>
        ) : (
          <span key={idx}>{p.chunk}</span>
        ),
      )}
    </>
  );
}

function SearchEmptyState({ title, hint, onClear }: { title: string; hint: string; onClear: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{hint}</p>
      <button type="button" onClick={onClear} aria-label="Clear search" className="mt-3 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10">
        Clear search
      </button>
    </div>
  );
}

const RECENT_ORGS_KEY = "crm:recent-orgs";
const RECENT_ORGS_MAX = 5;

/** Short team-attribution handle: first 8 of owner_id, fail-open to "—". */
function ownerShort(ownerId?: string | null): string {
  if (!ownerId) return "—";
  return ownerId.length > 8 ? ownerId.slice(0, 8) : ownerId;
}

function readRecentOrgs(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_ORGS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string").slice(0, RECENT_ORGS_MAX);
  } catch { /* fail-open: no recents */ }
  return [];
}

function writeRecentOrgs(ids: string[]) {
  try {
    localStorage.setItem(RECENT_ORGS_KEY, JSON.stringify(ids.slice(0, RECENT_ORGS_MAX)));
  } catch { /* fail-open: private mode etc. */ }
}

/** Fail-open auto-log: record a deal-stage move as a crm_activities note row. */
async function logDealStageActivity(orgId: string, deal: Deal, from: string, to: string): Promise<void> {
  try {
    await request("/api/crm/activities", {
      method: "POST",
      body: JSON.stringify({
        org_id: orgId,
        kind: "note",
        deal_id: deal.id,
        body: `Deal "${deal.title}" moved ${from} → ${to}.`,
      }),
    });
  } catch { /* fail-open: the stage move itself already succeeded */ }
}

function GhostCashDisclaimer() {
  return (
    <p className="rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-xs text-amber-200">
      👻💵 Ghost Cash does not apply here — invoices are <b>real coin accounting</b> (100 coins = $1.00),
      not hypothetical org IOUs. For time-based Ghost Cash books, see <a className="font-bold underline" href="/timer">/timer</a>.
    </p>
  );
}

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

// --- Company 360 field helpers (tolerate legacy UI keys + DB column names) ---
function contactName(c: Contact): string {
  return c.name ?? c.full_name ?? "Unnamed";
}
function dealAmount(d: Deal): number {
  return Number(d.amount_coins ?? d.value_coins ?? 0);
}
function isOpenDeal(d: Deal): boolean {
  return d.stage !== "won" && d.stage !== "lost";
}
function invoiceLinesOf(v: Invoice): InvoiceLine[] {
  return v.lines ?? v.items ?? [];
}
function invoiceTotalOf(v: Invoice): number {
  return Number(v.total_coins ?? invoiceLinesOf(v).reduce((n, l) => n + Number(l.qty || 0) * Number(l.unit_coins || 0), 0));
}
function isUnpaidInvoice(v: Invoice): boolean {
  return ["unpaid", "draft", "sent"].includes(String(v.status));
}
function activityTitle(a: Activity): string {
  return a.title ?? a.body ?? "(untitled)";
}

// Dashboard: 100 coins = exactly $1.00 (mirrors COINS_PER_USD in crm-reports).
const COINS_PER_USD = 100;
function fmtCoins(coins: number, showUsd: boolean): string {
  const n = Number(coins ?? 0) || 0;
  return showUsd ? `$${(n / COINS_PER_USD).toFixed(2)}` : `${n}`;
}

// --- Activities: kinds, overdue + day-bucket helpers (client-side; mirrors API filters) ---
const ACT_KINDS = ["note", "call", "email", "meeting", "task"] as const;
const ACT_KIND_ICON: Record<string, string> = { note: "📝", call: "📞", email: "✉️", meeting: "🤝", task: "✅" };
function activityKind(a: Activity): string {
  const k = (a.kind ?? "note").toLowerCase();
  return (ACT_KINDS as readonly string[]).includes(k) ? k : "note";
}
function activityKindIcon(a: Activity): string {
  return ACT_KIND_ICON[activityKind(a)] ?? "📝";
}
function isActivityOverdue(a: Activity, now = Date.now()): boolean {
  return !a.done && !!a.due_at && new Date(a.due_at).getTime() < now;
}
function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function activityDayBucket(a: Activity, todayStart: number): "overdue" | "today" | "upcoming" | "nodate" | "done" {
  if (a.done) return "done";
  if (!a.due_at) return "nodate";
  const t = new Date(a.due_at).getTime();
  if (Number.isNaN(t)) return "nodate";
  if (t < Date.now()) return "overdue";
  const day = 24 * 60 * 60 * 1000;
  if (t < todayStart + day) return "today";
  return "upcoming";
}
function toDateInputValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function faviconFor(c: Company): string {
  const host = (c.domain?.trim() || c.website?.trim() || "").replace(/^https?:\/\//i, "").split("/")[0];
  return host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64` : "";
}
// Health score: contacts*2 + open deals*5 + won/100.
function healthScore(nContacts: number, nOpenDeals: number, wonCoins: number): number {
  return Math.round((nContacts * 2 + nOpenDeals * 5 + wonCoins / 100) * 10) / 10;
}

const inputCls = "min-w-0 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none";
const cardCls = "rounded-2xl border border-white/10 bg-white/[.04] p-5";
const btnCls = "min-h-[44px] rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none";
const ghostBtnCls = "min-h-[36px] rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none";
const stageBtnCls = "min-h-[44px] min-w-[44px] rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none";
const tabBtnBase = "min-h-[44px] rounded-lg px-3 py-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none";

export function CrmWorkspace() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [recentOrgs, setRecentOrgs] = useState<string[]>([]);
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
  const [showUsd, setShowUsd] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  // Create-form state
  const [coName, setCoName] = useState("");
  const [coDomain, setCoDomain] = useState("");
  const [coIndustry, setCoIndustry] = useState("");
  const [coSize, setCoSize] = useState("");
  const [coWebsite, setCoWebsite] = useState("");
  const [coNotes, setCoNotes] = useState("");
  // Company 360 directory state (server search/pagination + industry filter + A-Z sort)
  const [dirRows, setDirRows] = useState<Company[]>([]);
  const [dirTotal, setDirTotal] = useState<number | null>(null);
  const [dirBusy, setDirBusy] = useState(false);
  const [indFilter, setIndFilter] = useState("");
  const [sortAZ, setSortAZ] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const PAGE_SIZE = 20;
  const [ctName, setCtName] = useState("");
  const [ctEmail, setCtEmail] = useState("");
  const [ctCompany, setCtCompany] = useState("");
  const [ctPhone, setCtPhone] = useState("");
  const [ctTitle, setCtTitle] = useState("");
  const [ctStatus, setCtStatus] = useState("lead");
  const [ctNotes, setCtNotes] = useState("");
  // Contact directory: status + company filters, detail drawer, CSV import/export.
  const [ctStatusFilter, setCtStatusFilter] = useState("");
  const [ctCompanyFilter, setCtCompanyFilter] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [editContact, setEditContact] = useState({ name: "", email: "", phone: "", title: "", status: "lead", notes: "", company_id: "" });
  const [csvBusy, setCsvBusy] = useState(false);
  // Bulk selection (contacts + companies) for bulk-delete.
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  // Inline edit drafts (prefilled when an Edit button opens them).
  const [editingCompany, setEditingCompany] = useState({ id: "", name: "", domain: "", industry: "", size: "", website: "", notes: "" });
  const [editingDeal, setEditingDeal] = useState({ id: "", title: "", amount: "", prob: "", close: "", lost: "", notes: "", company: "", contact: "" });
  const [editingActivity, setEditingActivity] = useState({ id: "", title: "" });
  const [editingInvoice, setEditingInvoice] = useState({ id: "", status: "", notes: "" });
  const [dlTitle, setDlTitle] = useState("");
  const [dlAmount, setDlAmount] = useState("");
  const [dlCompany, setDlCompany] = useState("");
  const [dlContact, setDlContact] = useState("");
  const [dlClose, setDlClose] = useState("");
  const [dlProb, setDlProb] = useState("");
  // Pipeline filters + stage sort
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [dealSort, setDealSort] = useState<DealSortKey>("value_desc");
  const [acTitle, setAcTitle] = useState("");
  const [acDue, setAcDue] = useState("");
  const [acKind, setAcKind] = useState<string>("note");
  const [acDeal, setAcDeal] = useState("");
  const [acContact, setAcContact] = useState("");
  const [acCompany, setAcCompany] = useState("");
  // Activities filters / sort / inline due-date editing
  const [actKindFilter, setActKindFilter] = useState("all");
  const [actStatusFilter, setActStatusFilter] = useState<"all" | "open" | "done" | "overdue">("all");
  const [actSort, setActSort] = useState<"due_asc" | "due_desc" | "created_desc">("due_asc");
  const [actDealFilter, setActDealFilter] = useState("");
  const [editingDueId, setEditingDueId] = useState("");
  const [editingDueValue, setEditingDueValue] = useState("");
  const [invNumber, setInvNumber] = useState("");
  const [invCompany, setInvCompany] = useState("");
  const [invDue, setInvDue] = useState("");
  const [invLines, setInvLines] = useState<InvoiceLine[]>([{ label: "", qty: 1, unit_coins: 0 }]);

  const loadOrgs = useCallback(async () => {
    try {
      const r = await request<{ orgs: Org[] }>("/api/orgs");
      const list = r.orgs ?? [];
      setOrgs(list);
      // Per-org CRM deep link: ?org_id= auto-selects on load (fail-open to recent/first org).
      let initial = "";
      try {
        const param = new URLSearchParams(window.location.search).get("org_id") ?? "";
        if (param && list.some((o) => o.id === param)) initial = param;
      } catch { /* fail-open: keep default selection */ }
      if (!initial) {
        const recents = readRecentOrgs();
        initial = recents.find((id) => list.some((o) => o.id === id)) ?? "";
      }
      setOrgId((prev) => {
        if (prev && list.some((o) => o.id === prev)) return prev;
        return initial || list[0]?.id || "";
      });
      if (!list.length) setNotice("No orgs yet — create one in /squads first.");
    } catch (e) {
      setOrgs([]);
      setNotice(e instanceof Error ? e.message : "Unable to load orgs.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setRecentOrgs(readRecentOrgs());
    void loadOrgs();
  }, [loadOrgs]);

  // Saved recent searches (last 5) in localStorage — pure client-side.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_SEARCH_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT_SEARCHES));
      }
    } catch {
      // Ignore corrupt/unavailable storage.
    }
  }, []);

  const saveRecentSearch = useCallback((raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setRecentSearches((prev) => {
      const next = [q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT_SEARCHES);
      try {
        window.localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage failures (private mode etc.).
      }
      return next;
    });
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
    searchRef.current?.focus();
  }, []);

  // Keyboard shortcuts: "/" focuses global search, "1..N" switches tabs.
  // Ignored while typing in inputs/textareas/selects or with modifiers.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase() ?? "";
      const typing = tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable;
      if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        return;
      }
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && /^[1-9]$/.test(e.key)) {
        const next = TABS[Number(e.key) - 1];
        if (next) setTab(next.key);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Org switcher member counts: per-org roster totals, fail-open (no count on error).
  useEffect(() => {
    if (!orgs.length) return;
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        orgs.map(async (o) => {
          try {
            const r = await request<{ total?: number; members?: unknown[] }>(
              `/api/orgs/${encodeURIComponent(o.id)}/members?paged=1&limit=1`,
            );
            const total = typeof r.total === "number"
              ? r.total
              : Array.isArray(r.members) ? r.members.length : null;
            return [o.id, total] as const;
          } catch {
            return [o.id, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setMemberCounts((prev) => {
        const next = { ...prev };
        for (const [id, total] of entries) {
          if (total != null) next[id] = total;
        }
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [orgs]);

  // Track recent orgs + keep the per-org deep link in the URL (?org_id=).
  useEffect(() => {
    if (!orgId) return;
    setRecentOrgs((prev) => {
      const next = [orgId, ...prev.filter((id) => id !== orgId)].slice(0, RECENT_ORGS_MAX);
      writeRecentOrgs(next);
      return next;
    });
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("org_id") !== orgId) {
        url.searchParams.set("org_id", orgId);
        window.history.replaceState(null, "", url.toString());
      }
    } catch { /* fail-open: URL stays as-is */ }
  }, [orgId]);

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
        stage_breakdown: (b.stage_breakdown as Record<string, StageStat> | undefined) ?? undefined,
        weighted_coins: Number(b.weighted_coins ?? 0),
        win_rate: Number(b.win_rate ?? 0),
        avg_deal_coins: Number(b.avg_deal_coins ?? 0),
        activity_total: Number(b.activity_total ?? 0),
        activity_done: Number(b.activity_done ?? 0),
        activity_completion_pct: Number(b.activity_completion_pct ?? 0),
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

  // Global search: one box filters contacts + companies + deals + activities + invoices.
  const filteredCompanies = useMemo(() => {
    const needle = normalizedNeedle(query);
    if (!needle) return companies;
    return companies.filter((c) => matchesNeedle([c.name, c.domain, c.industry, c.website, c.notes], needle));
  }, [companies, query]);

  const CONTACT_STATUSES = ["lead", "active", "inactive"] as const;

  function contactInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    const bits = (parts[0][0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "");
    return bits.toUpperCase() || "?";
  }

  // Duplicate-email hints: every contact sharing an email with another contact.
  const duplicateEmails = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of contacts) {
      const e = (c.email ?? "").trim().toLowerCase();
      if (e) counts.set(e, (counts.get(e) ?? 0) + 1);
    }
    const dupes = new Set<string>();
    for (const [e, n] of counts) if (n > 1) dupes.add(e);
    return dupes;
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const needle = normalizedNeedle(query);
    return contacts.filter((c) => {
      if (ctStatusFilter && (c.status ?? "lead") !== ctStatusFilter) return false;
      if (ctCompanyFilter && (c.company_id ?? "") !== ctCompanyFilter) return false;
      if (!needle) return true;
      // Search covers name + email + phone + title + company.
      return matchesNeedle([contactName(c), c.email, c.phone, c.title, companyNameOf(companies, c.company_id)], needle);
    });
  }, [companies, contacts, query, ctStatusFilter, ctCompanyFilter]);

  const selectedContact = useMemo(
    () => (selectedContactId ? contacts.find((c) => c.id === selectedContactId) ?? null : null),
    [contacts, selectedContactId],
  );

  const filteredDeals = useMemo(() => {
    const needle = normalizedNeedle(query);
    if (!needle) return deals;
    return deals.filter((d) => matchesNeedle([d.title, d.stage, dealAmount(d), companyNameOf(companies, d.company_id)], needle));
  }, [companies, deals, query]);

  const filteredActivities = useMemo(() => {
    const needle = normalizedNeedle(query);
    if (!needle) return activities;
    return activities.filter((a) => matchesNeedle([activityTitle(a), a.kind, a.due_at, a.done ? "done" : "open"], needle));
  }, [activities, query]);

  const filteredInvoices = useMemo(() => {
    const needle = normalizedNeedle(query);
    if (!needle) return invoices;
    return invoices.filter((v) =>
      matchesNeedle(
        [v.number, v.status, companyNameOf(companies, v.company_id), invoiceTotalOf(v), ...invoiceLinesOf(v).map((l) => l.label)],
        needle,
      ),
    );
  }, [companies, invoices, query]);

  const isSearching = normalizedNeedle(query) !== "";

  // Per-tab result counts: totals when idle, filtered counts while searching.
  const tabCounts = useMemo<Record<string, number | null>>(() => ({
    dashboard: isSearching ? filteredContacts.length + filteredCompanies.length + filteredDeals.length + filteredActivities.length + filteredInvoices.length : null,
    pipeline: isSearching ? filteredDeals.length : deals.length,
    contacts: isSearching ? filteredContacts.length : contacts.length,
    companies: isSearching ? filteredCompanies.length : companies.length,
    activities: isSearching ? filteredActivities.length : activities.length,
    invoices: isSearching ? filteredInvoices.length : invoices.length,
    reports: null,
  }), [isSearching, deals, contacts, companies, activities, invoices, filteredContacts, filteredCompanies, filteredDeals, filteredActivities, filteredInvoices]);

  const dealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const s of STAGES) map.set(s, []);
    for (const d of filteredDeals) {
      const bucket = map.get(d.stage) ?? [];
      bucket.push(d);
      map.set(d.stage, bucket);
    }
    return map;
  }, [filteredDeals]);

  // Pipeline: per-column sort (by value or expected close date).
  const sortedStageRows = useCallback((rows: Deal[]): Deal[] => {
    const next = [...rows];
    switch (dealSort) {
      case "value_desc": next.sort((a, b) => dealAmount(b) - dealAmount(a)); break;
      case "value_asc": next.sort((a, b) => dealAmount(a) - dealAmount(b)); break;
      case "close_asc":
        next.sort((a, b) => (dealCloseDate(a) || "9999") < (dealCloseDate(b) || "9999") ? -1 : 1);
        break;
      case "close_desc":
        next.sort((a, b) => (dealCloseDate(a) || "") > (dealCloseDate(b) || "") ? -1 : 1);
        break;
      default:
        next.sort((a, b) => String(b.created_at ?? "") > String(a.created_at ?? "") ? 1 : -1);
    }
    return next;
  }, [dealSort]);

  // Pipeline stats: open value, probability-weighted value, win rate.
  const pipelineStats = useMemo(() => {
    const open = deals.filter((d) => isOpenDeal(d));
    const won = deals.filter((d) => d.stage === "won");
    const lost = deals.filter((d) => d.stage === "lost");
    const openValue = open.reduce((n, d) => n + dealAmount(d), 0);
    const weighted = open.reduce((n, d) => n + weightedDealValue(d), 0);
    const decided = won.length + lost.length;
    const winRate = decided === 0 ? null : Math.round((won.length / decided) * 100);
    return { openValue, weighted, winRate, wonCount: won.length, lostCount: lost.length };
  }, [deals]);

  const dealContactName = useCallback((id?: string | null): string => {
    if (!id) return "—";
    const c = contacts.find((x) => x.id === id);
    return c ? contactName(c) : "—";
  }, [contacts]);

  const stagesToShow = stageFilter === "all" ? [...STAGES] : [stageFilter];

  // --- Dashboard derived rows (client-side over already-loaded lists; no extra fetches) ---
  const stageBars = useMemo(() => {
    const rows = STAGES.map((s) => {
      const fromApi = summary?.stage_breakdown?.[s];
      const clientRows = dealsByStage.get(s) ?? [];
      return {
        stage: s,
        count: fromApi ? Number(fromApi.count ?? 0) : clientRows.length,
        coins: fromApi
          ? Number(fromApi.coins ?? 0)
          : clientRows.reduce((n, d) => n + dealAmount(d), 0),
      };
    });
    const max = Math.max(1, ...rows.map((r) => r.coins));
    return { rows, max };
  }, [summary, dealsByStage]);

  const topCompanies = useMemo(() => {
    const totals = new Map<string, { coins: number; count: number }>();
    for (const d of deals) {
      if (!isOpenDeal(d) || !d.company_id) continue;
      const e = totals.get(d.company_id) ?? { coins: 0, count: 0 };
      e.coins += dealAmount(d);
      e.count += 1;
      totals.set(d.company_id, e);
    }
    return [...totals.entries()]
      .map(([id, t]) => ({ id, name: companyNameOf(companies, id), ...t }))
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 5);
  }, [deals, companies]);

  const recentActivities = useMemo(
    () => [...activities]
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
      .slice(0, 8),
    [activities],
  );

  const overduePreview = useMemo(() => {
    const now = Date.now();
    return activities.filter((a) => isActivityOverdue(a, now)).slice(0, 5);
  }, [activities]);

  const unpaidPreview = useMemo(
    () => invoices.filter(isUnpaidInvoice).slice(0, 5),
    [invoices],
  );

  // --- Activities: progress, filters, sort, grouping (client-side over loaded rows) ---
  const activityProgress = useMemo(() => {
    const total = activities.length;
    const done = activities.filter((a) => a.done).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [activities]);

  const visibleActivities = useMemo(() => {
    const now = Date.now();
    const needle = normalizedNeedle(query);
    const matchIds = needle ? new Set(filteredActivities.map((a) => a.id)) : null;
    let rows = activities.filter((a) => {
      if (actKindFilter !== "all" && activityKind(a) !== actKindFilter) return false;
      if (actDealFilter && a.deal_id !== actDealFilter) return false;
      if (actStatusFilter === "open" && a.done) return false;
      if (actStatusFilter === "done" && !a.done) return false;
      if (actStatusFilter === "overdue" && !isActivityOverdue(a, now)) return false;
      if (matchIds && !matchIds.has(a.id)) return false;
      return true;
    });
    const dueTime = (a: Activity) => {
      const t = a.due_at ? new Date(a.due_at).getTime() : NaN;
      return Number.isNaN(t) ? null : t;
    };
    rows = [...rows].sort((x, y) => {
      if (actSort === "created_desc") return String(y.created_at ?? "").localeCompare(String(x.created_at ?? ""));
      const dx = dueTime(x);
      const dy = dueTime(y);
      if (dx == null && dy == null) return String(y.created_at ?? "").localeCompare(String(x.created_at ?? ""));
      if (dx == null) return 1;
      if (dy == null) return -1;
      return actSort === "due_desc" ? dy - dx : dx - dy;
    });
    return rows;
  }, [activities, actKindFilter, actDealFilter, actStatusFilter, actSort, query, filteredActivities]);

  const groupedActivities = useMemo(() => {
    const todayStart = startOfToday();
    const groups: { key: string; label: string; rows: Activity[] }[] = [
      { key: "overdue", label: "Overdue", rows: [] },
      { key: "today", label: "Due today", rows: [] },
      { key: "upcoming", label: "Upcoming", rows: [] },
      { key: "nodate", label: "No due date", rows: [] },
      { key: "done", label: "Done", rows: [] },
    ];
    const byKey = new Map(groups.map((g) => [g.key, g]));
    for (const a of visibleActivities) {
      byKey.get(activityDayBucket(a, todayStart))?.rows.push(a);
    }
    return groups.filter((g) => g.rows.length > 0);
  }, [visibleActivities]);

  const invDraftTotal = invLines.reduce((n, l) => n + Number(l.qty || 0) * Number(l.unit_coins || 0), 0);
  const companyName = (id?: string | null) => companies.find((c) => c.id === id)?.name ?? "—";
  const activeOrg = orgs.find((o) => o.id === orgId) ?? null;
  const activeMemberCount = orgId ? memberCounts[orgId] : undefined;

  // Server-side company directory: GET /api/crm/companies?org_id=&q=&industry=&limit=&offset=&sort=&order=.
  const loadDirectory = useCallback(async (org: string, qText: string, industry: string, pageNum: number, az: boolean) => {
    if (!org) return;
    setDirBusy(true);
    try {
      const p = new URLSearchParams({ org_id: org, limit: String(PAGE_SIZE), offset: String(pageNum * PAGE_SIZE) });
      if (qText.trim()) p.set("q", qText.trim());
      if (industry) p.set("industry", industry);
      if (az) { p.set("sort", "name"); p.set("order", "asc"); }
      const body = await request<{ companies?: Company[]; total?: number | null }>(`/api/crm/companies?${p.toString()}`);
      setDirRows(Array.isArray(body.companies) ? body.companies : []);
      setDirTotal(typeof body.total === "number" ? body.total : null);
    } catch {
      setDirRows([]);
      setDirTotal(null);
    } finally {
      setDirBusy(false);
    }
  }, []);

  // Reset to first page when the search text or industry filter changes.
  useEffect(() => {
    setPage(0);
  }, [query, indFilter]);

  useEffect(() => {
    if (orgId && tab === "companies") void loadDirectory(orgId, query, indFilter, page, sortAZ);
  }, [orgId, tab, query, indFilter, page, sortAZ, loadDirectory]);

  const industries = useMemo(() => {
    const set = new Set<string>();
    for (const c of companies) if (c.industry?.trim()) set.add(c.industry.trim());
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [companies]);

  const dirVisible = useMemo(() => {
    const rows = dirRows.slice();
    if (sortAZ) rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [dirRows, sortAZ]);

  const selectedCompany = selectedCompanyId
    ? companies.find((c) => c.id === selectedCompanyId) ?? dirRows.find((c) => c.id === selectedCompanyId) ?? null
    : null;

  const selectedStats = useMemo(() => {
    if (!selectedCompany) return null;
    const id = selectedCompany.id;
    const coContacts = contacts.filter((c) => c.company_id === id);
    const coDeals = deals.filter((d) => d.company_id === id);
    const openDeals = coDeals.filter(isOpenDeal);
    const wonTotal = coDeals.filter((d) => d.stage === "won").reduce((n, d) => n + dealAmount(d), 0);
    const openTotal = openDeals.reduce((n, d) => n + dealAmount(d), 0);
    const unpaidTotal = invoices.filter((v) => v.company_id === id && isUnpaidInvoice(v)).reduce((n, v) => n + invoiceTotalOf(v), 0);
    const dealIds = new Set(coDeals.map((d) => d.id));
    const contactIds = new Set(coContacts.map((c) => c.id));
    const recent = activities
      .filter((a) => a.company_id === id || (a.deal_id != null && dealIds.has(a.deal_id)) || (a.contact_id != null && contactIds.has(a.contact_id)))
      .slice()
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
      .slice(0, 5);
    return {
      contactsCount: coContacts.length,
      openCount: openDeals.length,
      openTotal,
      wonTotal,
      unpaidTotal,
      score: healthScore(coContacts.length, openDeals.length, wonTotal),
      coContacts,
      recent,
    };
  }, [selectedCompany, contacts, deals, invoices, activities]);

  async function copyDeepLink() {
    if (!orgId) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("org_id", orgId);
      await navigator.clipboard.writeText(url.toString());
      setNotice("Per-org CRM link copied.");
    } catch {
      setNotice("Copy failed — use the ?org_id= URL in the address bar.");
    }
  }

  async function moveDeal(id: string, stage: string, lostReason?: string) {
    setNotice("");
    const deal = deals.find((d) => d.id === id);
    const from = deal?.stage ?? "unknown";
    try {
      const body: Record<string, unknown> = { id, stage, org_id: orgId };
      // Mirror the API stage auto-defaults optimistically; carry an explicit
      // lost reason when moving to lost, clear it when leaving lost.
      body.probability = STAGE_DEFAULT_PROBABILITY[stage] ?? 10;
      if (stage === "lost") {
        if (lostReason) body.lost_reason = lostReason;
      } else {
        body.lost_reason = null;
      }
      await request(`/api/crm/deals`, { method: "PATCH", body: JSON.stringify(body) });
      setDeals((prev) => prev.map((d) =>
        d.id === id
          ? {
              ...d, stage,
              probability: Number(body.probability),
              lost_reason: stage === "lost" ? (String(lostReason ?? d.lost_reason ?? "") || null) : null,
            }
          : d,
      ));
      setNotice(`Deal moved to ${stage}.`);
      if (deal) void logDealStageActivity(orgId, deal, from, stage);
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

  async function updateActivityDue(a: Activity, dueInput: string) {
    setNotice("");
    try {
      const due_at = dueInput ? new Date(`${dueInput}T00:00:00`).toISOString() : null;
      await request(`/api/crm/activities`, {
        method: "PATCH",
        body: JSON.stringify({ id: a.id, due_at, org_id: orgId }),
      });
      setActivities((prev) => prev.map((x) => (x.id === a.id ? { ...x, due_at } : x)));
      setEditingDueId("");
      setNotice("Due date updated.");
    } catch (e) {
      setNotice(friendlyApiError("Activity due date", e));
    }
  }

  async function quickAddActivity(daysOut: number) {
    if (!orgId) { setNotice("Pick an org first."); return; }
    const title = acTitle.trim() || (daysOut <= 1 ? "Follow up tomorrow" : "Follow up next week");
    setNotice("");
    try {
      await request(`/api/crm/activities`, {
        method: "POST",
        body: JSON.stringify({
          org_id: orgId,
          kind: (ACT_KINDS as readonly string[]).includes(acKind) ? acKind : "note",
          body: title,
          due_at: addDaysISO(daysOut),
          deal_id: acDeal || undefined,
          contact_id: acContact || undefined,
          company_id: acCompany || undefined,
        }),
      });
      setAcTitle("");
      setNotice(daysOut <= 1 ? "Activity added for tomorrow." : "Activity added for next week.");
      void loadAll(orgId);
    } catch (err) { setNotice(friendlyApiError("Create activity", err)); }
  }

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !coName.trim()) { setNotice("Pick an org and name the company."); return; }
    try {
      await request(`/api/crm/companies`, {
        method: "POST",
        body: JSON.stringify({
          org_id: orgId,
          name: coName.trim(),
          domain: coDomain.trim() || undefined,
          industry: coIndustry.trim() || undefined,
          size: coSize.trim() || undefined,
          website: coWebsite.trim() || undefined,
          notes: coNotes.trim() || undefined,
        }),
      });
      setCoName(""); setCoDomain(""); setCoIndustry(""); setCoSize(""); setCoWebsite(""); setCoNotes("");
      setNotice("Company created.");
      setPage(0);
      setSelectedCompanyId(null);
      void loadAll(orgId);
      void loadDirectory(orgId, query, indFilter, 0, sortAZ);
    } catch (err) { setNotice(friendlyApiError("Create company", err)); }
  }

  async function createContact(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !ctName.trim()) { setNotice("Pick an org and name the contact."); return; }
    const email = ctEmail.trim();
    if (email && duplicateEmails.has(email.toLowerCase())) {
      setNotice(`Heads up: ${email} already exists — creating a possible duplicate.`);
    }
    try {
      await request(`/api/crm/contacts`, {
        method: "POST",
        body: JSON.stringify({
          org_id: orgId,
          full_name: ctName.trim().slice(0, 120),
          email: email || undefined,
          phone: ctPhone.trim().slice(0, 40) || undefined,
          title: ctTitle.trim().slice(0, 120) || undefined,
          status: (CONTACT_STATUSES as readonly string[]).includes(ctStatus) ? ctStatus : "lead",
          notes: ctNotes.trim().slice(0, 2000) || undefined,
          company_id: ctCompany || undefined,
        }),
      });
      setCtName(""); setCtEmail(""); setCtCompany(""); setCtPhone(""); setCtTitle(""); setCtStatus("lead"); setCtNotes("");
      setNotice("Contact created.");
      void loadAll(orgId);
    } catch (err) { setNotice(friendlyApiError("Create contact", err)); }
  }

  function openContact(c: Contact) {
    setSelectedContactId(c.id);
    setEditContact({
      name: contactName(c),
      email: c.email ?? "",
      phone: c.phone ?? "",
      title: c.title ?? "",
      status: c.status ?? "lead",
      notes: c.notes ?? "",
      company_id: c.company_id ?? "",
    });
    setNotice("");
  }

  async function saveContact(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedContactId) return;
    if (!editContact.name.trim()) { setNotice("Contact name must not be empty."); return; }
    try {
      const r = await request<{ contact: Contact }>(`/api/crm/contacts`, {
        method: "PATCH",
        body: JSON.stringify({
          id: selectedContactId,
          org_id: orgId,
          full_name: editContact.name.trim().slice(0, 120),
          email: editContact.email.trim() || null,
          phone: editContact.phone.trim().slice(0, 40) || null,
          title: editContact.title.trim().slice(0, 120) || null,
          status: editContact.status,
          notes: editContact.notes.trim().slice(0, 2000) || null,
          company_id: editContact.company_id || null,
        }),
      });
      const updated = r.contact;
      if (updated) setContacts((prev) => prev.map((c) => (c.id === selectedContactId ? { ...c, ...updated } : c)));
      setNotice("Contact updated.");
    } catch (err) { setNotice(friendlyApiError("Update contact", err)); }
  }

  async function deleteContact(id: string) {
    const target = contacts.find((c) => c.id === id);
    if (!target) return;
    if (!window.confirm(`Delete contact "${contactName(target)}"? This cannot be undone.`)) return;
    setNotice("");
    const prev = contacts;
    setContacts((rows) => rows.filter((c) => c.id !== id));
    setSelectedContacts((rows) => rows.filter((x) => x !== id));
    if (selectedContactId === id) setSelectedContactId(null);
    try {
      await request(`/api/crm/contacts`, { method: "DELETE", body: JSON.stringify({ id, org_id: orgId }) });
      setNotice("Contact deleted.");
      void loadAll(orgId);
    } catch (err) {
      setContacts(prev);
      setNotice(friendlyApiError("Delete contact", err));
    }
  }

  async function bulkDeleteContacts() {
    if (!selectedContacts.length) return;
    if (!window.confirm(`Delete ${selectedContacts.length} contact${selectedContacts.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setNotice("");
    const prev = contacts;
    const ids = new Set(selectedContacts);
    setContacts((rows) => rows.filter((c) => !ids.has(c.id)));
    setSelectedContacts([]);
    if (selectedContactId && ids.has(selectedContactId)) setSelectedContactId(null);
    try {
      for (const id of ids) {
        await request(`/api/crm/contacts`, { method: "DELETE", body: JSON.stringify({ id, org_id: orgId }) });
      }
      setNotice("Selected contacts deleted.");
      void loadAll(orgId);
    } catch (err) {
      setContacts(prev);
      setNotice(friendlyApiError("Bulk delete contacts", err));
    }
  }

  function openCompanyEdit(c: Company) {
    setEditingCompany({
      id: c.id, name: c.name ?? "", domain: c.domain ?? "", industry: c.industry ?? "",
      size: c.size ?? "", website: c.website ?? "", notes: c.notes ?? "",
    });
    setNotice("");
  }

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCompany.id) return;
    if (!editingCompany.name.trim()) { setNotice("Company name must not be empty."); return; }
    setNotice("");
    const prev = companies;
    const patch: Partial<Company> = {
      name: editingCompany.name.trim().slice(0, 120),
      domain: editingCompany.domain.trim() || null,
      industry: editingCompany.industry.trim() || null,
      size: editingCompany.size.trim() || null,
      website: editingCompany.website.trim() || null,
      notes: editingCompany.notes.trim() || null,
    };
    setCompanies((rows) => rows.map((c) => (c.id === editingCompany.id ? { ...c, ...patch } : c)));
    try {
      const r = await request<{ company: Company }>(`/api/crm/companies`, {
        method: "PATCH",
        body: JSON.stringify({ id: editingCompany.id, org_id: orgId, ...patch }),
      });
      if (r.company) setCompanies((rows) => rows.map((c) => (c.id === editingCompany.id ? { ...c, ...r.company } : c)));
      setDirRows((rows) => rows.map((c) => (c.id === editingCompany.id ? { ...c, ...patch } : c)));
      setEditingCompany({ id: "", name: "", domain: "", industry: "", size: "", website: "", notes: "" });
      setNotice("Company updated.");
    } catch (err) {
      setCompanies(prev);
      setNotice(friendlyApiError("Update company", err));
    }
  }

  async function deleteCompany(id: string) {
    const target = companies.find((c) => c.id === id) ?? dirRows.find((c) => c.id === id);
    if (!target) return;
    if (!window.confirm(`Delete company "${target.name}"? Linked rows keep working (links set to empty).`)) return;
    setNotice("");
    const prev = companies;
    const prevDir = dirRows;
    setCompanies((rows) => rows.filter((c) => c.id !== id));
    setDirRows((rows) => rows.filter((c) => c.id !== id));
    setSelectedCompanies((rows) => rows.filter((x) => x !== id));
    if (selectedCompanyId === id) setSelectedCompanyId(null);
    try {
      await request(`/api/crm/companies`, { method: "DELETE", body: JSON.stringify({ id, org_id: orgId }) });
      setNotice("Company deleted.");
      void loadAll(orgId);
    } catch (err) {
      setCompanies(prev);
      setDirRows(prevDir);
      setNotice(friendlyApiError("Delete company", err));
    }
  }

  async function bulkDeleteCompanies() {
    if (!selectedCompanies.length) return;
    if (!window.confirm(`Delete ${selectedCompanies.length} ${selectedCompanies.length === 1 ? "company" : "companies"}? This cannot be undone.`)) return;
    setNotice("");
    const prev = companies;
    const prevDir = dirRows;
    const ids = new Set(selectedCompanies);
    setCompanies((rows) => rows.filter((c) => !ids.has(c.id)));
    setDirRows((rows) => rows.filter((c) => !ids.has(c.id)));
    setSelectedCompanies([]);
    if (selectedCompanyId && ids.has(selectedCompanyId)) setSelectedCompanyId(null);
    try {
      for (const id of ids) {
        await request(`/api/crm/companies`, { method: "DELETE", body: JSON.stringify({ id, org_id: orgId }) });
      }
      setNotice("Selected companies deleted.");
      void loadAll(orgId);
    } catch (err) {
      setCompanies(prev);
      setDirRows(prevDir);
      setNotice(friendlyApiError("Bulk delete companies", err));
    }
  }

  function openDealEdit(d: Deal) {
    setEditingDeal({
      id: d.id,
      title: d.title ?? "",
      amount: String(dealAmount(d)),
      prob: String(dealProbability(d)),
      close: dealCloseDate(d),
      lost: String(d.lost_reason ?? ""),
      notes: String(d.notes ?? ""),
      company: String(d.company_id ?? ""),
      contact: String(d.contact_id ?? ""),
    });
    setNotice("");
  }

  async function saveDeal(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDeal.id) return;
    if (!editingDeal.title.trim()) { setNotice("Deal title must not be empty."); return; }
    const coins = Math.max(0, Math.floor(Number(editingDeal.amount || 0)));
    if (!Number.isFinite(coins)) { setNotice("Deal amount must be a number."); return; }
    const probRaw = editingDeal.prob.trim();
    const prob = probRaw === "" ? undefined : Math.floor(Number(probRaw));
    if (prob !== undefined && (!Number.isFinite(prob) || prob < 0 || prob > 100)) {
      setNotice("Probability must be 0–100.");
      return;
    }
    const closeRaw = editingDeal.close.trim();
    if (closeRaw && !/^\d{4}-\d{2}-\d{2}$/.test(closeRaw)) {
      setNotice("Expected close must be YYYY-MM-DD.");
      return;
    }
    setNotice("");
    const prev = deals;
    const patch: Record<string, unknown> = {
      id: editingDeal.id, org_id: orgId,
      title: editingDeal.title.trim(), value_coins: coins,
      probability: prob,
      expected_close: closeRaw || null,
      lost_reason: editingDeal.lost.trim() || null,
      notes: editingDeal.notes.trim() || null,
      company_id: editingDeal.company || null,
      contact_id: editingDeal.contact || null,
    };
    setDeals((rows) => rows.map((d) => (d.id === editingDeal.id ? {
      ...d,
      title: editingDeal.title.trim(), value_coins: coins, amount_coins: coins,
      probability: prob ?? dealProbability(d),
      expected_close: closeRaw || null,
      lost_reason: editingDeal.lost.trim() || null,
      notes: editingDeal.notes.trim() || null,
      company_id: editingDeal.company || null,
      contact_id: editingDeal.contact || null,
    } : d)));
    try {
      const r = await request<{ deal: Deal }>(`/api/crm/deals`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (r.deal) setDeals((rows) => rows.map((d) => (d.id === editingDeal.id ? { ...d, ...r.deal } : d)));
      setEditingDeal({ id: "", title: "", amount: "", prob: "", close: "", lost: "", notes: "", company: "", contact: "" });
      setNotice("Deal updated.");
    } catch (err) {
      setDeals(prev);
      setNotice(friendlyApiError("Update deal", err));
    }
  }

  async function deleteDeal(id: string) {
    const target = deals.find((d) => d.id === id);
    if (!target) return;
    if (!window.confirm(`Delete deal "${target.title}"? This cannot be undone.`)) return;
    setNotice("");
    const prev = deals;
    setDeals((rows) => rows.filter((d) => d.id !== id));
    if (editingDeal.id === id) setEditingDeal({ id: "", title: "", amount: "", prob: "", close: "", lost: "", notes: "", company: "", contact: "" });
    try {
      await request(`/api/crm/deals`, { method: "DELETE", body: JSON.stringify({ id, org_id: orgId }) });
      setNotice("Deal deleted.");
      void loadAll(orgId);
    } catch (err) {
      setDeals(prev);
      setNotice(friendlyApiError("Delete deal", err));
    }
  }

  function openActivityEdit(a: Activity) {
    setEditingActivity({ id: a.id, title: activityTitle(a) });
    setNotice("");
  }

  async function saveActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!editingActivity.id) return;
    if (!editingActivity.title.trim()) { setNotice("Activity text must not be empty."); return; }
    setNotice("");
    const prev = activities;
    setActivities((rows) => rows.map((a) => (a.id === editingActivity.id ? { ...a, title: editingActivity.title.trim(), body: editingActivity.title.trim() } : a)));
    try {
      const r = await request<{ activity: Activity }>(`/api/crm/activities`, {
        method: "PATCH",
        body: JSON.stringify({ id: editingActivity.id, org_id: orgId, body: editingActivity.title.trim() }),
      });
      if (r.activity) setActivities((rows) => rows.map((a) => (a.id === editingActivity.id ? { ...a, ...r.activity } : a)));
      setEditingActivity({ id: "", title: "" });
      setNotice("Activity updated.");
    } catch (err) {
      setActivities(prev);
      setNotice(friendlyApiError("Update activity", err));
    }
  }

  async function deleteActivity(id: string) {
    const target = activities.find((a) => a.id === id);
    if (!target) return;
    if (!window.confirm(`Delete activity "${activityTitle(target).slice(0, 80)}"? This cannot be undone.`)) return;
    setNotice("");
    const prev = activities;
    setActivities((rows) => rows.filter((a) => a.id !== id));
    if (editingActivity.id === id) setEditingActivity({ id: "", title: "" });
    try {
      await request(`/api/crm/activities`, { method: "DELETE", body: JSON.stringify({ id, org_id: orgId }) });
      setNotice("Activity deleted.");
      void loadAll(orgId);
    } catch (err) {
      setActivities(prev);
      setNotice(friendlyApiError("Delete activity", err));
    }
  }

  function openInvoiceEdit(v: Invoice) {
    setEditingInvoice({ id: v.id, status: v.status ?? "draft", notes: v.notes ?? "" });
    setNotice("");
  }

  async function saveInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!editingInvoice.id) return;
    setNotice("");
    const prev = invoices;
    setInvoices((rows) => rows.map((v) => (v.id === editingInvoice.id ? { ...v, status: editingInvoice.status, notes: editingInvoice.notes } : v)));
    try {
      const r = await request<{ invoice: Invoice }>(`/api/crm/invoices`, {
        method: "PATCH",
        body: JSON.stringify({ id: editingInvoice.id, org_id: orgId, status: editingInvoice.status, notes: editingInvoice.notes }),
      });
      if (r.invoice) setInvoices((rows) => rows.map((v) => (v.id === editingInvoice.id ? { ...v, ...r.invoice } : v)));
      setEditingInvoice({ id: "", status: "", notes: "" });
      setNotice("Invoice updated.");
    } catch (err) {
      setInvoices(prev);
      setNotice(friendlyApiError("Update invoice", err));
    }
  }

  async function deleteInvoice(id: string) {
    const target = invoices.find((v) => v.id === id);
    if (!target) return;
    if (!window.confirm(`Delete invoice "${target.number}"? Its line items go with it.`)) return;
    setNotice("");
    const prev = invoices;
    setInvoices((rows) => rows.filter((v) => v.id !== id));
    if (editingInvoice.id === id) setEditingInvoice({ id: "", status: "", notes: "" });
    try {
      await request(`/api/crm/invoices`, { method: "DELETE", body: JSON.stringify({ id, org_id: orgId }) });
      setNotice("Invoice deleted.");
      void loadAll(orgId);
    } catch (err) {
      setInvoices(prev);
      setNotice(friendlyApiError("Delete invoice", err));
    }
  }

  function csvCell(v: unknown): string {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function exportContactsCsv() {
    const rows: string[][] = [["full_name", "email", "phone", "title", "status", "notes", "company"]];
    for (const c of filteredContacts) {
      rows.push([
        contactName(c), c.email ?? "", c.phone ?? "", c.title ?? "",
        c.status ?? "lead", c.notes ?? "", companyNameOf(companies, c.company_id),
      ]);
    }
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${filteredContacts.length} contact${filteredContacts.length === 1 ? "" : "s"} to CSV.`);
  }

  // Minimal client-side CSV parser (handles quoted fields + escaped quotes).
  function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else quoted = false;
        } else field += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch === "\r") { /* skip */ }
      else field += ch;
    }
    row.push(field);
    if (row.length > 1 || row[0].trim() !== "") rows.push(row);
    return rows;
  }

  async function importContactsCsv(file: File) {
    if (!orgId) { setNotice("Pick an org first."); return; }
    setCsvBusy(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
      if (rows.length < 2) { setNotice("CSV is empty — add a header row plus at least one contact."); return; }
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (names: string[]) => {
        for (const n of names) {
          const at = header.indexOf(n);
          if (at !== -1) return at;
        }
        return -1;
      };
      // Accept full_name or legacy name header; company matches by name.
      const iName = idx(["full_name", "name"]);
      const iEmail = idx(["email"]);
      const iPhone = idx(["phone"]);
      const iTitle = idx(["title"]);
      const iStatus = idx(["status"]);
      const iNotes = idx(["notes"]);
      const iCompany = idx(["company", "company_name"]);
      if (iName === -1) { setNotice("CSV needs a full_name (or name) column."); return; }
      const byCompany = new Map(companies.map((c) => [c.name.trim().toLowerCase(), c.id]));
      let created = 0;
      const errors: string[] = [];
      for (let r = 1; r < rows.length; r++) {
        const cols = rows[r];
        const fullName = (cols[iName] ?? "").trim().slice(0, 120);
        if (!fullName) { errors.push(`row ${r + 1}: missing name`); continue; }
        const email = iEmail === -1 ? "" : (cols[iEmail] ?? "").trim().slice(0, 160);
        const statusRaw = (iStatus === -1 ? "lead" : (cols[iStatus] ?? "").trim().toLowerCase()) || "lead";
        const companyRaw = iCompany === -1 ? "" : (cols[iCompany] ?? "").trim().toLowerCase();
        try {
          await request(`/api/crm/contacts`, {
            method: "POST",
            body: JSON.stringify({
              org_id: orgId,
              full_name: fullName,
              email: email || undefined,
              phone: iPhone === -1 ? undefined : ((cols[iPhone] ?? "").trim().slice(0, 40) || undefined),
              title: iTitle === -1 ? undefined : ((cols[iTitle] ?? "").trim().slice(0, 120) || undefined),
              status: (CONTACT_STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : "lead",
              notes: iNotes === -1 ? undefined : ((cols[iNotes] ?? "").trim().slice(0, 2000) || undefined),
              company_id: (companyRaw && byCompany.get(companyRaw)) || undefined,
            }),
          });
          created++;
        } catch (err) {
          errors.push(`row ${r + 1}: ${err instanceof Error ? err.message : "failed"}`);
        }
      }
      setNotice(
        `CSV import: ${created} contact${created === 1 ? "" : "s"} created` +
        (errors.length ? `. ${errors.length} skipped (${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "; …" : ""})` : "."),
      );
      void loadAll(orgId);
    } catch (err) {
      setNotice(friendlyApiError("CSV import", err));
    } finally {
      setCsvBusy(false);
    }
  }

  async function createDeal(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !dlTitle.trim()) { setNotice("Pick an org and title the deal."); return; }
    const probRaw = dlProb.trim();
    const prob = probRaw === "" ? undefined : Math.floor(Number(probRaw));
    if (prob !== undefined && (!Number.isFinite(prob) || prob < 0 || prob > 100)) {
      setNotice("Probability must be 0–100.");
      return;
    }
    if (dlClose.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(dlClose.trim())) {
      setNotice("Expected close must be YYYY-MM-DD.");
      return;
    }
    try {
      await request(`/api/crm/deals`, {
        method: "POST",
        body: JSON.stringify({
          org_id: orgId, title: dlTitle.trim(),
          value_coins: Number(dlAmount || 0), amount_coins: Number(dlAmount || 0),
          stage: "lead",
          probability: prob,
          expected_close: dlClose.trim() || undefined,
          company_id: dlCompany || undefined,
          contact_id: dlContact || undefined,
        }),
      });
      setDlTitle(""); setDlAmount(""); setDlCompany(""); setDlContact(""); setDlClose(""); setDlProb("");
      setNotice("Deal created in Lead.");
      void loadAll(orgId);
    } catch (err) { setNotice(friendlyApiError("Create deal", err)); }
  }

  async function createActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !acTitle.trim()) { setNotice("Pick an org and title the activity."); return; }
    if (!(ACT_KINDS as readonly string[]).includes(acKind)) { setNotice("Pick a valid kind: note, call, email, meeting, or task."); return; }
    try {
      await request(`/api/crm/activities`, {
        method: "POST",
        body: JSON.stringify({
          org_id: orgId,
          kind: acKind,
          body: acTitle.trim(),
          due_at: acDue || undefined,
          deal_id: acDeal || undefined,
          contact_id: acContact || undefined,
          company_id: acCompany || undefined,
        }),
      });
      setAcTitle(""); setAcDue(""); setAcKind("note"); setAcDeal(""); setAcContact(""); setAcCompany("");
      setNotice("Activity added.");
      void loadAll(orgId);
    } catch (err) { setNotice(friendlyApiError("Create activity", err)); }
  }

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !invNumber.trim()) { setNotice("Pick an org and set an invoice number."); return; }
    const lines = invLines.filter((l) => l.label.trim()).map((l) => ({ label: l.label.trim(), qty: Number(l.qty || 0), unit_coins: Number(l.unit_coins || 0) }));
    if (!lines.length) { setNotice("Add at least one labeled line item."); return; }
    try {
      await request(`/api/crm/invoices`, { method: "POST", body: JSON.stringify({ org_id: orgId, number: invNumber.trim(), company_id: invCompany || undefined, due_date: invDue || undefined, items: lines }) });
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
          <select id="crm-org" aria-label="Select organization" value={orgId} onChange={(e) => setOrgId(e.target.value)} className={`${inputCls} max-w-xs`}>
            <option value="">Select org…</option>
            {orgs.map((o) => {
              const count = memberCounts[o.id];
              const countSuffix = count == null ? "" : ` · ${count} member${count === 1 ? "" : "s"}`;
              return (
                <option key={o.id} value={o.id}>{o.name} (@{o.slug}{countSuffix})</option>
              );
            })}
          </select>
          {activeOrg && (
            <span className="text-xs text-slate-400" title="Active org slug and roster size">
              @{activeOrg.slug}{activeMemberCount != null ? ` · ${activeMemberCount} member${activeMemberCount === 1 ? "" : "s"}` : ""}
            </span>
          )}
          <button type="button" aria-label="Refresh CRM data" className={ghostBtnCls} onClick={() => { void loadOrgs(); if (orgId) void loadAll(orgId); }} disabled={busy}>
            {busy ? "Loading…" : "Refresh"}
          </button>
          {orgId && (
            <>
              <a className={ghostBtnCls} href={`/squads?org_id=${encodeURIComponent(orgId)}#orgs`}>View in Squads →</a>
              <a className={ghostBtnCls} href={`/squads?org_id=${encodeURIComponent(orgId)}#orgs`}>Open Org wallet →</a>
              <button type="button" className={ghostBtnCls} onClick={() => void copyDeepLink()}>Copy CRM link</button>
            </>
          )}
          <div className="ml-auto w-full sm:w-72">
            <div className="relative">
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveRecentSearch(query); }}
                placeholder="Search all CRM…  ( / to focus )"
                aria-label="Global search across contacts, companies, deals, activities, and invoices"
                type="search"
                role="searchbox"
                className={`${inputCls} w-full pr-16`}
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  title="Clear search (Esc)"
                  className="absolute right-8 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-sm font-bold text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  ×
                </button>
              )}
              <kbd aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-white/15 bg-white/5 px-1.5 text-[10px] text-slate-400">/</kbd>
            </div>
            {recentSearches.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs" aria-label="Recent searches">
                <span className="text-slate-400">Recent:</span>
                {recentSearches.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-label={`Search again for ${r}`}
                    title={`Search again for ${r}`}
                    className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-slate-300 hover:bg-white/10"
                    onClick={() => { setQuery(r); searchRef.current?.focus(); }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {recentOrgs.length > 0 && orgs.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400">Recent:</span>
            {recentOrgs.filter((id) => orgs.some((o) => o.id === id)).slice(0, RECENT_ORGS_MAX).map((id) => {
              const o = orgs.find((x) => x.id === id);
              if (!o) return null;
              return (
                <button
                  key={id}
                  type="button"
                  className={`${ghostBtnCls} ${id === orgId ? "border-cyan-300/50 text-cyan-200" : ""}`}
                  onClick={() => setOrgId(id)}
                  title={`Switch to ${o.name} (@${o.slug})`}
                >
                  {o.name}
                </button>
              );
            })}
          </div>
        )}
        <div className="sticky top-0 z-10 -mx-5 mt-3 border-b border-white/10 bg-slate-950/90 px-5 py-2 backdrop-blur" >
          <div className="flex gap-2 overflow-x-auto pb-1 snap-x motion-reduce:scroll-auto" role="tablist" aria-label="CRM sections">
            {TABS.map((t, i) => {
              const count = tabCounts[t.key] ?? null;
              return (
                <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} aria-label={`Show ${t.label}${count !== null ? `, ${count} results` : ""} (shortcut ${i + 1})`} title={`Shortcut: ${i + 1}`} onClick={() => setTab(t.key)}
                  className={`${tabBtnBase} shrink-0 snap-start ${tab === t.key ? "bg-cyan-300 text-slate-950" : "border border-white/15 bg-white/5 text-slate-200"}`}>
                  {t.label}
                  {count !== null && (
                    <span aria-hidden="true" className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${tab === t.key ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-cyan-200"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {busy && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" aria-hidden="true" aria-label="Loading">
            {["a", "b", "c", "d", "e"].map((k) => (
              <div key={k} className="h-16 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none" />
            ))}
          </div>
        )}
        {notice && <p className="mt-3 text-sm text-cyan-200" role="status">{notice}</p>}
        {apiDown && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm text-amber-300" role="alert">{apiDown}</p>
            <button type="button" aria-label="Retry loading CRM data" className={ghostBtnCls} onClick={() => { if (orgId) void loadAll(orgId); }} disabled={busy || !orgId}>
              {busy ? "Retrying…" : "Retry"}
            </button>
          </div>
        )}
      </section>

      {!orgId && (
        <section className={cardCls}>
          <p className="text-sm text-slate-300">Select an org to open its CRM. Org-scoped data only — nothing crosses orgs.</p>
        </section>
      )}

      {orgId && tab === "dashboard" && (
        <>
          {isSearching && (
            <section aria-label="Search results across all CRM data" className={`${cardCls} space-y-3`}>
              <p className="text-sm text-slate-300" role="status">
                <b className="text-white">{tabCounts.dashboard}</b> match{tabCounts.dashboard === 1 ? "" : "es"} for <b className="text-cyan-200">“{query.trim()}”</b> across all tabs.
              </p>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: "pipeline", label: "Deals", n: filteredDeals.length },
                  { key: "contacts", label: "Contacts", n: filteredContacts.length },
                  { key: "companies", label: "Companies", n: filteredCompanies.length },
                  { key: "activities", label: "Activities", n: filteredActivities.length },
                  { key: "invoices", label: "Invoices", n: filteredInvoices.length },
                ] as const).map((r) => (
                  <button key={r.key} type="button" aria-label={`View ${r.n} ${r.label.toLowerCase()} matching search`} className={ghostBtnCls} onClick={() => setTab(r.key)}>
                    {r.label}: <b className="text-cyan-200">{r.n}</b> →
                  </button>
                ))}
                <button type="button" aria-label="Clear search" className={ghostBtnCls} onClick={clearSearch}>Clear search</button>
              </div>
            </section>
          )}
          <section aria-label="Dashboard controls" className={`${cardCls} flex flex-wrap items-center gap-2`}>
            <button type="button" className={ghostBtnCls} onClick={() => { if (orgId) void loadAll(orgId); }} disabled={busy || !orgId}>
              {busy ? "Refreshing…" : "Refresh dashboard"}
            </button>
            <button
              type="button"
              className={ghostBtnCls}
              aria-pressed={showUsd}
              aria-label={showUsd ? "Show amounts in coins" : "Show amounts in USD"}
              onClick={() => setShowUsd((v) => !v)}
            >
              {showUsd ? "Show coins" : "Show USD"}
            </button>
            <span className="text-xs text-slate-400">100 coins = $1.00</span>
          </section>

          <section aria-label="CRM dashboard summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {busy && !summary ? (
              <>
                {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
                  <div key={k} className={cardCls} aria-hidden="true">
                    <div className="h-3 w-20 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
                    <div className="mt-3 h-8 w-16 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { label: "Pipeline coins", value: summary ? fmtCoins(summary.total_pipeline_coins, showUsd) : "—" },
                  { label: "Weighted pipeline", value: summary ? fmtCoins(summary.weighted_coins ?? 0, showUsd) : "—" },
                  { label: "Won coins", value: summary ? fmtCoins(summary.won_coins, showUsd) : "—" },
                  { label: "Avg deal size", value: summary ? fmtCoins(summary.avg_deal_coins ?? 0, showUsd) : "—" },
                  { label: "Open deals", value: summary ? String(summary.open_deals) : "—" },
                  { label: "Win rate", value: summary ? `${summary.win_rate ?? 0}%` : "—" },
                  { label: "Overdue activities", value: summary ? String(summary.overdue_activities) : "—" },
                  { label: "Unpaid invoices", value: summary ? `${summary.unpaid_invoices} (${fmtCoins(summary.unpaid_coins, showUsd)})` : "—" },
                ].map((k) => (
                  <div key={k.label} className={cardCls}>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{k.label}</p>
                    <p className="mt-2 text-2xl font-black text-white">{k.value}</p>
                  </div>
                ))}
              </>
            )}
            {!summary && !busy && (
              <p className="text-sm text-slate-400 sm:col-span-2 lg:col-span-4">No summary yet — create a deal to populate the dashboard. The API may still be deploying; other tabs work once their routes respond.</p>
            )}
          </section>

          {summary && (
            <section aria-label="CRM dashboard details" className="grid gap-4 lg:grid-cols-2">
              <div className={cardCls}>
                <h3 className="font-bold text-white">Deals by stage</h3>
                <div className="mt-3 space-y-2">
                  {stageBars.rows.map((r) => (
                    <div key={r.stage}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-semibold uppercase tracking-widest text-slate-400">{r.stage} ({r.count})</span>
                        <span className="text-slate-300">{fmtCoins(r.coins, showUsd)}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${r.stage}: ${r.count} deals, ${r.coins} coins`}>
                        <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.round((r.coins / stageBars.max) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <h3 className="mt-5 font-bold text-white">Activity completion</h3>
                {(() => {
                  const pct = summary.activity_completion_pct ?? activityProgress.pct;
                  const done = summary.activity_done ?? activityProgress.done;
                  const total = summary.activity_total ?? activityProgress.total;
                  return (
                    <div className="mt-2">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-400">{done} of {total} done</span>
                        <span className="font-semibold text-cyan-200">{pct}%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`Activity completion ${pct} percent`}>
                        <div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className={cardCls}>
                <h3 className="font-bold text-white">Top companies by pipeline</h3>
                {topCompanies.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-400">No open deals with a company yet.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-white/10">
                    {topCompanies.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                        <span className="font-semibold text-white">{c.name}</span>
                        <span className="text-xs text-slate-400">{c.count} open deal{c.count === 1 ? "" : "s"}</span>
                        <span className="ml-auto font-semibold text-cyan-200">{fmtCoins(c.coins, showUsd)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <h3 className="mt-5 font-bold text-white">Overdue &amp; unpaid preview</h3>
                {overduePreview.length === 0 && unpaidPreview.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-400">All clear — nothing overdue or unpaid.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {overduePreview.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-2">
                        <span aria-hidden="true">{activityKindIcon(a)}</span>
                        <span className="text-white">{activityTitle(a)}</span>
                        <span className="ml-auto text-xs text-amber-300">due {a.due_at ? new Date(a.due_at).toLocaleDateString() : "—"}</span>
                      </li>
                    ))}
                    {unpaidPreview.map((v) => (
                      <li key={v.id} className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-slate-300">{v.status}</span>
                        <span className="text-white">{v.number}</span>
                        <span className="ml-auto text-xs text-cyan-200">{fmtCoins(invoiceTotalOf(v), showUsd)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {(overduePreview.length > 0 || unpaidPreview.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={ghostBtnCls} onClick={() => setTab("activities")}>Open activities</button>
                    <button type="button" className={ghostBtnCls} onClick={() => setTab("invoices")}>Open invoices</button>
                  </div>
                )}
              </div>

              <div className={`${cardCls} lg:col-span-2`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-white">Recent activity</h3>
                  <button type="button" className={`${ghostBtnCls} ml-auto`} onClick={() => setTab("activities")}>View all</button>
                </div>
                {recentActivities.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-400">No activity yet — log the first one in the Activities tab.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-white/10">
                    {recentActivities.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                        <span aria-hidden="true">{activityKindIcon(a)}</span>
                        <span className={a.done ? "text-slate-400 line-through" : "text-white"}>{activityTitle(a)}</span>
                        <span className="ml-auto text-xs text-slate-400">
                          {a.done ? "done" : a.due_at ? `due ${new Date(a.due_at).toLocaleDateString()}` : "no due date"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {orgId && tab === "pipeline" && (
        <>
          {isSearching && filteredDeals.length === 0 && (
            <div className={cardCls}>
              <SearchEmptyState title={`No deals match “${query.trim()}”`} hint="Try a different keyword, or clear the search to see the full pipeline." onClear={clearSearch} />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className={cardCls}>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Open pipeline</p>
              <p className="mt-2 text-2xl font-black text-white">{pipelineStats.openValue} coins</p>
              <p className="mt-1 text-sm text-slate-400">{coinsToUsd(pipelineStats.openValue)} USD (coins/100)</p>
            </div>
            <div className={cardCls}>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Weighted value Σ(value×prob)</p>
              <p className="mt-2 text-2xl font-black text-white">{pipelineStats.weighted} coins</p>
              <p className="mt-1 text-sm text-slate-400">{coinsToUsd(pipelineStats.weighted)} USD</p>
            </div>
            <div className={cardCls}>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Win rate</p>
              <p className="mt-2 text-2xl font-black text-white">
                {pipelineStats.winRate === null ? "—" : `${pipelineStats.winRate}%`}
              </p>
              <p className="mt-1 text-sm text-slate-400">{pipelineStats.wonCount} won · {pipelineStats.lostCount} lost</p>
            </div>
          </div>

          <div className={`${cardCls} flex flex-wrap items-center gap-2`}>
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400" htmlFor="deal-stage-filter">Stage</label>
            <select id="deal-stage-filter" aria-label="Filter deals by stage" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className={`${inputCls} min-h-[44px] w-44`}>
              <option value="all">All stages</option>
              {STAGES.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400" htmlFor="deal-sort">Sort</label>
            <select id="deal-sort" aria-label="Sort deals" value={dealSort} onChange={(e) => setDealSort(e.target.value as DealSortKey)} className={`${inputCls} min-h-[44px] w-48`}>
              <option value="value_desc">Value: high → low</option>
              <option value="value_asc">Value: low → high</option>
              <option value="close_asc">Close date: soonest</option>
              <option value="close_desc">Close date: latest</option>
              <option value="newest">Newest first</option>
            </select>
          </div>

        <section aria-label="Sales pipeline" className="grid grid-flow-col auto-cols-[85%] snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:snap-none sm:overflow-visible lg:grid-cols-3 motion-reduce:scroll-auto">
          {stagesToShow.map((stage) => {
            const rows = sortedStageRows(dealsByStage.get(stage) ?? []);
            return (
              <div key={stage} className={`${cardCls} min-w-0 snap-start`}>
                <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-300">{stage} ({rows.length})</h3>
                <div className="mt-3 space-y-3">
                  {rows.length === 0 && (
                    <p className="text-sm text-slate-400">
                      {isSearching ? `No deals in ${stage} match “${query.trim()}”.` : `No deals in ${stage} yet — new deals land in Lead.`}
                    </p>
                  )}
                  {rows.map((d) => (
                    <div key={d.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                      <p className="font-semibold text-white"><Highlight text={d.title} needle={query} /></p>
                      <p className="mt-1 text-xs text-slate-400">
                        {dealAmount(d)} coins · {coinsToUsd(dealAmount(d))} USD · {dealProbability(d)}% · <Highlight text={companyName(d.company_id)} needle={query} />
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        weighted {weightedDealValue(d)} coins
                        {dealCloseDate(d) ? ` · closes ${dealCloseDate(d)}` : " · no close date"}
                        {dealContactName(d.contact_id) !== "—" ? ` · ${dealContactName(d.contact_id)}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-400" title={`Team attribution: deal owner ${d.owner_id ?? "unknown"}`}>owner: {ownerShort(d.owner_id)}</p>
                      {d.stage === "lost" && d.lost_reason && (
                        <p className="mt-1 text-xs text-amber-300">lost: {d.lost_reason}</p>
                      )}
                      {d.notes && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-400">📝 {d.notes}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {STAGES.filter((s) => s !== d.stage).map((s) => (
                          <button key={s} type="button" aria-label={`Move ${d.title} to ${s}`} className={stageBtnCls} onClick={() => void moveDeal(d.id, s)}>→ {s}</button>
                        ))}
                        <button type="button" aria-label={`Edit ${d.title}`} className={ghostBtnCls} onClick={() => openDealEdit(d)}>Edit</button>
                        <button type="button" aria-label={`Delete ${d.title}`} className={ghostBtnCls} onClick={() => void deleteDeal(d.id)}>Delete</button>
                      </div>
                      {d.stage !== "lost" && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <label className="text-[11px] text-slate-500" htmlFor={`lost-${d.id}`}>Mark lost:</label>
                          <select
                            id={`lost-${d.id}`}
                            aria-label={`Lost reason for ${d.title}`}
                            className={`${inputCls} w-32 !py-1 text-xs`}
                            defaultValue=""
                            onChange={(e) => { if (e.target.value) void moveDeal(d.id, "lost", e.target.value); e.target.value = ""; }}
                          >
                            <option value="">Reason…</option>
                            {LOST_REASONS.map((r) => (<option key={r} value={r}>{r}</option>))}
                          </select>
                        </div>
                      )}
                      {editingDeal.id === d.id && (
                        <form onSubmit={(e) => void saveDeal(e)} aria-label={`Edit deal ${d.title}`} className="mt-2 space-y-2 border-t border-white/10 pt-2">
                          <input value={editingDeal.title} onChange={(e) => setEditingDeal((p) => ({ ...p, title: e.target.value }))} placeholder="Deal title" aria-label="Edit deal title" maxLength={160} className={`${inputCls} w-full`} />
                          <div className="flex flex-wrap gap-2">
                            <input value={editingDeal.amount} onChange={(e) => setEditingDeal((p) => ({ ...p, amount: e.target.value }))} placeholder="Coins" inputMode="numeric" aria-label="Edit deal amount in coins" className={`${inputCls} w-28`} />
                            <input value={editingDeal.prob} onChange={(e) => setEditingDeal((p) => ({ ...p, prob: e.target.value }))} placeholder="Prob %" inputMode="numeric" aria-label="Edit deal probability percent" className={`${inputCls} w-24`} />
                            <input value={editingDeal.close} onChange={(e) => setEditingDeal((p) => ({ ...p, close: e.target.value }))} type="date" aria-label="Edit expected close date" className={`${inputCls} w-36`} />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <select value={LOST_REASONS.includes(editingDeal.lost as (typeof LOST_REASONS)[number]) ? editingDeal.lost : ""} onChange={(e) => setEditingDeal((p) => ({ ...p, lost: e.target.value }))} aria-label="Edit lost reason" className={`${inputCls} w-32`}>
                              <option value="">Lost reason…</option>
                              {LOST_REASONS.map((r) => (<option key={r} value={r}>{r}</option>))}
                            </select>
                            <select value={editingDeal.company} onChange={(e) => setEditingDeal((p) => ({ ...p, company: e.target.value }))} aria-label="Edit deal company" className={`${inputCls} max-w-[10rem]`}>
                              <option value="">No company</option>
                              {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                            </select>
                            <select value={editingDeal.contact} onChange={(e) => setEditingDeal((p) => ({ ...p, contact: e.target.value }))} aria-label="Edit deal contact" className={`${inputCls} max-w-[10rem]`}>
                              <option value="">No contact</option>
{contacts.map((c) => (<option key={c.id} value={c.id}>{contactName(c)}</option>))}
                            </select>
                          </div>
                          <textarea value={editingDeal.notes} onChange={(e) => setEditingDeal((p) => ({ ...p, notes: e.target.value }))} placeholder="Deal notes…" aria-label="Edit deal notes" rows={2} className={`${inputCls} w-full`} />
                          <div className="flex flex-wrap gap-2">
                            <button className={btnCls} type="submit" aria-label="Save deal changes">Save</button>
                            <button type="button" className={ghostBtnCls} onClick={() => setEditingDeal({ id: "", title: "", amount: "", prob: "", close: "", lost: "", notes: "", company: "", contact: "" })} aria-label="Cancel deal edit">Cancel</button>
                          </div>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <form onSubmit={(e) => void createDeal(e)} aria-label="Create deal" className={`${cardCls} min-w-0 snap-start sm:col-span-2 lg:col-span-3`}>
            <h3 className="font-bold text-white">New deal</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <input value={dlTitle} onChange={(e) => setDlTitle(e.target.value)} placeholder="Deal title" aria-label="Deal title" className={`${inputCls} min-h-[44px] flex-1`} />
              <input value={dlAmount} onChange={(e) => setDlAmount(e.target.value)} placeholder="Coins" inputMode="numeric" aria-label="Deal amount in coins" className={`${inputCls} min-h-[44px] w-28`} />
              <input value={dlProb} onChange={(e) => setDlProb(e.target.value)} placeholder="Prob % (auto)" inputMode="numeric" aria-label="Deal probability percent" className={`${inputCls} min-h-[44px] w-32`} />
              <input value={dlClose} onChange={(e) => setDlClose(e.target.value)} type="date" aria-label="Expected close date" className={`${inputCls} min-h-[44px] w-40`} />
              <select value={dlCompany} onChange={(e) => setDlCompany(e.target.value)} aria-label="Deal company" className={`${inputCls} min-h-[44px] max-w-xs`}>
                <option value="">No company</option>
                {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <select value={dlContact} onChange={(e) => setDlContact(e.target.value)} aria-label="Deal contact" className={`${inputCls} min-h-[44px] max-w-xs`}>
                <option value="">No contact</option>
                {contacts.map((c) => (<option key={c.id} value={c.id}>{contactName(c)}</option>))}
              </select>
              <button className={btnCls} type="submit" aria-label="Add deal">Add deal</button>
            </div>
            {deals.length === 0 && !busy && (
              <p className="mt-3 text-sm text-slate-400">No deals yet — create your first deal above to start the pipeline.</p>
            )}
            {busy && (
              <div className="mt-3 space-y-2" aria-hidden="true">
                <div className="h-12 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none" />
                <div className="h-12 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none" />
              </div>
            )}
          </form>
        </section>
        </>
      )}

      {orgId && tab === "contacts" && (
        <section className={`${cardCls} space-y-4`} aria-label="Contacts">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-white">
              Contacts{" "}
              <span className="ml-1 rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2 py-0.5 text-xs font-bold text-cyan-200" title={`${contacts.length} total contacts`}>
                {filteredContacts.length === contacts.length ? contacts.length : `${filteredContacts.length}/${contacts.length}`}
              </span>
            </h3>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button type="button" className={ghostBtnCls} onClick={exportContactsCsv} disabled={!filteredContacts.length} aria-label="Export visible contacts as CSV">
                Export CSV
              </button>
              <label className={`${ghostBtnCls} cursor-pointer`} aria-label="Import contacts from CSV">
                {csvBusy ? "Importing…" : "Import CSV"}
                <input
                  type="file" accept=".csv,text/csv" className="hidden" disabled={csvBusy}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importContactsCsv(f); }}
                />
              </label>
            </div>
          </div>
          <form onSubmit={(e) => void createContact(e)} aria-label="Create contact" className="flex flex-wrap gap-2">
            <input value={ctName} onChange={(e) => setCtName(e.target.value)} placeholder="Full name" aria-label="Contact full name" maxLength={120} className={`${inputCls} min-h-[44px] flex-1`} />
            <input value={ctEmail} onChange={(e) => setCtEmail(e.target.value)} placeholder="email@co.com" aria-label="Contact email" type="email" maxLength={160} className={`${inputCls} min-h-[44px] flex-1`} />
            <input value={ctPhone} onChange={(e) => setCtPhone(e.target.value)} placeholder="Phone" aria-label="Contact phone" maxLength={40} className={`${inputCls} min-h-[44px] w-40`} />
            <input value={ctTitle} onChange={(e) => setCtTitle(e.target.value)} placeholder="Title (e.g. CTO)" aria-label="Contact title" maxLength={120} className={`${inputCls} min-h-[44px] flex-1`} />
            <select value={ctStatus} onChange={(e) => setCtStatus(e.target.value)} aria-label="Contact status" className={`${inputCls} min-h-[44px] w-32`}>
              {CONTACT_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
            <select value={ctCompany} onChange={(e) => setCtCompany(e.target.value)} aria-label="Contact company" className={`${inputCls} min-h-[44px] max-w-xs`}>
              <option value="">No company</option>
              {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <input value={ctNotes} onChange={(e) => setCtNotes(e.target.value)} placeholder="Notes…" aria-label="Contact notes" maxLength={2000} className={`${inputCls} min-h-[44px] flex-1`} />
            <button className={btnCls} type="submit" aria-label="Add contact">Add contact</button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-slate-400" htmlFor="ct-status-filter">Status</label>
            <select id="ct-status-filter" value={ctStatusFilter} onChange={(e) => setCtStatusFilter(e.target.value)} aria-label="Filter contacts by status" className={`${inputCls} min-h-[44px] w-36`}>
              <option value="">All statuses</option>
              {CONTACT_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
            <label className="text-xs font-semibold text-slate-400" htmlFor="ct-company-filter">Company</label>
            <select id="ct-company-filter" value={ctCompanyFilter} onChange={(e) => setCtCompanyFilter(e.target.value)} aria-label="Filter contacts by company" className={`${inputCls} min-h-[44px] max-w-xs`}>
              <option value="">All companies</option>
              {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            {(ctStatusFilter || ctCompanyFilter) && (
              <button type="button" className={ghostBtnCls} onClick={() => { setCtStatusFilter(""); setCtCompanyFilter(""); }} aria-label="Clear contact filters">
                Clear filters
              </button>
            )}
            {selectedContacts.length > 0 && (
              <button type="button" className={ghostBtnCls} onClick={() => void bulkDeleteContacts()} aria-label={`Delete ${selectedContacts.length} selected contacts`}>
                Delete selected ({selectedContacts.length})
              </button>
            )}
          </div>
          {busy ? (
            <div className="space-y-2" aria-hidden="true" aria-label="Loading contacts">
              {[0, 1, 2].map((k) => (
                <div key={k} className="h-10 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none" />
              ))}
            </div>
          ) : filteredContacts.length === 0
            ? (
              isSearching
                ? <SearchEmptyState title={`No contacts match “${query.trim()}”`} hint="Try a different keyword, or clear the search to see all contacts." onClear={clearSearch} />
                : <p className="text-sm text-slate-400">No contacts yet — add teammates, leads, or clients with the form above.</p>
              )
            : (
              <ul className="divide-y divide-white/10">
                {filteredContacts.map((c) => {
                  const emailKey = (c.email ?? "").trim().toLowerCase();
                  const isDupe = !!emailKey && duplicateEmails.has(emailKey);
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(c.id)}
                        onChange={() => setSelectedContacts((prev) => (prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]))}
                        aria-label={`Select ${contactName(c)} for bulk delete`}
                        className="h-4 w-4 accent-cyan-300"
                      />
                      <span aria-hidden="true" title={contactName(c)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/10 text-xs font-black text-cyan-200">
                        {contactInitials(contactName(c))}
                      </span>
                      <button type="button" onClick={() => openContact(c)} aria-label={`Open details for ${contactName(c)}`} className="font-semibold text-white underline decoration-dotted decoration-white/30 underline-offset-4 hover:decoration-cyan-300">
                        {contactName(c)}
                      </button>
                      {c.title && <span className="text-xs text-slate-400">{c.title}</span>}
                      <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-slate-300">{c.status ?? "lead"}</span>
                      <span className="text-slate-400">{c.email ?? "no email"}</span>
                      {isDupe && (
                        <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-xs font-semibold text-amber-200" title="Another contact uses this same email">
                          possible duplicate
                        </span>
                      )}
                      <span className="text-xs text-slate-400" title={`Team attribution: contact owner ${c.owner_id ?? "unknown"}`}>owner: {ownerShort(c.owner_id)}</span>
                      <span className="ml-auto text-slate-400"><Highlight text={companyName(c.company_id)} needle={query} /></span>
                      <button type="button" aria-label={`Delete ${contactName(c)}`} className={ghostBtnCls} onClick={() => void deleteContact(c.id)}>Delete</button>
                    </li>
                  );
                })}
              </ul>
            )}
          {selectedContact && (
            <div role="dialog" aria-modal="true" aria-label={`Contact details for ${contactName(selectedContact)}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedContactId(null)}>
              <div className="w-full max-w-lg space-y-4 rounded-2xl border border-white/15 bg-slate-950 p-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/10 text-sm font-black text-cyan-200">
                    {contactInitials(contactName(selectedContact))}
                  </span>
                  <h4 className="text-lg font-bold text-white">{contactName(selectedContact)}</h4>
                  <button type="button" className={`${ghostBtnCls} ml-auto`} onClick={() => setSelectedContactId(null)} aria-label="Close contact details">
                    Close
                  </button>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs uppercase tracking-widest text-slate-400">Email</dt><dd className="text-slate-200">{selectedContact.email ?? "—"}</dd></div>
                  <div><dt className="text-xs uppercase tracking-widest text-slate-400">Phone</dt><dd className="text-slate-200">{selectedContact.phone ?? "—"}</dd></div>
                  <div><dt className="text-xs uppercase tracking-widest text-slate-400">Title</dt><dd className="text-slate-200">{selectedContact.title ?? "—"}</dd></div>
                  <div><dt className="text-xs uppercase tracking-widest text-slate-400">Status</dt><dd className="text-slate-200">{selectedContact.status ?? "lead"}</dd></div>
                  <div className="col-span-2"><dt className="text-xs uppercase tracking-widest text-slate-400">Company</dt><dd className="text-slate-200">{companyName(selectedContact.company_id)}</dd></div>
                  <div className="col-span-2"><dt className="text-xs uppercase tracking-widest text-slate-400">Notes</dt><dd className="whitespace-pre-wrap text-slate-200">{selectedContact.notes ?? "—"}</dd></div>
                </dl>
                <form onSubmit={(e) => void saveContact(e)} aria-label="Edit contact" className="space-y-2 border-t border-white/10 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <input value={editContact.name} onChange={(e) => setEditContact((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" aria-label="Edit contact name" maxLength={120} className={`${inputCls} min-h-[44px] flex-1`} />
                    <input value={editContact.email} onChange={(e) => setEditContact((p) => ({ ...p, email: e.target.value }))} placeholder="email@co.com" aria-label="Edit contact email" maxLength={160} className={`${inputCls} min-h-[44px] flex-1`} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input value={editContact.phone} onChange={(e) => setEditContact((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" aria-label="Edit contact phone" maxLength={40} className={`${inputCls} min-h-[44px] w-40`} />
                    <input value={editContact.title} onChange={(e) => setEditContact((p) => ({ ...p, title: e.target.value }))} placeholder="Title" aria-label="Edit contact title" maxLength={120} className={`${inputCls} min-h-[44px] flex-1`} />
                    <select value={editContact.status} onChange={(e) => setEditContact((p) => ({ ...p, status: e.target.value }))} aria-label="Edit contact status" className={`${inputCls} min-h-[44px] w-32`}>
                      {CONTACT_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                    <select value={editContact.company_id} onChange={(e) => setEditContact((p) => ({ ...p, company_id: e.target.value }))} aria-label="Edit contact company" className={`${inputCls} min-h-[44px] max-w-xs`}>
                      <option value="">No company</option>
                      {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </div>
                  <textarea value={editContact.notes} onChange={(e) => setEditContact((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes…" aria-label="Edit contact notes" maxLength={2000} rows={3} className={`${inputCls} w-full`} />
                  <div className="flex flex-wrap gap-2">
                    <button className={btnCls} type="submit" aria-label="Save contact changes">Save changes</button>
                    <button type="button" className={ghostBtnCls} onClick={() => void deleteContact(selectedContact.id)} aria-label={`Delete ${contactName(selectedContact)}`}>Delete contact</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}

      {orgId && tab === "companies" && (
        <section className={`${cardCls} space-y-4`} aria-label="Companies">
          <form onSubmit={(e) => void createCompany(e)} aria-label="Create company" className="flex flex-wrap gap-2">
            <input value={coName} onChange={(e) => setCoName(e.target.value)} placeholder="Acme Inc" aria-label="Company name" className={`${inputCls} min-h-[44px] flex-1`} />
            <input value={coDomain} onChange={(e) => setCoDomain(e.target.value)} placeholder="acme.com" aria-label="Company domain" className={`${inputCls} min-h-[44px] flex-1`} />
            <input value={coIndustry} onChange={(e) => setCoIndustry(e.target.value)} placeholder="Industry (e.g. SaaS)" aria-label="Company industry" className={`${inputCls} min-h-[44px] flex-1`} />
            <input value={coSize} onChange={(e) => setCoSize(e.target.value)} placeholder="Size (e.g. 11-50)" aria-label="Company size" className={`${inputCls} min-h-[44px] w-36`} />
            <input value={coWebsite} onChange={(e) => setCoWebsite(e.target.value)} placeholder="https://acme.com" aria-label="Company website" className={`${inputCls} min-h-[44px] flex-1`} />
            <input value={coNotes} onChange={(e) => setCoNotes(e.target.value)} placeholder="Notes…" aria-label="Company notes" className={`${inputCls} min-h-[44px] flex-1`} />
            <button className={btnCls} type="submit" aria-label="Add company">Add company</button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-slate-400" htmlFor="co-industry">Industry</label>
            <select id="co-industry" value={indFilter} onChange={(e) => { setIndFilter(e.target.value); setPage(0); }} className={`${inputCls} min-h-[44px] max-w-xs`}>
              <option value="">All industries</option>
              {industries.map((ind) => (<option key={ind} value={ind}>{ind}</option>))}
            </select>
            <button type="button" className={ghostBtnCls} aria-pressed={sortAZ} title="Sort companies A–Z by name" onClick={() => setSortAZ((v) => !v)}>
              {sortAZ ? "✓ A–Z" : "A–Z"}
            </button>
            <span className="ml-auto text-xs text-slate-400">
              {dirTotal != null ? `${dirTotal} total` : ""}{dirBusy ? " · loading…" : ""}
            </span>
          </div>
          {dirBusy && dirRows.length === 0 ? (
            <div className="space-y-2" aria-hidden="true" aria-label="Loading companies">
              {[0, 1].map((k) => (
                <div key={k} className="h-10 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none" />
              ))}
            </div>
          ) : dirVisible.length === 0
            ? (
              isSearching
                ? <SearchEmptyState title={`No companies match “${query.trim()}”`} hint="Try a different keyword, or clear the search to browse the full directory." onClear={clearSearch} />
                : <p className="text-sm text-slate-400">No companies yet — add your first customer or prospect above.</p>
              )
            : (
              <ul className="divide-y divide-white/10">
                {dirVisible.map((c) => {
                  const fav = faviconFor(c);
                  const h = healthScore(
                    contacts.filter((x) => x.company_id === c.id).length,
                    deals.filter((x) => x.company_id === c.id && isOpenDeal(x)).length,
                    deals.filter((x) => x.company_id === c.id && x.stage === "won").reduce((n, x) => n + dealAmount(x), 0),
                  );
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCompanies.includes(c.id)}
                        onChange={() => setSelectedCompanies((prev) => (prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]))}
                        aria-label={`Select ${c.name} for bulk delete`}
                        className="h-4 w-4 shrink-0 accent-cyan-300"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedCompanyId((prev) => (prev === c.id ? null : c.id))}
                        aria-expanded={selectedCompanyId === c.id}
                        aria-label={`Open ${c.name} details`}
                        className="flex min-w-0 flex-1 flex-wrap items-center gap-3 py-2 text-left text-sm"
                      >
                        {fav ? <img src={fav} alt="" width={16} height={16} loading="lazy" className="h-4 w-4 rounded-sm" /> : null}
                        <span className="font-semibold text-white">{c.name}</span>
                        <span className="text-slate-400">{c.domain ?? "no domain"}</span>
                        {c.industry ? <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-slate-300">{c.industry}</span> : null}
                        <span className="ml-auto text-xs font-semibold text-cyan-200" title="Health = contacts×2 + open deals×5 + won/100">♥ {h}</span>
                      </button>
                      <button type="button" aria-label={`Delete ${c.name}`} className={ghostBtnCls} onClick={() => void deleteCompany(c.id)}>Delete</button>
                    </li>
                  );
                })}
              </ul>
            )}
          {selectedCompanies.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">{selectedCompanies.length} selected</span>
              <button type="button" className={ghostBtnCls} onClick={() => void bulkDeleteCompanies()} aria-label={`Delete ${selectedCompanies.length} selected companies`}>
                Delete selected ({selectedCompanies.length})
              </button>
              <button type="button" className={ghostBtnCls} onClick={() => setSelectedCompanies([])} aria-label="Clear company selection">Clear</button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={ghostBtnCls} disabled={page <= 0 || dirBusy} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Prev</button>
            <span className="text-xs text-slate-400">Page {page + 1}{dirTotal != null ? ` of ${Math.max(1, Math.ceil(dirTotal / PAGE_SIZE))}` : ""}</span>
            <button
              type="button"
              className={ghostBtnCls}
              disabled={dirBusy || (dirTotal != null && (page + 1) * PAGE_SIZE >= dirTotal)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
          {selectedCompany && selectedStats && (
            <div className="rounded-xl border border-cyan-300/20 bg-black/30 p-4" aria-label={`Company 360 for ${selectedCompany.name}`}>
              <div className="flex flex-wrap items-center gap-3">
                {faviconFor(selectedCompany) ? <img src={faviconFor(selectedCompany)} alt="" width={32} height={32} loading="lazy" className="h-8 w-8 rounded-md" /> : null}
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedCompany.name}</h3>
                  <p className="text-xs text-slate-400">
                    {[selectedCompany.industry, selectedCompany.size].filter(Boolean).join(" · ") || "No industry/size set"}
                  </p>
                </div>
                <span className="ml-auto rounded-full border border-cyan-300/40 px-3 py-1 text-sm font-bold text-cyan-200" title="Health = contacts×2 + open deals×5 + won/100">
                  ♥ {selectedStats.score}
                </span>
                <button type="button" className={ghostBtnCls} onClick={() => openCompanyEdit(selectedCompany)} aria-label={`Edit ${selectedCompany.name}`}>Edit</button>
                <button type="button" className={ghostBtnCls} onClick={() => void deleteCompany(selectedCompany.id)} aria-label={`Delete ${selectedCompany.name}`}>Delete</button>
                <button type="button" className={ghostBtnCls} onClick={() => setSelectedCompanyId(null)} aria-label="Close company details">Close</button>
              </div>
              {editingCompany.id === selectedCompany.id && (
                <form onSubmit={(e) => void saveCompany(e)} aria-label={`Edit company ${selectedCompany.name}`} className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  <div className="flex flex-wrap gap-2">
                    <input value={editingCompany.name} onChange={(e) => setEditingCompany((p) => ({ ...p, name: e.target.value }))} placeholder="Company name" aria-label="Edit company name" maxLength={120} className={`${inputCls} min-h-[44px] flex-1`} />
                    <input value={editingCompany.domain} onChange={(e) => setEditingCompany((p) => ({ ...p, domain: e.target.value }))} placeholder="acme.com" aria-label="Edit company domain" maxLength={120} className={`${inputCls} min-h-[44px] flex-1`} />
                    <input value={editingCompany.industry} onChange={(e) => setEditingCompany((p) => ({ ...p, industry: e.target.value }))} placeholder="Industry" aria-label="Edit company industry" maxLength={80} className={`${inputCls} min-h-[44px] flex-1`} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input value={editingCompany.size} onChange={(e) => setEditingCompany((p) => ({ ...p, size: e.target.value }))} placeholder="Size" aria-label="Edit company size" maxLength={40} className={`${inputCls} min-h-[44px] w-36`} />
                    <input value={editingCompany.website} onChange={(e) => setEditingCompany((p) => ({ ...p, website: e.target.value }))} placeholder="https://…" aria-label="Edit company website" maxLength={200} className={`${inputCls} min-h-[44px] flex-1`} />
                    <input value={editingCompany.notes} onChange={(e) => setEditingCompany((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes…" aria-label="Edit company notes" maxLength={2000} className={`${inputCls} min-h-[44px] flex-1`} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className={btnCls} type="submit" aria-label="Save company changes">Save</button>
                    <button type="button" className={ghostBtnCls} onClick={() => setEditingCompany({ id: "", name: "", domain: "", industry: "", size: "", website: "", notes: "" })} aria-label="Cancel company edit">Cancel</button>
                  </div>
                </form>
              )}
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-xs uppercase tracking-widest text-slate-400">Website</dt><dd className="text-slate-200">{selectedCompany.website ? <a className="text-cyan-200 underline" href={selectedCompany.website.startsWith("http") ? selectedCompany.website : `https://${selectedCompany.website}`} target="_blank" rel="noreferrer">{selectedCompany.website}</a> : "—"}</dd></div>
                <div><dt className="text-xs uppercase tracking-widest text-slate-400">Domain</dt><dd className="text-slate-200">{selectedCompany.domain ?? "—"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-widest text-slate-400">Notes</dt><dd className="text-slate-200">{selectedCompany.notes || "—"}</dd></div>
              </dl>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-white/10 p-3"><p className="text-xs uppercase tracking-widest text-slate-400">Contacts</p><p className="text-xl font-black text-white">{selectedStats.contactsCount}</p></div>
                <div className="rounded-lg border border-white/10 p-3"><p className="text-xs uppercase tracking-widest text-slate-400">Open deals</p><p className="text-xl font-black text-white">{selectedStats.openCount} <span className="text-sm font-semibold text-cyan-200">({selectedStats.openTotal} coins)</span></p></div>
                <div className="rounded-lg border border-white/10 p-3"><p className="text-xs uppercase tracking-widest text-slate-400">Won total</p><p className="text-xl font-black text-white">{selectedStats.wonTotal} coins</p></div>
                <div className="rounded-lg border border-white/10 p-3"><p className="text-xs uppercase tracking-widest text-slate-400">Unpaid invoices</p><p className="text-xl font-black text-white">{selectedStats.unpaidTotal} coins</p></div>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Linked contacts ({selectedStats.contactsCount})</h4>
                  {selectedStats.coContacts.length === 0
                    ? <p className="mt-1 text-xs text-slate-400">No contacts linked yet.</p>
                    : <ul className="mt-1 space-y-1 text-sm">{selectedStats.coContacts.slice(0, 8).map((ct) => (<li key={ct.id} className="text-slate-300">{contactName(ct)}{ct.email ? <span className="text-slate-400"> · {ct.email}</span> : null}</li>))}</ul>}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Recent activities</h4>
                  {selectedStats.recent.length === 0
                    ? <p className="mt-1 text-xs text-slate-400">No recent activity for this company.</p>
                    : <ul className="mt-1 space-y-1 text-sm">{selectedStats.recent.map((a) => (<li key={a.id} className="flex items-center gap-2 text-slate-300"><span className={a.done ? "text-slate-400 line-through" : ""}>{activityTitle(a)}</span><span className="ml-auto text-xs text-slate-400">{a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}</span></li>))}</ul>}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {orgId && tab === "activities" && (
        <section className={`${cardCls} space-y-4`} aria-label="Activities">
          {/* Progress: done / total */}
          <div aria-label="Activities progress">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{activityProgress.done} of {activityProgress.total} done ({activityProgress.pct}%)</span>
              <span>{activities.filter((a) => isActivityOverdue(a)).length} overdue</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={activityProgress.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Activities completion">
              <div className="h-full rounded-full bg-cyan-300" style={{ width: `${activityProgress.pct}%` }} />
            </div>
          </div>
          <form onSubmit={(e) => void createActivity(e)} aria-label="Create activity" className="flex flex-wrap gap-2">
            <select value={acKind} onChange={(e) => setAcKind(e.target.value)} aria-label="Activity kind" className={`${inputCls} min-h-[44px] w-32`}>
              {ACT_KINDS.map((k) => (<option key={k} value={k}>{ACT_KIND_ICON[k]} {k}</option>))}
            </select>
            <input value={acTitle} onChange={(e) => setAcTitle(e.target.value)} placeholder="Call Acme about proposal…" aria-label="Activity title" className={`${inputCls} min-h-[44px] flex-1`} />
            <input value={acDue} onChange={(e) => setAcDue(e.target.value)} type="date" aria-label="Activity due date" className={`${inputCls} min-h-[44px] w-44`} />
            <select value={acDeal} onChange={(e) => setAcDeal(e.target.value)} aria-label="Link deal" className={`${inputCls} min-h-[44px] max-w-xs`}>
              <option value="">No deal</option>
              {deals.map((d) => (<option key={d.id} value={d.id}>{d.title}</option>))}
            </select>
            <select value={acContact} onChange={(e) => setAcContact(e.target.value)} aria-label="Link contact" className={`${inputCls} min-h-[44px] max-w-xs`}>
              <option value="">No contact</option>
              {contacts.map((c) => (<option key={c.id} value={c.id}>{contactName(c)}</option>))}
            </select>
            <select value={acCompany} onChange={(e) => setAcCompany(e.target.value)} aria-label="Link company" className={`${inputCls} min-h-[44px] max-w-xs`}>
              <option value="">No company</option>
              {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <button className={btnCls} type="submit" aria-label="Add activity">Add activity</button>
            <button className={ghostBtnCls} type="button" onClick={() => void quickAddActivity(1)} aria-label="Quick add for tomorrow">+ Tomorrow</button>
            <button className={ghostBtnCls} type="button" onClick={() => void quickAddActivity(7)} aria-label="Quick add for next week">+ Next week</button>
          </form>
          {/* Filters + sort */}
          <div className="flex flex-wrap items-center gap-2" aria-label="Activity filters">
            <select value={actKindFilter} onChange={(e) => setActKindFilter(e.target.value)} aria-label="Filter by kind" className={`${inputCls} min-h-[44px] w-36`}>
              <option value="all">All kinds</option>
              {ACT_KINDS.map((k) => (<option key={k} value={k}>{ACT_KIND_ICON[k]} {k}</option>))}
            </select>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
              {(["all", "open", "done", "overdue"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setActStatusFilter(s)} aria-pressed={actStatusFilter === s}
                  className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold ${actStatusFilter === s ? "bg-cyan-300 text-slate-950" : "border border-white/15 bg-white/5 text-slate-200"}`}>
                  {s === "all" ? "All" : s === "open" ? "Open" : s === "done" ? "Done" : "Overdue"}
                </button>
              ))}
            </div>
            <select value={actDealFilter} onChange={(e) => setActDealFilter(e.target.value)} aria-label="Filter by deal" className={`${inputCls} min-h-[44px] max-w-xs`}>
              <option value="">All deals</option>
              {deals.map((d) => (<option key={d.id} value={d.id}>{d.title}</option>))}
            </select>
            <select value={actSort} onChange={(e) => setActSort(e.target.value as "due_asc" | "due_desc" | "created_desc")} aria-label="Sort activities" className={`${inputCls} min-h-[44px] w-44`}>
              <option value="due_asc">Due ↑ earliest</option>
              <option value="due_desc">Due ↓ latest</option>
              <option value="created_desc">Newest first</option>
            </select>
          </div>
          {busy ? (
            <div className="space-y-2" aria-hidden="true" aria-label="Loading activities">
              {[0, 1, 2].map((k) => (
                <div key={k} className="h-12 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none" />
              ))}
            </div>
          ) : activities.length === 0
            ? (
              isSearching
                ? <SearchEmptyState title={`No activities match “${query.trim()}”`} hint="Try a different keyword, or clear the search to see all activities." onClear={clearSearch} />
                : (
                  <div className="rounded-xl border border-dashed border-white/15 p-6 text-center" aria-label="No activities yet">
                    <p className="text-3xl" aria-hidden="true">📋✨</p>
                    <p className="mt-2 font-semibold text-white">A clear desk is a good start</p>
                    <p className="mt-1 text-sm text-slate-400">Nothing to do — add your first follow-up above (try “+ Tomorrow”) and it will land here, grouped by due date.</p>
                  </div>
                )
              )
            : visibleActivities.length === 0
              ? (
                <div className="rounded-xl border border-dashed border-white/15 p-6 text-center" aria-label="No activities match filters">
                  <p className="text-3xl" aria-hidden="true">🔍🗂️</p>
                  <p className="mt-2 font-semibold text-white">No matches{isSearching ? ` for “${query.trim()}”` : " under these filters"}</p>
                  <p className="mt-1 text-sm text-slate-400">Try widening the kind or status filter — your {activities.length} activit{activities.length === 1 ? "y is" : "ies are"} still here.</p>
                  <button type="button" className={`${ghostBtnCls} mt-3`} onClick={() => { setActKindFilter("all"); setActStatusFilter("all"); setActDealFilter(""); }}>Clear filters</button>
                  {isSearching && <button type="button" className={`${ghostBtnCls} mt-3 ml-2`} onClick={clearSearch} aria-label="Clear search">Clear search</button>}
                </div>
              )
              : (
                <div className="space-y-5">
                  {groupedActivities.map((g) => (
                    <div key={g.key}>
                      <h3 className={`text-xs font-bold uppercase tracking-widest ${g.key === "overdue" ? "text-red-300" : "text-cyan-300"}`}>
                        {g.key === "overdue" ? `⚠️ Overdue (${g.rows.length})` : `${g.label} (${g.rows.length})`}
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {g.rows.map((a) => {
                          const overdue = isActivityOverdue(a);
                          const linkedDeal = a.deal_id ? deals.find((d) => d.id === a.deal_id)?.title : null;
                          const linkedContact = a.contact_id ? contacts.find((c) => c.id === a.contact_id) : null;
                          const linkedCompany = a.company_id ? companies.find((c) => c.id === a.company_id)?.name : null;
                          return (
                            <li key={a.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm ${overdue ? "border-red-400/60 bg-red-500/10" : "border-white/10 bg-black/30"}`}>
                              <input type="checkbox" checked={a.done} onChange={() => void toggleActivity(a)} aria-label={`Mark ${activityTitle(a)} done`} className="h-6 w-6 min-h-[44px] min-w-[44px] accent-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" />
                              <span title={activityKind(a)} aria-label={`Kind: ${activityKind(a)}`}>{activityKindIcon(a)}</span>
                              {editingActivity.id === a.id ? (
                                <form onSubmit={(e) => void saveActivity(e)} aria-label={`Edit activity ${activityTitle(a)}`} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                  <input value={editingActivity.title} onChange={(e) => setEditingActivity((p) => ({ ...p, title: e.target.value }))} placeholder="Activity text" aria-label="Edit activity text" maxLength={2000} className={`${inputCls} min-w-0 flex-1`} />
                                  <button className={btnCls} type="submit" aria-label="Save activity changes">Save</button>
                                  <button type="button" className={ghostBtnCls} onClick={() => setEditingActivity({ id: "", title: "" })} aria-label="Cancel activity edit">Cancel</button>
                                </form>
                              ) : (
                                <span className={a.done ? "text-slate-400 line-through" : overdue ? "font-semibold text-red-200" : "text-white"}><Highlight text={activityTitle(a)} needle={query} /></span>
                              )}
                              {editingActivity.id !== a.id && (
                                <>
                                  <button type="button" aria-label={`Edit ${activityTitle(a)}`} className={ghostBtnCls} onClick={() => openActivityEdit(a)}>Edit</button>
                                  <button type="button" aria-label={`Delete ${activityTitle(a)}`} className={ghostBtnCls} onClick={() => void deleteActivity(a.id)}>Delete</button>
                                </>
                              )}
                              {(linkedDeal || linkedContact || linkedCompany) && (
                                <span className="flex flex-wrap gap-1 text-[11px]">
                                  {linkedDeal && <span className="rounded-full border border-white/15 px-2 py-0.5 text-slate-300">🤝 {linkedDeal}</span>}
                                  {linkedContact && <span className="rounded-full border border-white/15 px-2 py-0.5 text-slate-300">👤 {contactName(linkedContact)}</span>}
                                  {linkedCompany && <span className="rounded-full border border-white/15 px-2 py-0.5 text-slate-300">🏢 {linkedCompany}</span>}
                                </span>
                              )}
                              <span className="ml-auto flex items-center gap-2 text-xs">
                                {editingDueId === a.id ? (
                                  <>
                                    <input type="date" value={editingDueValue} onChange={(e) => setEditingDueValue(e.target.value)} aria-label={`Due date for ${activityTitle(a)}`} className={`${inputCls} w-40`} />
                                    <button type="button" className={ghostBtnCls} onClick={() => void updateActivityDue(a, editingDueValue)}>Save</button>
                                    <button type="button" className={ghostBtnCls} onClick={() => setEditingDueId("")}>Cancel</button>
                                  </>
                                ) : (
                                  <button type="button" onClick={() => { setEditingDueId(a.id); setEditingDueValue(toDateInputValue(a.due_at)); }}
                                    title="Click to edit due date" aria-label={`Edit due date for ${activityTitle(a)}`}
                                    className={overdue ? "font-bold text-red-300 underline decoration-dotted" : "text-slate-400 underline decoration-dotted"}>
                                    {overdue ? `⚠️ overdue · ${a.due_at ? new Date(a.due_at).toLocaleDateString() : ""}` : a.due_at ? new Date(a.due_at).toLocaleDateString() : "no due date"}
                                  </button>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
        </section>
      )}

      {orgId && tab === "invoices" && (
        <section className={`${cardCls} space-y-4`} aria-label="Invoices">
          <GhostCashDisclaimer />
          <form onSubmit={(e) => void createInvoice(e)} aria-label="Create invoice" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <input value={invNumber} onChange={(e) => setInvNumber(e.target.value)} placeholder="INV-001" aria-label="Invoice number" className={`${inputCls} min-h-[44px] w-40`} />
              <select value={invCompany} onChange={(e) => setInvCompany(e.target.value)} aria-label="Invoice company" className={`${inputCls} min-h-[44px] max-w-xs`}>
                <option value="">No company</option>
                {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <input value={invDue} onChange={(e) => setInvDue(e.target.value)} type="date" aria-label="Invoice due date" className={`${inputCls} min-h-[44px] w-44`} />
            </div>
            {invLines.map((l, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <input value={l.label} onChange={(e) => setInvLines((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder={`Item ${i + 1}`} aria-label={`Invoice line ${i + 1} label`} className={`${inputCls} min-h-[44px] flex-1`} />
                <input value={String(l.qty)} onChange={(e) => setInvLines((prev) => prev.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value || 0) } : x)))} inputMode="numeric" aria-label={`Invoice line ${i + 1} quantity`} className={`${inputCls} min-h-[44px] w-20`} />
                <input value={String(l.unit_coins)} onChange={(e) => setInvLines((prev) => prev.map((x, j) => (j === i ? { ...x, unit_coins: Number(e.target.value || 0) } : x)))} inputMode="numeric" aria-label={`Invoice line ${i + 1} unit coins`} className={`${inputCls} min-h-[44px] w-28`} />
                <button type="button" aria-label={`Remove invoice line ${i + 1}`} className={ghostBtnCls} onClick={() => setInvLines((prev) => prev.filter((_, j) => j !== i))} disabled={invLines.length <= 1}>Remove</button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" aria-label="Add invoice line item" className={ghostBtnCls} onClick={() => setInvLines((prev) => [...prev, { label: "", qty: 1, unit_coins: 0 }])}>+ Line item</button>
              <span className="text-sm text-slate-300">Total: <b className="text-white">{invDraftTotal} coins</b></span>
              <button className={`${btnCls} ml-auto`} type="submit" aria-label="Create invoice">Create invoice</button>
            </div>
          </form>
          {busy ? (
            <div className="space-y-2" aria-hidden="true" aria-label="Loading invoices">
              {[0, 1].map((k) => (
                <div key={k} className="h-10 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none" />
              ))}
            </div>
          ) : invoices.length === 0
            ? (
              isSearching
                ? <SearchEmptyState title={`No invoices match “${query.trim()}”`} hint="Try a different keyword, or clear the search to see all invoices." onClear={clearSearch} />
                : <p className="text-sm text-slate-400">No invoices yet — draft the first one above to bill a client.</p>
              )
            : filteredInvoices.length === 0
              ? <SearchEmptyState title={`No invoices match “${query.trim()}”`} hint="Try a different keyword, or clear the search to see all invoices." onClear={clearSearch} />
              : (
                <ul className="divide-y divide-white/10" aria-label={`${filteredInvoices.length} invoices`}>
                  {filteredInvoices.map((v) => (
                    <li key={v.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                      <span className="font-semibold text-white"><Highlight text={v.number} needle={query} /></span>
                      <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-slate-300"><Highlight text={v.status} needle={query} /></span>
                      <span className="text-slate-400"><Highlight text={companyName(v.company_id)} needle={query} /></span>
                    <span className="ml-auto font-semibold text-cyan-200">{invoiceTotalOf(v)} coins</span>
                    <button type="button" aria-label={`Edit invoice ${v.number}`} className={ghostBtnCls} onClick={() => openInvoiceEdit(v)}>Edit</button>
                    <button type="button" aria-label={`Delete invoice ${v.number}`} className={ghostBtnCls} onClick={() => void deleteInvoice(v.id)}>Delete</button>
                    {editingInvoice.id === v.id && (
                      <form onSubmit={(e) => void saveInvoice(e)} aria-label={`Edit invoice ${v.number}`} className="flex w-full flex-wrap items-center gap-2 border-t border-white/10 pt-2">
                        <select value={editingInvoice.status} onChange={(e) => setEditingInvoice((p) => ({ ...p, status: e.target.value }))} aria-label="Edit invoice status" className={`${inputCls} w-32`}>
                          {["draft", "sent", "paid", "void"].map((s) => (<option key={s} value={s}>{s}</option>))}
                        </select>
                        <input value={editingInvoice.notes} onChange={(e) => setEditingInvoice((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes…" aria-label="Edit invoice notes" maxLength={2000} className={`${inputCls} min-w-0 flex-1`} />
                        <button className={btnCls} type="submit" aria-label="Save invoice changes">Save</button>
                        <button type="button" className={ghostBtnCls} onClick={() => setEditingInvoice({ id: "", status: "", notes: "" })} aria-label="Cancel invoice edit">Cancel</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
        </section>
      )}

      {orgId && tab === "reports" && (
        <CrmReports deals={deals} contacts={contacts} companies={companies} activities={activities} />
      )}

      {/* Read-only note: v1 untouched; coin movement stays in guarded RPCs — this UI only reads/writes CRM rows. */}
      <p className="text-xs text-slate-600">CRM rows are org-scoped memoranda. Coins move only in guarded flows; invoices here never mint, hold, or convert Ghost Cash.</p>
    </div>
  );
}
