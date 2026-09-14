import { NextResponse } from "next/server";
import { fail } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  canonicalizeSfx,
  canonicalizeSong,
  clientIp,
  sfxShareUrl,
  sizeOf,
  songShareUrl,
  validateSfx,
  validateSong,
  type Sfx4W,
  type Song4W,
} from "../_lib";

/** Max request JSON size: 32 KB (songs cap at 8 KB, SFX at 1 KB). */
const MAX_BODY_BYTES = 32 * 1024;

type Preview =
  | { title: string; bpm: number; tracks: number }
  | { title: string; kind: string; steps: number };

function rejected(errors: string[], status = 400) {
  return NextResponse.json(
    { ok: false, errors },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

function accepted(
  bytes: number,
  voices: number,
  preview: Preview,
  shareUrl: string,
  data: Song4W | Sfx4W,
) {
  return NextResponse.json(
    { ok: true, bytes, voices, preview, shareUrl, data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

/**
 * POST /api/music/submit — stateless 4W-1 dry-run validator for bots.
 * Accepts { song?, sfx? } (exactly one), validates with the shared
 * app/api/music/_lib guards (fail-closed: bad version/kinds/ranges/
 * counts/byte budgets/teen-clean titles rejected with per-problem
 * diagnostics), canonicalizes, and returns
 * { ok, bytes, voices, preview, shareUrl, data }.
 * 400s (413 for oversize, 429 for rate limit), never 500s.
 * No auth, no DB writes, no persistence.
 */
export async function POST(req: Request) {
  try {
    const rl = rateLimit("music-submit:" + clientIp(req), 30);
    if (!rl.allowed) {
      return fail("Rate limited. Try again shortly.", 429, rateLimitHeaders(rl));
    }
    let raw: string;
    try {
      raw = await req.text();
    } catch {
      return rejected(["submit: unreadable request body"]);
    }
    if (raw.length > MAX_BODY_BYTES) {
      return rejected(
        [`submit: body exceeds ${MAX_BODY_BYTES} bytes (got ${raw.length})`],
        413,
      );
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return rejected(["submit: invalid JSON"]);
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return rejected(["submit: body must be an object {song?, sfx?}"]);
    }
    const rec = body as Record<string, unknown>;
    const hasSong = rec.song !== undefined;
    const hasSfx = rec.sfx !== undefined;
    if (!hasSong && !hasSfx) {
      return rejected(["submit: one of 'song' or 'sfx' is required"]);
    }
    if (hasSong && hasSfx) {
      return rejected(["submit: exactly one of 'song' or 'sfx'"]);
    }

    if (hasSong) {
      let check: { ok: boolean; song: Song4W | null; diagnostics: string[] };
      try {
        check = validateSong(rec.song);
      } catch {
        return rejected(["submit: song validation failed"]);
      }
      if (!check.ok || !check.song) {
        return rejected(check.diagnostics);
      }
      const canonical = canonicalizeSong(check.song);
      const bytes = sizeOf(canonical);
      const voices = canonical.tracks.filter(
        (t) => Array.isArray(t.notes) && t.notes.length > 0,
      ).length;
      return accepted(
        bytes,
        voices,
        { title: canonical.title, bpm: canonical.bpm, tracks: canonical.tracks.length },
        songShareUrl(canonical),
        canonical,
      );
    }

    let check: { ok: boolean; sfx: Sfx4W | null; diagnostics: string[] };
    try {
      check = validateSfx(rec.sfx);
    } catch {
      return rejected(["submit: sfx validation failed"]);
    }
    if (!check.ok || !check.sfx) {
      return rejected(check.diagnostics);
    }
    const canonical = canonicalizeSfx(check.sfx);
    const bytes = sizeOf(canonical);
    return accepted(
      bytes,
      canonical.steps.length,
      { title: canonical.name, kind: canonical.kind, steps: canonical.steps.length },
      sfxShareUrl(canonical),
      canonical,
    );
  } catch {
    return rejected(["submit: invalid request"], 400);
  }
}
