'use strict';
process.env.NODE_ENV = 'test';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { assertProviderEligible, isGoogleGeminiModel, VENDOR_BY_PROVIDER } = require('../lib/vendor_eligibility');

async function main() {
  assert.strictEqual(VENDOR_BY_PROVIDER.opencode, 'opencode');
  const bridge = fs.readFileSync(path.join(__dirname, '../lib/opencode_bridge.js'), 'utf8');
  assert(bridge.includes("assertProviderEligible('opencode')"), 'integrated OpenCode entry points must enforce the server age gate');
  assert.strictEqual(isGoogleGeminiModel('google/gemini-2.5-flash'), true);
  assert.strictEqual(isGoogleGeminiModel('meta-llama/llama-4-scout'), false);
  await assert.rejects(() => assertProviderEligible('gemini'), /Google Gemini is disabled/);
  await assert.rejects(() => assertProviderEligible('openrouter', { model: 'google/gemini-2.5-flash' }), /Google Gemini models are disabled/);
  await assertProviderEligible('opencode');
  await assertProviderEligible('runpod');
  console.log('test_vendor_eligibility: 6 passed');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
