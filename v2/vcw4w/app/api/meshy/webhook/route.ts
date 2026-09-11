import { createHmac, timingSafeEqual } from "node:crypto";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { meshyWebhookSecret } from "@/lib/meshy";

export const dynamic = "force-dynamic";

/**
 * POST /api/meshy/webhook - Meshy task status push receiver.
 *
 * Paste this URL (deployed, https) into Meshy dashboard → API settings →
 * Webhooks → Payload URL:
 *   https://4weird.com/api/meshy/webhook
 * Local test via proxy: put the smee.io URL in Meshy, forward to
 * http://127.0.0.1:3000/api/meshy/webhook
 *
 * Meshy POSTs the task object as JSON on every status change. We match it
 * to meshy_jobs by meshy_task_id and store status + result_url, then return
 * 2xx fast (Meshy treats >=400 as failed delivery and may auto-disable the
 * webhook). Heavy work (Vault download) stays in GET /api/meshy/status,
 * which vaults the next time the owner polls.
 */

function expectedSecret(): string {
  return meshyWebhookSecret();
}

function header(req: Request, name: string): string {
  return String(req.headers.get(name) ?? req.headers.get(name.toLowerCase()) ?? "").trim();
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function authorized(req: Request, rawBody: string, json: Record<string, unknown>): boolean {
  const expected = expectedSecret();
  if (!expected) return true;
  const candidates = [
    header(req, "x-meshy-signature"),
    header(req, "x-meshy-webhook-secret"),
    header(req, "x-webhook-secret"),
    header(req, "x-signature"),
    header(req, "webhook-signature"),
    header(req, "authorization").replace(/^bearer\s+/i, ""),
    new URL(req.url).searchParams.get("secret") ?? "",
    String(json.secret ?? json.webhook_secret ?? ""),
  ]
    .map((s) => String(s ?? "").trim().replace(/^sha256=/i, ""))
    .filter(Boolean);
  if (candidates.some((c) => safeEqual(c, expected))) return true;
  // HMAC-SHA256 of the raw body (hex), for providers that sign instead of echoing.
  try {
    const hex = createHmac("sha256", expected).update(rawBody).digest("hex");
    if (candidates.some((c) => safeEqual(c, hex))) return true;
  } catch {
    // Fall through to deny.
  }
  return false;
}

function pickResultUrl(task: Record<string, unknown>): string {
  const urls = (task.model_urls ?? {}) as Record<string, unknown>;
  const first = (v: unknown) => (typeof v === "string" && v.startsWith("https://") ? v : "");
  return (
    first(urls.glb) ||
    first(urls.fbx) ||
    first(urls.obj) ||
    first(urls.usdz) ||
    first(urls.stl) ||
    first(task.thumbnail_url) ||
    first(task.video_url) ||
    ""
  ).slice(0, 2048);
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Meshy unavailable.", 503);
  const raw = await req.text().catch(() => "");
  let body: Record<string, unknown> = {};
  try {
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    // Stay 2xx so one malformed delivery doesn't disable the webhook.
    return ok({ received: false, reason: "invalid-json" });
  }
  if (!authorized(req, raw, body)) return fail("Invalid webhook secret.", 401);

  const taskId = String(body.id ?? body.task_id ?? body.result ?? "").slice(0, 128);
  if (!taskId) return ok({ received: false, reason: "missing-task-id" });

  const remote = String(body.status ?? "").toUpperCase();
  const resultUrl = pickResultUrl(body);
  const mapped = remote === "SUCCEEDED" ? "succeeded" : remote === "FAILED" || remote === "CANCELED" || remote === "CANCELLED" ? "failed" : "processing";

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("Meshy unavailable.", 503);
  }
  const { data: row, error: readErr } = await svc
    .from("meshy_jobs")
    .select("id,status,result_url")
    .eq("meshy_task_id", taskId)
    .maybeSingle();
  if (readErr || !row) {
    console.warn(`[api/meshy/webhook] unknown task ${taskId.slice(0, 16)} (${remote || "no-status"})`);
    return ok({ received: true, matched: false, remote });
  }
  const current = row as { id: string; status: string; result_url: string };
  if (current.status === "done") {
    // Already vaulted; only backfill an empty URL, never downgrade.
    if (!current.result_url && resultUrl) {
      await svc.from("meshy_jobs").update({ result_url: resultUrl }).eq("id", current.id);
    }
    return ok({ received: true, matched: true, status: "done", remote });
  }
  const patch: Record<string, unknown> =
    mapped === "succeeded"
      ? { status: "succeeded", ...(resultUrl ? { result_url: resultUrl } : {}) }
      : { status: mapped };
  const { error: updateErr } = await svc.from("meshy_jobs").update(patch).eq("id", current.id);
  if (updateErr) {
    console.error(`[api/meshy/webhook] update failed for ${taskId.slice(0, 16)}`, String(updateErr.message ?? updateErr).slice(0, 200));
    return fail("Unable to store webhook.", 500);
  }
  return ok({ received: true, matched: true, status: mapped, remote });
}

export async function GET() {
  return ok({ ok: true, usage: "POST Meshy task JSON here.", url: "/api/meshy/webhook" });
}
