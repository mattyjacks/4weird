/**
 * Ollama preflight for launch_vibecodeworker.bat / npm scripts / CI.
 *
 *   node scripts/node/ensure_ollama.js [--json] [--timeout-ms 8000]
 *       [--base-url URL] [--no-start] [--install] [--pull <model>]
 *
 * Default (no flags): detect binary, check server, START the server when the
 * binary exists but nothing listens. Fast, non-blocking, never installs.
 * --install performs the full unattended install (explicit consent: ~700MB+).
 * --pull ensures a model tag is present (pulls it when missing).
 *
 * Exit codes: 0 = ready (server up), 1 = not ready (see message/JSON),
 * 2 = usage error or unexpected failure.
 */
const {
  defaultBaseUrl,
  detectOllama,
  isServerUp,
  startServer,
  installOllama,
  ensureModel,
} = require('../../lib/ollama_manager');

function parseArgs(argv) {
  const opts = {
    json: false,
    timeoutMs: 8000,
    baseUrl: defaultBaseUrl(),
    start: true,
    install: false,
    pull: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--no-start') opts.start = false;
    else if (arg === '--install') opts.install = true;
    else if (arg === '--timeout-ms') {
      const value = parseInt(argv[++i], 10);
      if (!Number.isFinite(value) || value < 1000 || value > 600000) {
        throw new Error('--timeout-ms must be between 1000 and 600000');
      }
      opts.timeoutMs = value;
    } else if (arg === '--base-url') {
      const value = String(argv[++i] || '').trim().replace(/\/+$/, '');
      if (!/^https?:\/\//.test(value)) throw new Error('--base-url must be an http(s) URL');
      opts.baseUrl = value;
    } else if (arg === '--pull') {
      opts.pull = String(argv[++i] || '').trim();
      if (!opts.pull) throw new Error('--pull needs a model name');
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return opts;
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`ensure_ollama: ${e.message}`);
    process.exit(2);
  }
  if (opts.help) {
    console.log('Usage: node scripts/node/ensure_ollama.js [--json] [--timeout-ms N] [--base-url URL] [--no-start] [--install] [--pull <model>]');
    process.exit(0);
  }

  const say = (msg) => { if (!opts.json) console.log(msg); };
  const report = (result, exitCode) => {
    if (opts.json) console.log(JSON.stringify(result));
    process.exit(exitCode);
  };

  if (opts.install) {
    say('Ollama install requested — downloading (~700MB+) and installing...');
    const installed = await installOllama({ onProgress: say, timeoutMs: 600000 });
    if (!installed.ok) {
      say(`Ollama install failed: ${installed.error}`);
      if (installed.manual) say(installed.manual);
      return report({ ok: false, ...installed }, 1);
    }
    say(`Ollama installed (${installed.binary}).`);
  }

  const found = detectOllama();
  if (!found.ok) {
    say('Ollama is not installed. Re-run with --install to auto-install, or install manually from https://ollama.com/download');
    return report({ ok: false, installed: false, server: false, error: found.error }, 1);
  }

  let up = await isServerUp(opts.baseUrl, Math.min(opts.timeoutMs, 10000));
  if (!up.ok && opts.start) {
    say('Ollama server is down — starting `ollama serve`...');
    const started = await startServer({ binary: found.binary, baseUrl: opts.baseUrl, timeoutMs: opts.timeoutMs, onProgress: say });
    if (!started.ok) {
      say(`Could not start Ollama server: ${started.error}`);
      return report({ ok: false, installed: true, server: false, error: started.error }, 1);
    }
    up = { ok: true, models: started.models };
  }
  if (!up.ok) {
    say(`Ollama server is not reachable at ${opts.baseUrl}. Start it with \`ollama serve\` (or drop --no-start).`);
    return report({ ok: false, installed: true, server: false, error: up.error }, 1);
  }

  let pulled = null;
  if (opts.pull) {
    say(`Ensuring model '${opts.pull}' is installed...`);
    pulled = await ensureModel(opts.pull, { baseUrl: opts.baseUrl, allowPull: true, onProgress: say });
    if (!pulled.ok) {
      say(`Model '${opts.pull}' unavailable: ${pulled.error}`);
      return report({ ok: false, installed: true, server: true, models: up.models, pull: pulled }, 1);
    }
    say(`Model ready: ${pulled.model} (${pulled.stage}).`);
    up = await isServerUp(opts.baseUrl, 5000);
  }

  say(`Ollama ready at ${opts.baseUrl} (${(up.models || []).length} model(s) installed).`);
  return report({ ok: true, installed: true, server: true, models: up.models || [], pull: pulled }, 0);
}

main().catch((e) => {
  console.error(`ensure_ollama failed: ${e && e.message ? e.message : e}`);
  process.exit(2);
});
