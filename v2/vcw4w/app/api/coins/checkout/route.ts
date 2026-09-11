import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { CUSTOM_COINS_MAX, CUSTOM_COINS_MIN } from "@/lib/economy";

export const dynamic = "force-dynamic";

const variantPattern = /^\d+$/;

/**
 * Coin checkout: builds a Shopify cart URL for an allowlisted variant.
 * Fail closed: pack variants must appear in SHOPIFY_ALLOWED_VARIANTS (or the
 * legacy COIN_PACK_VARIANTS); an unconfigured allowlist blocks packs rather
 * than opening checkout to any numeric variant. The custom $0.01/unit
 * variant is always permitted with quantity == coin count. Money mints only
 * from the HMAC-verified webhook, never from this URL.
 */
function allowedPackVariants(): string[] {
  const raw = `${process.env.SHOPIFY_ALLOWED_VARIANTS ?? ""},${process.env.COIN_PACK_VARIANTS ?? ""}`;
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return fail("Supabase is not configured.", 503);
  }
  if (!sameOrigin(request)) return fail("Invalid request origin.", 403);
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const throttle = rateLimit(`checkout:${data.user.id}`, 10, 60_000);
  if (!throttle.allowed) {
    return fail("Too many checkout attempts. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const store = (process.env.SHOPIFY_STORE_DOMAIN ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(store)) return fail("Shop not configured.", 503);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const variantId = String(input.variantId ?? "");
  if (!variantPattern.test(variantId)) return fail("A valid product variant is required.", 400);
  // Custom amounts ride on a $0.01-per-unit variant: quantity equals coins.
  const customVariant = (process.env.COIN_CUSTOM_VARIANT ?? "").trim();
  // Fail closed on misconfiguration: custom variant must never collide with a pack variant.
  if (customVariant && allowedPackVariants().includes(customVariant)) {
    return fail("Checkout misconfigured.", 500);
  }
  let qty = 1;
  if (customVariant && variantId === customVariant) {
    const wanted = Number(input.quantity);
    if (!Number.isInteger(wanted) || wanted < CUSTOM_COINS_MIN || wanted > CUSTOM_COINS_MAX) {
      return fail(`Custom amounts need ${CUSTOM_COINS_MIN}-${CUSTOM_COINS_MAX} coins.`, 400);
    }
    qty = wanted;
  } else if (!allowedPackVariants().includes(variantId)) {
    return fail("This coin pack is not available.", 400);
  }
  return ok({ url: `https://${store}/cart/${encodeURIComponent(variantId)}:${qty}` });
}
