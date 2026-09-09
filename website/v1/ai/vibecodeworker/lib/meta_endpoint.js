/**
 * Meta-direct endpoint defaults.
 *
 * Meta's official Llama API (https://api.llama.com) is OpenAI-compatible and
 * the same URL for everybody, so Meta-direct keys never need a per-user
 * endpoint setting. A custom endpoint URL in settings still overrides this
 * default when present.
 */

const META_DIRECT_ENDPOINT_URL = 'https://api.llama.com/v1/chat/completions';

// Native Llama API model id (the OpenRouter slug
// `meta-llama/llama-4-scout-17b-16e-instruct` only exists on OpenRouter).
const META_DIRECT_MODEL = 'Llama-4-Scout-17B-16E-Instruct';

// A user-supplied endpoint counts as Meta-direct when it points at Meta's
// hosts (legacy `meta.ai` entries or the universal `llama.com` API).
function isMetaDirectUrl(url) {
  const value = String(url || '');
  return value.includes('meta.ai') || value.includes('llama.com');
}

module.exports = { META_DIRECT_ENDPOINT_URL, META_DIRECT_MODEL, isMetaDirectUrl };
