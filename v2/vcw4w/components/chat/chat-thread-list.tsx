"use client";

import Link from "next/link";
import { lastMessage, sortThreads, threadTitle, unreadCount, type ChatThread } from "./chat-types";

/**
 * ChatThreadList: 1-on-1 + group thread index with unread badges and
 * last-message previews. Pure render from props — the parent page owns
 * loading/persistence, so this never touches browser APIs directly.
 */
export function ChatThreadList({
  threads,
  viewerId,
  activeId,
}: {
  threads: ChatThread[];
  viewerId: string;
  activeId?: string;
}) {
  const sorted = sortThreads(threads);

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-8 text-center">
        <p className="text-lg font-bold text-white">No conversations yet</p>
        <p className="mt-2 text-sm text-slate-400">Start a thread to message a squad mate or clan member.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map((t) => {
        const unread = unreadCount(t, viewerId);
        const last = lastMessage(t);
        const active = t.id === activeId;
        return (
          <li key={t.id}>
            <Link
              href={`/chat/${t.id}`}
              className={`block rounded-xl border p-4 transition hover:border-cyan-300/50 ${
                active ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-white/[.04]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-bold text-white">{threadTitle(t, viewerId)}</p>
                {unread > 0 ? (
                  <span className="shrink-0 rounded-full bg-cyan-300 px-2 py-0.5 font-mono text-xs font-bold text-slate-950">
                    {unread}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm text-slate-400">
                {last ? `${last.sender_name}: ${last.content}` : "No messages yet"}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
