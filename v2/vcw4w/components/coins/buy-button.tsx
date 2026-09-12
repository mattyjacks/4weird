"use client";

import { useState } from "react";

export function BuyButton({ variantId, quantity = 1, label, tone = "cyan" }: { variantId: string; quantity?: number; label: string; tone?: "cyan" | "money" }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function start() {
    if (busy) return;
    setBusy(true);
    setMessage("Preparing checkout…");
    try {
      const response = await fetch("/api/coins/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ variantId, quantity }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Unable to start checkout.");
      if (typeof body.url !== "string" || !/^https:\/\//.test(body.url)) throw new Error("Checkout returned an invalid destination.");
      window.location.assign(body.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start checkout.");
      setBusy(false);
    }
  }

  return <span><button type="button" disabled={busy} onClick={start} className={tone === "money" ? "cta-money disabled:opacity-40" : "rounded-full bg-cyan-300 px-5 py-2 font-bold text-slate-950 disabled:opacity-40"}>{busy ? "Opening…" : label}</button>{message && <span role="status" className="ml-3 text-sm text-amber-200">{message}</span>}</span>;
}
