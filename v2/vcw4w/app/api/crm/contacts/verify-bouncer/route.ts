import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { ok, fail, dbFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

// NOTE (DS-BOUNCER-02): the shared client at `@/lib/bouncer`
// (verifySingleEmail) is owned by another in-progress envelope, so the
// upstream call is inlined here under the same contract:
// GET https://api.usebouncer.com/v1.1/email/verify?email=<e>&timeout=
// with an `x-api-key` header and BOUNCER_API_KEY (USEBOUNCER_API_KEY alias)
// resolution. The lib lane can swap this call site over later without
// changing the request/response shape of this route.

const BOUNCER_VERIFY_ENDPOINT = "https://api.usebouncer.com/v1.1/email/verify";
const BATCH_CAP = 200;

const STATUSES = ["lead", "active", "inactive"] as const;

type BouncerStatus = "deliverable" | "risky" | "undeliverable" | "unknown";

interface BouncerResult {
  status: BouncerStatus;
  reason: string;
  score: number | null;
  toxicity: boolean;
  trapRisk: boolean;
}

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

function cleanStr(v: unknown, cap: number): string {
  return String(v ?? "").trim().slice(0, cap);
}

function validEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function normalizeStatus(raw: unknown): BouncerStatus {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "deliverable") return "deliverable";
  if (s === "risky") return "risky";
  if (s === "undeliverable") return "undeliverable";
  return "unknown";
}

async function verifyEmailInline(email: string, apiKey: string): Promise<BouncerResult> {
  const failed: BouncerResult = {
    status: "unknown",
    reason: "verification_failed",
    score: null,
    toxicity: false,
    trapRisk: false,
  };
  try {
    const url = `${BOUNCER_VERIFY_ENDPOINT}?email=${encodeURIComponent(email)}&timeout=10`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "x-api-key": apiKey },
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ...failed, reason: `upstream_${res.status}` };
    const status = normalizeStatus(data.status);
    const reason =
      String(data.reason ?? data.result ?? "checked").slice(0, 160) || "checked";
    const rawScore = Number(data.score ?? data.qualityScore ?? Number.NaN);
    const score = Number.isFinite(rawScore)
      ? Math.max(0, Math.min(100, Math.round(rawScore)))
      : null;
    const haystack = `${reason} ${String(data.domain ?? "")}`;
    const toxicity = Boolean(
      data.toxic ?? data.isToxic ?? /toxic|disposable/i.test(reason),
    );
    const trapRisk = /spam[\s_-]?trap|honeypot|\btrap\b/i.test(haystack);
    return { status, reason, score, toxicity, trapRisk };
  } catch {
    return failed;
  }
}

// POST /api/crm/contacts/verify-bouncer
// Body: { org_id: string, contact_id?: uuid, contact_ids?: uuid[],
//         verify_all_unverified?: boolean, status?: lead|active|inactive,
//         company_id?: uuid }
// Verifies up to 200 contacts per batch (must have an email), writes
// bouncer_* columns on crm_contacts, and logs a crm_activities note per
// contact. Upstream calls are sequential and fail-open per contact.
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const u = authData?.user;
  if (!u) return fail("Login required.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }

  const input = (body ?? {}) as {
    org_id?: unknown;
    contact_id?: unknown;
    contact_ids?: unknown;
    verify_all_unverified?: unknown;
    status?: unknown;
    company_id?: unknown;
  };

  const orgId = isUuid(input.org_id);
  if (!orgId) return fail("Valid org_id is required.", 400);

  // Check org membership
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();

  if (!membership) return fail("Not a member of this org.", 403);

  const throttle = rateLimit(`crm-bouncer-verify:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many verification requests. Please wait.", 429);

  const apiKey = process.env.BOUNCER_API_KEY || process.env.USEBOUNCER_API_KEY || "";
  if (!apiKey) return fail("Bouncer is not configured.", 503);

  const singleId = isUuid(input.contact_id);
  const selectedIds = Array.isArray(input.contact_ids)
    ? input.contact_ids.map(isUuid).filter(Boolean)
    : [];

  const statusRaw = cleanStr(input.status, 20);
  if (statusRaw && !(STATUSES as readonly string[]).includes(statusRaw)) {
    return fail(`Invalid status. Expected one of: ${STATUSES.join(", ")}.`, 400);
  }

  const companyRaw = cleanStr(input.company_id, 36);
  if (companyRaw && !isUuid(companyRaw)) {
    return fail("Invalid company_id. Expected a UUID.", 400);
  }
  const companyId = isUuid(companyRaw);

  if (
    !singleId &&
    selectedIds.length === 0 &&
    !input.verify_all_unverified &&
    !statusRaw &&
    !companyId
  ) {
    return fail(
      "Provide contact_id, contact_ids, verify_all_unverified, or a group filter (status/company_id).",
      400,
    );
  }

  // Query candidate contacts (must have an email)
  let query = supabase
    .from("crm_contacts")
    .select("id, full_name, email")
    .eq("org_id", orgId)
    .not("email", "is", null);

  if (singleId) {
    query = query.eq("id", singleId);
  } else if (selectedIds.length > 0) {
    query = query.in("id", selectedIds);
  } else if (input.verify_all_unverified) {
    query = query.or("bouncer_status.eq.unverified,bouncer_status.is.null");
  }

  if (statusRaw) {
    query = query.eq("status", statusRaw);
  }

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  query = query.limit(BATCH_CAP); // 200 per batch cap for CRM

  const { data: rawContacts, error: fetchErr } = await query;
  if (fetchErr) {
    return dbFail("POST /api/crm/contacts/verify-bouncer (query)", fetchErr, "Unable to load contacts.");
  }

  const contacts = (rawContacts ?? []).filter(
    (c) => c.email && validEmail(String(c.email)),
  );
  if (contacts.length === 0) {
    return ok({
      message: "No eligible contacts with email addresses found to verify.",
      checked: 0,
      deliverable: 0,
      risky: 0,
      undeliverable: 0,
      unknown: 0,
      trapRisks: 0,
    });
  }

  const now = new Date().toISOString();
  let deliverable = 0;
  let risky = 0;
  let undeliverable = 0;
  let unknown = 0;
  let trapRisks = 0;

  // Sequential upstream calls (fail-open per contact)
  for (const c of contacts) {
    const email = String(c.email);
    const r = await verifyEmailInline(email, apiKey);

    if (r.status === "deliverable") deliverable++;
    else if (r.status === "risky") risky++;
    else if (r.status === "undeliverable") undeliverable++;
    else unknown++;
    if (r.trapRisk) trapRisks++;

    await supabase
      .from("crm_contacts")
      .update({
        bouncer_status: r.status,
        bouncer_score: r.score,
        bouncer_reason: r.reason,
        bouncer_toxicity: r.toxicity,
        bouncer_checked_at: now,
      })
      .eq("id", c.id);

    const label = c.full_name ? `${String(c.full_name)} <${email}>` : email;
    const flags = [r.toxicity ? "toxic" : null, r.trapRisk ? "spam-trap risk" : null].filter(
      Boolean,
    );
    const scoreBit = r.score !== null ? ` (score ${r.score})` : "";

    // Record CRM activity
    await supabase.from("crm_activities").insert({
      org_id: orgId,
      owner_id: u.id,
      contact_id: c.id,
      kind: "note",
      body: `✉️ Bouncer: ${label} → ${r.status.toUpperCase()}${scoreBit} — ${r.reason}${flags.length > 0 ? ` [${flags.join(", ")}]` : ""}.`,
      done: true,
    });
  }

  return ok({
    checked: contacts.length,
    deliverable,
    risky,
    undeliverable,
    unknown,
    trapRisks,
  });
}
