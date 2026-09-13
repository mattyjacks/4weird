import type { Metadata } from "next";

// Route layout carries metadata because the trash page is "use client"
// (localStorage bin), and metadata exports are server-only. Trash holds
// private invoice data: never indexed.
export const metadata: Metadata = {
  title: "Invoice trash",
  description: "Restore soft-deleted invoices or purge them permanently. Items auto-delete after 30 days.",
  alternates: { canonical: "/business/invoices/trash" },
  robots: { index: false, follow: false },
};

export default function InvoiceTrashLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
