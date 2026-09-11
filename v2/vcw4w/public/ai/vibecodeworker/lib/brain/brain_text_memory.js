/**
 * Human-readable internal brain files.
 *
 * JSON session memory remains the machine-facing source of truth. This module
 * mirrors only compact, useful conclusions into text files for fast inspection
 * and cross-run continuity. Writes are debounced and asynchronous so the game
 * loop never waits on disk I/O.
 */
const fs = require('fs');
const path = require('path');

const WRITE_INTERVAL_MS = 1500;
const MAX_DISCOVERIES = 80;
const MAX_THOUGHTS = 18;

function clean(value, max = 260) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function brainDir(brain) {
  return brain && brain.dataDir ? path.join(brain.dataDir, 'internal_brain') : '';
}

function ensureState(brain) {
  if (!brain || brain._textBrain) return brain && brain._textBrain;
  brain._textBrain = { discoveries: [], thoughts: [], timer: null, writing: false, dirty: false, lastWrite: 0 };
  return brain._textBrain;
}

function addUnique(items, value, max) {
  if (!value) return;
  if (items[items.length - 1] !== value && !items.includes(value)) items.push(value);
  if (items.length > max) items.splice(0, items.length - max);
}

function actionLabel(action) {
  if (!action) return 'observe';
  const target = clean(action.target || action.params?.key || action.params?.selector || '', 70);
  return `${action.type || 'observe'}${target ? ` → ${target}` : ''}`;
}

function discoveryFromEpisode(episode) {
  const reasoning = clean(episode.reasoning, 220);
  if (!reasoning) return '';
  // Reasoning is already agent-authored; retain the outcome-bearing portion,
  // not raw chain-of-thought or full prompt content.
  return `${actionLabel(episode.action)}: ${reasoning}`;
}

function renderStatus(brain, textBrain) {
  const mem = brain._sessionMem || {};
  const summary = brain.getSessionSummary ? brain.getSessionSummary() : '';
  const latest = textBrain.thoughts[textBrain.thoughts.length - 1];
  return [
    '# VibeCodeWorker internal brain',
    `Updated: ${new Date().toISOString()}`,
    `Run: ${brain.activeRunId || 'idle'}`,
    `Target rules: ${clean(brain.config?.gameRules, 300) || 'No custom rules set.'}`,
    `Session: ${summary || `${mem.totalSteps || 0} steps recorded.`}`,
    `Bugs known: ${(brain.bugs || []).length}`,
    latest ? `Current takeaway: ${latest}` : 'Current takeaway: Waiting for the first playtest decision.',
    '',
    'This is a compact operational summary. See gameplay_discoveries.txt for learned patterns and thinking_digest.txt for recent decisions.',
    ''
  ].join('\n');
}

function renderDiscoveries(textBrain) {
  return ['# Gameplay discoveries', 'Automatically distilled from completed playtest decisions.', '', ...textBrain.discoveries.map((item, index) => `${index + 1}. ${item}`), ''].join('\n');
}

function renderThoughts(textBrain) {
  return ['# Thinking digest', 'Short action-level conclusions; verbose prompts and hidden reasoning are intentionally excluded.', '', ...textBrain.thoughts.map((item) => `- ${item}`), ''].join('\n');
}

async function writeFiles(brain) {
  const textBrain = ensureState(brain);
  const dir = brainDir(brain);
  if (!textBrain || !dir || textBrain.writing) return;
  textBrain.writing = true;
  textBrain.dirty = false;
  try {
    await fs.promises.mkdir(dir, { recursive: true });
    await Promise.all([
      fs.promises.writeFile(path.join(dir, 'internal_brain.txt'), renderStatus(brain, textBrain), 'utf8'),
      fs.promises.writeFile(path.join(dir, 'gameplay_discoveries.txt'), renderDiscoveries(textBrain), 'utf8'),
      fs.promises.writeFile(path.join(dir, 'thinking_digest.txt'), renderThoughts(textBrain), 'utf8')
    ]);
    textBrain.lastWrite = Date.now();
  } catch (error) {
    // A short-lived test/session data directory can disappear while an
    // already-scheduled write is in flight. It is an expected teardown race,
    // not a live-playtest failure worth surfacing to the user.
    if (error && error.code === 'ENOENT') return;
    // Persistence must never make a live playtest fail.
    console.warn('[InternalBrain] Could not update text memory:', error.message);
  } finally {
    textBrain.writing = false;
    if (textBrain.dirty) scheduleWrite(brain);
  }
}

function scheduleWrite(brain, force = false) {
  const textBrain = ensureState(brain);
  if (!textBrain || !brainDir(brain)) return;
  textBrain.dirty = true;
  if (force) {
    if (textBrain.timer) clearTimeout(textBrain.timer);
    textBrain.timer = null;
    void writeFiles(brain);
    return;
  }
  if (textBrain.timer || textBrain.writing) return;
  const wait = Math.max(0, WRITE_INTERVAL_MS - (Date.now() - textBrain.lastWrite));
  textBrain.timer = setTimeout(() => {
    textBrain.timer = null;
    void writeFiles(brain);
  }, wait);
}

function startTextBrain(brain) {
  const textBrain = ensureState(brain);
  if (!textBrain) return;
  // Keep learned gameplay patterns across runs. The current run gets a fresh
  // digest, while the discovery ledger is bounded so it cannot grow forever.
  const dir = brainDir(brain);
  if (dir && textBrain.discoveries.length === 0) {
    try {
      const existing = fs.readFileSync(path.join(dir, 'gameplay_discoveries.txt'), 'utf8');
      textBrain.discoveries = existing.split(/\r?\n/)
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line && !line.startsWith('#') && !line.startsWith('Automatically'))
        .slice(-MAX_DISCOVERIES);
    } catch (error) {
      // First run has no ledger yet; there is nothing to restore.
    }
  }
  textBrain.thoughts = [];
  scheduleWrite(brain, true);
}

function recordTextBrainEpisode(brain, episode, bug) {
  const textBrain = ensureState(brain);
  if (!textBrain || !episode) return;
  const stamp = new Date(episode.timestamp || Date.now()).toLocaleTimeString();
  const thought = `${stamp} · ${episode.status || 'observed'} · ${discoveryFromEpisode(episode) || actionLabel(episode.action)}`;
  addUnique(textBrain.thoughts, thought, MAX_THOUGHTS);
  addUnique(textBrain.discoveries, discoveryFromEpisode(episode), MAX_DISCOVERIES);
  if (bug?.description) addUnique(textBrain.discoveries, `Bug found (${clean(bug.severity || 'unknown')}): ${clean(bug.description, 220)}`, MAX_DISCOVERIES);
  scheduleWrite(brain);
}

function recordDomDiscoveries(brain, domSnapshot) {
  const textBrain = ensureState(brain);
  if (!textBrain || !Array.isArray(domSnapshot) || domSnapshot.length === 0) return;
  // The DOM inspector is already capped at 40 visible interactive elements.
  // Read only a small label set here; this adds no new browser work to a step.
  domSnapshot.slice(0, 16).forEach((element) => {
    const tag = clean(element.tagName || element.tag || 'control', 20).toLowerCase();
    const label = clean(element.innerText || element.placeholder || element.id || element.className, 80);
    if (!label) return;
    const position = Number.isFinite(element.nx) && Number.isFinite(element.ny)
      ? ` at ${element.nx},${element.ny}`
      : '';
    addUnique(textBrain.discoveries, `Observed ${tag} control “${label}”${position}.`, MAX_DISCOVERIES);
  });
  scheduleWrite(brain);
}

function recordTextBrainBug(brain, bug) {
  const textBrain = ensureState(brain);
  if (!textBrain || !bug || !bug.description) return;
  addUnique(textBrain.discoveries, `Bug found (${clean(bug.severity || bug.type || 'unknown')}): ${clean(bug.description, 220)}`, MAX_DISCOVERIES);
  scheduleWrite(brain);
}

function getTextBrainContext(brain, limit = 6) {
  const textBrain = ensureState(brain);
  if (!textBrain || textBrain.discoveries.length === 0) return '';
  return textBrain.discoveries.slice(-Math.max(1, limit)).map(item => `- ${item}`).join('\n');
}

function flushTextBrain(brain) {
  const textBrain = ensureState(brain);
  if (!textBrain) return;
  if (textBrain.timer) clearTimeout(textBrain.timer);
  textBrain.timer = null;
  if (textBrain.dirty) void writeFiles(brain);
}

module.exports = { startTextBrain, recordTextBrainEpisode, recordDomDiscoveries, recordTextBrainBug, getTextBrainContext, flushTextBrain, brainDir };
