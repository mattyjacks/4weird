"use client";

import { useEffect, useMemo, useState } from "react";
import {
  invoiceSubtotal,
  invoiceTax,
  invoiceTotal,
  type Invoice,
} from "./invoice-types";

const ghostBtnCls =
  "min-h-[44px] rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10";

/**
 * InvoicePdfPreview: client-ready printable invoice sheet. Vector PDF
 * export ships via the browser print-to-PDF path (print CSS keeps the
 * sheet monochrome-safe); the button guards `window.print` behind a
 * mounted flag so SSR never touches browser APIs.
 */
export function InvoicePdfPreview({ invoice }: { invoice: Invoice }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const subtotal = useMemo(() => invoiceSubtotal(invoice.line_items), [invoice.line_items]);
  const tax = useMemo(() => invoiceTax(subtotal, invoice.tax_rate), [subtotal, invoice.tax_rate]);
  const total = useMemo(() => invoiceTotal(subtotal, tax), [subtotal, tax]);

  function handlePrint() {
    if (!mounted || typeof window === "undefined") return;
    try {
      window.print();
    } catch {
      // Fail-open: print unavailable (headless/iframe) — preview still reads.
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end print:hidden">
        <button type="button" className={ghostBtnCls} onClick={handlePrint}>
          Export PDF (print)
        </button>
      </div>
      <article className="rounded-2xl border border-white/10 bg-white p-8 text-slate-900 print:border-0 print:rounded-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {invoice.sender_company_name || "4WEIRD Studio"}
            </p>
            <h2 className="mt-1 text-3xl font-black">INVOICE</h2>
            <p className="mt-1 font-mono text-sm">{invoice.invoice_number}</p>
          </div>
          <dl className="text-right text-sm">
            <div className="flex justify-end gap-4"><dt className="text-slate-500">Issue</dt><dd className="font-mono">{invoice.issue_date}</dd></div>
            <div className="flex justify-end gap-4"><dt className="text-slate-500">Due</dt><dd className="font-mono">{invoice.due_date}</dd></div>
            <div className="flex justify-end gap-4"><dt className="text-slate-500">Status</dt><dd className="font-bold uppercase">{invoice.status}</dd></div>
          </dl>
        </header>

        <section className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Bill to</p>
            <p className="mt-1 font-bold">{invoice.client.name || "—"}</p>
            {invoice.client.address ? <p className="text-slate-600">{invoice.client.address}</p> : null}
            {invoice.client.email ? <p className="text-slate-600">{invoice.client.email}</p> : null}
            {invoice.client.vat_number ? <p className="text-slate-600">VAT: {invoice.client.vat_number}</p> : null}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">From</p>
            <p className="mt-1 font-bold">{invoice.sender_company_name || "—"}</p>
            {invoice.sender_company_address ? <p className="text-slate-600">{invoice.sender_company_address}</p> : null}
          </div>
        </section>

        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-xs uppercase tracking-widest text-slate-500">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.line_items.map((l) => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="py-2">{l.description || "—"}</td>
                <td className="py-2 text-right font-mono">{l.quantity}</td>
                <td className="py-2 text-right font-mono">${l.unit_rate.toFixed(2)}</td>
                <td className="py-2 text-right font-mono">${l.total.toFixed(2)}</td>
              </tr>
            ))}
            {invoice.line_items.length === 0 ? (
              <tr><td colSpan={4} className="py-4 text-center text-slate-500">No line items.</td></tr>
            ) : null}
          </tbody>
        </table>

        <dl className="mt-4 space-y-1 text-right font-mono text-sm">
          <div className="flex justify-end gap-6"><dt>Subtotal</dt><dd>${subtotal.toFixed(2)}</dd></div>
          <div className="flex justify-end gap-6"><dt>Tax ({invoice.tax_rate}%)</dt><dd>${tax.toFixed(2)}</dd></div>
          <div className="flex justify-end gap-6 text-lg font-black"><dt>Total ({invoice.currency})</dt><dd>${total.toFixed(2)}</dd></div>
        </dl>

        {invoice.notes ? (
          <p className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600">{invoice.notes}</p>
        ) : null}
      </article>
    </div>
  );
}
