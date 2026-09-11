"use client";

import { useCallback, useEffect, useState } from "react";

type RefundableLot = {
  lot_id: string;
  original_coins: number;
  remaining_coins: number;
  spent_coins: number;
  refunded_coins: number;
  refundable_coins: number;
  refundable_usd_cents: number;
  received_at: string;
  expires_at: string;
  refund_deadline: string;
  days_left: number;
  order_name: string | null;
  sku: string | null;
};

type PastRefund = {
  refund_id: string;
  lot_id: string;
  coins: number;
  usd_cents: number;
  created_at: string;
  order_name: string | null;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body.error ?? `Request failed (${response.status})`));
  return body as T;
}

function fmtCoins(n: number): string {
  const r = Math.round(Number(n) * 100) / 100;
  return Number.isInteger(r) ? r.toLocaleString() : r.toFixed(2);
}

export function RefundPanel() {
  const [lots, setLots] = useState<RefundableLot[]>([]);
  const [refunds, setRefunds] = useState<PastRefund[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Loading refundable coins…");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    void request<{ lots: RefundableLot[]; refunds: PastRefund[] }>("/api/coins/refunds")
      .then((b) => {
        setLots(b.lots ?? []);
        setRefunds(b.refunds ?? []);
        setMessage(
          (b.lots ?? []).length === 0
            ? "No refundable coins right now. Only unspent coins from purchases made in the last 90 days can be refunded; free coins (trial, daily, referrals) are never refundable."
            : "",
        );
      })
      .catch((error: unknown) =>
        setMessage(error instanceof Error ? error.message : "Unable to load refunds."),
      );
  }, []);
  useEffect(() => {
    load();
    window.addEventListener("vibe-coins-changed", load);
    return () => window.removeEventListener("vibe-coins-changed", load);
  }, [load]);

  async function refund(lot: RefundableLot, partial: boolean) {
    if (busy) return;
    const raw = (amounts[lot.lot_id] ?? "").trim();
    const coins = partial ? Number(raw) : undefined;
    if (partial && (!Number.isFinite(coins) || (coins as number) <= 0)) {
      setMessage("Enter a refund amount in coins first.");
      return;
    }
    const label =
      partial || lot.spent_coins > 0
        ? `Refund ${partial ? `${fmtCoins(coins as number)} of ${fmtCoins(lot.refundable_coins)}` : `the ${fmtCoins(lot.refundable_coins)} unspent`} coins from this purchase?${lot.spent_coins > 0 ? ` You already spent ${fmtCoins(lot.spent_coins)}; only the unspent remainder is refundable.` : ""}`
        : `Refund ${fmtCoins(lot.refundable_coins)} unspent coins from this purchase?`;
    if (!window.confirm(label)) return;
    setBusy(true);
    setMessage("Refunding…");
    try {
      const body: Record<string, unknown> = { lot_id: lot.lot_id };
      if (partial) body.coins = coins;
      const result = await request<{ refund: { coins: number } }>("/api/coins/refund", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setMessage(`Refunded ${fmtCoins(result.refund.coins)} coins. The lot is marked refunded.`);
      setAmounts((m) => ({ ...m, [lot.lot_id]: "" }));
      load();
      window.dispatchEvent(new Event("vibe-coins-changed"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to refund.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
      <h2 className="text-xl font-bold">Refunds</h2>
      <p className="mt-2 text-sm text-slate-400">
        Unspent coins from purchases made in the last 90 days can be refunded. Free coins are
        never refundable. If you already spent part of a pack, only the unspent remainder is
        refunded (pro-rated); the lot is marked refunded for the refunded amount.
      </p>
      {message && (
        <p role="status" className="mt-3 text-sm text-slate-400">
          {message}
        </p>
      )}
      {lots.length > 0 && (
        <ul className="mt-4 space-y-3">
          {lots.map((lot) => (
            <li key={lot.lot_id} className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold">
                  {fmtCoins(lot.refundable_coins)} coins refundable
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    (${((lot.refundable_usd_cents ?? 0) / 100).toFixed(2)})
                  </span>
                </span>
                <span className="text-xs text-slate-500">
                  {lot.days_left}d left · {lot.order_name ?? "purchase"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Bought {fmtCoins(lot.original_coins)}
                {lot.spent_coins > 0 && (
                  <> · spent {fmtCoins(lot.spent_coins)} · unspent {fmtCoins(lot.remaining_coins)}</>
                )}
                {lot.refunded_coins > 0 && <> · already refunded {fmtCoins(lot.refunded_coins)}</>}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => refund(lot, false)}
                  className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"
                >
                  Refund {fmtCoins(lot.refundable_coins)}
                </button>
                <input
                  aria-label={`Partial refund amount for ${lot.order_name ?? "purchase"}`}
                  inputMode="decimal"
                  placeholder="Partial amount"
                  value={amounts[lot.lot_id] ?? ""}
                  onChange={(e) => setAmounts((m) => ({ ...m, [lot.lot_id]: e.target.value }))}
                  className="w-32 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  disabled={busy}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => refund(lot, true)}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  Partial refund
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {refunds.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-slate-300">Past refunds</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-400">
            {refunds.slice(0, 10).map((r) => (
              <li key={r.refund_id}>
                Refunded {fmtCoins(r.coins)} coins
                {r.order_name ? ` (${r.order_name})` : ""} ·{" "}
                {new Date(r.created_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
