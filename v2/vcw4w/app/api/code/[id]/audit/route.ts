import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";
import { isUuid } from "@/lib/validate";
import { quoteAuditSplit, SUBMIT_CUT_NOTE } from "@/lib/zip-submit";

export const dynamic = "force-dynamic";

/**
 * POST /api/code/[id]/audit { deep? } — coin-metered code audit.
 * Auth: owner session OR bot key with `code:audit`.
 * Static re-audit always runs (stored findings); deep=true adds a
 * Luna/OpenAI review of the stored findings (25% cut INCLUDED) and is
 * metered as audit_deep. Quarantined rows stay quarantined.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid submission.", 400);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let userId = data?.user?.id ?? null;
  let viaBot = false;
  if (!userId) {
    const bot = await resolveBotKey(req).catch(() => null);
    if (!bot) return fail("Login required.", 401);
    if (!keyHasScope(bot, "code:audit")) return fail("Key lacks scope: code:audit.", 403);
    userId = bot.userId;
    viaBot = true;
  }
  const throttle = rateLimit(`code-audit:${userId}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many audits. Try again shortly.", 429);

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const deep = (body as Record<string, unknown>)?.deep === true;
  const quote = quoteAuditSplit(deep);

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Audit unavailable.", 503);
  }
  const { data: sub, error: subErr } = await svc
    .from("code_submissions")
    .select("id,owner_id,title,status,verdict,quarantined,audit_findings,zip_bytes,game_root")
    .eq("id", id)
    .single();
  if (subErr || !sub) return dbFail("api/code/audit", subErr, "Project not found.", 404);
  if ((sub as { owner_id: string }).owner_id !== userId) {
    return fail("Project not found.", 404);
  }

  // Meter first (fail closed).
  if (viaBot) {
    const { error } = await svc.rpc("meter_submission_charge_for", {
      p_user: userId,
      p_submission: id,
      p_kind: deep ? "audit_deep" : "audit",
      p_gross: quote.gross,
      p_cut: quote.cut,
    });
    if (error) return rpcFail("api/code/audit", error, rpcStatus, "Unable to meter this audit.");
  } else {
    const { error } = await supabase.rpc("meter_submission_charge", {
      p_submission: id,
      p_kind: deep ? "audit_deep" : "audit",
      p_gross: quote.gross,
      p_cut: quote.cut,
    });
    if (error) return rpcFail("api/code/audit", error, rpcStatus, "Unable to meter this audit.");
  }

  const findings = ((sub as { audit_findings?: unknown }).audit_findings ?? []) as {
    level: string;
    code: string;
    detail: string;
  }[];
  let aiNote: string | null = null;
  if (deep) {
    const key = process.env.OPENAI_API_KEY ?? "";
    if (!key) {
      aiNote = "Deep review needs OPENAI_API_KEY on the server — static findings returned, deep charge still applies.";
    } else {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15_000);
        try {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
            body: JSON.stringify({
              model: process.env.LUNA_MODEL ?? "gpt-5.6-luna",
              temperature: 0,
              max_tokens: 300,
              messages: [
                {
                  role: "system",
                  content:
                    "You are a game-submission security reviewer. Given static findings codes, reply with 3-6 short remediation bullets. Never reproduce file contents.",
                },
                {
                  role: "user",
                  content: `Title: ${String((sub as { title: string }).title).slice(0, 80)}. Findings: ${JSON.stringify(findings.slice(0, 10)).slice(0, 2000)}`,
                },
              ],
            }),
          });
          if (res.ok) {
            const dj = (await res.json()) as { choices?: { message?: { content?: string } }[] };
            aiNote = String(dj?.choices?.[0]?.message?.content ?? "").slice(0, 1500) || null;
          } else {
            aiNote = "Deep review provider unavailable — static findings stand.";
          }
        } finally {
          clearTimeout(timer);
        }
      } catch {
        aiNote = "Deep review timed out — static findings stand.";
      }
    }
  }

  await svc
    .from("code_submissions")
    .update({ audit_coins: quote.gross })
    .eq("id", id);

  return ok({
    submission: id,
    verdict: (sub as { verdict: string }).verdict,
    quarantined: (sub as { quarantined: boolean }).quarantined,
    findings,
    aiNote,
    quote,
    note: SUBMIT_CUT_NOTE,
  });
}
