"use client";

import { useState } from "react";

export function DailyClaim() {
  const [message, setMessage] = useState("Claim once per day — streaks earn more.");
  const [busy, setBusy] = useState(false);

  async function claim() {
    if (busy) return;
    setBusy(true);
    setMessage("Claiming…");
    try {
      const response = await fetch("/api/coins/daily", { method: "POST", credentials: "include" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Unable to claim.");
      setMessage(body.claimed ? `+${body.coins} coins! Day ${body.streak} streak.` : `Already claimed today. Streak: day ${body.streak}.`);
      if (body.claimed) window.dispatchEvent(new Event("vibe-coins-changed"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to claim.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><h2 className="text-xl font-bold">Daily login bonus</h2><p role="status" className="mt-2 text-sm text-slate-400">{message}</p><button type="button" disabled={busy} onClick={claim} className="mt-4 rounded-full bg-cyan-300 px-5 py-2 font-bold text-slate-950 disabled:opacity-40">{busy ? "Claiming…" : "Claim daily bonus"}</button><p className="mt-2 text-xs text-slate-500">5 coins + 1 per consecutive day, up to 12.</p></section>;
}
