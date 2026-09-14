import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { ok, fail, dbFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import {
  EASYDNC_API_ENDPOINT,
  normalizePhoneNumber,
  calculateEasyDncCost,
  generateBatchHash,
} from "@/lib/easydnc";

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

// POST /api/crm/contacts/scrub-dnc
// Body: { org_id: string, contact_ids?: string[], scrub_all_unverified?: boolean, lead_source?: string, api_key?: string }
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
    org_id?: string;
    contact_ids?: string[];
    scrub_all_unverified?: boolean;
    lead_source?: string;
    api_key?: string;
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

  const throttle = rateLimit(`crm-dnc-scrub:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many scrub requests. Please wait.", 429);

  // Query candidate contacts
  let query = supabase
    .from("crm_contacts")
    .select("id, full_name, phone, dnc_status, lead_source")
    .eq("org_id", orgId)
    .not("phone", "is", null);

  if (Array.isArray(input.contact_ids) && input.contact_ids.length > 0) {
    const validIds = input.contact_ids.map(isUuid).filter(Boolean);
    if (validIds.length === 0) return fail("No valid contact IDs provided.", 400);
    query = query.in("id", validIds);
  } else if (input.scrub_all_unverified) {
    query = query.or("dnc_status.eq.unverified,dnc_status.is.null,dnc_expires_at.lt.now()");
  }

  if (input.lead_source) {
    query = query.eq("lead_source", input.lead_source);
  }

  query = query.limit(200); // 200 per batch cap for CRM

  const { data: rawContacts, error: fetchErr } = await query;
  if (fetchErr) return dbFail("POST /api/crm/contacts/scrub-dnc (query)", fetchErr, "Unable to load contacts.");

  const contacts = rawContacts ?? [];
  if (contacts.length === 0) {
    return ok({ message: "No eligible contacts with phone numbers found to scrub.", count: 0 });
  }

  // Normalize phone numbers
  const validCandidates: { contactId: string; normalized: string; rawPhone: string }[] = [];
  for (const c of contacts) {
    try {
      if (c.phone) {
        const norm = normalizePhoneNumber(c.phone);
        validCandidates.push({ contactId: c.id, normalized: norm, rawPhone: c.phone });
      }
    } catch {
      // Mark invalid phone in database
      await supabase
        .from("crm_contacts")
        .update({ dnc_status: "error" })
        .eq("id", c.id);
    }
  }

  if (validCandidates.length === 0) {
    return fail("None of the selected contacts had valid 10-digit US phone numbers.", 400);
  }

  const uniqueNormalized = Array.from(new Set(validCandidates.map((v) => v.normalized)));
  const isByok = Boolean(input.api_key);
  const activeKey = input.api_key || process.env.EASYDNC_API_KEY;
  if (!activeKey) {
    return fail("Lookup service not configured.", 503);
  }
  const cost = calculateEasyDncCost(uniqueNormalized.length);

  // Debit Vibe Coins via stored procedure
  const batchHash = generateBatchHash(uniqueNormalized);
  const { data: paymentResult, error: paymentError } = await supabase.rpc(
    "process_easydnc_batch_payment",
    {
      p_user_id: u.id,
      p_total_numbers: uniqueNormalized.length,
      p_batch_hash: batchHash,
      p_is_byok: isByok,
      p_org_id: orgId,
    }
  );

  if (paymentError) {
    return dbFail("POST /api/crm/contacts/scrub-dnc (payment)", paymentError, "Failed to process payment.");
  }

  const batchId = paymentResult?.[0]?.batch_id ?? null;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000); // 31 Days TSR Safe Harbor

  // Call upstream EasyDNC API
  const dncStatusMap = new Map<string, boolean>();
  for (const num of uniqueNormalized) {
    try {
      const url = `${EASYDNC_API_ENDPOINT}?key=${encodeURIComponent(activeKey)}&number=${encodeURIComponent(num)}`;
      const res = await fetch(url, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(8000) });
      const data = await res.json().catch(() => ({}));
      dncStatusMap.set(num, Boolean(data.dnc));
    } catch {
      dncStatusMap.set(num, false);
    }
  }

  // Update contacts and log activities
  let cleanCount = 0;
  let dncCount = 0;

  for (const candidate of validCandidates) {
    const isDnc = dncStatusMap.get(candidate.normalized) ?? false;
    const status = isDnc ? "dnc" : "clean";

    if (isDnc) dncCount++;
    else cleanCount++;

    await supabase
      .from("crm_contacts")
      .update({
        dnc_status: status,
        dnc_checked_at: now.toISOString(),
        dnc_expires_at: expiresAt.toISOString(),
        dnc_batch_id: batchId,
      })
      .eq("id", candidate.contactId);

    // Record CRM activity
    await supabase.from("crm_activities").insert({
      org_id: orgId,
      owner_id: u.id,
      contact_id: candidate.contactId,
      kind: "note",
      body: isDnc
        ? `🚨 DNC ALERT: Phone ${candidate.rawPhone} is REGISTERED on the National Do Not Call Registry. Calling prohibited under TSR/TCPA.`
        : `🛡️ DNC Verified: Phone ${candidate.rawPhone} scrubbed clean via EasyDNC. Safe Harbor active for 31 days (expires ${expiresAt.toISOString().slice(0, 10)}).`,
      done: true,
    });
  }

  return ok({
    scrubbed_contacts: validCandidates.length,
    clean_contacts: cleanCount,
    dnc_contacts: dncCount,
    batch_id: batchId,
    safe_harbor_expires_at: expiresAt.toISOString(),
    cost: isByok
      ? { is_byok: true }
      : {
          gross_coins: cost.grossCoins,
          cut_coins: cost.cutCoins, // 25% Platform Cut
          provider_coins: cost.providerCoins,
        },
  });
}
