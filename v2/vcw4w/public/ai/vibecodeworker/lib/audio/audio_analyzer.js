/**
 * PCM Audio Analyzer for VibeCodeWorker game-audio QA
 * ===================================================
 * Works on raw float PCM so every engine (headless capture, WAV upload,
 * WebAudio getFloatTimeDomainData dumps) funnels through one path.
 *
 * Channel doctrine (per feature request):
 *   - MONO (default): a single stream. Stereo input is downmixed with
 *     equal-power (L+R)/2 before any metric is computed.
 *   - STEREO (opt-in): keeps L and R separate AND reports the differences
 *     between them (level imbalance, correlation/phase, dropouts).
 *
 * Metrics: RMS/peak/dBFS, clipping %, silence %, DC offset, zero-crossing
 * rate (brightness proxy), L/R imbalance dB, inter-channel correlation,
 * dropout/mute detection per channel. All pure functions — no network.
 */

const CHANNEL_MODES = ['mono', 'stereo'];

function normalizeInput(input) {
  // Accepts: { left, right?, sampleRate? } | { mono, sampleRate? } |
  // Float32Array (mono) | { samples: [...] } | number[] (mono).
  if (!input) throw new Error('analyzeAudio requires PCM input.');
  if (Array.isArray(input)) return { mono: Float32Array.from(input), sampleRate: 44100, mode: 'mono' };
  if (input instanceof Float32Array) return { mono: input, sampleRate: 44100, mode: 'mono' };
  if (input.mono) return { mono: toFloat32(input.mono), sampleRate: input.sampleRate || 44100, mode: 'mono' };
  if (input.samples && !input.left) return { mono: toFloat32(input.samples), sampleRate: input.sampleRate || 44100, mode: 'mono' };
  if (input.left) {
    return {
      left: toFloat32(input.left),
      right: input.right ? toFloat32(input.right) : toFloat32(input.left),
      sampleRate: input.sampleRate || 44100,
      mode: input.mode === 'stereo' ? 'stereo' : 'mono',
    };
  }
  throw new Error('Unrecognized PCM shape. Pass { mono } or { left, right }.');
}

function toFloat32(arr) {
  if (arr instanceof Float32Array) return arr;
  return Float32Array.from(arr);
}

function downmixToMono(left, right) {
  const n = Math.min(left.length, right.length);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (left[i] + right[i]) / 2;
  return out;
}

function channelStats(samples) {
  const n = samples.length;
  if (n === 0) return { rms: 0, peak: 0, dbfs: -Infinity, clippedRatio: 0, silenceRatio: 1, dcOffset: 0, zeroCrossingRate: 0 };
  let sumSq = 0;
  let peak = 0;
  let clipped = 0;
  let silent = 0;
  let dcSum = 0;
  let crossings = 0;
  for (let i = 0; i < n; i++) {
    const v = samples[i];
    sumSq += v * v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
    if (a >= 0.999) clipped++;
    if (a < 0.01) silent++;
    dcSum += v;
    if (i > 0 && (samples[i - 1] < 0) !== (v < 0)) crossings++;
  }
  const rms = Math.sqrt(sumSq / n);
  return {
    rms,
    peak,
    dbfs: rms > 0 ? 20 * Math.log10(rms) : -Infinity,
    clippedRatio: clipped / n,
    silenceRatio: silent / n,
    dcOffset: dcSum / n,
    zeroCrossingRate: n > 1 ? crossings / (n - 1) : 0,
  };
}

function stereoDiff(left, right) {
  const n = Math.min(left.length, right.length);
  if (n === 0) return { levelImbalanceDb: 0, correlation: 1, maxAbsDiff: 0, meanAbsDiff: 0, dropoutL: true, dropoutR: true };
  const sl = channelStats(left.subarray(0, n));
  const sr = channelStats(right.subarray(0, n));
  const levelImbalanceDb = 20 * Math.log10((sl.rms + 1e-9) / (sr.rms + 1e-9));
  // Pearson correlation (phase/coherence proxy).
  let meanL = sl.dcOffset;
  let meanR = sr.dcOffset;
  let cov = 0;
  let varL = 0;
  let varR = 0;
  let maxAbs = 0;
  let meanAbs = 0;
  for (let i = 0; i < n; i++) {
    const dl = left[i] - meanL;
    const dr = right[i] - meanR;
    cov += dl * dr;
    varL += dl * dl;
    varR += dr * dr;
    const d = Math.abs(left[i] - right[i]);
    meanAbs += d;
    if (d > maxAbs) maxAbs = d;
  }
  const correlation = varL > 0 && varR > 0 ? cov / Math.sqrt(varL * varR) : 1;
  return {
    levelImbalanceDb,
    correlation,
    maxAbsDiff: maxAbs,
    meanAbsDiff: meanAbs / n,
    dropoutL: sl.silenceRatio > 0.99,
    dropoutR: sr.silenceRatio > 0.99,
  };
}

function gradeFindings({ monoStats, diff, mode, durationSeconds }) {
  const findings = [];
  const push = (severity, code, message) => findings.push({ severity, code, message });

  if (monoStats.silenceRatio > 0.98) push('high', 'SILENCE', `Output is ${(monoStats.silenceRatio * 100).toFixed(1)}% silent over ${durationSeconds.toFixed(1)}s — mute bus, autoplay block, or missing asset.`);
  else if (monoStats.silenceRatio > 0.9) push('medium', 'MOSTLY_SILENT', `Output is ${(monoStats.silenceRatio * 100).toFixed(1)}% near-silent — check gain staging.`);
  if (monoStats.clippedRatio > 0.01) push('high', 'CLIPPING', `${(monoStats.clippedRatio * 100).toFixed(2)}% of samples clip at 0dBFS — audible distortion, lower master gain.`);
  else if (monoStats.clippedRatio > 0.001) push('medium', 'HOT_MASTER', 'Master runs hot with occasional clips — leave 3-6dB headroom.');
  if (Math.abs(monoStats.dcOffset) > 0.02) push('medium', 'DC_OFFSET', `DC offset ${monoStats.dcOffset.toFixed(4)} — high-pass or re-render the loop.`);
  if (monoStats.dbfs > -6) push('low', 'LOUD', `Average level ${monoStats.dbfs.toFixed(1)}dBFS is loud — verify against platform loudness targets.`);
  if (monoStats.dbfs < -48 && monoStats.silenceRatio < 0.9) push('low', 'QUIET', `Average level ${monoStats.dbfs.toFixed(1)}dBFS is very quiet — players will crank volume into the noise floor.`);

  if (mode === 'stereo' && diff) {
    if (Math.abs(diff.levelImbalanceDb) > 6) push('high', 'STEREO_IMBALANCE', `L/R imbalance ${diff.levelImbalanceDb.toFixed(1)}dB — one side is twice as loud; check panning or a dead channel.`);
    else if (Math.abs(diff.levelImbalanceDb) > 3) push('medium', 'STEREO_DRIFT', `L/R imbalance ${diff.levelImbalanceDb.toFixed(1)}dB — audible image pull.`);
    if (diff.dropoutL !== diff.dropoutR) push('high', 'ONE_SIDED_DROPOUT', `Only one stereo channel has signal (L ${diff.dropoutL ? 'mute' : 'live'} / R ${diff.dropoutR ? 'mute' : 'live'}) — broken cable/pan bug.`);
    if (diff.correlation < -0.3) push('medium', 'PHASE_INVERTED', `L/R correlation ${diff.correlation.toFixed(2)} is strongly negative — probable phase inversion; mono fold-down will cancel.`);
    else if (diff.correlation < 0.2 && diff.meanAbsDiff > 0.15) push('low', 'WIDE_OR_DECOUPLED', `L/R correlation ${diff.correlation.toFixed(2)} is low — very wide or decoupled mix; confirm mono compatibility.`);
    if (diff.meanAbsDiff < 0.001) push('low', 'DUAL_MONO', 'L and R are sample-identical — ship mono and save bandwidth.');
  }
  return findings;
}

/**
 * Main entry: analyze PCM in mono (default) or stereo (opt-in diff).
 * @param {object} input PCM shape (see normalizeInput)
 * @param {object} opts { mode: 'mono'|'stereo' }
 */
function analyzeAudio(input, opts = {}) {
  const norm = normalizeInput(input);
  // Explicit opts.mode always wins; otherwise honor the PCM's own flag.
  const mode = opts.mode ? (opts.mode === 'stereo' ? 'stereo' : 'mono')
    : (norm.mode === 'stereo' ? 'stereo' : 'mono');
  if (!CHANNEL_MODES.includes(mode)) throw new Error(`mode must be one of ${CHANNEL_MODES.join('|')}`);

  const sampleRate = norm.sampleRate || 44100;
  let mono;
  let diff = null;
  let perChannel = null;
  if (norm.left) {
    if (mode === 'stereo') {
      // Opt-in: keep L/R separate AND report the differences between them.
      perChannel = { left: channelStats(norm.left), right: channelStats(norm.right) };
      diff = stereoDiff(norm.left, norm.right);
    }
    // Default: single mono stream — stereo input is downmixed first.
    mono = channelStats(downmixToMono(norm.left, norm.right));
  } else {
    mono = channelStats(norm.mono);
  }
  const frames = norm.left ? Math.min(norm.left.length, norm.right.length) : norm.mono.length;
  const durationSeconds = frames / sampleRate;
  const findings = gradeFindings({ monoStats: mono, diff, mode, durationSeconds });
  const worst = findings.some((f) => f.severity === 'high') ? 'fail'
    : findings.some((f) => f.severity === 'medium') ? 'warn' : 'pass';

  return {
    success: true,
    mode, // 'mono' = single default stream; 'stereo' = L/R + differences
    sampleRate,
    durationSeconds,
    samples: frames,
    mono,
    ...(perChannel ? { channels: perChannel } : {}),
    ...(diff ? { stereoDiff: diff } : {}),
    findings,
    verdict: worst,
  };
}

/**
 * Comparison helper: does narration/dialogue match what STT heard?
 * Used by the voice director to flag subtitle/VO drift.
 */
function compareTranscript(expected, heard) {
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const a = norm(expected);
  const b = norm(heard);
  if (!a || !b) return { similarity: 0, match: false, expected: a, heard: b };
  const aWords = a.split(' ');
  const bSet = new Set(b.split(' '));
  const overlap = aWords.filter((w) => bSet.has(w)).length / Math.max(aWords.length, 1);
  // Order-sensitive bonus: longest run of expected words appearing in order.
  const bWords = b.split(' ');
  let best = 0;
  for (let i = 0; i < aWords.length; i++) {
    let run = 0;
    let bi = bWords.indexOf(aWords[i]);
    if (bi === -1) continue;
    for (let k = i; k < aWords.length && bWords[bi + (k - i)] === aWords[k]; k++) run++;
    if (run > best) best = run;
  }
  const similarity = Math.min(1, overlap * 0.7 + (best / Math.max(aWords.length, 1)) * 0.3);
  return { similarity, match: similarity >= 0.8, expected: a, heard: b };
}

/**
 * Build the audio block appended to the Muse Spark 1.3 multimodal prompt.
 * Keeps the brain token-cheap: numbers + verdict, not raw samples.
 */
function buildAudioQABlock(audioReport, transcript = null) {
  if (!audioReport) return '';
  const lines = [
    '## AUDIO QA (ElevenLabs STT + PCM telemetry)',
    `Mode: ${audioReport.mode} | ${audioReport.durationSeconds.toFixed(1)}s @ ${audioReport.sampleRate}Hz | verdict: ${audioReport.verdict.toUpperCase()}`,
    `Level: ${audioReport.mono.dbfs.toFixed(1)}dBFS RMS, peak ${audioReport.mono.peak.toFixed(3)}, silence ${(audioReport.mono.silenceRatio * 100).toFixed(1)}%, clipped ${(audioReport.mono.clippedRatio * 100).toFixed(2)}%`,
  ];
  if (audioReport.mode === 'stereo' && audioReport.stereoDiff) {
    const d = audioReport.stereoDiff;
    lines.push(`Stereo L/R: imbalance ${d.levelImbalanceDb.toFixed(1)}dB, correlation ${d.correlation.toFixed(2)}, meanAbsDiff ${d.meanAbsDiff.toFixed(4)}`);
  }
  for (const f of audioReport.findings.slice(0, 6)) lines.push(`- [${f.severity.toUpperCase()}] ${f.code}: ${f.message}`);
  if (transcript) lines.push(`Transcript (STT): "${String(transcript).slice(0, 300)}"`);
  lines.push('If verdict is fail/warn, set bug_report.has_bug=true with severity high/medium and name the audio code.');
  return lines.join('\n');
}

// ─── test helpers (synthetic PCM, no files needed) ───────────────────

function synthSine({ seconds = 1, freq = 440, sampleRate = 44100, gain = 0.5, stereo = false, rightGain = null, phaseInvertR = false } = {}) {
  const n = Math.floor(seconds * sampleRate);
  const left = new Float32Array(n);
  for (let i = 0; i < n; i++) left[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate) * gain;
  if (!stereo) return { mono: left, sampleRate };
  const right = new Float32Array(n);
  const rg = rightGain == null ? gain : rightGain;
  for (let i = 0; i < n; i++) {
    const v = Math.sin((2 * Math.PI * freq * i) / sampleRate) * rg;
    right[i] = phaseInvertR ? -v : v;
  }
  return { left, right, sampleRate, mode: 'stereo' };
}

function synthSilence({ seconds = 1, sampleRate = 44100, stereo = false } = {}) {
  const n = Math.floor(seconds * sampleRate);
  if (!stereo) return { mono: new Float32Array(n), sampleRate };
  return { left: new Float32Array(n), right: new Float32Array(n), sampleRate, mode: 'stereo' };
}

module.exports = {
  CHANNEL_MODES,
  analyzeAudio,
  compareTranscript,
  buildAudioQABlock,
  downmixToMono,
  channelStats,
  stereoDiff,
  synthSine,
  synthSilence,
};
