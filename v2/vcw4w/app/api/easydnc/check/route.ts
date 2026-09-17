import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { sameOrigin } from "@/lib/csrf";
import { ok, fail, dbFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import {
  EASYDNC_API_ENDPOINT,
  normalizePhoneNumber,
  calculateEasyDncCost,
  generateBatchHash,
} from "@/lib/easydnc";
import { createHash } from "crypto";
import { checkAuthenticatedVendorEligibility } from "@/lib/vendor-eligibility";

export const maxDuration = 60; // Allow sufficient time for batch checks

interface CheckDncUpstreamResponse {
  status?: string;
  dnc?: boolean;
  charged?: number;
  balance?: number;
  error?: string;
}

// GET /api/easydnc/check?number=<phone> — BYOK key arrives via header (never
// ?key=, which leaks into proxy/history/logs). Non-BYOK lookups spend the
// server key and require a session + throttle, mirroring the POST path.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawNumber = searchParams.get("number");
  const byokKey = req.headers.get("x-easydnc-key");

  if (!rawNumber) {
    return fail("Missing required query parameter: number", 400);
  }

  let normalized: string;
  try {
    normalized = normalizePhoneNumber(rawNumber);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Invalid phone number format", 400);
  }

  if (!byokKey) {
    if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return fail("Authentication required. Log in or supply a BYOK key.", 401);
    }
    const vendorAge = await checkAuthenticatedVendorEligibility(supabase, data.user.id, "easydnc");
    if (!vendorAge.allowed) return fail(vendorAge.reason, 403);
    const throttle = rateLimit(`easydnc-single:${data.user.id}`, 30, 60_000);
    if (!throttle.allowed) {
      return fail("Rate limit exceeded.", 429);
    }
  }

  const apiKey = byokKey || process.env.EASYDNC_API_KEY;
  if (!apiKey) {
    return fail("Lookup service not configured.", 503);
  }
  try {
    const upstreamRes = await fetch(EASYDNC_API_ENDPOINT, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ number: normalized }),
      signal: AbortSignal.timeout(10000),
    });

    const data = (await upstreamRes.json().catch(() => ({}))) as CheckDncUpstreamResponse;

    if (!upstreamRes.ok && !data.status) {
      return fail(data.error || "Upstream EasyDNC request failed", upstreamRes.status);
    }

    const isDnc = Boolean(data.dnc);
    return ok({
      number: normalized,
      dnc: isDnc,
      status: data.status || (isDnc ? "Registered on DNC" : "Clean"),
      checked_at: new Date().toISOString(),
      statutory_warning: isDnc
        ? "DO NOT CALL: Calling a number registered on the DNC registry incurs fines up to $51,744/call under TSR and $500–$1,500/call under TCPA."
        : "Safe Harbor Active: Scrub valid for up to 31 days under FTC TSR (weekly scrub recommended).",
    });
  } catch (err) {
    console.error("[easydnc] Single lookup error:", err);
    return fail("Failed to connect to EasyDNC registry service", 502);
  }
}

// POST /api/easydnc/check
// Body: { numbers: string[], is_byok?: boolean, api_key?: string, org_id?: string }
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const input = (body ?? {}) as {
    numbers?: string[];
    is_byok?: boolean;
    api_key?: string;
    org_id?: string;
  };
  const isByok = Boolean(input.is_byok && input.api_key);
  let sessionClient: Awaited<ReturnType<typeof createClient>> | null = null;
  let sessionUserId: string | null = null;
  if (hasServerSupabase()) {
    sessionClient = await createClient();
    const { data: authData } = await sessionClient.auth.getUser();
    sessionUserId = authData?.user?.id ?? null;
  }
  if (sessionUserId && sessionClient && !isByok) {
    const vendorAge = await checkAuthenticatedVendorEligibility(sessionClient, sessionUserId, "easydnc");
    if (!vendorAge.allowed) return fail(vendorAge.reason, 403);
  }
  if (isByok && !sessionUserId) {
    return fail("BYOK DNC checks require an Adult-band signed-in account; anonymous key use cannot verify eligibility.", 403);
  }
  if (isByok && sessionUserId && sessionClient) {
    const vendorAge = await checkAuthenticatedVendorEligibility(sessionClient, sessionUserId, "easydnc");
    if (!vendorAge.allowed) return fail(vendorAge.reason, 403);
  }

  const rawNumbers = Array.isArray(input.numbers) ? input.numbers : [];
  // CSRF guard for the cookie-authed (Vibe-Coin) path: that path debits
  // coin_ledger via RPC keyed to the ambient session cookie, so a
  // cross-site POST must not ride it. BYOK callers supply their own key
  // and touch no session state, so non-browser BYOK callers (no Origin)
  // stay callable. Fail closed: missing Origin AND Referer is rejected.
  if (!(input.is_byok && input.api_key) && !sameOrigin(req)) {
    return fail("Invalid request origin.", 403);
  }
  if (rawNumbers.length === 0) {
    return fail("Payload must include an array of phone numbers", 400);
  }

  if (rawNumbers.length > 50000) {
    return fail("Batch limit exceeded: maximum 50,000 numbers per request", 400);
  }

  // Normalize numbers and eliminate duplicates
  const normalizedMap = new Map<string, string>(); // normalized -> original
  const invalidNumbers: { original: string; reason: string }[] = [];

  for (const raw of rawNumbers) {
    try {
      const norm = normalizePhoneNumber(raw);
      if (!normalizedMap.has(norm)) {
        normalizedMap.set(norm, raw);
      }
    } catch (err) {
      invalidNumbers.push({ original: raw, reason: err instanceof Error ? err.message : "Invalid" });
    }
  }

  const uniqueNormalized = Array.from(normalizedMap.keys());
  if (uniqueNormalized.length === 0) {
    return fail("No valid US 10-digit phone numbers found in submission", 400);
  }

  // Economic calculations
  const cost = calculateEasyDncCost(uniqueNormalized.length);
  const activeApiKey = isByok ? input.api_key! : (process.env.EASYDNC_API_KEY || "DEMO_KEY");

  let batchId: string | null = null;
  const userId = sessionUserId;
  const supabaseClient = sessionClient;

  // If paying with Vibe Coins, user must be logged in
  if (!isByok) {
    if (!userId || !supabaseClient) {
      return fail("Authentication required to pay with Vibe Coins. Log in or supply a BYOK API key.", 401);
    }

    const throttle = rateLimit(`easydnc-batch:${userId}`, 10, 60_000);
    if (!throttle.allowed) {
      return fail("Rate limit exceeded. Please wait a moment before running another scrub.", 429);
    }

    // Call stored procedure to debit coin_ledger and record platform 25% cut
    const batchHash = generateBatchHash(uniqueNormalized);
    const { data: paymentResult, error: paymentError } = await supabaseClient.rpc(
      "process_easydnc_batch_payment",
      {
        p_user_id: userId,
        p_total_numbers: uniqueNormalized.length,
        p_batch_hash: batchHash,
        p_is_byok: false,
        p_org_id: input.org_id ?? null,
      }
    );

    if (paymentError) {
      return dbFail("POST /api/easydnc/check (payment)", paymentError, "Failed to process Vibe Coins payment.");
    }

    if (paymentResult && paymentResult[0]) {
      batchId = paymentResult[0].batch_id;
    }
  }

  // Execute lookups in chunks
  const checkedAt = new Date().toISOString();
  const results: {
    number: string;
    original: string;
    dnc: boolean;
    status: string;
    checked_at: string;
  }[] = [];

  let dncCount = 0;
  let cleanCount = 0;

  // Process in concurrent chunks of 10
  const CHUNK_SIZE = 10;
  for (let i = 0; i < uniqueNormalized.length; i += CHUNK_SIZE) {
    const chunk = uniqueNormalized.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (num) => {
        try {
          const res = await fetch(EASYDNC_API_ENDPOINT, {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": `Bearer ${activeApiKey}` },
            body: JSON.stringify({ number: num }),
            signal: AbortSignal.timeout(8000),
          });

          const data = (await res.json().catch(() => ({}))) as CheckDncUpstreamResponse;
          const isDnc = Boolean(data.dnc);

          if (isDnc) dncCount++;
          else cleanCount++;

          results.push({
            number: num,
            original: normalizedMap.get(num) ?? num,
            dnc: isDnc,
            status: data.status || (isDnc ? "ON DNC" : "CLEAN"),
            checked_at: checkedAt,
          });
        } catch (err) {
          // If upstream fails for a single number, record error state
          results.push({
            number: num,
            original: normalizedMap.get(num) ?? num,
            dnc: false,
            status: "Error: lookup timed out",
            checked_at: checkedAt,
          });
        }
      })
    );
  }

  // Insert audit records if database connected
  if (supabaseClient && batchId) {
    try {
      const auditRows = results.map((r) => {
        const phoneHash = createHash("sha256")
          .update(`${r.number}:${batchId}`)
          .digest("hex");
        return {
          batch_id: batchId,
          phone_hash: phoneHash,
          dnc_status: r.dnc,
          raw_status: r.status,
          checked_at: r.checked_at,
        };
      });

      // Insert in chunks of 500
      for (let j = 0; j < auditRows.length; j += 500) {
        await supabaseClient.from("easydnc_audit_records").insert(auditRows.slice(j, j + 500));
      }

      // Update summary counts
      await supabaseClient
        .from("easydnc_scrub_batches")
        .update({ total_dnc: dncCount, total_clean: cleanCount })
        .eq("id", batchId);
    } catch (auditErr) {
      console.error("[easydnc] Audit record insert error:", auditErr);
    }
  }

  const batchHash = generateBatchHash(uniqueNormalized);

  return ok({
    batch_id: batchId,
    batch_hash: batchHash,
    checked_at: checkedAt,
    total_submitted: rawNumbers.length,
    total_checked: uniqueNormalized.length,
    total_dnc: dncCount,
    total_clean: cleanCount,
    invalid_numbers_count: invalidNumbers.length,
    invalid_numbers: invalidNumbers.slice(0, 50), // Sample for review
    cost: isByok
      ? { is_byok: true, gross_coins: 0, cut_coins: 0, provider_coins: 0 }
      : {
          is_byok: false,
          gross_coins: cost.grossCoins,
          cut_coins: cost.cutCoins, // 25% Platform Cut
          provider_coins: cost.providerCoins, // 75% Provider Share
          rate_per_check_coins: 2.50,
          gross_usd: cost.grossUsd,
          cut_usd: cost.cutUsd,
        },
    safe_harbor: {
      valid_until_days: 31,
      recommendation: "Re-scrub weekly (every 7 days) to maintain optimum regulatory safety.",
      statutory_warning:
        "Violations of the FTC Do Not Call Registry carry civil penalties of up to $51,744 per call under TSR and $500–$1,500 per call under TCPA.",
    },
    results,
  });
}
