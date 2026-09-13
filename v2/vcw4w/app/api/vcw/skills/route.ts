import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/csrf";
import { resolveVcwCaller, vcwReadScope, vcwWriteScope } from "@/lib/vcw-gateway-auth";
import { checkEgressUrl, fetchEgressUrl } from "@/lib/ssrf-guard";
import {
  defaultSkillRegistry,
  listSkillSummaries,
  runRegisteredSkill,
  type EchoSkillSource,
} from "@/lib/vcw-skills";


// Registry is seeded once per worker from the trusted echo builtin via the
// fail-open loader, so a bad seed can never 500 the route. Gateway auth is
// preserved: the same resolveVcwCaller + scope checks as the gateway routes,
// no edits to lib/vcw-gateway*.ts.
const registry = defaultSkillRegistry();

/** Cap on a fetched source body: preview only, never a full mirror. */
const MAX_SOURCE_BYTES = 256 * 1024;
const SOURCE_PREVIEW_CHARS = 2000;

/**
 * GET /api/vcw/skills; list registered ValleyNet skill summaries.
 *
 * Auth: vcw read scope (session, bot key, or `vcw_live_` gateway key).
 */
export async function GET(req: Request) {
  const caller = await resolveVcwCaller(req);
  if (!caller) return fail("Authentication required.", 401);
  if (!vcwReadScope(caller)) return fail("Read scope required.", 403);
  const rl = rateLimit(`vcw:skills:list:${caller.keyId ?? caller.userId}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  const skills = listSkillSummaries(registry);
  return ok({ count: skills.length, skills });
}

async function fetchSourcePreview(raw: string): Promise<EchoSkillSource | { error: string }> {
  const checked = await checkEgressUrl(raw);
  if ("error" in checked) return { error: checked.error };
  const url = checked.url.toString();
  let resp: Response;
  try {
    resp = await fetchEgressUrl(url, { signal: AbortSignal.timeout(10_000) });
  } catch {
    return { error: "Unable to fetch source URL." };
  }
  if (!resp.ok) return { error: `Source URL returned HTTP ${resp.status}.` };
  const declared = Number(resp.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_SOURCE_BYTES) {
    return { error: `Source body too large (max ${MAX_SOURCE_BYTES} bytes).` };
  }
  let bytes: Uint8Array;
  try {
    const buf = await resp.arrayBuffer();
    bytes = new Uint8Array(buf.slice(0, MAX_SOURCE_BYTES + 1));
  } catch {
    return { error: "Unable to read source body." };
  }
  if (bytes.length > MAX_SOURCE_BYTES) {
    return { error: `Source body too large (max ${MAX_SOURCE_BYTES} bytes).` };
  }
  let preview = "";
  try {
    preview = new TextDecoder("utf-8", { fatal: false }).decode(bytes).slice(0, SOURCE_PREVIEW_CHARS);
  } catch {
    preview = "";
  }
  return { url, bytes: bytes.length, preview };
}

/**
 * POST /api/vcw/skills; run a registered skill in the sandbox.
 *
 * Auth: vcw write scope. Body: `{ name, input?, sourceUrl? }`. Only
 * registered skills run (unknown names 404); only sandboxed builtins
 * execute (anything else 501, never fetched or eval'd). A caller-supplied
 * sourceUrl is validated + fetched through the canonical SSRF egress guard
 * (https-only, DNS + rebinding checks) with a bounded preview handed to the
 * skill; guard failures 400, fetch failures 502.
 */
export async function POST(req: Request) {
  const caller = await resolveVcwCaller(req);
  if (!caller) return fail("Authentication required.", 401);
  if (!vcwWriteScope(caller)) return fail("Write scope required.", 403);
  if (caller.mode === "session" && !sameOrigin(req)) return fail("Invalid request origin.", 403);
  const rl = rateLimit(`vcw:skills:run:${caller.keyId ?? caller.userId}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const name = String(input.name ?? "").trim().toLowerCase().slice(0, 64);
  if (!name) return fail("A skill name is required.", 400);

  const manifest = registry.get(name);
  if (!manifest) {
    return fail(`Unknown skill: ${name}. List skills via GET /api/vcw/skills.`, 404);
  }

  let source: EchoSkillSource | undefined;
  const sourceRaw = input.sourceUrl ?? input.source_url ?? null;
  if (sourceRaw !== null && sourceRaw !== undefined && String(sourceRaw) !== "") {
    if (typeof sourceRaw !== "string") return fail("Invalid sourceUrl (string).", 400);
    const fetched = await fetchSourcePreview(sourceRaw);
    if ("error" in fetched) {
      const fetchFailed = /unable to fetch|returned HTTP|unable to read/i.test(fetched.error);
      return fail(fetched.error, fetchFailed ? 502 : 400);
    }
    source = fetched;
  }

  const ran = runRegisteredSkill(registry, name, input.input ?? null, source);
  if ("error" in ran) {
    const notExecutable = /not executable|unsupported builtin/i.test(ran.error);
    return fail(ran.error, notExecutable ? 501 : 400);
  }
  return ok({ name: manifest.name, version: manifest.version, result: ran.result });
}
