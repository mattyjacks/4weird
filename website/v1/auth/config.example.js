/**
 * 4weird Games - Auth & Vibe Coins configuration (EXAMPLE).
 *
 * Copy this file to `config.js` in the same folder and fill in YOUR values:
 *   1. Create a project at https://supabase.com/dashboard
 *   2. Project Settings -> API: copy the Project URL and the ANON (publishable) key.
 *   3. NEVER paste the service_role (secret) key here. The client only ever
 *      holds the anon key; money movement happens in the shopify-coins Edge
 *      Function, which holds service_role server-side.
 *
 * `config.js` is gitignored so per-deployment values (and any mistake) never
 * reach the repository. Without `config.js`, the account page shows a clear
 * "not configured" state instead of failing silently.
 */
window.FourWeirdAuthConfig = {
  // Example: 'https://abcdefghijklmno.supabase.co'
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',

  // The PUBLISHABLE key, in either Supabase format: a legacy anon JWT
  // (payload role "anon") or a new sb_publishable_ key. The loader accepts
  // only these two and REFUSES secret keys (service_role JWT / sb_secret_),
  // so a secret pasted here by accident cannot run in the browser.
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',

  // Trusted backend for Shopify fulfillment + coin claims (no secrets here,
  // only the function URL; it enforces its own auth + HMAC).
  // Example: 'https://abcdefghijklmno.supabase.co/functions/v1/shopify-coins'
  COINS_FUNCTION_URL: 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/shopify-coins',

  // Your Shopify storefront. Buyers always pay on Shopify's hosted checkout;
  // card data never touches 4weird (PCI scope stays with Shopify).
  SHOPIFY_STORE_DOMAIN: 'shop.mattyjacks.com',

  // Vibe Coins packs. variantId must be the NUMERIC variant ID from
  // Shopify Admin -> Products -> (pack) -> variant. Find it in the variant
  // URL (.../variants/123456789) or via Admin API. PLACEHOLDERS below.
  // sku must match the keys in COIN_SKU_MAP inside
  // supabase/functions/shopify-coins/index.ts or the grant is skipped.
  COIN_PACKS: [
    { id: 'coins-100', name: 'Starter Stack', coins: 100, price: '$4.99', sku: 'VIBE-COINS-100', variantId: 'REPLACE-WITH-VARIANT-ID' },
    { id: 'coins-550', name: 'Player Pack', coins: 550, price: '$19.99', sku: 'VIBE-COINS-550', variantId: 'REPLACE-WITH-VARIANT-ID' },
    { id: 'coins-1300', name: 'Whale Pack', coins: 1300, price: '$39.99', sku: 'VIBE-COINS-1300', variantId: 'REPLACE-WITH-VARIANT-ID' }
  ]
};
