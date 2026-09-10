import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const throttle = rateLimit(`coin-claim:${user.id}`, 3, 60_000);
  if (!throttle.allowed) return NextResponse.json({ error: "Too many claim attempts. Try again shortly." }, { status: 429, headers: { "Retry-After": String(throttle.retryAfter), "Cache-Control": "private, no-store" } });
  const response = await fetch(`${url.replace(/\/$/, "")}/functions/v1/shopify-coins/claim`, { method: "POST", headers: { Authorization: `Bearer ${token}`, apikey: key, "Content-Type": "application/json" }, body: "{}", cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json({ error: typeof body.error === "string" ? body.error : "Unable to claim coins." }, { status: response.status >= 400 && response.status < 500 ? response.status : 502, headers: { "Cache-Control": "private, no-store" } });
  return NextResponse.json({ claimed: Number(body.claimed) || 0 }, { headers: { "Cache-Control": "private, no-store" } });
}
