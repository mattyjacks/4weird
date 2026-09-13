/* ==========================================================================
   4WEIRD VIBECODEWORKER // CORE STATE, AUDIO SYNTH & SHARED UTILS
   ========================================================================== */

export const state = {
  isRunning: false,
  isPaused: false,
  gameLoaded: false,
  maxSteps: 100,
  currentStep: 0,
  intervalMs: 1200,
  elapsedSeconds: 0,
  apm: 0,
  bugs: [],
  logs: [],
  fpsHistory: Array(15).fill(60),
  heapHistory: Array(15).fill(40),
  loopTimer: null,
  metricsTimer: null,
  audioEnabled: true,
  actionCount: 0,
  tokenCount: 14820,
  currentModel: 'GPT-5.6 Luna (OpenAI - DEFAULT)',
  heatmapEnabled: true,
  heatmapPoints: [],
  visionFramesAnalyzed: 0,
  visionAnomaliesCount: 0,
  visionLatencyMs: 12,
  activeSubagentModalId: null,
  subagents: [
    { id: 1, name: '👁️ GPT-5.6 Vision Analyst', role: 'Visual Glitch Detector', status: 'active', desc: 'Frame Capture & Anomaly Detection', targetPrompt: 'Monitor frame buffer and pixel alignment anomalies', progress: 55, logs: [] },
    { id: 2, name: '🏗️ Codebase Repair Architect', role: 'AST Code Inspector', status: 'active', desc: 'Git Diff Patch Generator', targetPrompt: 'Synthesize self-healing git patch blocks for exceptions', progress: 40, logs: [] },
    { id: 3, name: '⚡ Boundary Stress Fuzzer', role: 'DOM Fuzzer', status: 'active', desc: 'Event Injection & Input Fuzzing', targetPrompt: 'Dispatch high-frequency pointer down/up events across boundaries', progress: 75, logs: [] },
    { id: 4, name: '📈 Heap & Frame Auditor', role: 'Memory Auditor', status: 'active', desc: 'Memory Leak & FPS Monitor', targetPrompt: 'Monitor GC cycles and main thread frame stutter spikes', progress: 30, logs: [] }
  ],
  patches: [],
  replaySnapshots: [],
  replayIndex: 0,
  isReplayLive: true,
  isReplayPlaying: false,
  replayPlayTimer: null,
  activeStageTab: 'viewport',
  leftSidebarCollapsed: false,
  rightSidebarCollapsed: false,
  isSimpleMode: true,
  currentView: 'hub', // 'hub' or 'editor'
  internalGameBrain: {
    gameStage: 'MENU',
    detectedControls: ['Space (Jump)', 'Arrow Keys / WASD (Move)', 'Pointer Clicks (Interact)'],
    targetObjectives: ['Auto-Navigate Menu', 'Fuzz Inputs & Boundaries', 'Auto-Restart on Game Over'],
    highScorePolicy: 'MAXIMIZE_SCORE',
    playstyleStrategy: 'BALANCED_EXPLORATION',
    discoveredButtons: { start: [], restart: [] },
    score: 0,
    highScore: 0,
    actionsSucceeded: 0,
    defectsFound: 0
  },
  rso: {
    generation: 1,
    reward: 0.0,
    actionsSucceeded: 0,
    policy: 'BALANCED_EXPLORATION',
    intervalMs: 1200,
    fuzzWeights: { keys: 0.40, click: 0.40, wait: 0.20 }
  },
  gpuSettings: {
    endpoint: 'http://localhost:11434',
    model: 'llama3:8b',
    vramAllocatedGB: 6.4,
    vramTotalGB: 12.0,
    offloadStatus: '33/33 Layers (GPU Direct)',
    tokensPerSec: 48.2,
    backendMode: 'Ollama REST / Native WebGPU'
  },
  phoneRemote: {
    linkingCode: '',
    linkUrl: '',
    isConnected: true,
    desktopGpuActive: true
  },
  authPassword: null
};

export const el = {};

export function isTauriRuntime() {
  return typeof window !== 'undefined' && (!!window.__TAURI__ || !!window.__TAURI_INTERNALS__);
}

export async function invokeTauriCommand(cmd, args = {}) {
  if (!isTauriRuntime()) return null;
  try {
    if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
      return await window.__TAURI__.core.invoke(cmd, args);
    } else if (window.__TAURI__ && typeof window.__TAURI__.invoke === 'function') {
      return await window.__TAURI__.invoke(cmd, args);
    }
  } catch (err) {
    console.warn('[Tauri IPC Error]', err);
  }
  return null;
}

export const synth = {
  ctx: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  play(freq, type = 'sine', duration = 0.08, volume = 0.05) {
    if (!state.audioEnabled) return;
    try {
      this.init();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Synth audio blocked or failed", e);
    }
  },
  playSuccess() {
    this.play(880, 'sine', 0.1, 0.06);
    setTimeout(() => this.play(1320, 'sine', 0.15, 0.04), 80);
  },
  playFail() {
    this.play(220, 'sawtooth', 0.2, 0.08);
    setTimeout(() => this.play(110, 'sawtooth', 0.25, 0.08), 120);
  },
  playClick() {
    this.play(650, 'triangle', 0.04, 0.06);
  },
  playLog() {
    this.play(1100, 'sine', 0.02, 0.02);
  }
};
