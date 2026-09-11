import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

function cleanNext(value: string): string {
  const v = String(value ?? "");
  // Strict same-origin target: single leading slash (no protocol-relative
  // //evil), no backslashes (some clients normalize /\evil to //evil), no
  // control characters, length-capped. Anything else falls back to /.
  if (!v.startsWith("/") || v.startsWith("//")) return "/";
  if (v.includes("\\")) return "/";
  if (v.length > 2048) return "/";
  for (let i = 0; i < v.length; i++) {
    const code = v.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return "/";
  }
  return v;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = cleanNext(searchParams.get("next") ?? "/");

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // redirect user to specified redirect URL or root of app
      redirect(next);
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=No token hash or type`);
}
