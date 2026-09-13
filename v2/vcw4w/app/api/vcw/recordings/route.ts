import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/csrf";
import { clientIp } from "@/lib/validate";
import { resolveVcwCaller, vcwReadScope, vcwWriteScope } from "@/lib/vcw-gateway-auth";
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
 * Capture pipeline modelled on the debug-play route: accepts `{ events,
 * frames }`, runs them through the bounded input buffer plus the capped-fps
 * / frame-hash dedupe sampler, and returns `{ sessionId, eventCount, ...
 * }`. Raw frame bytes are never retained (hashes + sizes only) and the
 * session ledger below is an in-memory, per-instance window.
 *
 * Auth: vcw write scope (session, bot key, or `vcw_live_` gateway key;
 * same-origin gated for cookie sessions). Every ingest meters one
 * `action-step` (vcw source) before packaging; insufficient balance fails
 * closed with 402. Per-IP throttle is kept alongside the per-caller
 * throttle.
 *
 * Body: {
 *   gameSlug?: string,
 *   events?: Array<{ t: number, kind: "key"|"pointer"|"wheel"|"gamepad"|"touch", code: string, x?: number, y?: number, pressed?: boolean }>,
 *   frames?: Array<{ t: number, data: string (data-URL or base64), hash?: string }>
 * }
 */

interface SessionLedgerEntry {
  sessionId: string;
  userId: string;
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
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const caller = await resolveVcwCaller(req);
  if (!caller) return fail("Authentication required.", 401);
  if (!vcwWriteScope(caller)) return fail("Write scope required.", 403);
  if (caller.mode === "session" && !sameOrigin(req)) return fail("Invalid request origin.", 403);
  // Per-IP throttle (kept) plus a per-caller throttle.
  const rl = rateLimit(`vcw:recordings:ingest:${clientIp(req)}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const callerRl = rateLimit(`vcw:recordings:ingest:caller:${caller.keyId ?? caller.userId}`, 20, 60_000);
  if (!callerRl.allowed) return fail("Rate limited.", 429);
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
  // Meter one action-step before packaging — uncharged ingests must never
  // exist. Session callers meter via meter_vcw_usage() (auth.uid); key
  // callers (bot/gateway, no session) meter via meter_vcw_usage_for(p_user,
  // ...) through service_role. Insufficient funds fails closed with 402;
  // every other meter fault fails closed too.
  try {
    if (caller.mode === "session") {
      const meterClient = await createClient();
      const { error: meterError } = await meterClient.rpc("meter_vcw_usage", {
        p_op: "action-step",
        p_qty: 1,
        p_run: null,
        p_source: "vcw",
      });
      if (meterError) {
        const message = String(
          (meterError as { message?: unknown } | null)?.message ?? meterError ?? "",
        );
        if (/insufficient|balance|funds/i.test(message)) {
          return fail("Insufficient Vibe Coin balance.", 402);
        }
        return dbFail("vcw/recordings meter", meterError, "Unable to meter the ingest.");
      }
    } else {
      const db = serviceClient();
      const { error: meterError } = await db.rpc("meter_vcw_usage_for", {
        p_user: caller.userId,
        p_op: "action-step",
        p_qty: 1,
        p_run: null,
        p_source: "vcw",
      });
      if (meterError) {
        const message = String(
          (meterError as { message?: unknown } | null)?.message ?? meterError ?? "",
        );
        if (/insufficient|balance|funds/i.test(message)) {
          return fail("Insufficient Vibe Coin balance.", 402);
        }
        return dbFail("vcw/recordings meter", meterError, "Unable to meter the ingest.");
      }
    }
  } catch (error) {
    return dbFail("vcw/recordings meter", error, "Unable to meter the ingest.");
  }
  const recorder = createRecorder();
  for (const event of events) recordInputEvent(recorder, event);
  for (const frame of frames) sampleFrame(recorder, frame);
  const { session, jsonl } = packageSession(recorder, { gameSlug });

  LEDGER.push({
    sessionId: session.id,
    userId: caller.userId,
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
 * Ephemeral foundation (per-instance window, metadata only), scoped per
 * caller: authenticated callers see ONLY their own user_id rows, so no
 * cross-user ledger leak is possible. Anonymous callers get 401. Durable
 * persistence rides a future QUEUE item.
 */
export async function GET(req: Request) {
  const caller = await resolveVcwCaller(req);
  if (!caller) return fail("Authentication required.", 401);
  if (!vcwReadScope(caller)) return fail("Read scope required.", 403);
  const rl = rateLimit(`vcw:recordings:list:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const callerRl = rateLimit(`vcw:recordings:list:caller:${caller.keyId ?? caller.userId}`, 60, 60_000);
  if (!callerRl.allowed) return fail("Rate limited.", 429);
  const mine = [...LEDGER].reverse().filter((entry) => entry.userId === caller.userId);
  return ok({
    sessions: mine,
    ephemeral: true,
  });
}
