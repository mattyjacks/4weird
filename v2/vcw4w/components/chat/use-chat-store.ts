"use client";

import { useCallback, useEffect, useState } from "react";
import {
  newMessageId,
  seedThreads,
  type ChatThread,
} from "./chat-types";

const STORE_KEY = "4weird_chat_threads_v1";
const BUS_NAME = "4weird_chat_bus";
const INTEROP_BUS = "4weird_interop_bus";

export const DEMO_VIEWER_ID = "you";
export const DEMO_VIEWER_NAME = "You";

function emitInterop(event: string, data: Record<string, unknown>) {
  try {
    const channel = new BroadcastChannel(INTEROP_BUS);
    channel.postMessage({ event, data, at: Date.now() });
    channel.close();
  } catch {
    // Fail-open: interop bus is best-effort.
  }
}

/**
 * useChatStore: thread persistence (localStorage, loaded in useEffect so
 * SSR markup matches) + cross-tab realtime fan-out over
 * BroadcastChannel. Fail-open everywhere: storage or channel failures
 * fall back to in-memory seeds, never a crash.
 */
export function useChatStore() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let initial: ChatThread[] | null = null;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatThread[];
        if (Array.isArray(parsed)) initial = parsed;
      }
    } catch {
      initial = null;
    }
    if (!initial || initial.length === 0) {
      initial = seedThreads(DEMO_VIEWER_ID, DEMO_VIEWER_NAME);
    }
    setThreads(initial);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(BUS_NAME);
      channel.onmessage = (ev: MessageEvent) => {
        const msg = (ev.data ?? {}) as { type?: string; threads?: ChatThread[] };
        if (msg.type === "threads" && Array.isArray(msg.threads)) {
          setThreads(msg.threads);
        }
      };
    } catch {
      channel = null;
    }
    return () => {
      try {
        channel?.close();
      } catch {
        // Ignore close errors.
      }
    };
  }, []);

  const persist = useCallback((next: ChatThread[]) => {
    setThreads(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      // Fail-open: quota/private-mode.
    }
    try {
      const channel = new BroadcastChannel(BUS_NAME);
      channel.postMessage({ type: "threads", threads: next });
      channel.close();
    } catch {
      // Fail-open: same-tab only.
    }
  }, []);

  const sendMessage = useCallback(
    (threadId: string, content: string) => {
      const text = content.trim().slice(0, 2000);
      if (!text) return;
      persist(
        threads.map((t) => {
          if (t.id !== threadId) return t;
          const now = new Date().toISOString();
          return {
            ...t,
            updated_at: now,
            messages: [
              ...t.messages,
              {
                id: newMessageId(),
                thread_id: threadId,
                sender_user_id: DEMO_VIEWER_ID,
                sender_name: DEMO_VIEWER_NAME,
                content: text,
                created_at: now,
              },
            ],
          };
        })
      );
      emitInterop("chat:message-sent", { threadId });
    },
    [threads, persist]
  );

  const markRead = useCallback(
    (threadId: string) => {
      const now = new Date().toISOString();
      persist(
        threads.map((t) => {
          if (t.id !== threadId) return t;
          return {
            ...t,
            participants: t.participants.map((p) =>
              p.user_id === DEMO_VIEWER_ID ? { ...p, last_read_at: now } : p
            ),
          };
        })
      );
    },
    [threads, persist]
  );

  return { threads, mounted, sendMessage, markRead };
}
