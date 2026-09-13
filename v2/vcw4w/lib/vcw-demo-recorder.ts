/**
 * VibeCodeWorker DemoRecorder capture pipeline (Remastery Feature 05, Wave 3 vcw slice).
 *
 * NEW-file slice: recording-session types, input-event capture buffer
 * (bounded ring), canvas-frame sampler at a capped fps, consecutive
 * frame-hash dedupe, and a session packager emitting AI-training JSONL
 * rows (one row per input event joined with the latest frame hash at
 * event time).
 *
 * Pure logic only, mirroring the `vcw-debug-play.ts` fail-open pattern:
 * invalid entries are dropped (counted), never thrown. Routes own auth,
 * rate limits, metering, and persistence — no server dependency lives
 * here, no secrets, nothing logged.
 */

export const DEMO_RECORDER_MAX_FPS = 5;

export const DEMO_RECORDER_MAX_EVENTS = 10_000;

export const DEMO_RECORDER_MAX_FRAMES = 1_200;

/** Maximum accepted chars for one normalized input code. */
export const DEMO_RECORDER_MAX_CODE_CHARS = 128;

/** Maximum accepted chars for one raw frame payload (data-URL or base64). */
export const DEMO_RECORDER_MAX_FRAME_CHARS = 2_000_000;

/** Maximum accepted events in a single ingest payload. */
export const DEMO_RECORDER_MAX_INGEST_EVENTS = 10_000;

/** Maximum accepted frames in a single ingest payload. */
export const DEMO_RECORDER_MAX_INGEST_FRAMES = 1_200;

export type DemoInputKind = "key" | "pointer" | "wheel" | "gamepad" | "touch";

export interface DemoInputEvent {
  /** Milliseconds since session start. */
  t: number;
  kind: DemoInputKind;
  /** Normalized code: key ("arrow_right", "space"), pointer button, axis id. */
  code: string;
  x?: number;
  y?: number;
  pressed?: boolean;
}

export interface DemoFrameSample {
  /** Milliseconds since session start. */
  t: number;
  /** FNV-1a hex of the normalized frame bytes; dedupe key. */
  hash: string;
  /** Normalized payload length in chars (bytes are not retained). */
  chars: number;
}

export interface DemoSession {
  id: string;
  gameSlug: string;
  events: DemoInputEvent[];
  frames: DemoFrameSample[];
  droppedInputs: number;
  duplicateFramesDropped: number;
}

/** One AI-training row: an input joined with the latest frame at event time. */
export interface DemoDatasetRow {
  sessionId: string;
  gameSlug: string;
  t: number;
  input: string;
  frameHash: string | null;
}

export interface RecorderState {
  events: DemoInputEvent[];
  frames: DemoFrameSample[];
  lastFrameT: number | null;
  lastHash: string | null;
  droppedInputs: number;
  duplicateFramesDropped: number;
  maxEvents: number;
  maxFrames: number;
  minFrameIntervalMs: number;
}

/**
 * Deterministic FNV-1a (32-bit) hex digest over a string. Dependency-free
 * so the buffer works in browser capture code and in route runtimes alike.
 */
export function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (`0000000${(hash >>> 0).toString(16)}`).slice(-8);
}

/** Strip a `data:...;base64,` prefix; pass through raw payloads. */
export function stripFramePrefix(frame: string): string {
  const at = frame.indexOf("base64,");
  return at >= 0 ? frame.slice(at + "base64,".length) : frame;
}

/** Normalize a game slug; fail-open to `"unknown-game"`. */
export function normalizeGameSlug(slug: unknown): string {
  const raw = typeof slug === "string" ? slug.trim().toLowerCase() : "";
  return /^[a-z0-9-]{1,64}$/.test(raw) ? raw : "unknown-game";
}

function makeSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `dr-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
  }
}

/** Fresh recorder state (bounded ring buffer + capped frame sampler). */
export function createRecorder(opts?: {
  maxEvents?: number;
  maxFrames?: number;
  maxFps?: number;
}): RecorderState {
  const maxEvents =
    typeof opts?.maxEvents === "number" &&
    Number.isFinite(opts.maxEvents) &&
    opts.maxEvents > 0
      ? Math.min(Math.floor(opts.maxEvents), DEMO_RECORDER_MAX_EVENTS)
      : DEMO_RECORDER_MAX_EVENTS;
  const maxFrames =
    typeof opts?.maxFrames === "number" &&
    Number.isFinite(opts.maxFrames) &&
    opts.maxFrames > 0
      ? Math.min(Math.floor(opts.maxFrames), DEMO_RECORDER_MAX_FRAMES)
      : DEMO_RECORDER_MAX_FRAMES;
  const fps =
    typeof opts?.maxFps === "number" &&
    Number.isFinite(opts.maxFps) &&
    opts.maxFps > 0
      ? Math.min(opts.maxFps, 60)
      : DEMO_RECORDER_MAX_FPS;
  return {
    events: [],
    frames: [],
    lastFrameT: null,
    lastHash: null,
    droppedInputs: 0,
    duplicateFramesDropped: 0,
    maxEvents,
    maxFrames,
    minFrameIntervalMs: Math.floor(1000 / fps),
  };
}

const INPUT_KINDS: readonly DemoInputKind[] = [
  "key",
  "pointer",
  "wheel",
  "gamepad",
  "touch",
];

function normalizeInputEvent(raw: unknown): DemoInputEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const t = typeof e.t === "number" && Number.isFinite(e.t) ? Math.max(0, e.t) : null;
  const kind =
    typeof e.kind === "string" &&
    (INPUT_KINDS as readonly string[]).includes(e.kind)
      ? (e.kind as DemoInputKind)
      : null;
  const code =
    typeof e.code === "string" && e.code.trim()
      ? e.code.trim().slice(0, DEMO_RECORDER_MAX_CODE_CHARS)
      : null;
  if (t === null || kind === null || code === null) return null;
  const out: DemoInputEvent = { t, kind, code };
  if (typeof e.x === "number" && Number.isFinite(e.x)) out.x = e.x;
  if (typeof e.y === "number" && Number.isFinite(e.y)) out.y = e.y;
  if (typeof e.pressed === "boolean") out.pressed = e.pressed;
  return out;
}

/**
 * Capture one input event into the ring buffer. Fail-open: invalid entries
 * are counted in `droppedInputs` and return `{ accepted: false }`, never throw.
 * When the buffer is full the oldest event is evicted (ring semantics).
 */
export function recordInputEvent(
  state: RecorderState,
  raw: unknown,
): { accepted: boolean } {
  try {
    const event = normalizeInputEvent(raw);
    if (!event) {
      state.droppedInputs += 1;
      return { accepted: false };
    }
    state.events.push(event);
    if (state.events.length > state.maxEvents) {
      state.events.splice(0, state.events.length - state.maxEvents);
    }
    return { accepted: true };
  } catch {
    state.droppedInputs += 1;
    return { accepted: false };
  }
}

export interface FrameSampleResult {
  accepted: boolean;
  duplicate: boolean;
  reason: string;
}

/**
 * Sample one canvas frame at the capped fps with consecutive-hash dedupe.
 * Fail-open: oversized/invalid payloads, over-fps samples, and unchanged
 * frames return `{ accepted: false, reason }` (duplicates counted in
 * `duplicateFramesDropped`); never throws. Only the hash + size are
 * retained — raw pixels never accumulate in the buffer.
 */
export function sampleFrame(
  state: RecorderState,
  raw: unknown,
): FrameSampleResult {
  try {
    if (!raw || typeof raw !== "object") {
      return { accepted: false, duplicate: false, reason: "invalid-frame" };
    }
    const f = raw as Record<string, unknown>;
    const t =
      typeof f.t === "number" && Number.isFinite(f.t) ? Math.max(0, f.t) : null;
    const data = typeof f.data === "string" ? f.data : null;
    if (t === null || data === null || data.length === 0) {
      return { accepted: false, duplicate: false, reason: "invalid-frame" };
    }
    if (data.length > DEMO_RECORDER_MAX_FRAME_CHARS) {
      return { accepted: false, duplicate: false, reason: "frame-too-large" };
    }
    if (
      state.lastFrameT !== null &&
      t - state.lastFrameT < state.minFrameIntervalMs
    ) {
      return { accepted: false, duplicate: false, reason: "over-fps-cap" };
    }
    const hash = typeof f.hash === "string" && f.hash ? f.hash.slice(0, 64) : fnv1aHex(stripFramePrefix(data));
    if (state.lastHash !== null && hash === state.lastHash) {
      state.duplicateFramesDropped += 1;
      return { accepted: true, duplicate: true, reason: "duplicate-frame" };
    }
    state.frames.push({ t, hash, chars: stripFramePrefix(data).length });
    if (state.frames.length > state.maxFrames) {
      state.frames.splice(0, state.frames.length - state.maxFrames);
    }
    state.lastFrameT = t;
    state.lastHash = hash;
    return { accepted: true, duplicate: false, reason: "sampled" };
  } catch {
    return { accepted: false, duplicate: false, reason: "invalid-frame" };
  }
}

export interface IngestResult {
  session: DemoSession;
  /** AI-training JSONL: one row per input event. */
  jsonl: string;
}

/**
 * Package the buffered session into `{ session, jsonl }`. Each input event
 * joins with the latest sampled frame hash at or before the event time
 * (`frameHash: null` when no frame precedes the event). Fail-open: always
 * returns a well-formed result, even for an empty buffer.
 */
export function packageSession(
  state: RecorderState,
  meta?: { sessionId?: unknown; gameSlug?: unknown },
): IngestResult {
  try {
    const sessionId =
      typeof meta?.sessionId === "string" && meta.sessionId
        ? meta.sessionId.slice(0, 64)
        : makeSessionId();
    const gameSlug = normalizeGameSlug(meta?.gameSlug);
    const rows: DemoDatasetRow[] = [];
    let frameIdx = -1;
    for (const event of state.events) {
      while (
        frameIdx + 1 < state.frames.length &&
        state.frames[frameIdx + 1].t <= event.t
      ) {
        frameIdx += 1;
      }
      rows.push({
        sessionId,
        gameSlug,
        t: event.t,
        input: event.kind === "key" ? event.code : `${event.kind}:${event.code}`,
        frameHash: frameIdx >= 0 ? state.frames[frameIdx].hash : null,
      });
    }
    const session: DemoSession = {
      id: sessionId,
      gameSlug,
      events: [...state.events],
      frames: [...state.frames],
      droppedInputs: state.droppedInputs,
      duplicateFramesDropped: state.duplicateFramesDropped,
    };
    const jsonl = rows.map((row) => JSON.stringify(row)).join("\n");
    return { session, jsonl };
  } catch {
    const fallbackId = makeSessionId();
    const fallback: DemoSession = {
      id: fallbackId,
      gameSlug: "unknown-game",
      events: [],
      frames: [],
      droppedInputs: state.droppedInputs,
      duplicateFramesDropped: state.duplicateFramesDropped,
    };
    return { session: fallback, jsonl: "" };
  }
}
