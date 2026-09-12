import {
  BLOCKED_CATEGORIES_DEFAULT,
  POLICY_TEMPLATES,
  guardrailMessage,
  isAppAllowed,
} from "@/lib/it-policy";
import { fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

// GET /api/it/policies — public policy templates + default blocked list, no auth.
export async function GET() {
  try {
    return ok({
      templates: POLICY_TEMPLATES,
      blockedDefault: BLOCKED_CATEGORIES_DEFAULT,
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to load policies.");
  }
}

// POST /api/it/policies { check } — public allow-check, no auth.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { check?: unknown };
    const check = String(body.check ?? "").trim();
    if (!check) return fail("Provide an app slug or category to check.", 400);
    return ok({ allowed: isAppAllowed(check), message: guardrailMessage(check) });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to check policy.");
  }
}
