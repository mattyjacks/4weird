// WIRING: require from app/main.js getConfiguredPort() (local API server port block) — e.g. const { resolvePort } = require('./vcwcode-port-guard');
'use strict';

const DEFAULT_PORT = 42069;

function toPortNumber(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 && n <= 65535 ? n : null;
}

// resolvePort(cfg, env) -> number
// Pure extraction of main.js getConfiguredPort(): cfg.serverPort wins,
// then env.VIBECODEWORKER_PORT / env.PORT, else DEFAULT_PORT (42069).
// Never throws; unparseable inputs fall through to the default.
function resolvePort(cfg, env) {
  const c = cfg && typeof cfg === 'object' ? cfg : {};
  const e = env && typeof env === 'object' ? env : {};
  return (
    toPortNumber(c.serverPort) ||
    toPortNumber(e.VIBECODEWORKER_PORT) ||
    toPortNumber(e.PORT) ||
    DEFAULT_PORT
  );
}

module.exports = { DEFAULT_PORT, resolvePort, toPortNumber };
