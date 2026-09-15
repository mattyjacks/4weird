"use client";

/**
 * AI training-signal thumbs (FBOV-09 stub).
 *
 * Renders Approve (AI read was correct) / Fix (AI read needs correction)
 * buttons under the AI enrichment block in the /feedback/admin detail
 * drawer. Each click POSTs { signal } to /api/feedback/[id]/enrich, which
 * writes one feedback_ai_logs row (model "human-signal") — a training
 * signal stub, never a human-field edit.
 */

import { useState } from "react";

type SignalState = "idle" | "busy" | "done" | "error";

export function AiSignalButtons({ feedbackId }: { feedbackId: string }) {
  const [state, setState] = useState<SignalState>("idle");
  const [message, setMessage] = useState("");

  async function send(signal: "approve" | "fix") {
    if (state === "busy") return;
    setState("busy");
    setMessage("");
    try {
      const res = await fetch(
        `/api/feedback/${encodeURIComponent(feedbackId)}/enrich`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ signal }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        setState("error");
        setMessage(
          typeof data.error === "string" && data.error.length > 0
            ? data.error
            : "Could not save signal. Try again shortly.",
        );
        return;
      }
      setState("done");
      setMessage(
        signal === "approve"
          ? "Saved: AI read marked correct."
          : "Saved: AI read flagged for a fix.",
      );
    } catch {
      setState("error");
      setMessage("Could not reach the feedback store. Try again shortly.");
    }
  }

  const btn =
    "rounded-full border px-3 py-1.5 text-xs font-bold disabled:opacity-50";
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="AI training signal">
        <button
          type="button"
          disabled={state === "busy"}
          onClick={() => send("approve")}
          className={`${btn} border-emerald-300/40 text-emerald-200 hover:bg-emerald-300/10`}
        >
          👍 Approve
        </button>
        <button
          type="button"
          disabled={state === "busy"}
          onClick={() => send("fix")}
          className={`${btn} border-amber-300/40 text-amber-200 hover:bg-amber-300/10`}
        >
          🔧 Fix
        </button>
      </div>
      {message && (
        <p
          role="status"
          className={`mt-2 text-xs ${state === "error" ? "text-red-300" : "text-slate-400"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
