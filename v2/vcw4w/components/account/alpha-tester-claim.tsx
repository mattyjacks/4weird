"use client";

import { useState } from "react";

export function AlphaTesterClaim() {
  const [message, setMessage] = useState("One launch gift per account.");
  const [busy, setBusy] = useState(false);

  async function claim() {
    if (busy) return;
    setBusy(true);
    setMessage("Claiming…");
    try {
      const response = await fetch("/api/coins/alpha", { method: "POST", credentials: "include" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Unable to claim your alpha bonus.");
      setMessage(body.claimed ? `+${body.coins} Vibe Coins added to your balance!` : "You already claimed your alpha bonus.");
      window.dispatchEvent(new Event("vibe-coins-changed"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to claim your alpha bonus.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-6"><h2 className="text-xl font-bold text-amber-100">Alpha Tester</h2><p role="status" className="mt-2 text-sm text-amber-100/80">{message}</p><button type="button" disabled={busy} onClick={claim} className="mt-4 rounded-full bg-amber-300 px-5 py-2 font-bold text-slate-950 disabled:opacity-40">{busy ? "Claiming…" : "Alpha Tester: Get 500 Coins for free!"}</button></section>;
}
