/**
 * Local-model role orchestration.
 *
 * The agent is not one model call; different pipeline stages want different
 * models. Each ROLE below names an orchestration responsibility; the user
 * assigns any installed model (local Ollama tag like `qwen3:8b`, or a cloud
 * model when that role's provider is cloud) to each role in the dashboard
 * "Local models" panel. Nothing here is hard-coded to a single model: every
 * default is just a starting suggestion and is overridable per role.
 *
 * Roles:
 *   agent   ; everyday playtest decisions, planning, tool calls.
 *   vision  ; screenshot / frame understanding (needs a vision-capable model).
 *   coder   ; autocode patches, code review, heal-worker edits.
 *   reasoner; slow deep diagnosis, self-improvement, root-cause work.
 *
 * Config shape (persisted in config/default.json under `localModels`):
 *   {
 *     ollamaUrl: 'http://127.0.0.1:11434',
 *     autoStart: true,            // start `ollama serve` on boot when installed
 *     roles: {
 *       agent:    { provider: 'local', model: 'qwen3:8b' },
 *       vision:   { provider: 'local', model: 'qwen2.5vl:7b' },
 *       coder:    { provider: 'local', model: 'qwen2.5-coder:7b' },
 *       reasoner: { provider: 'local', model: 'deepseek-r1:8b' }
 *     }
 *   }
 *
 * `callRoleLLM(brain, role, ...)` resolves the role against the live config
 * and delegates to the existing callLLM; cloud roles behave exactly like
 * the legacy single-model path, local roles hit the Ollama endpoint.
 */

const { isSafeModelName } = require('./ollama_manager');

const ROLES = {
  agent: {
    title: 'Agent (decisions)',
    description: 'Everyday playtest decisions, planning, and tool calls. A fast general chat model is ideal.',
    defaultModel: 'qwen3:8b',
    wantsVision: false,
  },
  vision: {
    title: 'Vision (screenshots)',
    description: 'Sees game frames and screenshots. Must be a vision-capable model (e.g. qwen2.5vl, llava, ministral-vision).',
    defaultModel: 'qwen2.5vl:7b',
    wantsVision: true,
  },
  coder: {
    title: 'Coder (patches)',
    description: 'Autocode patches, code review, and heal-worker edits. A code-tuned model works best.',
    defaultModel: 'qwen2.5-coder:7b',
    wantsVision: false,
  },
  reasoner: {
    title: 'Reasoner (diagnosis)',
    description: 'Slow deep diagnosis, self-improvement loops, and root-cause analysis. A reasoning model fits here.',
    defaultModel: 'deepseek-r1:8b',
    wantsVision: false,
  },
};

const ROLE_NAMES = Object.keys(ROLES);
const PROVIDER_NAMES = ['local', 'deepseek', 'meta', 'openai', 'gemini', 'openrouter'];

function defaultLocalModels() {
  const roles = {};
  for (const name of ROLE_NAMES) {
    roles[name] = { provider: 'local', model: ROLES[name].defaultModel };
  }
  return {
    ollamaUrl: 'http://127.0.0.1:11434',
    autoStart: true,
    roles,
  };
}

function isValidRoleName(name) {
  return ROLE_NAMES.includes(name);
}

/** Normalize + validate a persisted localModels block. Unknown roles/providers are dropped. */
function normalizeLocalModels(input) {
  const out = defaultLocalModels();
  if (!input || typeof input !== 'object') return out;
  if (typeof input.ollamaUrl === 'string' && /^https?:\/\/[^/]+/.test(input.ollamaUrl.trim())) {
    out.ollamaUrl = input.ollamaUrl.trim().replace(/\/+$/, '');
  }
  if (typeof input.autoStart === 'boolean') out.autoStart = input.autoStart;
  const roles = input.roles && typeof input.roles === 'object' ? input.roles : {};
  for (const name of ROLE_NAMES) {
    const entry = roles[name];
    if (!entry || typeof entry !== 'object') continue;
    const provider = PROVIDER_NAMES.includes(entry.provider) ? entry.provider : 'local';
    const model = typeof entry.model === 'string' && entry.model.trim()
      ? entry.model.trim().slice(0, 128)
      : ROLES[name].defaultModel;
    out.roles[name] = { provider, model };
  }
  return out;
}

/**
 * Resolve what { provider, modelName, endpointUrl } a role should run with.
 * appConfig: { provider, modelName, endpointUrl, localModels? }; the live
 * brain/autoCode config. Unconfigured roles fall back to the legacy
 * single-model config so existing setups keep working untouched.
 */
function resolveRoleModel(role, appConfig = {}) {
  const fallback = {
    provider: appConfig.provider || 'deepseek',
    modelName: appConfig.modelName || '',
    endpointUrl: appConfig.endpointUrl || '',
  };
  if (!isValidRoleName(role)) return fallback;
  const localModels = normalizeLocalModels(appConfig.localModels);
  const entry = (appConfig.localModels && appConfig.localModels.roles && appConfig.localModels.roles[role]) || localModels.roles[role];
  const provider = PROVIDER_NAMES.includes(entry && entry.provider) ? entry.provider : 'local';
  let model = entry && typeof entry.model === 'string' && entry.model.trim()
    ? entry.model.trim()
    : ROLES[role].defaultModel;
  if (provider === 'local') {
    // Env override wins for headless/CI setups (dashboard panel otherwise).
    const envModel = process.env[`VIBE_ROLE_${role.toUpperCase()}`];
    if (envModel && isSafeModelName(envModel.trim())) model = envModel.trim();
    return { provider: 'local', modelName: model, endpointUrl: `${localModels.ollamaUrl}/api/chat` };
  }
  // Cloud role: same provider semantics as the legacy path; keep an explicit
  // model when the user set one, otherwise inherit the global model choice.
  return { provider, modelName: model || fallback.modelName, endpointUrl: fallback.endpointUrl };
}

/**
 * Run one LLM call for an orchestration role. `brain` is the usual
 * AgentBrain/AutoCode instance (only .config is read). Returns whatever
 * callLLM returns. Lazy-requires llm_caller to keep module load order safe.
 */
async function callRoleLLM(brain, role, prompt, base64Image = null, audioInput = null) {
  const { callLLM } = require('./brain/llm_caller');
  const resolved = resolveRoleModel(role, (brain && brain.config) || {});
  const roleBrain = brain && typeof brain === 'object'
    ? Object.create(Object.getPrototypeOf(brain), Object.getOwnPropertyDescriptors(brain))
    : { config: {} };
  roleBrain.config = { ...((brain && brain.config) || {}), ...resolved };
  return callLLM(roleBrain, prompt, base64Image, audioInput);
}

/** Suggested starter tags shown in the UI datalist (pure hints; any installed tag works). */
function suggestedTags(role) {
  const base = {
    agent: ['qwen3:8b', 'qwen3:14b', 'mistral:latest', 'llama3.1:8b', 'gemma3:4b'],
    vision: ['qwen2.5vl:7b', 'qwen2.5vl:3b', 'llava:7b', 'llava:13b', 'ministral-3-vision:latest'],
    coder: ['qwen2.5-coder:7b', 'qwen2.5-coder:14b', 'codellama:7b', 'starcoder2:7b'],
    reasoner: ['deepseek-r1:8b', 'deepseek-r1:14b', 'qwen3:8b', 'qwq:32b'],
  };
  const list = base[role] || [];
  if (ROLES[role] && !list.includes(ROLES[role].defaultModel)) return [ROLES[role].defaultModel, ...list];
  return list;
}

module.exports = {
  ROLES,
  ROLE_NAMES,
  PROVIDER_NAMES,
  defaultLocalModels,
  isValidRoleName,
  normalizeLocalModels,
  resolveRoleModel,
  callRoleLLM,
  suggestedTags,
  isSafeModelName,
};
