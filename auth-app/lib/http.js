/** CORS allowlist + JSON helpers. No '*' origins: cookies are credentialed. */

function allowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export function corsHeaders(req) {
  const origin = (req.headers.get('origin') || '').toLowerCase();
  const headers = { Vary: 'Origin' };
  if (origin && allowedOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = req.headers.get('origin');
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, PUT, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type';
  headers['Access-Control-Max-Age'] = '600';
  return headers;
}

/** Returns a 204 preflight response, or null when the caller should proceed. */
export function preflight(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  return null;
}

export function ok(req, obj, status = 200) {
  return Response.json(obj, { status, headers: corsHeaders(req) });
}

export function fail(req, status, message) {
  return Response.json({ success: false, error: String(message).slice(0, 200) }, { status, headers: corsHeaders(req) });
}

export function methodOnly(req, list) {
  if (!list.includes(req.method)) {
    return fail(req, 405, 'Method Not Allowed');
  }
  return null;
}

/** Best-effort client IP (Vercel sets x-forwarded-for). For rate limiting. */
export function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for') || '';
  const ip = fwd.split(',')[0].trim() || 'unknown';
  return ip.slice(0, 64);
}
