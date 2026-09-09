/**
 * LLM Provider API Caller and Heuristic Fallbacks
 */

const { getResolvedApiKey } = require('../storage');
const { isMetaDirectUrl } = require('../meta_endpoint');

function selectDeepSeekModel(requestedModel, hasImage, prompt) {
  // Vision input is accepted only by the documented vision model. Keep image
  // interpretation there, and use Flash for text-only planning/replay work.
  if (hasImage) return 'deepseek-v4-flash-vision-exp';
  if (!requestedModel || requestedModel === 'deepseek-auto') return 'deepseek-v4-flash';
  // Preserve an explicit Reasoner choice for deliberate long-form diagnosis.
  if (requestedModel === 'deepseek-reasoner' && /diagnos|architect|root cause|self-improv/i.test(prompt || '')) return requestedModel;
  return requestedModel;
}

async function callLLM(brain, prompt, base64Image = null, audioInput = null) {
  // audioInput (Muse Spark 1.3 ear): { base64, mimeType?, transcript?, report? }
  // or a raw base64 string. Providers with native audio (meta/openrouter via
  // OpenRouter) get an input_audio part; every provider gets the transcript +
  // PCM telemetry appended to the prompt so audio QA works everywhere.
  let audioBase64 = null;
  let audioTranscript = null;
  let audioReportBlock = '';
  if (audioInput) {
    if (typeof audioInput === 'string') {
      audioBase64 = audioInput;
    } else if (typeof audioInput === 'object') {
      audioBase64 = audioInput.base64 || audioInput.audioBase64 || null;
      audioTranscript = audioInput.transcript || audioInput.text || null;
      if (audioInput.report || audioInput.promptBlock) {
        try {
          const { buildAudioQABlock } = require('../audio/audio_analyzer');
          audioReportBlock = audioInput.promptBlock || buildAudioQABlock(audioInput.report, audioTranscript);
        } catch (_) {}
      }
    }
    if (audioReportBlock) prompt = `${prompt}\n${audioReportBlock}`;
    else if (audioTranscript) prompt = `${prompt}\n## AUDIO TRANSCRIPT (STT)\n"${String(audioTranscript).slice(0, 500)}"`;
  }

  let { provider, apiKey, endpointUrl, modelName } = brain.config;

  // Resolve API key from local persistent credentials or environment
  apiKey = getResolvedApiKey(provider, apiKey);

  if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY') {
    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      apiKey = process.env.OPENAI_API_KEY;
    } else if (provider === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
      apiKey = process.env.DEEPSEEK_API_KEY;
    } else if (provider === 'meta' && (process.env.META_API_KEY || process.env.OPENROUTER_API_KEY)) {
      apiKey = process.env.META_API_KEY || process.env.OPENROUTER_API_KEY;
    } else if (provider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
      apiKey = process.env.OPENROUTER_API_KEY;
    } else if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
      apiKey = process.env.GEMINI_API_KEY;
    } else if (!provider || provider === 'openai') {
      // Auto-fallback check
      if (process.env.OPENAI_API_KEY) {
        apiKey = process.env.OPENAI_API_KEY;
        provider = 'openai';
      } else if (process.env.DEEPSEEK_API_KEY) {
        apiKey = process.env.DEEPSEEK_API_KEY;
        provider = 'deepseek';
      } else if (process.env.META_API_KEY) {
        apiKey = process.env.META_API_KEY;
        provider = 'meta';
      } else if (process.env.OPENROUTER_API_KEY) {
        apiKey = process.env.OPENROUTER_API_KEY;
        provider = 'openrouter';
      }
    }
  }

  let url = '';
  let headers = { 'Content-Type': 'application/json' };
  let body = {};

  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers['Authorization'] = `Bearer ${apiKey}`;
    const realModel = modelName || 'gpt-5.6-luna';

    const content = [{ type: 'text', text: prompt }];
    if (base64Image) {
      content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } });
    }
    if (audioBase64) {
      // OpenAI-compatible audio part (Muse Spark 1.3 via OpenRouter).
      content.push({ type: 'input_audio', input_audio: { data: audioBase64, format: 'wav' } });
    }
    body = { model: realModel, response_format: { type: "json_object" }, messages: [{ role: 'user', content }] };

  } else if (provider === 'deepseek') {
    url = 'https://api.deepseek.com/chat/completions';
    headers['Authorization'] = `Bearer ${apiKey}`;
    const realModel = selectDeepSeekModel(modelName, !!base64Image, prompt);

    const content = [{ type: 'text', text: prompt }];
    if (base64Image) {
      content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } });
    }
    body = { model: realModel, messages: [{ role: 'user', content }] };
    // Low detail keeps rapid frame-to-frame play affordable; action decisions
    // generally do not need original-resolution pixels.
    if (base64Image) content[1].image_url.detail = 'low';

  } else if (provider === 'meta') {
    // Meta Model API or OpenRouter-compatible endpoint for Muse Spark 1.3 Contributor
    const realModel = modelName || 'meta-llama/llama-4-scout-17b-16e-instruct';
    const isMetaDirect = isMetaDirectUrl(endpointUrl);
    url = isMetaDirect ? endpointUrl : (endpointUrl || 'https://openrouter.ai/api/v1/chat/completions');
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['HTTP-Referer'] = 'https://github.com/mattyjacks/4weird';
    headers['X-Title'] = '4weird VibeCodeWorker';

    const content = [{ type: 'text', text: prompt }];
    if (base64Image) {
      content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } });
    }
    if (audioBase64) {
      // Muse Spark 1.3 ear: native audio part next to the screenshot.
      content.push({ type: 'input_audio', input_audio: { data: audioBase64, format: 'wav' } });
    }
    body = { model: realModel, messages: [{ role: 'user', content }] };

  } else if (provider === 'gemini') {
    const model = modelName || 'gemini-3.5-flash-lite';
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const parts = [{ text: prompt }];
    if (base64Image) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image
        }
      });
    }
    body = {
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    };
    if (audioBase64) {
      // Gemini native audio: inline wav bytes beside the screenshot pixels.
      parts.push({ inlineData: { mimeType: 'audio/wav', data: audioBase64 } });
    }

  } else if (provider === 'openrouter') {
    url = 'https://openrouter.ai/api/v1/chat/completions';
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['HTTP-Referer'] = 'https://github.com/mattyjacks/4weird';
    headers['X-Title'] = 'AI Game Debugger';
    const model = modelName || 'meta-llama/llama-4-scout-17b-16e-instruct';
    const content = [{ type: 'text', text: prompt }];
    if (base64Image) {
      content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } });
    }
    if (audioBase64) {
      content.push({ type: 'input_audio', input_audio: { data: audioBase64, format: 'wav' } });
    }
    body = { model, messages: [{ role: 'user', content }] };

  } else if (provider === 'local') {
    url = endpointUrl || 'http://localhost:11434/api/chat';
    const model = modelName || 'llama3';
    if (url.includes('/api/chat')) {
      body = { model, format: "json", stream: false, messages: [{ role: 'user', content: prompt, images: base64Image ? [base64Image] : [] }] };
    } else {
      const content = [{ type: 'text', text: prompt }];
      if (base64Image) {
        content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } });
      }
      body = { model, messages: [{ role: 'user', content }] };
    }
  }

  console.log(`Sending API Request to ${provider} using model ${modelName || 'default'}`);
  const abortController = new AbortController();
  const fetchTimeout = setTimeout(() => abortController.abort(), 60000);
  let response;
  try {
    response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: abortController.signal });
  } finally {
    clearTimeout(fetchTimeout);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM API Call failed: ${response.status} ${response.statusText} - ${errText}`);
  }

  const data = await response.json();
  let contentString = '';
  let promptTokens = 0, completionTokens = 0;

  if (provider === 'gemini') {
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      contentString = data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Unexpected Gemini API response format");
    }
    if (data.usageMetadata) {
      promptTokens = data.usageMetadata.promptTokenCount || 0;
      completionTokens = data.usageMetadata.candidatesTokenCount || 0;
    }
  } else {
    if (data.choices && data.choices[0] && data.choices[0].message) {
      contentString = data.choices[0].message.content;
    } else if (data.message && data.message.content) {
      contentString = data.message.content;
    } else {
      throw new Error("Unexpected LLM API response format");
    }

    if (data.usage) {
      promptTokens = data.usage.prompt_tokens || 0;
      completionTokens = data.usage.completion_tokens || 0;
    } else if (data.prompt_eval_count !== undefined || data.eval_count !== undefined) {
      promptTokens = data.prompt_eval_count || 0;
      completionTokens = data.eval_count || 0;
    }
  }

  const activeModel = provider === 'deepseek'
    ? selectDeepSeekModel(modelName, !!base64Image, prompt)
    : (modelName || (provider === 'openai' ? 'gpt-5.6-luna' : (provider === 'openrouter' ? 'meta-llama/llama-4-scout-17b-16e-instruct' : (provider === 'gemini' ? 'gemini-3.5-flash-lite' : 'llama3'))));

  if (promptTokens === 0 && completionTokens === 0) {
    promptTokens = Math.round(prompt.length / 4) + (base64Image ? 260 : 0) + (audioBase64 ? Math.round(audioBase64.length / 760) : 0);
    completionTokens = Math.round(contentString.length / 4);
  }

  if (brain && typeof brain.recordTokenUsage === 'function') {
    brain.recordTokenUsage(activeModel, promptTokens, completionTokens);
  }
  try {
    return JSON.parse(contentString);
  } catch (e) {
    const jsonMatch = contentString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`LLM returned non-JSON response: ${contentString.slice(0, 200)}`);
  }
}

// Round-robin cursor so the offline fallback never hammers clickables[0]
// (the old logo-loop at 111,30 on mattyjacks.com). State lives on the brain
// when available, with a module-level fallback for standalone callers.
let fallbackCursor = 0;
let fallbackCalls = 0;

function toNormalizedTarget(el) {
  if (Number.isFinite(el.nx) && Number.isFinite(el.ny)) {
    return `${Math.round(el.nx)},${Math.round(el.ny)}`;
  }
  // Legacy snapshots without nx/ny: rect is CSS pixels, not 0-1000. Without a
  // viewport size we cannot convert exactly, so fall back to a selector/id
  // (dispatcher resolves it in-page) instead of emitting wrong coords.
  if (el.id) return `#${el.id}`;
  if (el.innerText) return el.innerText.slice(0, 30);
  return el.tagName || '';
}

function runHeuristicFallback(consoleLogs, domSnapshot, brain = null) {
  console.log("Heuristic Fallback triggered!");
  fallbackCalls += 1;
  const callCount = fallbackCalls;

  // Every 5th offline step: scroll to explore long pages (marketing sites like
  // mattyjacks.com are mostly below the fold). Every 9th: keyboard probe.
  if (callCount % 9 === 0) {
    const keys = ['Tab', 'Enter', 'ArrowDown', 'Space'];
    const key = keys[Math.floor(callCount / 9) % keys.length];
    return {
      status: 'exploring',
      reasoning: "Offline explorer (no API key): keyboard probe to explore page.",
      action: { type: 'press_key', target: key, duration_ms: 200 },
      next_delay_ms: 1000,
      bug_report: { has_bug: false }
    };
  }
  if (callCount % 5 === 0) {
    return {
      status: 'exploring',
      reasoning: "Offline explorer (no API key): scrolling to discover content below the fold.",
      action: { type: 'scroll', target: 'down', duration_ms: 200, params: { direction: 'down', amount: 600 } },
      next_delay_ms: 1000,
      bug_report: { has_bug: false }
    };
  }

  if (domSnapshot && domSnapshot.length > 0) {
    const clickables = domSnapshot.filter(el => ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'CANVAS'].includes(el.tagName));
    const pool = clickables.length > 0 ? clickables : domSnapshot;
    // Round-robin through the pool, skipping whatever we clicked last time.
    const cursor = brain && Number.isFinite(brain._heuristicCursor) ? brain._heuristicCursor : fallbackCursor;
    const lastTarget = brain ? brain._lastHeuristicTarget : null;
    let pick = null;
    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[(cursor + i) % pool.length];
      const target = toNormalizedTarget(candidate);
      if (target && target !== lastTarget) {
        pick = candidate;
        if (brain) {
          brain._heuristicCursor = (cursor + i + 1) % pool.length;
          brain._lastHeuristicTarget = target;
        } else {
          fallbackCursor = (cursor + i + 1) % pool.length;
        }
        break;
      }
    }
    if (!pick) pick = pool[cursor % pool.length];
    const target = toNormalizedTarget(pick);
    const label = pick.innerText || pick.id || pick.tagName;
    return {
      status: 'exploring',
      reasoning: `Offline explorer (no API key): trying interactive element ${pick.tagName} "${String(label).slice(0, 40)}" (${pool.indexOf(pick) + 1}/${pool.length}). Add an API key for smart decisions.`,
      action: { type: 'click', target, duration_ms: 200 },
      next_delay_ms: 1000,
      bug_report: { has_bug: false }
    };
  }

  const fallbacks = ['Space', 'ArrowRight', 'ArrowUp', 'w', 'd'];
  const key = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  return {
    status: 'exploring',
    reasoning: "Offline explorer (no API key): no interactive elements found, probing keyboard.",
    action: { type: 'press_key', target: key, duration_ms: 200 },
    next_delay_ms: 1000,
    bug_report: { has_bug: false }
  };
}

module.exports = {
  callLLM,
  runHeuristicFallback
};
