/**
 * CSRF guard for cookie-authenticated mutating API routes.
 *
 * All browser callers use same-origin fetch with credentials, so every
 * state-changing request must carry an Origin (or Referer) that matches the
 * request Host. Cross-site form POSTs and fetch() calls from an attacker's
 * origin fail this check even though the victim's cookies are attached.
 * Fail closed: a missing Origin AND Referer is rejected.
 */
export function sameOrigin(req: Request): boolean {
  // SECURITY: never trust x-forwarded-host (client-controllable). Use the
  // authoritative Host header only; deployments behind trusted proxies must
  // configure the proxy to overwrite Host, not rely on forwarded headers.
  const host = (req.headers.get("host") ?? "").split(",")[0].trim().toLowerCase();
  if (!host) return false;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  if (!origin && !referer) return false;
  try {
    if (origin) {
      const parsed = new URL(origin);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
      if (parsed.host.toLowerCase() !== host) return false;
    }
    if (referer) {
      const parsed = new URL(referer);
      if (parsed.host.toLowerCase() !== host) return false;
    }
    return true;
  } catch {
    return false;
  }
}
