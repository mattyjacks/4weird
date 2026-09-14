import { fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  BPM_MAX,
  BPM_MIN,
  encodeWav,
  INSTRUMENT_IDS,
  isInstrumentId,
  MAX_NOTES,
  MAX_SECONDS,
  renderInstrument,
  TAIL_SECONDS,
  type InstrumentId,
  type RenderNote,
} from "./render";

// POST /api/music/render — public WAV render for bots + humans.
// Body: { instrument: one of 20 ids, notes: [{midi,t,d,v?} <=64], bpm? }
// Success: { success:true, instrument, wavBase64, sampleRate, seconds }.
// Fail-closed: every invalid shape is a 400 {success:false,error}.
// No auth (public render like list). IP rate-limited. Never logs bodies.

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const first = fwd.split(",")[0]?.trim() ?? "";
  const direct = req.headers.get("x-real-ip")?.trim() ?? "";
  const ip = first || direct || "anon";
  return ip.slice(0, 64).toLowerCase();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseNote(raw: unknown, path: string): { note: RenderNote | null; error: string | null } {
  if (!isRecord(raw)) return { note: null, error: path + ": note must be an object" };
  const { midi, t, d, v } = raw;
  if (typeof midi !== "number" || !Number.isInteger(midi) || midi < 0 || midi > 127) {
    return { note: null, error: path + ".midi: must be an integer 0..127" };
  }
  if (typeof t !== "number" || !Number.isFinite(t) || t < 0 || t > 100000) {
    return { note: null, error: path + ".t: must be a finite number >= 0 (start beats)" };
  }
  if (typeof d !== "number" || !Number.isFinite(d) || d <= 0 || d > 100000) {
    return { note: null, error: path + ".d: must be a finite number > 0 (len beats)" };
  }
  if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1)) {
    return { note: null, error: path + ".v: must be 0..1 when present" };
  }
  const note: RenderNote = { midi, t, d };
  if (v !== undefined) note.v = v;
  return { note, error: null };
}

export async function POST(req: Request) {
  const throttle = rateLimit(`music-render:${clientIp(req)}`, 30, 60_000);
  if (!throttle.allowed) {
    return fail("Rate limited. Try again shortly.", 429, rateLimitHeaders(throttle));
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  if (!isRecord(raw)) return fail("Body must be a JSON object.", 400);

  const instrument: unknown = raw.instrument;
  if (!isInstrumentId(instrument)) {
    return fail("Unknown instrument. Use one of: " + INSTRUMENT_IDS.join("|") + ".", 400);
  }
  const id = instrument as InstrumentId;

  if (!Array.isArray(raw.notes)) return fail("notes must be an array.", 400);
  if (raw.notes.length < 1 || raw.notes.length > MAX_NOTES) {
    return fail("notes must hold 1.." + MAX_NOTES + " notes.", 400);
  }
  const notes: RenderNote[] = [];
  for (let i = 0; i < raw.notes.length; i++) {
    const parsed = parseNote(raw.notes[i], "notes[" + i + "]");
    if (!parsed.note || parsed.error) {
      return fail(parsed.error ?? "Invalid note.", 400);
    }
    notes.push(parsed.note);
  }

  let bpm = 120;
  if (raw.bpm !== undefined) {
    if (typeof raw.bpm !== "number" || !Number.isFinite(raw.bpm) || raw.bpm < BPM_MIN || raw.bpm > BPM_MAX) {
      return fail("bpm must be 40..240.", 400);
    }
    bpm = raw.bpm;
  }

  // Pre-check the 30s render cap before spending CPU.
  let endBeats = 0;
  for (const n of notes) endBeats = Math.max(endBeats, n.t + n.d);
  if (endBeats * (60 / bpm) + TAIL_SECONDS > MAX_SECONDS) {
    return fail("Render exceeds 30s cap. Shorten notes or raise bpm.", 400);
  }

  try {
    const rendered = renderInstrument(id, notes, bpm);
    const wav = encodeWav(rendered.samples, rendered.sampleRate);
    return ok({
      instrument: id,
      wavBase64: wav.toString("base64"),
      sampleRate: rendered.sampleRate,
      seconds: Math.round(rendered.seconds * 100) / 100,
    });
  } catch {
    return fail("Unable to render instrument.", 500);
  }
}

export function GET() {
  return fail("Method not allowed.", 405);
}
