import { NextResponse } from "next/server";
import { fail, ok, dbFail } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { clientIp } from "@/lib/validate";
import {
  vocrehabCalculateSsiEstimate,
  vocrehabSsiParams2026,
} from "@/lib/vocrehab-ssi";

export async function POST(req: Request) {
  const rl = rateLimit(`vocrehab-ssi-ip:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429, rateLimitHeaders(rl));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const hourlyWage = Number(input.hourlyWage);
  const hoursPerWeek = Number(input.hoursPerWeek);
  if (!Number.isFinite(hourlyWage) || !Number.isFinite(hoursPerWeek)) {
    return fail("hourlyWage and hoursPerWeek must be numbers.", 400);
  }

  let estimate: ReturnType<typeof vocrehabCalculateSsiEstimate>;
  try {
    estimate = vocrehabCalculateSsiEstimate({ hourlyWage, hoursPerWeek });
  } catch (e) {
    return fail(e instanceof RangeError ? e.message : "Out-of-range input.", 400);
  }

  if (input.save !== true) return ok({ estimate });

  const paramsVersion = input.paramsVersion;
  if (paramsVersion !== undefined && paramsVersion !== vocrehabSsiParams2026.paramsVersion) {
    return fail(`paramsVersion mismatch: expected "${vocrehabSsiParams2026.paramsVersion}".`, 400);
  }
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return NextResponse.json(
      { success: false, error: "Sign in to save your runs.", estimate },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const { error } = await supabase.from("vocrehab_calculator_runs").insert({
    user_id: user.user.id,
    hourly_wage: hourlyWage,
    hours_per_week: hoursPerWeek,
    estimate,
    params_version: vocrehabSsiParams2026.paramsVersion,
  });
  if (error) return dbFail("api/vocrehab/ssi", error);
  return ok({ estimate, saved: true });
}
