/**
 * Plain-node unit tests for Ollama lifecycle + local-model role routing
 * (lib/ollama_manager.js, lib/model_roles.js). No Electron, no network -
 * run:  node tests/test_ollama_models.js   (from website/v1/ai/vibecodeworker)
 */
const assert = require('assert');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const ollama = require(path.join(projectRoot, 'lib', 'ollama_manager'));
const roles = require(path.join(projectRoot, 'lib', 'model_roles'));

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`PASS  ${name}`);
}

// ─── ollama_manager: pure helpers ───
check('defaultBaseUrl honors OLLAMA_URL env', () => {
  const prevUrl = process.env.OLLAMA_URL;
  const prevHost = process.env.OLLAMA_HOST;
  delete process.env.OLLAMA_HOST;
  process.env.OLLAMA_URL = 'http://lan-host:11434/';
  assert.strictEqual(ollama.defaultBaseUrl(), 'http://lan-host:11434');
  delete process.env.OLLAMA_URL;
  assert.strictEqual(ollama.defaultBaseUrl(), 'http://127.0.0.1:11434');
  process.env.OLLAMA_HOST = '0.0.0.0:11434';
  assert.strictEqual(ollama.defaultBaseUrl(), 'http://127.0.0.1:11434');
  delete process.env.OLLAMA_HOST;
  if (prevUrl === undefined) delete process.env.OLLAMA_URL;
  else process.env.OLLAMA_URL = prevUrl;
  if (prevHost === undefined) delete process.env.OLLAMA_HOST;
  else process.env.OLLAMA_HOST = prevHost;
});

check('candidateBinaryPaths always offers a PATH fallback first', () => {
  const list = ollama.candidateBinaryPaths();
  assert.ok(Array.isArray(list) && list.length > 1, 'expected several candidates');
  assert.strictEqual(list[0], 'ollama');
});

check('isSafeModelName allow-lists registry-style tags', () => {
  assert.ok(ollama.isSafeModelName('qwen3:8b'));
  assert.ok(ollama.isSafeModelName('qwen2.5vl:7b'));
  assert.ok(ollama.isSafeModelName('deepseek-r1:8b'));
  assert.ok(!ollama.isSafeModelName(''));
  assert.ok(!ollama.isSafeModelName('evil; rm -rf ~'));
  assert.ok(!ollama.isSafeModelName('../../etc/passwd'));
  assert.ok(!ollama.isSafeModelName('model with spaces'));
});

check('manualInstallHint is platform-specific and non-empty', () => {
  const hint = ollama.manualInstallHint();
  assert.ok(typeof hint === 'string' && hint.length > 20, 'hint: ' + hint);
  assert.ok(/ollama\.com\/download|install\.sh|brew/i.test(hint));
});

// ─── model_roles: registry ───
check('exactly the four orchestration roles exist', () => {
  assert.deepStrictEqual([...roles.ROLE_NAMES].sort(), ['agent', 'coder', 'reasoner', 'vision']);
  for (const name of roles.ROLE_NAMES) {
    assert.ok(roles.ROLES[name].title && roles.ROLES[name].description, name);
    assert.ok(roles.ROLES[name].defaultModel, name);
  }
  assert.strictEqual(roles.ROLES.vision.wantsVision, true);
});

check('normalizeLocalModels fills gaps and drops junk', () => {
  const out = roles.normalizeLocalModels({
    ollamaUrl: 'http://192.168.1.50:11434/',
    roles: {
      agent: { provider: 'local', model: 'qwen3:14b' },
      vision: { provider: 'nope', model: '' },
      hacker: { provider: 'local', model: 'evil' },
    },
  });
  assert.strictEqual(out.ollamaUrl, 'http://192.168.1.50:11434');
  assert.strictEqual(out.roles.agent.model, 'qwen3:14b');
  assert.strictEqual(out.roles.vision.provider, 'local'); // invalid provider reset
  assert.ok(out.roles.vision.model.length > 0); // empty model backfilled
  assert.ok(!out.roles.hacker, 'unknown roles must not survive');
  assert.ok(out.roles.coder && out.roles.reasoner, 'missing roles backfilled');
});

check('normalizeLocalModels tolerates garbage input', () => {
  for (const bad of [null, undefined, 42, 'qwen', []]) {
    const out = roles.normalizeLocalModels(bad);
    assert.strictEqual(out.ollamaUrl, 'http://127.0.0.1:11434');
    assert.strictEqual(out.roles.agent.model, 'qwen3:8b');
  }
});

check('resolveRoleModel maps local roles to the Ollama chat endpoint', () => {
  const cfg = {
    provider: 'deepseek',
    modelName: 'deepseek-v4-flash',
    endpointUrl: '',
    localModels: {
      ollamaUrl: 'http://127.0.0.1:11434',
      roles: {
        vision: { provider: 'local', model: 'qwen2.5vl:7b' },
        coder: { provider: 'local', model: 'qwen2.5-coder:7b' },
      },
    },
  };
  const vision = roles.resolveRoleModel('vision', cfg);
  assert.strictEqual(vision.provider, 'local');
  assert.strictEqual(vision.modelName, 'qwen2.5vl:7b');
  assert.strictEqual(vision.endpointUrl, 'http://127.0.0.1:11434/api/chat');
  // Unconfigured role falls back to role defaults, still local.
  const agent = roles.resolveRoleModel('agent', cfg);
  assert.strictEqual(agent.provider, 'local');
  assert.strictEqual(agent.modelName, 'qwen3:8b');
});

check('resolveRoleModel honors cloud roles and legacy fallback', () => {
  const cfg = {
    provider: 'openai',
    modelName: 'gpt-5.6-luna',
    endpointUrl: '',
    localModels: { roles: { coder: { provider: 'openai', model: 'gpt-5.6-sol' } } },
  };
  const coder = roles.resolveRoleModel('coder', cfg);
  assert.strictEqual(coder.provider, 'openai');
  assert.strictEqual(coder.modelName, 'gpt-5.6-sol');
  // Unknown role -> legacy single-model config untouched.
  const legacy = roles.resolveRoleModel('nope', cfg);
  assert.strictEqual(legacy.provider, 'openai');
  assert.strictEqual(legacy.modelName, 'gpt-5.6-luna');
});

check('VIBE_ROLE_* env overrides the local model tag', () => {
  const prev = process.env.VIBE_ROLE_VISION;
  process.env.VIBE_ROLE_VISION = 'llava:13b';
  const got = roles.resolveRoleModel('vision', {}).modelName;
  assert.strictEqual(got, 'llava:13b');
  process.env.VIBE_ROLE_VISION = 'evil; touch pwned';
  assert.strictEqual(roles.resolveRoleModel('vision', {}).modelName, 'qwen2.5vl:7b');
  if (prev === undefined) delete process.env.VIBE_ROLE_VISION;
  else process.env.VIBE_ROLE_VISION = prev;
});

check('suggestedTags always lead with the role default', () => {
  for (const name of roles.ROLE_NAMES) {
    const tags = roles.suggestedTags(name);
    assert.ok(tags.length >= 3, name);
    assert.strictEqual(tags[0], roles.ROLES[name].defaultModel, name);
  }
});

check('defaultLocalModels matches config/default.json shape', () => {
  const fs = require('fs');
  const onDisk = JSON.parse(fs.readFileSync(path.join(projectRoot, 'config', 'default.json'), 'utf8'));
  const normalized = roles.normalizeLocalModels(onDisk.localModels);
  assert.strictEqual(normalized.ollamaUrl, 'http://127.0.0.1:11434');
  for (const name of roles.ROLE_NAMES) {
    assert.ok(normalized.roles[name] && normalized.roles[name].model, name);
  }
});

console.log(`\nAll ${passed} ollama/model-role checks passed.`);
