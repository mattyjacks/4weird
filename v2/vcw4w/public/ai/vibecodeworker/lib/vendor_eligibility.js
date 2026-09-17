const { getResolvedApiKey } = require('./storage');

const VENDOR_BY_PROVIDER = Object.freeze({
  openai: 'openai',
  openrouter: 'openrouter',
  meta: 'meta-api',
  deepseek: 'deepseek',
  gemini: 'gemini-api',
  elevenlabs: 'elevenlabs',
  fal: 'fal',
  meshy: 'meshy',
  runpod: 'runpod',
  opencode: 'opencode',
});

const BASE = 'https://4weird.com';

function isGoogleGeminiModel(model) {
  const id = String(model || '').trim().toLowerCase();
  return /(^|[/:])google([/:]|$)/.test(id) || /(^|[/:])gemini([/:.-]|$)/.test(id) || id.includes('gemini');
}

async function assertProviderEligible(provider, options = {}) {
  if (!provider || provider === 'local') return true;
  const vendor = VENDOR_BY_PROVIDER[String(provider).toLowerCase()];
  if (!vendor) throw new Error(`External provider "${provider}" is not approved for this desktop client.`);

  // Gemini is unavailable on the mixed-age 4weird service even for adult
  // profiles: Google's terms restrict the application itself, not just the
  // individual requester's age.
  if (vendor === 'gemini-api') {
    throw new Error('Google Gemini is disabled because its API terms prohibit use in services likely accessed by people under 18.');
  }
  if ((vendor === 'openrouter' || vendor === 'meta-api') && isGoogleGeminiModel(options.model)) {
    throw new Error('Google Gemini models are disabled because their API terms prohibit use in services likely accessed by people under 18.');
  }

  if (process.env.NODE_ENV === 'test') return true;
  const botKey = String(options.botKey || getResolvedApiKey('fourweird', '') || '').trim();
  if (!botKey) throw new Error('Connect an eligible 4weird account with a bot key to use cloud providers.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${BASE}/api/bot/vendor-eligibility?vendor=${encodeURIComponent(vendor)}`, {
      method: 'GET',
      headers: { 'x-bot-key': botKey, accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.allowed !== true) {
      throw new Error(String(payload.error || 'This 4weird account is not eligible to use the selected provider.'));
    }
    return true;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { assertProviderEligible, isGoogleGeminiModel, VENDOR_BY_PROVIDER };
