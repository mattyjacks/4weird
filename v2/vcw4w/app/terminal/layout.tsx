import type { Metadata } from "next";

// Route layout carries metadata because the Commander terminal page is
// "use client" (local allow-listed commands, zero server exec), and metadata
// exports are server-only.
export const metadata: Metadata = {
  title: "CryptArt Commander",
  description: "Local power-user terminal for 4weird Games. Allow-listed commands only — no server execution, works offline.",
  alternates: { canonical: "/terminal" },
};

export default function TerminalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
