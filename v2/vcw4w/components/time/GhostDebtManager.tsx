"use client";

import { useState } from "react";
import { GhostDebt, formatGhostCash } from "@/types/time";
import { CheckCircle2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GhostDebtManagerProps {
  debts: GhostDebt[];
  onRefresh: () => void;
}

export function GhostDebtManager({ debts, onRefresh }: GhostDebtManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [debtorId, setDebtorId] = useState("");
  const [amount, setAmount] = useState("100");
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async (debtId: string, action: "settle" | "forgive") => {
    const actionLabel = action === "settle" ? "settled" : "forgiven";
    if (!confirm(`Mark this Ghost Cash debt as ${actionLabel}?`)) return;

    await fetch("/api/time/debts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ debtId, action }),
    });

    onRefresh();
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtorId || !amount) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/time/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtorId,
          amountGhostCash: parseFloat(amount),
          memo,
        }),
      });

      if (res.ok) {
        setDebtorId("");
        setMemo("");
        setIsOpen(false);
        onRefresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingDebts = debts.filter((d) => d.status === "pending");
  const settledDebts = debts.filter((d) => d.status !== "pending");

  const totalPendingOwed = pendingDebts.reduce((sum, d) => sum + d.amountGhostCash, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Ghost Cash (👻) Debt Ledger</h2>
          <p className="text-sm text-zinc-400">
            Track debts owed between org leaders, social media marketers, and freelancers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold">
            Total Outstanding: {formatGhostCash(totalPendingOwed)}
          </div>
          <Button
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs gap-1"
          >
            <Plus className="h-4 w-4" />
            Record Debt
          </Button>
        </div>
      </div>

      {isOpen && (
        <form onSubmit={handleManualCreate} className="p-5 rounded-xl border border-white/10 bg-zinc-950/80 space-y-4">
          <h3 className="font-semibold text-white text-sm">Record Intra-Org Debt</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Debtor Profile UUID</label>
              <Input
                placeholder="User UUID of person who owes Ghost Cash"
                value={debtorId}
                onChange={(e) => setDebtorId(e.target.value)}
                className="bg-black/50 border-white/10 text-white font-mono text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Amount in Ghost Cash (👻)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 250"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-black/50 border-white/10 text-white font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Memo / Scope of Work</label>
            <Input
              placeholder="e.g. 5 hours social media community management"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="bg-black/50 border-white/10 text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs"
            >
              {isSubmitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Save Debt
            </Button>
          </div>
        </form>
      )}

      {/* Debts Table / List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-300">Pending Debts</h3>
        {pendingDebts.length === 0 ? (
          <div className="p-6 rounded-xl border border-white/10 bg-zinc-950/40 text-center text-xs text-zinc-500">
            No outstanding Ghost Cash debts. All balances are settled!
          </div>
        ) : (
          pendingDebts.map((d) => (
            <div
              key={d.id}
              className="p-4 rounded-xl border border-white/10 bg-zinc-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-400 font-mono">
                    {formatGhostCash(d.amountGhostCash)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Pending
                  </span>
                </div>
                <p className="text-sm font-medium text-white">{d.memo || "Work compensation"}</p>
                <div className="text-xs text-zinc-400 flex items-center gap-2">
                  <span>Creditor: <strong className="text-zinc-200">{d.creditor?.displayName || d.creditor?.username || "You"}</strong></span>
                  <span>•</span>
                  <span>Debtor: <strong className="text-zinc-200">{d.debtor?.displayName || d.debtor?.username || d.debtorId}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAction(d.id, "settle")}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Mark Settled
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(d.id, "forgive")}
                  className="text-xs border-white/10 text-zinc-400 hover:text-zinc-200"
                >
                  Forgive
                </Button>
              </div>
            </div>
          ))
        )}

        {settledDebts.length > 0 && (
          <div className="pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-400">Settled & Forgiven History</h3>
            {settledDebts.slice(0, 10).map((d) => (
              <div
                key={d.id}
                className="p-3 rounded-lg border border-white/5 bg-zinc-950/30 flex items-center justify-between text-xs text-zinc-400"
              >
                <div>
                  <span className="font-mono text-zinc-300 mr-2">{formatGhostCash(d.amountGhostCash)}</span>
                  <span>{d.memo}</span>
                </div>
                <span className="capitalize px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
