"use client";

import { useEffect, useRef, useState } from "react";

const inputCls =
  "min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";
const btnCls =
  "min-h-[44px] rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50";

/**
 * ChatComposer: message input with anti-double-click guard (disables
 * while a send is in flight) and Enter-to-send. Calls onSend and clears
 * only after it resolves — a rejected send keeps the draft.
 */
export function ChatComposer({ onSend }: { onSend: (content: string) => void | Promise<void> }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      inputRef.current?.focus();
    } catch {
      // Fail-open: focus unavailable — input still usable.
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      await onSend(content);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-white/10 p-3">
      <input
        ref={inputRef}
        className={inputCls}
        placeholder="Message…"
        aria-label="Message"
        value={draft}
        maxLength={2000}
        onChange={(e) => setDraft(e.target.value)}
      />
      <button type="submit" className={btnCls} disabled={sending || draft.trim().length === 0}>
        {sending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
