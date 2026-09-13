"use client";

import { useEffect, useMemo, useState } from "react";

type Receipt = {
  id: string;
  date: string;
  vendor: string;
  category: string;
  amount: number;
};

const STATES: { code: string; label: string; rate: number }[] = [
  { code: "CA", label: "California", rate: 0.093 },
  { code: "NY", label: "New York", rate: 0.0685 },
  { code: "OR", label: "Oregon", rate: 0.09 },
  { code: "CO", label: "Colorado", rate: 0.044 },
  { code: "IL", label: "Illinois", rate: 0.0495 },
  { code: "PA", label: "Pennsylvania", rate: 0.0307 },
  { code: "TX", label: "Texas (no income tax)", rate: 0 },
  { code: "FL", label: "Florida (no income tax)", rate: 0 },
  { code: "WA", label: "Washington (no income tax)", rate: 0 },
  { code: "OTHER", label: "Other / average", rate: 0.045 },
];

// Simplified flat planning rate for the federal slice. Displayed openly as a
// rough estimate so the math is checkable, never presented as tax advice.
const FEDERAL_PLANNING_RATE = 0.15;

const DRAFT_KEY = "4weird-tax-draft-v1";

function money(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function parseAmount(raw: string): number {
  const n = Number(raw.replace(/[$,]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function TaxClient() {
  const [incomeRaw, setIncomeRaw] = useState("60000");
  const [otherExpensesRaw, setOtherExpensesRaw] = useState("5000");
  const [stateCode, setStateCode] = useState("OTHER");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("Supplies");
  const [amountRaw, setAmountRaw] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- localStorage restore must run post-hydration to avoid an SSR mismatch; single mount sync is intentional. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as {
          incomeRaw?: unknown;
          otherExpensesRaw?: unknown;
          stateCode?: unknown;
          receipts?: unknown;
        };
        if (typeof draft.incomeRaw === "string") setIncomeRaw(draft.incomeRaw);
        if (typeof draft.otherExpensesRaw === "string") setOtherExpensesRaw(draft.otherExpensesRaw);
        if (typeof draft.stateCode === "string" && STATES.some((s) => s.code === draft.stateCode)) {
          setStateCode(draft.stateCode as string);
        }
        if (Array.isArray(draft.receipts)) {
          const clean = (draft.receipts as unknown[]).filter(
            (r): r is Receipt =>
              typeof r === "object" &&
              r !== null &&
              typeof (r as Receipt).id === "string" &&
              typeof (r as Receipt).vendor === "string" &&
              typeof (r as Receipt).date === "string" &&
              typeof (r as Receipt).category === "string" &&
              typeof (r as Receipt).amount === "number" &&
              Number.isFinite((r as Receipt).amount),
          );
          setReceipts(clean);
        }
      }
    } catch {
      // Corrupt draft: start fresh.
    }
    setLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ incomeRaw, otherExpensesRaw, stateCode, receipts }),
      );
    } catch {
      // Storage blocked: the estimator keeps working without persistence.
    }
  }, [loaded, incomeRaw, otherExpensesRaw, stateCode, receipts]);

  const income = parseAmount(incomeRaw);
  const otherExpenses = parseAmount(otherExpensesRaw);
  const receiptsTotal = useMemo(
    () => receipts.reduce((sum, r) => sum + r.amount, 0),
    [receipts],
  );
  const state = STATES.find((s) => s.code === stateCode) ?? STATES[STATES.length - 1];

  const estimate = useMemo(() => {
    if (!Number.isFinite(income) || !Number.isFinite(otherExpenses)) return null;
    const expenses = otherExpenses + receiptsTotal;
    const net = Math.max(0, income - expenses);
    const federal = net * FEDERAL_PLANNING_RATE;
    const stateTax = net * state.rate;
    const total = federal + stateTax;
    return {
      expenses,
      net,
      federal,
      stateTax,
      total,
      quarterly: total / 4,
      effectiveRate: net > 0 ? total / net : 0,
    };
  }, [income, otherExpenses, receiptsTotal, state.rate]);

  function addReceipt() {
    const amount = parseAmount(amountRaw);
    if (!vendor.trim()) {
      setNotice("Add a vendor or short note for the receipt.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice("Receipt amount must be a number above zero.");
      return;
    }
    setReceipts((prev) => [
      ...prev,
      {
        id: newId(),
        date: date || new Date().toISOString().slice(0, 10),
        vendor: vendor.trim(),
        category: category.trim() || "Supplies",
        amount: Math.round(amount * 100) / 100,
      },
    ]);
    setVendor("");
    setAmountRaw("");
    setNotice("Receipt added.");
  }

  function removeReceipt(id: string) {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
    setNotice("Receipt removed.");
  }

  function exportCsv() {
    if (receipts.length === 0) {
      setNotice("No receipts to export yet — add one first.");
      return;
    }
    try {
      const header = "date,vendor,category,amount_usd";
      const lines = [...receipts]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => [r.date, csvCell(r.vendor), csvCell(r.category), r.amount.toFixed(2)].join(","));
      const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "4weird-tax-receipts.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice(`Exported ${receipts.length} receipt${receipts.length === 1 ? "" : "s"} to CSV.`);
    } catch {
      setNotice("CSV export failed in this browser.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8">
        <h2 className="text-xl font-black">Estimate</h2>

        <label className="mt-6 block text-sm font-semibold text-slate-200">
          Annual freelance income (USD)
          <input
            value={incomeRaw}
            onChange={(e) => setIncomeRaw(e.target.value)}
            inputMode="decimal"
            placeholder="60000"
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-slate-200">
          Other business expenses (USD)
          <input
            value={otherExpensesRaw}
            onChange={(e) => setOtherExpensesRaw(e.target.value)}
            inputMode="decimal"
            placeholder="5000"
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-slate-200">
          State
          <select
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white"
          >
            {STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {estimate ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm">
            <h3 className="font-bold text-slate-100">Worked estimate</h3>
            <dl className="mt-3 space-y-1.5 text-slate-300">
              <div className="flex justify-between gap-4">
                <dt>Income</dt>
                <dd className="font-semibold text-white">{money(income)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Expenses (other + {receipts.length} receipts)</dt>
                <dd className="font-semibold text-white">{money(estimate.expenses)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Net profit</dt>
                <dd className="font-semibold text-white">{money(estimate.net)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Federal slice ({Math.round(FEDERAL_PLANNING_RATE * 100)}% planning rate)</dt>
                <dd className="font-semibold text-white">{money(estimate.federal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>
                  State slice ({state.label}, {(state.rate * 100).toFixed(2)}%)
                </dt>
                <dd className="font-semibold text-white">{money(estimate.stateTax)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-white/10 pt-2">
                <dt className="font-bold text-white">Estimated annual set-aside</dt>
                <dd className="font-bold text-cyan-300">{money(estimate.total)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Per quarter (÷ 4)</dt>
                <dd className="font-bold text-cyan-300">{money(estimate.quarterly)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Effective rate on net</dt>
                <dd className="font-semibold text-white">
                  {(estimate.effectiveRate * 100).toFixed(1)}%
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-slate-500">
              net = income − expenses; federal = net × {FEDERAL_PLANNING_RATE}; state = net ×{" "}
              {state.rate}; quarterly = total ÷ 4. Rough planning math, not tax advice.
            </p>
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-200">
            Enter numbers for income and expenses to see the worked estimate.
          </p>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black">Receipts ({receipts.length})</h2>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:border-cyan-300/50"
          >
            Export CSV
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 block text-sm font-semibold text-slate-200 sm:col-span-1">
            Vendor / note
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Art tablet store"
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-200">
            Amount (USD)
            <input
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value)}
              inputMode="decimal"
              placeholder="49.99"
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-200">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-200">
            Category
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Supplies"
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={addReceipt}
          className="mt-4 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
        >
          Add receipt
        </button>

        {receipts.length === 0 ? (
          <p className="mt-6 rounded-xl border border-white/10 bg-slate-950 p-4 text-sm text-slate-400">
            No receipts yet. Add your first one above — receipts add into the
            expense side of the estimate and export to CSV.
          </p>
        ) : (
          <ul className="mt-6 space-y-2">
            {[...receipts].reverse().map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-white">{r.vendor}</span>
                  <span className="block text-xs text-slate-400">
                    {r.date} · {r.category}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-bold text-cyan-300">{money(r.amount)}</span>
                  <button
                    type="button"
                    onClick={() => removeReceipt(r.id)}
                    aria-label={`Remove receipt from ${r.vendor}`}
                    className="rounded-lg border border-white/15 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:border-red-300/60 hover:text-red-200"
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-sm text-slate-400">
          Receipts total: <span className="font-bold text-white">{money(receiptsTotal)}</span>
        </p>
        {notice ? (
          <p role="status" className="mt-2 text-sm text-cyan-200">
            {notice}
          </p>
        ) : null}
      </div>
    </div>
  );
}
