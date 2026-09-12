import { BuyButton } from "@/components/coins/buy-button";
import { CustomBuy } from "@/components/coins/custom-buy";
import { COIN_PACKS, CUSTOM_COINS_MAX, CUSTOM_COINS_MIN, SERVICE_CUT_PCT, formatUsd } from "@/lib/economy";
import { InfoTip } from "@/components/ui/info-tip";
import { CompactDetails } from "@/components/ui/compact-details";

/**
 * Coin pack catalog (server component). Pack variant IDs come from
 * COIN_PACK_VARIANTS (one Shopify variant ID per pack, in pack order) and
 * COIN_CUSTOM_VARIANT (a $0.01-per-unit variant whose quantity equals coins).
 * Unconfigured packs render an explicit "not on sale yet" state.
 */
export function PackCatalog() {
  // Checkout accepts packs from SHOPIFY_ALLOWED_VARIANTS or the legacy
  // COIN_PACK_VARIANTS (positional, pack order); the catalog honors both so
  // a pack configured only via the new list does not render "Not on sale
  // yet" while checkout would accept it.
  const variants = (process.env.COIN_PACK_VARIANTS ?? "").split(",").map((v) => v.trim());
  const allowed = (process.env.SHOPIFY_ALLOWED_VARIANTS ?? "").split(",").map((v) => v.trim());
  const customVariant = (process.env.COIN_CUSTOM_VARIANT ?? "").trim();
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
        <strong>
          One-year expiry, oldest coins first.{" "}
          <InfoTip text="Each coin lot lasts one year. Spending always uses the oldest coins first." label="About expiry" />
        </strong>{" "}
        Each coin lot expires one year after it is received. When you spend, we automatically use the oldest unexpired centicentcoins first, so the coins closest to expiry are always used first.
      </div>
      <div>
        <h2 className="text-xl font-bold">
          Coin packs{" "}
          <InfoTip text="Fixed packs are quick. Custom lets you pick any whole-coin count. Same price: 1 cent per coin." label="About packs vs custom" />
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {COIN_PACKS.map((pack, i) => {
            const variantId = variants[i] ?? allowed[i] ?? "";
            return (
              <article key={pack.key} className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
                <h3 className="text-xl font-bold">{pack.coins.toLocaleString()} Vibe Coins</h3>
                <p className="mt-1 text-sm text-slate-400">{pack.blurb} · {formatUsd(pack.priceCents)} (1¢ per coin)</p>
                <div className="mt-4">{variantId ? <BuyButton variantId={variantId} label={`Buy - ${formatUsd(pack.priceCents)}`} /> : <span className="text-sm text-amber-200">Not on sale yet; check back soon.</span>}</div>
              </article>
            );
          })}
        </div>
      </div>
      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
        <h3 className="text-xl font-bold">
          Custom amount{" "}
          <InfoTip text="Pick any whole-coin count in range, at 1 cent per coin. Same expiry as packs." label="About custom amount" />
        </h3>
        <p className="mt-2 text-sm text-slate-400">Any whole-coin count from {CUSTOM_COINS_MIN.toLocaleString()} to {CUSTOM_COINS_MAX.toLocaleString()}, at 1¢ per coin. Enter the amount on the checkout screen; the quantity is set for you. Coins expire one year after receipt; spending is oldest-unexpired first.</p>
        <div className="mt-4">{customVariant ? <CustomBuy variantId={customVariant} /> : <span className="text-sm text-amber-200">Custom amounts are not on sale yet; check back soon.</span>}</div>
      </section>
      <CompactDetails summary="Refunds, expiry, trial — in brief">
        <p className="text-xs text-slate-500">Every price already includes the {SERVICE_CUT_PCT}% platform service cut; it is never added on top. New accounts start with a free trial of up to 100 coins ($1.00) - one per person and network. Unspent purchased coins are refundable within 90 days (pro-rated when partly spent); free coins are never refundable.</p>
      </CompactDetails>
    </div>
  );
}
