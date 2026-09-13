"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "./chat-types";

/**
 * ChatMessageList: scrollable message viewport. Auto-scrolls to the
 * newest message inside useEffect (no DOM reads during render, so no
 * hydration mismatch). Empty thread renders an inviting empty state.
 */
export function ChatMessageList({
  messages,
  viewerId,
}: {
  messages: ChatMessage[];
  viewerId: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      bottomRef.current?.scrollIntoView({ block: "end" });
    } catch {
      // Fail-open: scroll unavailable — messages still read top-down.
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <p className="text-sm text-slate-400">Say hello — messages appear here in realtime.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((m) => {
        const mine = m.sender_user_id === viewerId;
        return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                mine ? "bg-cyan-300 text-slate-950" : "border border-white/10 bg-white/[.06] text-white"
              }`}
            >
              {!mine ? <p className="text-[11px] font-bold uppercase tracking-widest opacity-70">{m.sender_name}</p> : null}
              <p className="mt-0.5 whitespace-pre-wrap text-sm">{m.content}</p>
              <p className={`mt-1 font-mono text-[10px] ${mine ? "text-slate-800" : "text-slate-500"}`}>
                {new Date(m.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
