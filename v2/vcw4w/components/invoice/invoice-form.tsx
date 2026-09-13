"use client";

import { useEffect, useMemo, useState } from "react";
import {
  blankInvoice,
  invoiceSubtotal,
  invoiceTax,
  invoiceTotal,
  lineTotal,
  newInvoiceId,
  type Invoice,
  type InvoiceLineItem,
} from "./invoice-types";

const DRAFT_KEY = "4weird_invoice_draft_v1";

const inputCls =
  "min-w-0 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";
const btnCls =
  "min-h-[44px] rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50";
const ghostBtnCls =
  "min-h-[44px] rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10";

function emitInterop(event: string, data: Record<string, unknown>) {
  try {
    const channel = new BroadcastChannel("4weird_interop_bus");
    channel.postMessage({ event, data, at: Date.now() });
    channel.close();
  } catch {
    // Fail-open: interop bus is best-effort, never bricks the form.
  }
}

function emptyLine(position: number): InvoiceLineItem {
  return { id: newInvoiceId(), description: "", quantity: 1, unit_rate: 0, total: 0, position };
}

/**
 * InvoiceForm: client directory fields + line-item editor with live
 * subtotal/tax/total. Draft persists to localStorage inside useEffect
 * (SSR-safe, zero hydration mismatch). Fail-open: storage errors surface
 * as a notice, never a crash.
 */
export function InvoiceForm({ onSaved }: { onSaved?: (invoice: Invoice) => void }) {
  const [invoice, setInvoice] = useState<Invoice>(() => blankInvoice());
  const [mounted, setMounted] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Invoice;
        if (parsed && Array.isArray(parsed.line_items)) setInvoice(parsed);
      }
    } catch {
      setNotice("Saved draft could not be read — starting with a blank invoice.");
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(invoice));
    } catch {
      // Fail-open: ignore quota/private-mode errors.
    }
  }, [invoice, mounted]);

  const subtotal = useMemo(() => invoiceSubtotal(invoice.line_items), [invoice.line_items]);
  const tax = useMemo(() => invoiceTax(subtotal, invoice.tax_rate), [subtotal, invoice.tax_rate]);
  const total = useMemo(() => invoiceTotal(subtotal, tax), [subtotal, tax]);

  function patch(p: Partial<Invoice>) {
    setInvoice((prev) => ({ ...prev, ...p }));
  }

  function patchLine(id: string, p: Partial<InvoiceLineItem>) {
    setInvoice((prev) => ({
      ...prev,
      line_items: prev.line_items.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...p };
        next.total = lineTotal(next.quantity, next.unit_rate);
        return next;
      }),
    }));
  }

  function handleSave() {
    if (!invoice.client.name.trim()) {
      setNotice("Add a client name before saving.");
      return;
    }
    if (invoice.line_items.length === 0) {
      setNotice("Add at least one line item before saving.");
      return;
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Fail-open.
    }
    emitInterop("invoice:saved", { id: invoice.id, number: invoice.invoice_number, total });
    setNotice(`Invoice ${invoice.invoice_number} ready — $${total.toFixed(2)} ${invoice.currency}.`);
    onSaved?.(invoice);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
      {notice ? (
        <p role="status" className="mb-4 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Invoice number
          <input className={inputCls} value={invoice.invoice_number} onChange={(e) => patch({ invoice_number: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Status
          <select
            className={inputCls}
            value={invoice.status}
            onChange={(e) => patch({ status: e.target.value as Invoice["status"] })}
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Client name
          <input
            className={inputCls}
            placeholder="Client company"
            value={invoice.client.name}
            onChange={(e) => patch({ client: { ...invoice.client, name: e.target.value } })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Client email
          <input
            className={inputCls}
            placeholder="billing@example.com"
            value={invoice.client.email ?? ""}
            onChange={(e) => patch({ client: { ...invoice.client, email: e.target.value } })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Billing address
          <input
            className={inputCls}
            placeholder="Street, city, country"
            value={invoice.client.address ?? ""}
            onChange={(e) => patch({ client: { ...invoice.client, address: e.target.value } })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          VAT ID
          <input
            className={inputCls}
            placeholder="VAT / tax ID (optional)"
            value={invoice.client.vat_number ?? ""}
            onChange={(e) => patch({ client: { ...invoice.client, vat_number: e.target.value } })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Issue date
          <input type="date" className={inputCls} value={invoice.issue_date} onChange={(e) => patch({ issue_date: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Due date
          <input type="date" className={inputCls} value={invoice.due_date} onChange={(e) => patch({ due_date: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Tax rate (%)
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={invoice.tax_rate}
            onChange={(e) => patch({ tax_rate: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Sender company
          <input
            className={inputCls}
            placeholder="Your studio / company"
            value={invoice.sender_company_name ?? ""}
            onChange={(e) => patch({ sender_company_name: e.target.value })}
          />
        </label>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Line items</h3>
          <button
            type="button"
            className={ghostBtnCls}
            onClick={() => patch({ line_items: [...invoice.line_items, emptyLine(invoice.line_items.length)] })}
          >
            + Add line
          </button>
        </div>
        {invoice.line_items.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No line items yet — add your first billable line.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {invoice.line_items.map((l) => (
              <li key={l.id} className="grid gap-2 rounded-xl border border-white/10 p-3 md:grid-cols-[1fr_90px_110px_110px_auto]">
                <input
                  className={inputCls}
                  placeholder="Description"
                  value={l.description}
                  onChange={(e) => patchLine(l.id, { description: e.target.value })}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label="Quantity"
                  className={inputCls}
                  value={l.quantity}
                  onChange={(e) => patchLine(l.id, { quantity: Number(e.target.value) || 0 })}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label="Unit rate"
                  className={inputCls}
                  value={l.unit_rate}
                  onChange={(e) => patchLine(l.id, { unit_rate: Number(e.target.value) || 0 })}
                />
                <span className="flex items-center px-2 font-mono text-sm text-emerald-300">
                  ${l.total.toFixed(2)}
                </span>
                <button
                  type="button"
                  className={ghostBtnCls}
                  onClick={() => patch({ line_items: invoice.line_items.filter((x) => x.id !== l.id) })}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <dl className="mt-6 space-y-1 text-right font-mono text-sm text-slate-300">
        <div className="flex justify-end gap-6"><dt>Subtotal</dt><dd>${subtotal.toFixed(2)}</dd></div>
        <div className="flex justify-end gap-6"><dt>Tax ({invoice.tax_rate}%)</dt><dd>${tax.toFixed(2)}</dd></div>
        <div className="flex justify-end gap-6 text-base font-bold text-white"><dt>Total</dt><dd>${total.toFixed(2)}</dd></div>
      </dl>

      <div className="mt-4 flex gap-3">
        <button type="button" className={btnCls} onClick={handleSave}>
          Save invoice
        </button>
        <button
          type="button"
          className={ghostBtnCls}
          onClick={() => {
            setInvoice(blankInvoice());
            setNotice("Draft cleared.");
          }}
        >
          Clear draft
        </button>
      </div>
    </div>
  );
}
