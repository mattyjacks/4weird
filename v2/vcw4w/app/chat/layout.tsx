import type { Metadata } from "next";

// Route layout carries metadata because chat/page.tsx is a "use client"
// component (per-device localStorage threads), and metadata exports are
// server-only. Per-thread title override lives in [threadId]/layout.tsx.
// Threads are per-device private data: never indexed.
export const metadata: Metadata = {
  title: "Direct messages",
  description: "Private 1-on-1 chat threads with squad mates and clan members on 4weird Games.",
  alternates: { canonical: "/chat" },
  robots: { index: false, follow: false },
};

export default function ChatLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
