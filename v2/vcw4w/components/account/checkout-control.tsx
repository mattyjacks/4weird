"use client";

import { useState } from "react";

export function CheckoutControl() {
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("500");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = /^\d+$/.test(variantId);

  async function start() {
    if (!valid || busy) return;
    setBusy(true);
    setMessage("Preparing checkout…");
    try {
      // quantity rides along for the custom $0.01/unit variant (pack
      // variants ignore it server-side); without it custom amounts 400.
      const qty = Number.parseInt(quantity, 10);
      const response = await fetch("/api/coins/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ variantId, ...(Number.isInteger(qty) && qty > 0 ? { quantity: qty } : {}) }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Unable to start checkout.");
      if (typeof body.url !== "string" || !/^https:\/\//.test(body.url)) throw new Error("Checkout returned an invalid destination.");
      window.location.assign(body.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start checkout.");
      setBusy(false);
    }
  }

  return <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><h2 className="text-xl font-bold">Buy Vibe Coins</h2><p className="mt-2 text-sm text-slate-400">100 coins = $1.00, service cut included. Pick a pack on the pricing page, or enter a Shopify variant ID directly.</p><div className="mt-4 flex gap-2"><input id="variant-id" name="variantId" aria-label="Shopify variant ID" inputMode="numeric" value={variantId} onChange={(event) => setVariantId(event.target.value)} placeholder="Variant ID" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2" disabled={busy} /><input id="variant-qty" name="quantity" aria-label="Coin quantity (custom amounts only)" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Qty" title="Custom $0.01/unit variant only: coin count 500-100000. Pack variants ignore this." className="w-24 rounded-lg border border-white/15 bg-black/30 px-3 py-2" disabled={busy} /><button type="button" disabled={!valid || busy} onClick={start} className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-40">{busy ? "Opening…" : "Checkout"}</button></div>{message && <p role="status" className="mt-3 text-sm text-amber-200">{message}</p>}</section>;
}
