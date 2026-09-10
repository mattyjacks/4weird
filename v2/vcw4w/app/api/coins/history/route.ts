import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const raw = Number(request.nextUrl.searchParams.get("limit") ?? 25);
  const limit = Number.isFinite(raw) ? Math.max(1, Math.min(Math.trunc(raw), 100)) : 25;
  const { data, error } = await supabase.from("coin_ledger").select("delta,reason,created_at").order("created_at", { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: "Unable to load coin history." }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}
