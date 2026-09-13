/**
 * Invoice suite shared types (Remastery Feature 17, Wave 1 web2 slice).
 * Mirrors the README §2 table shapes: invoice_clients, invoices,
 * invoice_line_items — plus the 30-day soft-delete trash lifecycle.
 *
 * Pure types + pure helpers only: no browser APIs here, safe to import
 * from server or client components.
 */

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface InvoiceClient {
  id: string;
  name: string;
  email?: string;
  address?: string;
  phone?: string;
  vat_number?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_rate: number;
  total: number;
  position: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client: InvoiceClient;
  issue_date: string;
  due_date: string;
  currency: string;
  tax_rate: number;
  notes?: string;
  sender_company_name?: string;
  sender_company_address?: string;
  status: InvoiceStatus;
  line_items: InvoiceLineItem[];
  /** 30-day soft-delete trash marker; null/undefined = live. */
  deleted_at?: string | null;
}

/** Trash retention window in days (README §4.4: 30-day auto-purge). */
export const TRASH_RETENTION_DAYS = 30;

/** Vibe Coin parity: 100 coins = exactly $1.00 USD. */
export const COINS_PER_USD = 100;

/** 75/25 monetization split: creator share of a gross amount. */
export function creatorShare(gross: number): number {
  return Math.round(gross * 0.75 * 100) / 100;
}

/** 75/25 monetization split: platform share of a gross amount. */
export function platformShare(gross: number): number {
  return Math.round(gross * 0.25 * 100) / 100;
}

export function lineTotal(quantity: number, unitRate: number): number {
  const q = Number.isFinite(quantity) ? quantity : 0;
  const r = Number.isFinite(unitRate) ? unitRate : 0;
  return Math.round(q * r * 100) / 100;
}

export function invoiceSubtotal(items: InvoiceLineItem[]): number {
  return Math.round(items.reduce((sum, i) => sum + lineTotal(i.quantity, i.unit_rate), 0) * 100) / 100;
}

export function invoiceTax(subtotal: number, taxRate: number): number {
  const rate = Number.isFinite(taxRate) ? taxRate : 0;
  return Math.round(subtotal * (rate / 100) * 100) / 100;
}

export function invoiceTotal(subtotal: number, tax: number): number {
  return Math.round((subtotal + tax) * 100) / 100;
}

export function isTrashed(invoice: Invoice): boolean {
  return Boolean(invoice.deleted_at);
}

/** Whole days remaining before auto-purge; <= 0 means purge is due. */
export function daysUntilPurge(invoice: Invoice, nowMs = Date.now()): number {
  if (!invoice.deleted_at) return TRASH_RETENTION_DAYS;
  const deletedMs = Date.parse(invoice.deleted_at);
  if (!Number.isFinite(deletedMs)) return 0;
  const elapsedDays = (nowMs - deletedMs) / (1000 * 60 * 60 * 24);
  return Math.ceil(TRASH_RETENTION_DAYS - elapsedDays);
}

/** Filter helper: live invoices (trash excluded). */
export function liveInvoices(invoices: Invoice[]): Invoice[] {
  return invoices.filter((i) => !isTrashed(i));
}

/** Filter helper: trashed invoices, oldest deletion first. */
export function trashedInvoices(invoices: Invoice[]): Invoice[] {
  return invoices
    .filter(isTrashed)
    .sort((a, b) => Date.parse(a.deleted_at ?? "") - Date.parse(b.deleted_at ?? ""));
}

export function newInvoiceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `inv-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function blankInvoice(): Invoice {
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    id: newInvoiceId(),
    invoice_number: `INV-${new Date().getFullYear()}-001`,
    client: { id: "", name: "" },
    issue_date: today,
    due_date: due,
    currency: "USD",
    tax_rate: 0,
    notes: "",
    sender_company_name: "",
    sender_company_address: "",
    status: "draft",
    line_items: [],
    deleted_at: null,
  };
}
