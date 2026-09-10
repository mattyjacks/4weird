"use client";

import { useState } from "react";
import { BuyButton } from "@/components/coins/buy-button";
import { CUSTOM_COINS_MAX, CUSTOM_COINS_MIN, formatUsd, isCustomAmount } from "@/lib/economy";

export function CustomBuy({ variantId }: { variantId: string }) {
  const [amount, setAmount] = useState(String(CUSTOM_COINS_MIN));
  const coins = isCustomAmount(amount);
  return <div className="flex flex-wrap items-center gap-3"><label className="text-sm text-slate-300" htmlFor="custom-coins">Coins <span className="text-slate-500">({CUSTOM_COINS_MIN.toLocaleString()}–{CUSTOM_COINS_MAX.toLocaleString()})</span></label><input id="custom-coins" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} className="w-32 rounded-lg border border-white/15 bg-black/30 px-3 py-2" />{coins ? <BuyButton variantId={variantId} quantity={coins} label={`Buy ${coins.toLocaleString()} — ${formatUsd(coins)}`} /> : <span className="text-sm text-amber-200">Enter {CUSTOM_COINS_MIN.toLocaleString()}–{CUSTOM_COINS_MAX.toLocaleString()} coins.</span>}</div>;
}
