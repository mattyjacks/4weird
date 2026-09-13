import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/api-respond";
import { botRateLimit } from "@/lib/bot-auth";
import { sameOriginOrBotKey } from "@/lib/csrf-bot";
import { exceedsBodyLimit } from "@/lib/validate";
import {
  MUSIC_POST_MAX_BYTES,
  buildMusicRegistry,
  validateAndNormalizeMusic,
} from "@/lib/music-api";

const noStore = { "Cache-Control": "private, no-store" };

// GET /api/music — public `$music:1` seed registry (no DB).
// Throttled as a bot read, but needs no credential: the registry is public
// content, same as the /music library pages. Bots fetch it with plain curl:
//   curl https://4weird.com/api/music
export async function GET(req: Request) {
  const throttle = botRateLimit(req, "read");
  if (!throttle.allowed) {
    return fail("Rate limited. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const registry = buildMusicRegistry();
  return ok({
    format: registry.format,
    songs: registry.songs,
    sfx: registry.sfx,
    contract: registry.contract,
    usage: {
      get: "curl https://4weird.com/api/music",
      post: 'curl -X POST https://4weird.com/api/music -H "x-bot-key: bot4weird_YOURKEY" -H "Content-Type: application/json" -d \'{"format":"$music:1","kind":"sfx","title":"Blip","name":"Blip","wave":"sine","freqStart":880,"freqEnd":440,"dur":0.2}\'',
      docs: 'POST validates $music:1 JSON and returns {ok, kind, bytes, data, embed}. Stateless: nothing is stored (persistence needs the music_submissions table — see QUEUE).',
    },
  });
}

// POST /api/music — validate a `$music:1` song/sfx payload.
// Auth follows the established bot pattern (lib/csrf-bot.ts): browsers prove
// same-origin, bots prove a VALID `bot4weird_` key (x-bot-key header or
// Bearer token) — no new secret scheme is invented here. Stateless: the
// payload is validated and normalized in memory, never written anywhere.
export async function POST(req: Request) {
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
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  if (exceedsBodyLimit(body, MUSIC_POST_MAX_BYTES)) return fail("Request is too large.", 413);
  const result = validateAndNormalizeMusic(body);
  if (!result.ok) {
    // 422 (not fail()) on purpose: fail() truncates to 200 chars, which would
    // eat the per-error diagnostics bots need to fix their payloads.
    return NextResponse.json(
      {
        success: false,
        ok: false,
        kind: result.kind ?? null,
        errors: result.errors,
        bytes: result.bytes,
      },
      { status: 422, headers: noStore },
    );
  }
  return ok({
    ok: true,
    kind: result.kind,
    bytes: result.bytes,
    data: result.data,
    embed: result.embed,
  });
}
