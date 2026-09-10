import { BuyButton } from "@/components/coins/buy-button";
import { CustomBuy } from "@/components/coins/custom-buy";
import { COIN_PACKS, CUSTOM_COINS_MAX, CUSTOM_COINS_MIN, SERVICE_CUT_PCT, formatUsd } from "@/lib/economy";

/**
 * Coin pack catalog (server component). Pack variant IDs come from
 * COIN_PACK_VARIANTS (one Shopify variant ID per pack, in pack order) and
 * COIN_CUSTOM_VARIANT (a $0.01-per-unit variant whose quantity equals coins).
 * Unconfigured packs render an explicit "not on sale yet" state.
 */
export function PackCatalog() {
  const variants = (process.env.COIN_PACK_VARIANTS ?? "").split(",").map((v) => v.trim());
  const customVariant = (process.env.COIN_CUSTOM_VARIANT ?? "").trim();
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2">{COIN_PACKS.map((pack, i) => {
    const variantId = variants[i] ?? "";
    return <article key={pack.key} className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><h3 className="text-xl font-bold">{pack.coins.toLocaleString()} Vibe Coins</h3><p className="mt-1 text-sm text-slate-400">{pack.blurb} · {formatUsd(pack.priceCents)} (1¢ per coin)</p><div className="mt-4">{variantId ? <BuyButton variantId={variantId} label={`Buy — ${formatUsd(pack.priceCents)}`} /> : <span className="text-sm text-amber-200">Not on sale yet — check back soon.</span>}</div></article>;
  })}</div><section className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><h3 className="text-xl font-bold">Custom amount</h3><p className="mt-2 text-sm text-slate-400">Any whole-coin count from {CUSTOM_COINS_MIN.toLocaleString()} to {CUSTOM_COINS_MAX.toLocaleString()}, at 1¢ per coin. Enter the amount on the checkout screen — the quantity is set for you.</p><div className="mt-4">{customVariant ? <CustomBuy variantId={customVariant} /> : <span className="text-sm text-amber-200">Custom amounts are not on sale yet — check back soon.</span>}</div></section><p className="text-xs text-slate-500">Every price already includes the {SERVICE_CUT_PCT}% platform service cut — it is never added on top. New accounts start with a free 100-coin ($1.00) trial.</p></div>;
}
