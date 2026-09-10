import { preflight, ok, fail, methodOnly } from '../../../lib/http.js';

export async function GET(req) {
  const pre = preflight(req) || methodOnly(req, ['GET']);
  if (pre) return pre;
  return ok(req, { success: true, service: '4weird-auth', time: new Date().toISOString() });
}
