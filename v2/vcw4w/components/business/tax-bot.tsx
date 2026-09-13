"use client";

import { useEffect, useMemo, useState } from "react";

interface Expense {
  id: string;
  label: string;
  amount: string;
}

interface Persisted {
  income: string;
  rate: number;
  expenses: Expense[];
}

const STORAGE_KEY = "4weird_business_tax_v1";
const DEFAULT_RATE = 25;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim().replace(/[$,]/g, "");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function quarterlyDueDates(): Array<{ label: string; due: string }> {
  const year = new Date().getFullYear();
  return [
    { label: "Q1", due: `April 15, ${year}` },
    { label: "Q2", due: `June 15, ${year}` },
    { label: "Q3", due: `September 15, ${year}` },
    { label: "Q4", due: `January 15, ${year + 1}` },
  ];
}

function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// Tax Info Bot: freelance estimated-tax calculator with expense tracking.
// Educational estimates only — never tax advice. All state stays in the
// browser (localStorage persistence); CSV export downloads via Blob.
export function TaxBot() {
  const [income, setIncome] = useState("");
  const [rate, setRate] = useState(DEFAULT_RATE);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<Persisted>;
        if (typeof parsed.income === "string") setIncome(parsed.income);
        if (typeof parsed.rate === "number" && Number.isFinite(parsed.rate)) {
          setRate(Math.min(60, Math.max(0, parsed.rate)));
        }
        if (Array.isArray(parsed.expenses)) {
          setExpenses(
            parsed.expenses
              .filter(
                (e): e is Expense =>
                  typeof e === "object" &&
                  e !== null &&
                  typeof (e as Expense).id === "string" &&
                  typeof (e as Expense).label === "string" &&
                  typeof (e as Expense).amount === "string",
              )
              .slice(0, 100),
          );
        }
      } catch {
        setStorageOk(false);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    try {
      const payload: Persisted = { income, rate, expenses };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Blocked storage was already surfaced by the hydration probe above.
    }
  }, [income, rate, expenses]);

  const incomeValue = useMemo(() => parseAmount(income), [income]);
  const incomeValid = income.trim() === "" || incomeValue !== null;

  const parsedExpenses = useMemo(
    () =>
      expenses.map((e) => ({
        ...e,
        value: parseAmount(e.amount),
      })),
    [expenses],
  );

  const expenseTotal = useMemo(
    () =>
      parsedExpenses.reduce((sum, e) => sum + (e.value ?? 0), 0),
    [parsedExpenses],
  );

  const allExpensesValid = parsedExpenses.every((e) => e.value !== null);
  const netProfit =
    incomeValue !== null ? Math.max(0, incomeValue - expenseTotal) : null;
  const estimatedTax = netProfit !== null ? (netProfit * rate) / 100 : null;
  const quarterly =
    estimatedTax !== null
      ? quarterlyDueDates().map((q) => ({ ...q, amount: estimatedTax / 4 }))
      : [];
  const canCompute =
    incomeValue !== null && allExpensesValid && estimatedTax !== null;

  const addExpense = () => {
    const label = newLabel.trim();
    const value = parseAmount(newAmount);
    if (label === "") {
      setFormError("Give the expense a category name first.");
      return;
    }
    if (value === null) {
      setFormError("Enter a valid non-negative amount, e.g. 149.99.");
      return;
    }
    setExpenses((prev) => [...prev, { id: makeId(), label, amount: newAmount.trim() }]);
    setNewLabel("");
    setNewAmount("");
    setFormError(null);
  };

  const removeExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const exportCsv = () => {
    if (!canCompute || incomeValue === null || estimatedTax === null) return;
    const lines = [
      "4weird Tax Info Bot — educational estimate, NOT tax advice",
      `Exported,${new Date().toISOString()}`,
      `Assumed effective tax rate,${rate}%`,
      `Gross freelance income,${incomeValue.toFixed(2)}`,
      ...parsedExpenses.map((e) =>
        `Expense: ${JSON.stringify(e.label)},${(e.value ?? 0).toFixed(2)}`,
      ),
      `Total deductible expenses,${expenseTotal.toFixed(2)}`,
      `Estimated net profit,${netProfit?.toFixed(2) ?? "0.00"}`,
      `Estimated annual tax,${estimatedTax.toFixed(2)}`,
      ...quarterly.map((q) => `Quarterly ${q.label} (due ${q.due}),${q.amount.toFixed(2)}`),
    ];
    downloadText("tax-estimate.csv", lines.join("\n"), "text/csv");
    setExported(true);
    window.setTimeout(() => setExported(false), 3000);
  };

  return (
    <div className="grid gap-4">
      <div
        role="note"
        className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-5 text-sm leading-relaxed text-amber-100"
      >
        <p className="font-black uppercase tracking-widest text-amber-300">
          Educational estimate only
        </p>
        <p className="mt-2">
          This bot multiplies your net profit by a rate you choose — it is not
          tax advice, not a filing, and not a substitute for a tax
          professional. Rules differ by country, state, and situation.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">Income &amp; rate</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tax-income" className="text-sm font-semibold text-slate-300">
              Annual freelance income (USD)
            </label>
            <input
              id="tax-income"
              type="text"
              inputMode="decimal"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="e.g. 60000"
              aria-invalid={!incomeValid}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            />
            {!incomeValid ? (
              <p role="alert" className="mt-2 text-sm text-rose-300">
                Enter a valid non-negative number.
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="tax-rate" className="text-sm font-semibold text-slate-300">
              Assumed effective tax rate: {rate}%
            </label>
            <input
              id="tax-rate"
              type="range"
              min={0}
              max={60}
              step={1}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="mt-4 w-full accent-cyan-300"
            />
            <p className="mt-2 text-xs text-slate-500">
              Default {DEFAULT_RATE}% is a rough placeholder only — adjust it to
              your situation or your accountant&apos;s guidance.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-lg font-black">Deductible expenses</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
          <div>
            <label htmlFor="tax-expense-label" className="text-sm font-semibold text-slate-300">
              Category
            </label>
            <input
              id="tax-expense-label"
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Home office"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            />
          </div>
          <div>
            <label htmlFor="tax-expense-amount" className="text-sm font-semibold text-slate-300">
              Amount (USD)
            </label>
            <input
              id="tax-expense-amount"
              type="text"
              inputMode="decimal"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addExpense();
              }}
              placeholder="e.g. 1200"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={addExpense}
              className="w-full rounded-full bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 sm:w-auto"
            >
              Add expense
            </button>
          </div>
        </div>
        {formError ? (
          <p role="alert" className="mt-3 text-sm text-rose-300">
            {formError}
          </p>
        ) : null}
        {parsedExpenses.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {parsedExpenses.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
              >
                <span className="text-slate-200">
                  {e.label}{" "}
                  <span className={e.value === null ? "text-rose-300" : "text-slate-400"}>
                    — {e.value === null ? "invalid amount" : currency.format(e.value)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeExpense(e.id)}
                  aria-label={`Remove expense ${e.label}`}
                  className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold transition hover:bg-white/10"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            No expenses yet — add categories like software, hardware, or home
            office to lower the estimated net profit.
          </p>
        )}
        <p className="mt-4 text-sm text-slate-300" aria-live="polite">
          Total expenses:{" "}
          <strong className="text-white">{currency.format(expenseTotal)}</strong>
        </p>
      </div>

      <div
        className="rounded-3xl border border-white/10 bg-white/[.03] p-6"
        aria-live="polite"
      >
        <h2 className="text-lg font-black">Estimate</h2>
        {canCompute && netProfit !== null && estimatedTax !== null ? (
          <div className="mt-4">
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Net profit
                </dt>
                <dd className="mt-1 text-2xl font-black text-white">
                  {currency.format(netProfit)}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Est. annual tax ({rate}%)
                </dt>
                <dd className="mt-1 text-2xl font-black text-cyan-300">
                  {currency.format(estimatedTax)}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Per quarter
                </dt>
                <dd className="mt-1 text-2xl font-black text-white">
                  {currency.format(estimatedTax / 4)}
                </dd>
              </div>
            </dl>
            <h3 className="mt-6 text-sm font-black uppercase tracking-widest text-slate-400">
              Quarterly breakdown
            </h3>
            <ul className="mt-3 space-y-2">
              {quarterly.map((q) => (
                <li
                  key={q.label}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
                >
                  <span className="text-slate-300">
                    {q.label} — due {q.due}
                  </span>
                  <strong className="text-white">{currency.format(q.amount)}</strong>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={exportCsv}
              className="mt-6 rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              Download CSV estimate
            </button>
            {exported ? (
              <p className="mt-3 text-sm text-cyan-300">
                CSV downloaded — check your downloads folder.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Enter your annual income above to see the estimate and quarterly
            breakdown. Fix any invalid amounts first.
          </p>
        )}
        {!storageOk ? (
          <p className="mt-4 text-sm text-amber-300">
            Local storage is unavailable — your numbers will not be saved
            between visits, but the calculator still works.
          </p>
        ) : null}
      </div>
    </div>
  );
}
