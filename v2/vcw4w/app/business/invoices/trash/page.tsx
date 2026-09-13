"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { InvoiceTrashList } from "@/components/invoice/invoice-trash-list";
import { trashedInvoices, type Invoice } from "@/components/invoice/invoice-types";

const TRASH_KEY = "4weird_invoice_trash_v1";

/**
 * Trash page (client): reads the soft-deleted invoice bin from
 * localStorage inside useEffect (SSR-safe), offers 1-click restore and
 * permanent purge. Fail-open: unreadable storage renders an empty bin
 * with a notice instead of crashing.
 */
export default function InvoiceTrashPage() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [mounted, setMounted] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(TRASH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Invoice[];
        if (Array.isArray(parsed)) setItems(parsed.filter((i) => i && i.deleted_at));
      }
    } catch {
      setNotice("Trash bin could not be read — showing an empty bin.");
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(TRASH_KEY, JSON.stringify(items));
    } catch {
      // Fail-open: ignore quota/private-mode errors.
    }
  }, [items, mounted]);

  const handleRestore = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setNotice("Invoice restored to the live list.");
  }, []);

  const handlePurge = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setNotice("Invoice permanently purged.");
  }, []);

  const handleEmpty = useCallback(() => {
    setItems([]);
    setNotice("Trash emptied.");
  }, []);

  const trashed = trashedInvoices(items);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-5 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
          4WEIRD // BUSINESS // INVOICES
        </p>
        <h1 className="mt-2 text-4xl font-black">Trash</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Deleted invoices rest here for 30 days before auto-purge. Related:{" "}
          <Link href="/business/invoices" className="font-bold text-cyan-300 hover:underline">
            Invoice list
          </Link>{" "}
          ·{" "}
          <Link href="/business/invoices/new" className="font-bold text-cyan-300 hover:underline">
            New invoice
          </Link>
          .
        </p>
        {notice ? (
          <p role="status" className="mt-6 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
            {notice}
          </p>
        ) : null}
        <div className="mt-10">
          <InvoiceTrashList
            items={trashed}
            onRestore={handleRestore}
            onPurge={handlePurge}
            onEmptyTrash={handleEmpty}
          />
        </div>
      </section>
    </main>
  );
}
