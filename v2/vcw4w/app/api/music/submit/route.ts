import { NextResponse } from "next/server";
import {
  sfxByteSize,
  songByteSize,
  validateSfx,
  validateSong,
  type Sfx4W,
  type Song4W,
} from "@/lib/music/format-4w";

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

function accepted(bytes: number, voices: number, preview: Preview) {
  return NextResponse.json(
    { ok: true, bytes, voices, preview },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

/**
 * POST /api/music/submit — stateless 4W-1 dry-run validator for bots.
 * Accepts { song?, sfx? } (exactly one), validates with the landed
 * lib/music/format-4w guards (fail-closed: bad version/kinds/ranges/counts/
 * byte budgets rejected with per-problem diagnostics), and returns
 * { ok, bytes, voices, preview }.
 *
 * Foundation only (DS-REM-05 precedent): no auth, no DB writes, no
 * persistence. Auth/persistence arrive via a later request.
 */
export async function POST(req: Request) {
  try {
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
      let check: { ok: boolean; errors: string[] };
      try {
        check = validateSong(rec.song);
      } catch {
        return rejected(["submit: song validation failed"]);
      }
      if (!check.ok) return rejected(check.errors);
      const song = rec.song as Song4W;
      const bytes = songByteSize(song);
      const voices = song.tracks.filter(
        (t) => Array.isArray(t.notes) && t.notes.length > 0,
      ).length;
      return accepted(bytes, voices, {
        title: song.title,
        bpm: song.bpm,
        tracks: song.tracks.length,
      });
    }

    let check: { ok: boolean; errors: string[] };
    try {
      check = validateSfx(rec.sfx);
    } catch {
      return rejected(["submit: sfx validation failed"]);
    }
    if (!check.ok) return rejected(check.errors);
    const sfx = rec.sfx as Sfx4W;
    const bytes = sfxByteSize(sfx);
    return accepted(bytes, sfx.steps.length, {
      title: sfx.name,
      kind: sfx.kind,
      steps: sfx.steps.length,
    });
  } catch {
    return rejected(["submit: internal error"], 500);
  }
}
