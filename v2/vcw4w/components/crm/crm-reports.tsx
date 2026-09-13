"use client";

import { useMemo, useState } from "react";
import { csvCell, defuseTxtLine, safeDateStamp } from "./csv-safety";

// Tolerant row shapes: the workspace uses local aliases (amount_coins / name)
// while /api/crm routes return value_coins / full_name. Accept both.
type DealLike = {
  id: string;
  title?: string | null;
  stage?: string;
  amount_coins?: number | null;
  value_coins?: number | null;
  company_id?: string | null;
  contact_id?: string | null;
  created_at?: string;
};
type ContactLike = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company_id?: string | null;
  created_at?: string;
};
type CompanyLike = {
  id: string;
  name?: string | null;
  domain?: string | null;
  notes?: string | null;
  created_at?: string;
};
type ActivityLike = {
  id: string;
  title?: string | null;
  deal_id?: string | null;
  due_at?: string | null;
  done?: boolean;
  created_at?: string;
};

export type CrmReportsProps = {
  deals?: DealLike[];
  contacts?: ContactLike[];
  companies?: CompanyLike[];
  activities?: ActivityLike[];
};

// 100 coins = exactly $1.00 (matches invoice-manager usd()).
export const COINS_PER_USD = 100;

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

function download(filename: string, mime: string, text: string) {
  // Security: Blob-based download (content never becomes markup) with a
  // sanitized name — strip path separators and `..` so a hostile value can
  // never escape the download name. Callers pass date-stamp names only.
  const safe = String(filename ?? "")
    .replace(/[/\\]+/g, "-")
    .replace(/\.\.+/g, "·")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 80) || "download";
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safe;
  a.click();
  URL.revokeObjectURL(url);
}

function dealCoins(d: DealLike): number {
  return Number(d.value_coins ?? d.amount_coins ?? 0);
}

function contactLabel(c: ContactLike): string {
  return c.full_name ?? c.name ?? "";
}

function usd(coins: number): string {
  return `$${(Number(coins ?? 0) / COINS_PER_USD).toFixed(2)}`;
}

function monthKey(iso?: string): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "unknown";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const cardCls = "rounded-2xl border border-white/10 bg-white/[.04] p-5";
const ghostBtnCls =
  "min-h-[36px] rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none";
const inputCls =
  "min-w-0 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none";

/**
 * CrmReports: client-side exports + print summary for the CRM workspace.
 * Purely presentational — receives already-loaded rows as props, never
 * fetches and never touches coin tables. All downloads are Blob-based.
 */
export function CrmReports({
  deals = [],
  contacts = [],
  companies = [],
  activities = [],
}: CrmReportsProps) {
  const [coinsIn, setCoinsIn] = useState("100");
  const [usdIn, setUsdIn] = useState("1.00");

  const companyById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companies) m.set(c.id, c.name ?? "");
    return m;
  }, [companies]);

  const contactById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of contacts) m.set(c.id, contactLabel(c));
    return m;
  }, [contacts]);

  const dealById = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of deals) m.set(d.id, d.title ?? "");
    return m;
  }, [deals]);

  const stageTotals = useMemo(() => {
    const m = new Map<string, { count: number; coins: number }>();
    for (const d of deals) {
      const stage = d.stage ?? "unknown";
      const cur = m.get(stage) ?? { count: 0, coins: 0 };
      cur.count += 1;
      cur.coins += dealCoins(d);
      m.set(stage, cur);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [deals]);

  const monthlyWon = useMemo(() => {
    const m = new Map<string, { count: number; coins: number }>();
    for (const d of deals) {
      if (d.stage !== "won") continue;
      const k = monthKey(d.created_at);
      const cur = m.get(k) ?? { count: 0, coins: 0 };
      cur.count += 1;
      cur.coins += dealCoins(d);
      m.set(k, cur);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [deals]);

  const totalPipeline = deals.reduce((n, d) => n + dealCoins(d), 0);
  // Date-only stamp: validated YYYY-MM-DD, never user input.
  const stamp = safeDateStamp(new Date().toISOString().slice(0, 10));

  function exportDeals() {
    const rows: string[][] = [
      ["id", "title", "stage", "value_coins", "usd_value", "company", "contact", "created_at"],
    ];
    for (const d of deals) {
      const c = dealCoins(d);
      rows.push([
        d.id,
        d.title ?? "",
        d.stage ?? "",
        String(c),
        (c / COINS_PER_USD).toFixed(2),
        companyById.get(d.company_id ?? "") ?? "",
        contactById.get(d.contact_id ?? "") ?? "",
        d.created_at ?? "",
      ]);
    }
    download(`crm-deals-${stamp}.csv`, "text/csv;charset=utf-8", toCsv(rows));
  }

  function exportContacts() {
    const rows: string[][] = [["id", "full_name", "email", "phone", "company", "created_at"]];
    for (const c of contacts) {
      rows.push([
        c.id,
        contactLabel(c),
        c.email ?? "",
        c.phone ?? "",
        companyById.get(c.company_id ?? "") ?? "",
        c.created_at ?? "",
      ]);
    }
    download(`crm-contacts-${stamp}.csv`, "text/csv;charset=utf-8", toCsv(rows));
  }

  function exportCompanies() {
    const rows: string[][] = [["id", "name", "domain", "notes", "created_at"]];
    for (const c of companies) {
      rows.push([c.id, c.name ?? "", c.domain ?? "", c.notes ?? "", c.created_at ?? ""]);
    }
    download(`crm-companies-${stamp}.csv`, "text/csv;charset=utf-8", toCsv(rows));
  }

  function exportActivities() {
    const rows: string[][] = [["id", "title", "deal", "done", "due_at", "created_at"]];
    for (const a of activities) {
      rows.push([
        a.id,
        a.title ?? "",
        dealById.get(a.deal_id ?? "") ?? "",
        a.done ? "true" : "false",
        a.due_at ?? "",
        a.created_at ?? "",
      ]);
    }
    download(`crm-activities-${stamp}.csv`, "text/csv;charset=utf-8", toCsv(rows));
  }

  function exportSummaryTxt() {
    const lines = [
      `CRM pipeline summary (${stamp})`,
      `Deals: ${deals.length} · pipeline ${totalPipeline} coins (${usd(totalPipeline)})`,
      `Contacts: ${contacts.length} · Companies: ${companies.length} · Activities: ${activities.length}`,
      "",
      "By stage:",
      ...stageTotals.map(([s, t]) => `- ${s}: ${t.count} deals · ${t.coins} coins (${usd(t.coins)})`),
      "",
      "Won totals by month (created_at):",
      ...(monthlyWon.length
        ? monthlyWon.map(([m, t]) => `- ${m}: ${t.count} won · ${t.coins} coins (${usd(t.coins)})`)
        : ["- (no won deals yet)"]),
      "",
      "Rate: 100 coins = $1.00. Coin settlement happens only via guarded checkout/ledger flows.",
    ];
    // Neutralize formula-leading lines (incl. values smuggled past the
    // bullet prefix via embedded newlines) before download.
    const safe = lines.join("\n").split("\n").map(defuseTxtLine).join("\n");
    download(`crm-pipeline-summary-${stamp}.txt`, "text/plain;charset=utf-8", safe);
  }

  return (
    <div className="space-y-6">
      {/* Screen controls — hidden when printing. */}
      <section className={`${cardCls} print:hidden`} aria-label="CRM exports">
        <h2 className="text-lg font-bold text-white">Reports &amp; exports</h2>
        <p className="mt-1 text-sm text-slate-400">
          Client-side CSV / TXT downloads from the loaded workspace rows. Nothing is written back.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={ghostBtnCls} onClick={exportDeals} disabled={!deals.length}>
            Export deals CSV
          </button>
          <button type="button" className={ghostBtnCls} onClick={exportContacts} disabled={!contacts.length}>
            Export contacts CSV
          </button>
          <button type="button" className={ghostBtnCls} onClick={exportCompanies} disabled={!companies.length}>
            Export companies CSV
          </button>
          <button type="button" className={ghostBtnCls} onClick={exportActivities} disabled={!activities.length}>
            Export activities CSV
          </button>
          <button type="button" className={ghostBtnCls} onClick={exportSummaryTxt} disabled={!deals.length}>
            Pipeline summary TXT
          </button>
          <button type="button" className={ghostBtnCls} onClick={() => window.print()} disabled={!deals.length}>
            Print
          </button>
        </div>
      </section>

      {/* Coins ↔ USD converter — hidden when printing. */}
      <section className={`${cardCls} print:hidden`} aria-label="Coins to USD converter">
        <h2 className="text-lg font-bold text-white">Coins ↔ USD converter</h2>
        <p className="mt-1 text-sm text-slate-400">Rate: 100 coins = $1.00.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-300">
            Coins (🪙)
            <input
              value={coinsIn}
              onChange={(e) => {
                setCoinsIn(e.target.value);
                const n = Number(e.target.value);
                if (Number.isFinite(n)) setUsdIn((n / COINS_PER_USD).toFixed(2));
              }}
              inputMode="decimal"
              maxLength={16}
              className={`${inputCls} w-full`}
              aria-label="Coins amount"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-300">
            USD ($)
            <input
              value={usdIn}
              onChange={(e) => {
                setUsdIn(e.target.value);
                const n = Number(e.target.value);
                if (Number.isFinite(n)) setCoinsIn(String(Math.round(n * COINS_PER_USD)));
              }}
              inputMode="decimal"
              maxLength={16}
              className={`${inputCls} w-full`}
              aria-label="USD amount"
            />
          </label>
        </div>
        <p className="mt-2 text-sm text-slate-300" role="status">
          {Number.isFinite(Number(coinsIn)) ? Number(coinsIn).toLocaleString() : "—"} 🪙 ≈{" "}
          {usd(Number(coinsIn) || 0)}
        </p>
      </section>

      {/* On-screen summary + monthly table. */}
      <section className={cardCls} aria-label="Pipeline summary">
        <h2 className="text-lg font-bold text-white">Pipeline summary</h2>
        <p className="mt-1 text-sm text-slate-300">
          {deals.length} deals · {totalPipeline.toLocaleString()} 🪙 ≈ {usd(totalPipeline)}
        </p>
        {stageTotals.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No deals loaded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/10">
            {stageTotals.map(([stage, t]) => (
              <li key={stage} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="font-semibold uppercase tracking-wide text-cyan-300">{stage}</span>
                <span className="text-slate-400">
                  {t.count} deals · {t.coins.toLocaleString()} 🪙 ≈ {usd(t.coins)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardCls} aria-label="Monthly won totals">
        <h2 className="text-lg font-bold text-white">Monthly won totals</h2>
        <p className="mt-1 text-sm text-slate-400">Grouped by deal created_at month (YYYY-MM).</p>
        {monthlyWon.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No won deals yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-widest text-slate-400">
                  <th className="py-2 pr-4 font-semibold">Month</th>
                  <th className="py-2 pr-4 font-semibold">Won deals</th>
                  <th className="py-2 pr-4 font-semibold">Coins</th>
                  <th className="py-2 font-semibold">USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {monthlyWon.map(([month, t]) => (
                  <tr key={month} className="text-slate-200">
                    <td className="py-2 pr-4 font-mono">{month}</td>
                    <td className="py-2 pr-4">{t.count}</td>
                    <td className="py-2 pr-4">{t.coins.toLocaleString()} 🪙</td>
                    <td className="py-2">{usd(t.coins)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Print-only summary: hidden on screen, shown when printing.
          Security: renders loaded workspace rows + a date stamp only — never
          URL params — all as React text nodes, so query-string markup cannot
          reflect into the print sheet. */}
      <section className="hidden print:block" aria-label="Print summary">
        <h2>CRM pipeline summary ({stamp})</h2>
        <p>
          {deals.length} deals · {totalPipeline} coins ({usd(totalPipeline)}) · {contacts.length}{" "}
          contacts · {companies.length} companies · {activities.length} activities.
        </p>
        <ul>
          {stageTotals.map(([stage, t]) => (
            <li key={stage}>
              {stage}: {t.count} deals · {t.coins} coins ({usd(t.coins)})
            </li>
          ))}
        </ul>
        <h3>Won totals by month</h3>
        <ul>
          {monthlyWon.length === 0 && <li>No won deals yet.</li>}
          {monthlyWon.map(([month, t]) => (
            <li key={month}>
              {month}: {t.count} won · {t.coins} coins ({usd(t.coins)})
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
