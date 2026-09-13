"use client";

import Link from "next/link";
import { ChatThreadList } from "@/components/chat/chat-thread-list";
import { DEMO_VIEWER_ID, useChatStore } from "@/components/chat/use-chat-store";

/**
 * Chat index: thread list view. Store loads from localStorage after
 * mount (SSR-safe placeholder first, zero hydration mismatch).
 */
export default function ChatPage() {
  const { threads, mounted } = useChatStore();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">4WEIRD // CHAT</p>
        <h1 className="mt-2 text-4xl font-black">Direct messages</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Private 1-on-1 threads with squad mates and clan members. Open a thread to read and reply —{" "}
          <Link href="/business/invoices" className="font-bold text-cyan-300 hover:underline">
            invoices
          </Link>{" "}
          and{" "}
          <Link href="/tools" className="font-bold text-cyan-300 hover:underline">
            free tools
          </Link>{" "}
          live nearby.
        </p>
        <div className="mt-10">
          {!mounted ? (
            <p className="rounded-2xl border border-white/10 bg-white/[.04] p-8 text-center text-sm text-slate-400">
              Loading conversations…
            </p>
          ) : (
            <ChatThreadList threads={threads} viewerId={DEMO_VIEWER_ID} />
          )}
        </div>
      </section>
    </main>
  );
}
