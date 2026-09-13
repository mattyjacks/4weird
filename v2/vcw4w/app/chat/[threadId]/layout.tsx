import type { Metadata } from "next";

// Thread route is "use client" (params + localStorage store), so its static
// metadata lives here. No canonical: the thread id is dynamic and per-device,
// and thread content is private (noindex inherited intent, restated).
export const metadata: Metadata = {
  title: "Chat thread",
  description: "Read and reply to a private conversation on 4weird Games.",
  robots: { index: false, follow: false },
};

export default function ChatThreadLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
