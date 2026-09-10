/**
 * 4weird Games - auth service + shop configuration (EXAMPLE).
 *
 * Copy this file to `config.js` in the same folder and fill in YOUR values.
 * This file holds NO secrets: the browser talks to the 4weird-auth service,
 * which keeps every Supabase key server-side and the session in httpOnly
 * cookies. Page JavaScript never sees tokens or keys by design.
 *
 * `config.js` is gitignored so per-deployment values never reach the repo.
 * Without `config.js`, the account page shows a clear "not configured"
 * state instead of failing silently.
 */
window.FourWeirdAuthConfig = {
  // Base URL of your deployed auth-app (see auth-app/README.md), e.g.
  // 'https://auth.4weird.com'. Use '' ONLY with the same-origin proxy setup
  // (static host rewrites /auth-api/* to the service); otherwise the page
  // refuses to send logins anywhere.
  AUTH_APP_URL: 'REPLACE-WITH-AUTH-APP-URL',

  // Your Shopify storefront. Buyers always pay on Shopify's hosted checkout;
  // card data never touches 4weird (PCI scope stays with Shopify).
  SHOPIFY_STORE_DOMAIN: 'shop.mattyjacks.com',

  // Vibe Coins packs. variantId must be the NUMERIC variant ID from
  // Shopify Admin -> Products -> (pack) -> variant. PLACEHOLDERS below.
  // sku must match the keys in COIN_SKU_MAP inside
  // supabase/functions/shopify-coins/index.ts or the grant is skipped.
  COIN_PACKS: [
    { id: 'coins-100', name: 'Starter Stack', coins: 100, price: '$4.99', sku: 'VIBE-COINS-100', variantId: 'REPLACE-WITH-VARIANT-ID' },
    { id: 'coins-550', name: 'Player Pack', coins: 550, price: '$19.99', sku: 'VIBE-COINS-550', variantId: 'REPLACE-WITH-VARIANT-ID' },
    { id: 'coins-1300', name: 'Whale Pack', coins: 1300, price: '$39.99', sku: 'VIBE-COINS-1300', variantId: 'REPLACE-WITH-VARIANT-ID' }
  ]
};
