import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const { data: rows, error } = await supabase
    .from("code_submissions")
    .select("id,title,status,monetization_status,created_at,updated_at")
    .eq("owner_id", u.id)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) return fail("Unable to load projects.", 500);
  return ok({ submissions: rows ?? [] });
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const title = String(input.title ?? "").trim();
  const source = String(input.source ?? "");
  if (
    title.length < 2 ||
    title.length > 80 ||
    !source ||
    Buffer.byteLength(source, "utf8") > 262144
  ) {
    return fail("Invalid project.", 400);
  }
  if (/(?:process\.env|service_role|<script[^>]+src\s*=|javascript:)/i.test(source)) {
    return fail("Unsafe source is not accepted.", 400);
  }
  const { data: row, error } = await supabase
    .from("code_submissions")
    .insert({ owner_id: u.id, title, source, status: "draft" })
    .select("id")
    .single();
  if (error) return fail("Unable to save draft.", 500);
  return ok({ submission: row });
}
