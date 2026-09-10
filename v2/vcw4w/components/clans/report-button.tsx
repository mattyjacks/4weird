"use client";

import { useState } from "react";

export function ReportButton({ targetType, targetId }: { targetType: "post" | "comment" | "image"; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("other");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult("");
    try {
      const res = await fetch("/api/clans/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          category,
          details,
        }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (!data.success) throw new Error(data.error ?? "Report failed.");
      setResult(data.message ?? "Reported.");
      setOpen(false);
      setDetails("");
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Report failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={() => setOpen((v) => !v)} className="text-xs text-slate-400 hover:text-red-300 hover:underline">
        Report
      </button>
      {result && <span className="text-xs text-slate-400">{result}</span>}
      {open && (
        <form onSubmit={send} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-slate-950 p-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded bg-slate-900 px-2 py-1 text-xs text-white"
            aria-label="Report category"
          >
            <option value="other">Spam / abuse / other</option>
            <option value="csam">Illegal/CSAM — hides immediately, preserved for authorities</option>
          </select>
          <input
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Details (optional, max 1000)"
            maxLength={1000}
            className="rounded bg-slate-900 px-2 py-1 text-xs text-white placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded bg-red-400 px-2 py-1 text-xs font-bold text-slate-950 disabled:opacity-50"
          >
            {sending ? "…" : "Send (anon OK)"}
          </button>
        </form>
      )}
    </span>
  );
}
