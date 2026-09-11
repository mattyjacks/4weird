import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Public deployments may omit Supabase; protected routes then fail closed in their handlers.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Public marketing pages and static HTML games must remain reachable
  // anonymously. Authentication is enforced by protected layouts/actions,
  // while the proxy only refreshes the session cookie for every request.
  // /api/vcw/health is the public service-status probe (the route itself
  // never forwards upstream bodies and keys off a coarse status field), so
  // it must stay reachable anonymously. Every other /api/vcw/* action stays
  // authenticated.
  const isVcwHealth =
    request.nextUrl.pathname === "/api/vcw/health" ||
    request.nextUrl.pathname.startsWith("/api/vcw/health/");
  // Endpoints that allow unauthenticated/guest access or alternate auth (e.g. x-bot-key).
  // Individual route handlers enforce fine-grained method and payload authentication.
  const path = request.nextUrl.pathname;
  const method = request.method;
  const isBotKeyAuth = request.headers.has("x-bot-key") || request.headers.get("authorization")?.startsWith("Bearer ");
  const isPublicApi =
    (path === "/api/games/guest-pass" && method === "POST") ||
    (path === "/api/games/rates" && method === "GET") ||
    (path === "/api/game-ai/features" && method === "GET") ||
    (path === "/api/clans" && method === "GET") ||
    (/^\/api\/clans\/[^/]+$/.test(path) && method === "GET") ||
    (/^\/api\/clans\/[^/]+\/channels$/.test(path) && method === "GET") ||
    (/^\/api\/clans\/[^/]+\/economy$/.test(path) && method === "GET") ||
    (path.startsWith("/api/bot/bclans") && isBotKeyAuth) ||
    (path === "/api/bot/me" && isBotKeyAuth);

  const protectedPath =
    !isPublicApi &&
    (request.nextUrl.pathname === "/account" ||
      request.nextUrl.pathname.startsWith("/protected") ||
      request.nextUrl.pathname.startsWith("/api/account") ||
      request.nextUrl.pathname.startsWith("/api/admin") ||
      request.nextUrl.pathname.startsWith("/api/agents") ||
      request.nextUrl.pathname.startsWith("/api/bot") ||
      request.nextUrl.pathname.startsWith("/api/cheats") ||
      request.nextUrl.pathname.startsWith("/api/clans") ||
      request.nextUrl.pathname.startsWith("/api/cloud") ||
      request.nextUrl.pathname.startsWith("/api/code") ||
      request.nextUrl.pathname.startsWith("/api/coins") ||
      request.nextUrl.pathname.startsWith("/api/lobbies") ||
      request.nextUrl.pathname.startsWith("/api/matches") ||
      request.nextUrl.pathname.startsWith("/api/me") ||
      request.nextUrl.pathname.startsWith("/api/messages") ||
      request.nextUrl.pathname.startsWith("/api/my") ||
      request.nextUrl.pathname.startsWith("/api/buddy") ||
      request.nextUrl.pathname.startsWith("/api/game-ai") ||
      request.nextUrl.pathname.startsWith("/api/games") ||
      request.nextUrl.pathname.startsWith("/api/orgs") ||
      request.nextUrl.pathname.startsWith("/api/presence") ||
      request.nextUrl.pathname.startsWith("/api/saves") ||
      request.nextUrl.pathname.startsWith("/api/settings") ||
      request.nextUrl.pathname.startsWith("/api/social") ||
      request.nextUrl.pathname.startsWith("/api/stats") ||
      request.nextUrl.pathname.startsWith("/api/teams") ||
      (request.nextUrl.pathname.startsWith("/api/vcw") && !isVcwHealth));

  if (protectedPath && !user) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
    }
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
