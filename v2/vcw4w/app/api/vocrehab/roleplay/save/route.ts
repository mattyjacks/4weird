import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import {
  vocrehabIsDifficulty,
  vocrehabIsSessionMode,
  vocrehabRoleplayMaxMessageChars,
  type VocrehabRoleplayScenarioId,
} from "@/lib/vocrehab-roleplay";
import { vocrehabIsInterviewJobId } from "@/lib/vocrehab-interview-jobs";
import { vocrehabRedactPii } from "@/lib/vocrehab-privacy";

// Explicit-save endpoint (Wave 2): persists one ephemeral rehearsal as a
// vocrehab_roleplay_sessions row (saved=true) + turns batch. Signed-in only;
// guests get 401 (mirrors documents/route). Text only — any audio-shaped
// payload (base64/blob) is rejected; PII is redacted before insert.
const SCENARIOS: readonly VocrehabRoleplayScenarioId[] = ["prep", "pivot", "disclosure", "job-interview"];
const AUDIO_HINT = /^(data:audio|blob:|.{0,24}base64)/i;

interface SaveTurn {
  role: "user" | "manager" | "feedback";
  text: string;
}

export async function POST(req: Request) {
  const rl = rateLimit(`vocrehab-save:${clientIp(req)}`, 15, 60_000);
  if (!rl.allowed) {
    return fail("Rate limited. Wait a bit and try again.", 429, rateLimitHeaders(rl));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return fail("Sign in to save your rehearsal.", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const { scenario, turns, jobId, difficulty, mode, reportCard } = (body ?? {}) as {
    scenario?: unknown;
    turns?: unknown;
    jobId?: unknown;
    difficulty?: unknown;
    mode?: unknown;
    reportCard?: unknown;
  };

  if (typeof scenario !== "string" || !(SCENARIOS as readonly string[]).includes(scenario)) {
    return fail("scenario must be one of: prep, pivot, disclosure, job-interview.", 400);
  }
  if (!Array.isArray(turns) || turns.length < 1 || turns.length > 18) {
    return fail("turns must be an array of 1..18 {role, text} rows.", 400);
  }
  const clean: SaveTurn[] = [];
  for (const t of turns) {
    const row = t as { role?: unknown; text?: unknown };
    if (row?.role !== "user" && row?.role !== "manager" && row?.role !== "feedback") {
      return fail("each turn role must be user, manager, or feedback.", 400);
    }
    if (typeof row.text !== "string" || row.text.trim().length < 1 || row.text.length > vocrehabRoleplayMaxMessageChars) {
      return fail(`each turn text must be 1..${vocrehabRoleplayMaxMessageChars} characters.`, 400);
    }
    if (AUDIO_HINT.test(row.text.slice(0, 32))) {
      return fail("Audio is never saved. Text transcripts only.", 400);
    }
    clean.push({ role: row.role, text: vocrehabRedactPii(row.text).text });
  }

  const metadata: Record<string, unknown> = {};
  if (vocrehabIsInterviewJobId(jobId)) metadata.jobId = jobId;
  if (vocrehabIsDifficulty(difficulty)) metadata.difficulty = difficulty;
  if (vocrehabIsSessionMode(mode)) metadata.mode = mode;
  if (reportCard && typeof reportCard === "object" && !Array.isArray(reportCard)) {
    metadata.reportCard = reportCard;
  }

  const { data: session, error: sessErr } = await supabase
    .from("vocrehab_roleplay_sessions")
    .insert({ user_id: user.id, scenario, turns: clean.length, saved: true, metadata })
    .select("id")
    .single();
  if (sessErr || !session) {
    return dbFail("vocrehab/roleplay/save", sessErr);
  }
  const { error: turnErr } = await supabase.from("vocrehab_roleplay_turns").insert(
    clean.map((t) => ({ session_id: (session as { id: string }).id, user_id: user.id, role: t.role, text: t.text })),
  );
  if (turnErr) {
    return dbFail("vocrehab/roleplay/save", turnErr);
  }
  return ok({ session_id: (session as { id: string }).id, turns: clean.length });
}
