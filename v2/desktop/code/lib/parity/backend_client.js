/**
 * Desktop parity — unified backend client (desktop lane, new file only).
 * Health-gated fallback: web-vcw -> cloud-role -> local-ollama -> heuristic.
 * Never logs secrets; redacts errors. CommonJS for node --check.
 */
"use strict";

const DEFAULTS = {
  webBaseUrl: "https://4weird.com",
  ollamaUrl: "http://localhost:11434",
  timeoutMs: 10000,
};

function redact(s) {
  if (s == null) return "";
  const t = String(s);
  if (/bot4weird_[A-Za-z0-9]{20,32}/.test(t)) return t.replace(/bot4weird_[A-Za-z0-9]{20,32}/g, "bot4weird_[REDACTED]");
  if (/vcw_live_[A-Za-z0-9]{32}/.test(t)) return t.replace(/vcw_live_[A-Za-z0-9]{32}/g, "vcw_live_[REDACTED]");
  if (/sk-[A-Za-z0-9-]{8,}/.test(t)) return t.replace(/sk-[A-Za-z0-9-]{8,}/g, "sk-[REDACTED]");
  return t.slice(0, 500);
}

function normalize(cfg) {
  const c = cfg || {};
  const backend = c.backend || {};
  return {
    webBaseUrl: backend.webBaseUrl || process.env.FOURWEIRD_BASE_URL || DEFAULTS.webBaseUrl,
    ollamaUrl: backend.ollamaUrl || process.env.OLLAMA_URL || DEFAULTS.ollamaUrl,
    webgpuEnabled: backend.webgpuEnabled !== false,
    strategy: Object.assign(
      { testing: "web-first", healing: "local-first", vision: "local-first" },
      backend.strategy || {},
    ),
    timeoutMs: backend.timeoutMs || DEFAULTS.timeoutMs,
  };
}

async function checkUrl(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs || 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, error: redact(e && e.message) };
  } finally {
    clearTimeout(t);
  }
}

async function health(cfg) {
  const n = normalize(cfg);
  const out = { web: null, ollama: null };
  out.web = await checkUrl(n.webBaseUrl + "/api/vcw/health", 8000);
  out.ollama = await checkUrl(n.ollamaUrl + "/api/tags", 5000);
  return out;
}

function chainFor(task, cfg) {
  const n = normalize(cfg);
  const s = (n.strategy && n.strategy[task]) || "web-first";
  if (s === "local-first") return ["local-ollama", "web-vcw", "heuristic-offline"];
  if (s === "web-first") return ["web-vcw", "local-ollama", "heuristic-offline"];
  return ["web-vcw", "local-ollama", "webgpu", "heuristic-offline"];
}

function resolve(task, cfg, probes) {
  const chain = chainFor(task, cfg);
  const p = probes || {};
  for (const leg of chain) {
    if (leg === "web-vcw" && p.web === false) continue;
    if (leg === "local-ollama" && p.ollama === false) continue;
    if (leg === "webgpu" && p.webgpu === false) continue;
    return { backend: leg, fallbackChain: chain };
  }
  return { backend: "heuristic-offline", fallbackChain: chain };
}

module.exports = { DEFAULTS, normalize, health, chainFor, resolve, redact };
