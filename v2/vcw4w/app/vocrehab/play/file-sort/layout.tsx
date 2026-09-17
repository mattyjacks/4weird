import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "File Sort — VocRehab Work & Life Practice Games",
  description:
    "Sort 12 files into Invoices, Schedules, and Client Notes. Practice, not a test — nothing here grades you.",
  alternates: { canonical: "/vocrehab/play/file-sort" },
};

export default function VocrehabFileSortLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
