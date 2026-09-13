import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import {
  DEMO_RECORDER_MAX_FRAME_CHARS,
  DEMO_RECORDER_MAX_INGEST_EVENTS,
  DEMO_RECORDER_MAX_INGEST_FRAMES,
  createRecorder,
  normalizeGameSlug,
  packageSession,
  recordInputEvent,
  sampleFrame,
} from "@/lib/vcw-demo-recorder";


/**
 * POST /api/vcw/recordings — DemoRecorder session ingest (Remastery Feature 05).
 *
 * Stateless capture-pipeline foundation, modelled on the debug-play route:
 * accepts `{ events, frames }`, runs them through the bounded input buffer
 * plus the capped-fps / frame-hash dedupe sampler, and returns
 * `{ sessionId, eventCount, ... }`. No auth, no DB writes, no metering in
 * this slice — raw frame bytes are never retained (hashes + sizes only) and
 * the session ledger below is an in-memory, per-instance window.
 * Auth/metering/persistence wiring is a steward QUEUE item.
 *
 * Body: {
 *   gameSlug?: string,
 *   events?: Array<{ t: number, kind: "key"|"pointer"|"wheel"|"gamepad"|"touch", code: string, x?: number, y?: number, pressed?: boolean }>,
 *   frames?: Array<{ t: number, data: string (data-URL or base64), hash?: string }>
 * }
 */

interface SessionLedgerEntry {
  sessionId: string;
  gameSlug: string;
  eventCount: number;
  frameCount: number;
  duplicateFramesDropped: number;
  droppedInputs: number;
  jsonlRows: number;
  receivedAt: string;
}

/** Ephemeral per-instance window (cap 50, metadata only — no payloads). */
const LEDGER: SessionLedgerEntry[] = [];
const LEDGER_CAP = 50;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;

  const events = Array.isArray(input.events) ? input.events : null;
  const frames = Array.isArray(input.frames) ? input.frames : [];
  if (!events) {
    return fail("An events array is required (may be empty).", 400);
  }
  if (events.length > DEMO_RECORDER_MAX_INGEST_EVENTS) {
    return fail(
      `Too many events (${events.length}; max ${DEMO_RECORDER_MAX_INGEST_EVENTS}).`,
      413,
    );
  }
  if (frames.length > DEMO_RECORDER_MAX_INGEST_FRAMES) {
    return fail(
      `Too many frames (${frames.length}; max ${DEMO_RECORDER_MAX_INGEST_FRAMES}).`,
      413,
    );
  }
  for (const frame of frames) {
    const data =
      frame && typeof frame === "object"
        ? (frame as Record<string, unknown>).data
        : null;
    if (typeof data === "string" && data.length > DEMO_RECORDER_MAX_FRAME_CHARS) {
      return fail("Frame too large. Sample at a lower fps or resolution.", 413);
    }
  }

  const gameSlug = normalizeGameSlug(input.gameSlug);
  const recorder = createRecorder();
  for (const event of events) recordInputEvent(recorder, event);
  for (const frame of frames) sampleFrame(recorder, frame);
  const { session, jsonl } = packageSession(recorder, { gameSlug });

  LEDGER.push({
    sessionId: session.id,
    gameSlug: session.gameSlug,
    eventCount: session.events.length,
    frameCount: session.frames.length,
    duplicateFramesDropped: session.duplicateFramesDropped,
    droppedInputs: session.droppedInputs,
    jsonlRows: jsonl ? jsonl.split("\n").length : 0,
    receivedAt: new Date().toISOString(),
  });
  if (LEDGER.length > LEDGER_CAP) {
    LEDGER.splice(0, LEDGER.length - LEDGER_CAP);
  }

  return ok({
    sessionId: session.id,
    eventCount: session.events.length,
    frameCount: session.frames.length,
    duplicateFramesDropped: session.duplicateFramesDropped,
    droppedInputs: session.droppedInputs,
  });
}

/**
 * GET /api/vcw/recordings — list recently ingested session metadata.
 * Ephemeral foundation (per-instance window, metadata only); durable
 * persistence + per-user scoping ride the same QUEUE item as POST auth.
 */
export async function GET(req: Request) {
  const rl = rateLimit(`vcw:recordings:list:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  return ok({
    sessions: [...LEDGER].reverse(),
    ephemeral: true,
  });
}
