"use client";

import { useMemo, useState } from "react";
import { daysUntilPurge, TRASH_RETENTION_DAYS, type Invoice } from "./invoice-types";

const ghostBtnCls =
  "min-h-[44px] rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50";

interface TrashListProps {
  items: Invoice[];
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
  onEmptyTrash: () => void;
}

/**
 * InvoiceTrashList: 30-day soft-delete trash bin. Each trashed invoice
 * shows a live auto-purge countdown with 1-click restore or permanent
 * purge. Renders an empty state when the bin is clear — never crashes
 * on malformed dates (fail-open: unparseable dates read as "purge due").
 */
export function InvoiceTrashList({ items, onRestore, onPurge, onEmptyTrash }: TrashListProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => Date.parse(a.deleted_at ?? "") - Date.parse(b.deleted_at ?? "")
      ),
    [items]
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-8 text-center">
        <p className="text-lg font-bold text-white">Trash is empty</p>
        <p className="mt-2 text-sm text-slate-400">
          Deleted invoices rest here for {TRASH_RETENTION_DAYS} days before auto-purge. Nothing to restore.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
          Trash — {sorted.length} invoice{sorted.length === 1 ? "" : "s"}
        </h3>
        <button type="button" className={ghostBtnCls} onClick={onEmptyTrash}>
          Empty trash
        </button>
      </div>
      <ul className="mt-4 space-y-3">
        {sorted.map((inv) => {
          const daysLeft = daysUntilPurge(inv);
          const urgent = daysLeft <= 7;
          return (
            <li key={inv.id} className="rounded-xl border border-white/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-white">
                    {inv.invoice_number} <span className="font-normal text-slate-400">· {inv.client.name || "Unnamed client"}</span>
                  </p>
                  <p className={`mt-1 font-mono text-xs ${urgent ? "text-rose-300" : "text-amber-200"}`}>
                    {daysLeft > 0
                      ? `Auto-purge in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
                      : "Purge due — restore or delete permanently"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className={ghostBtnCls} onClick={() => onRestore(inv.id)}>
                    Restore
                  </button>
                  {confirmId === inv.id ? (
                    <button type="button" className={ghostBtnCls} onClick={() => onPurge(inv.id)}>
                      Confirm purge
                    </button>
                  ) : (
                    <button type="button" className={ghostBtnCls} onClick={() => setConfirmId(inv.id)}>
                      Purge
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
