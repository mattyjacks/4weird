import { fail, ok } from "@/lib/api-respond";
import { botRateLimit } from "@/lib/bot-auth";
import { sameOriginOrBotKey } from "@/lib/csrf-bot";
import {
  canonicalizeSfx,
  canonicalizeSong,
  CONTRACT,
  getCatalog,
  sfxShareUrl,
  sizeOf,
  songShareUrl,
  validateSfx,
  validateSong,
} from "./_lib";

// GET /api/music — public 4W-1 seed registry (no DB).
// Serves content/music sidecars + SFX via getCatalog(); fail-open to
// empty lists when seed sources are absent mid-flight. Throttled bot
// read, no credential (same as the /music library pages).
//   curl https://4weird.com/api/music
export async function GET(req: Request) {
  try {
    const throttle = botRateLimit(req, "read");
    if (!throttle.allowed) {
      return fail("Rate limited. Try again shortly.", 429, {
        "Retry-After": String(throttle.retryAfter),
      });
    }
    const { songs, sfx, source } = await getCatalog();
    return ok({ songs, sfx, contract: CONTRACT, source });
  } catch {
    return fail("Invalid music request.", 400);
  }
}

const POST_MAX_BYTES = 32 * 1024;

// POST /api/music — validate + canonicalize + shareUrl (4W-1).
// Accepts { song?, sfx? } (exactly one). 400s with per-problem
// diagnostics, never 500s. Auth follows the established bot pattern:
// browsers prove same-origin, bots prove a VALID `bot4weird_` key.
export async function POST(req: Request) {
  try {
    if (!(await sameOriginOrBotKey(req))) {
      return fail(
        "POST /api/music needs a bot credential (x-bot-key header or Bearer token) or a same-origin browser fetch.",
        403,
      );
    }
    const throttle = botRateLimit(req, "write");
    if (!throttle.allowed) {
      return fail("Rate limited. Try again shortly.", 429, {
        "Retry-After": String(throttle.retryAfter),
      });
    }
    let raw: string;
    try {
      raw = await req.text();
    } catch {
      return fail("Invalid music request.", 400);
    }
    if (raw.length > POST_MAX_BYTES) {
      return fail("Request is too large.", 413);
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return fail("Invalid JSON body.", 400);
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return fail("Body must be an object {song?, sfx?}.", 400);
    }
    const rec = body as Record<string, unknown>;
    const hasSong = rec.song !== undefined;
    const hasSfx = rec.sfx !== undefined;
    if (!hasSong && !hasSfx) {
      return fail("One of 'song' or 'sfx' is required.", 400);
    }
    if (hasSong && hasSfx) {
      return fail("Exactly one of 'song' or 'sfx'.", 400);
    }
    if (hasSong) {
      let check: { ok: boolean; song: unknown; diagnostics: string[] };
      try {
        check = validateSong(rec.song);
      } catch {
        return fail("Song validation failed.", 400);
      }
      if (!check.ok || !check.song) {
        return fail(check.diagnostics.join("; ") || "Invalid song.", 400);
      }
      const canonical = canonicalizeSong(
        check.song as Parameters<typeof canonicalizeSong>[0],
      );
      return ok({
        ok: true,
        kind: "song",
        bytes: sizeOf(canonical),
        data: canonical,
        shareUrl: songShareUrl(canonical),
      });
    }
    let check: { ok: boolean; sfx: unknown; diagnostics: string[] };
    try {
      check = validateSfx(rec.sfx);
    } catch {
      return fail("Sfx validation failed.", 400);
    }
    if (!check.ok || !check.sfx) {
      return fail(check.diagnostics.join("; ") || "Invalid sfx.", 400);
    }
    const canonical = canonicalizeSfx(
      check.sfx as Parameters<typeof canonicalizeSfx>[0],
    );
    return ok({
      ok: true,
      kind: "sfx",
      bytes: sizeOf(canonical),
      data: canonical,
      shareUrl: sfxShareUrl(canonical),
    });
  } catch {
    return fail("Invalid music request.", 400);
  }
}
