import type { Metadata } from "next";

// Route layout carries metadata because the donor console is "use client"
// (browser hardware detection), and metadata exports are server-only.
export const metadata: Metadata = {
  title: "DPS donor console",
  description: "Share idle CPU/GPU with the 4weird donor compute pool. Detect your hardware, set your share, go online.",
  alternates: { canonical: "/compute/dps" },
};

export default function DpsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
