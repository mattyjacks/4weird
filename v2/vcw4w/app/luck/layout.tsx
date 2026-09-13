import type { Metadata } from "next";

// Route layout carries metadata because the Luck Factory page is "use client"
// (session-only React state, deterministic draws), and metadata exports are
// server-only. Entertainment only: no wagers, no payouts, nothing recorded.
export const metadata: Metadata = {
  title: "Luck Factory",
  description: "Turn an intention into a deterministic luck preview. Entertainment only — no wagers, no payouts, nothing recorded or charged.",
  alternates: { canonical: "/luck" },
};

export default function LuckLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
