import Link from "next/link";
import { Suspense, use, useEffect } from "react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { threadTitle } from "@/components/chat/chat-types";
import { DEMO_VIEWER_ID, useChatStore } from "@/components/chat/use-chat-store";

/**
 * Thread view: realtime message viewport + composer. Marks the thread
 * read on open (inside useEffect). Unknown thread id renders a
 * not-found state with a back link — never a crash.
 * NOTE: 'use client' + per-user threads — never 'use cache'. Static shell
 * (back link + title) prerenders; params + thread content stream in Suspense.
 */
function ThreadView({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params);
  const { threads, mounted, sendMessage, markRead } = useChatStore();
  const thread = threads.find((t) => t.id === threadId);

  useEffect(() => {
    if (mounted && thread) markRead(thread.id);
    // markRead identity changes per render; depend on stable keys only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, thread?.id]);

  if (!mounted) {
    return (
      <p className="mt-6 rounded-2xl border border-white/10 bg-white/[.04] p-8 text-center text-sm text-slate-400">
        Loading thread…
      </p>
    );
  }
  if (!thread) {
    return (
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.04] p-8 text-center">
        <p className="text-lg font-bold text-white">Thread not found</p>
        <p className="mt-2 text-sm text-slate-400">
          This conversation does not exist on this device yet.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-4 flex min-h-[60vh] flex-1 flex-col rounded-2xl border border-white/10 bg-white/[.02]">
      <header className="border-b border-white/10 p-4">
        <h1 className="text-xl font-black">{threadTitle(thread, DEMO_VIEWER_ID)}</h1>
        <p className="mt-1 text-xs text-slate-400">
          {thread.is_group ? "Group thread" : "Direct 1-on-1"} · {thread.participants.length} participant
          {thread.participants.length === 1 ? "" : "s"}
        </p>
      </header>
      <ChatMessageList messages={thread.messages} viewerId={DEMO_VIEWER_ID} />
      <ChatComposer onSend={(content) => sendMessage(thread.id, content)} />
    </div>
  );
}

export default function ChatThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-10">
        <Link href="/chat" className="text-sm font-bold text-cyan-300 hover:underline">
          &larr; All conversations
        </Link>
        <Suspense fallback={<p className="mt-6 rounded-2xl border border-white/10 bg-white/[.04] p-8 text-center text-sm text-slate-400">Loading thread…</p>}>
          <ThreadView params={params} />
        </Suspense>
      </section>
    </main>
  );
}
