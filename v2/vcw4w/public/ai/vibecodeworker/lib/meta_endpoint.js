/**
 * Meta-direct endpoint defaults.
 *
 * Meta's official Llama API (https://api.llama.com) is OpenAI-compatible and
 * the same URL for everybody, so Meta-direct keys never need a per-user
 * endpoint setting. A custom endpoint URL in settings still overrides this
 * default when present.
 */

const META_DIRECT_ENDPOINT_URL = 'https://api.llama.com/v1/chat/completions';

// Meta's hosted model id. OpenRouter uses the namespaced equivalent
// `meta/muse-spark-1.3-contributor`; direct Meta API calls use the bare id.
const META_DIRECT_MODEL = 'muse-spark-1.3-contributor';

// A user-supplied endpoint counts as Meta-direct when it points at Meta's
// hosts (legacy `meta.ai` entries or the universal `llama.com` API).
function isMetaDirectUrl(url) {
  const value = String(url || '');
  return value.includes('meta.ai') || value.includes('llama.com');
}

module.exports = { META_DIRECT_ENDPOINT_URL, META_DIRECT_MODEL, isMetaDirectUrl };
