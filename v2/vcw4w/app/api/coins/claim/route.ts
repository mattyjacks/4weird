import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const response = await fetch(`${url.replace(/\/$/, "")}/functions/v1/shopify-coins/claim`, { method: "POST", headers: { Authorization: `Bearer ${token}`, apikey: key, "Content-Type": "application/json" }, body: "{}", cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json({ error: typeof body.error === "string" ? body.error : "Unable to claim coins." }, { status: response.status >= 400 && response.status < 500 ? response.status : 502 });
  return NextResponse.json({ claimed: Number(body.claimed) || 0 });
}
