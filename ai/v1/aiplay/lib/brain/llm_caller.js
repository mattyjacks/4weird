/**
 * LLM Provider API Caller and Heuristic Fallbacks
 */

async function callLLM(brain, prompt, base64Image = null) {
  const { provider, apiKey, endpointUrl, modelName } = brain.config;
  let url = '';
  let headers = { 'Content-Type': 'application/json' };
  let body = {};

  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers['Authorization'] = `Bearer ${apiKey}`;
    const realModel = 'gpt-4o-mini';

    const content = [{ type: 'text', text: prompt }];
    if (base64Image) {
      content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } });
    }
    body = { model: realModel, response_format: { type: "json_object" }, messages: [{ role: 'user', content }] };

  } else if (provider === 'gemini') {
    const model = modelName || 'gemini-2.5-flash';
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

  } else if (provider === 'openrouter') {
    url = 'https://openrouter.ai/api/v1/chat/completions';
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['HTTP-Referer'] = 'https://github.com/mattyjacks/4weird';
    headers['X-Title'] = 'AI Game Debugger';
    const model = modelName || 'google/gemini-2.5-flash';
    const content = [{ type: 'text', text: prompt }];
    if (base64Image) {
      content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } });
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

  const activeModel = modelName || (provider === 'openai' ? 'gpt-5.4-mini-2026-03-17' : (provider === 'openrouter' ? 'google/gemini-2.5-flash' : (provider === 'gemini' ? 'gemini-2.5-flash' : 'llama3')));

  if (promptTokens === 0 && completionTokens === 0) {
    promptTokens = Math.round(prompt.length / 4) + (base64Image ? 260 : 0);
    completionTokens = Math.round(contentString.length / 4);
  }

  brain.recordTokenUsage(activeModel, promptTokens, completionTokens);
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

function runHeuristicFallback(consoleLogs, domSnapshot) {
  console.log("Heuristic Fallback triggered!");
  let type = 'wait';
  let target = '';

  if (domSnapshot && domSnapshot.length > 0) {
    const clickables = domSnapshot.filter(el => ['BUTTON', 'A', 'INPUT'].includes(el.tagName));
    if (clickables.length > 0) {
      type = 'click';
      target = clickables[0].rect
        ? `${clickables[0].rect.left + clickables[0].rect.width / 2},${clickables[0].rect.top + clickables[0].rect.height / 2}`
        : clickables[0].id || clickables[0].tagName;
    }
  } else {
    const fallbacks = ['Space', 'ArrowRight', 'ArrowUp', 'w', 'd'];
    type = 'press_key';
    target = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  return {
    status: 'stuck',
    reasoning: "API call failed. Falling back to default explorer heuristics.",
    action: { type, target, duration_ms: 200 },
    next_delay_ms: 1000,
    bug_report: { has_bug: false }
  };
}

module.exports = {
  callLLM,
  runHeuristicFallback
};
