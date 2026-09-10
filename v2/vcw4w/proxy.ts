import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Sessions only matter where the app reads or writes them: the account
  // area, auth flows, bot setup, and every API route. Everything else —
  // marketing pages, game detail/play shells, and the static game bundles
  // under /games/* — skips middleware entirely (zero session-refresh cost
  // per asset request). Page-level guards (e.g. /bot/setup) redirect
  // unauthenticated users themselves.
  matcher: ["/account/:path*", "/auth/:path*", "/api/:path*", "/bot/:path*"],
};
