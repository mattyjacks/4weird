import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { ok, fail, dbFail } from "@/lib/api-respond";
import { SAFE_HARBOR_DAYS, FTC_TSR_MAX_FINE_PER_CALL, TCPA_STATUTORY_FINE_MAX } from "@/lib/easydnc";

// GET /api/easydnc/certificate?batch_id=<UUID>
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batch_id");

  if (!batchId || !/^[0-9a-f-]{36}$/i.test(batchId)) {
    return fail("Invalid or missing batch_id parameter. Must be a valid UUID.", 400);
  }

  if (!hasServerSupabase()) {
    return fail("Database is not configured.", 503);
  }

  const supabase = await createClient();
  const { data: batch, error } = await supabase
    .from("easydnc_scrub_batches")
    .select("id,user_id,batch_hash,total_checked,total_dnc,total_clean,is_byok,created_at")
    .eq("id", batchId)
    .maybeSingle();

  if (error) {
    return dbFail("GET /api/easydnc/certificate", error, "Unable to load certificate.");
  }

  if (!batch) {
    return fail("Audit certificate not found for the specified batch ID.", 404);
  }

  const createdAt = new Date(batch.created_at);
  const safeHarborExpiresAt = new Date(createdAt.getTime() + SAFE_HARBOR_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const isSafeHarborActive = now.getTime() <= safeHarborExpiresAt.getTime();

  return ok({
    certificate_id: `CERT-4W-DNC-${batch.id.slice(0, 8).toUpperCase()}`,
    batch_id: batch.id,
    issuer: "MattyJacks LLC / 4weird Compliance Engine",
    status: "AUTHENTICALLY VERIFIED",
    batch_sha256_hash: batch.batch_hash,
    total_numbers_checked: batch.total_checked,
    total_registered_dnc: batch.total_dnc,
    total_clean: batch.total_clean,
    scrub_date_utc: batch.created_at,
    safe_harbor_window: {
      days_valid: SAFE_HARBOR_DAYS,
      expires_at_utc: safeHarborExpiresAt.toISOString(),
      is_currently_active: isSafeHarborActive,
    },
    statutory_citations: {
      ftc_tsr: "16 CFR § 310.4(b)(3)(iv) - National Do Not Call Registry Safe Harbor",
      max_penalty_per_call: `$${FTC_TSR_MAX_FINE_PER_CALL.toLocaleString()} USD (FTC TSR Civil Penalty)`,
      tcpa_statutory_damages: `$500 - $${TCPA_STATUTORY_FINE_MAX.toLocaleString()} USD per call (47 U.S.C. § 227)`,
    },
    legal_disclaimer:
      "MattyJacks LLC certifies that the numbers associated with this SHA-256 batch hash were processed through the EasyDNC registry interface at the stated timestamp. MattyJacks LLC makes this verification available at its sole discretion and assumes no liability for telecommunications placed by the user.",
  });
}
