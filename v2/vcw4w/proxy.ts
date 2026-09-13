import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { sameOrigin } from "@/lib/csrf";

export async function proxy(request: NextRequest) {
  // Central CSRF gate: cookie-authenticated mutations must prove same-origin
  // (Origin/Referer host === Host). Secret-header callers (x-bot-key,
  // Authorization: Bearer for cron/bot keys, webhook secrets, pod callbacks)
  // and unauthenticated public endpoints carry no session cookie and are
  // exempt by construction. Per-route sameOrigin() checks remain as defense
  // in depth; blender/progress-style token callbacks stay exempt (no cookies).
  const method = request.method;
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE")
  ) {
    // Presence alone is not enough: require a plausible secret shape,
    // otherwise a caller that can inject an empty/garbage header walks
    // through the exemption with no credential at all. Bot keys are
    // `bot4weird_`/`vcw_live_` prefixed; cron/bearer tokens are long
    // random strings - garbage like `x-bot-key: 1` must NOT exempt.
    const botKey = (request.headers.get("x-bot-key") ?? "").trim();
    const auth = (request.headers.get("authorization") ?? "").trim();
    const looksLikeBotKey =
      /^(bot4weird_[A-Za-z0-9]{16,}|vcw_live_[A-Za-z0-9]{16,})$/.test(botKey);
    const looksLikeBearer =
      // Bearer shape only: provider webhook secrets (Meshy signature, fal
      // headers, sk- keys) travel in their own headers, never in
      // Authorization, so matching those prefixes here would let any caller
      // bypass this gate with a self-asserted header value.
      /^Bearer\s+\S{20,}$/.test(auth);
    const hasSecretAuth = looksLikeBotKey || looksLikeBearer;
    const hasSessionCookie = request.cookies
      .getAll()
      .some((c) => c.name === "kid_session" || c.name.startsWith("sb-"));
    // Logout only destroys the session (it clears the sb-* cookies and
    // revokes nothing else), so a forged cross-site logout is at worst a
    // nuisance, never data theft or a state change on someone else's
    // behalf. It must stay reachable even when Origin/Referer are stripped
    // (privacy extensions, referrer policies): the server-set session
    // cookies are httpOnly, so this route is the ONLY path that can clear
    // them — blocking it leaves the account logged in server-side while
    // the browser already looks logged out.
    const isLogout = request.nextUrl.pathname === "/api/auth/logout";
    if (!hasSecretAuth && hasSessionCookie && !isLogout && !sameOrigin(request)) {
      return NextResponse.json(
        { success: false, error: "Invalid request origin." },
        { status: 403, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  }
  return await updateSession(request);
}

export const config = {
  // Sessions only matter where the app reads or writes them: the account
  // area, auth flows, bot setup, and every API route. Everything else -
  // marketing pages, game detail/play shells, and the static game bundles
  // under /games/*; skips middleware entirely (zero session-refresh cost
  // per asset request). Page-level guards (e.g. /bot/setup) redirect
  // unauthenticated users themselves.
  matcher: ["/account/:path*", "/auth/:path*", "/api/:path*", "/bot/:path*"],
};
