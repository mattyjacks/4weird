import { promises as fs } from "node:fs";
import path from "node:path";
import { ok, fail } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { checkAuthenticatedVendorEligibility } from "@/lib/vendor-eligibility";

// GET /api/search?q= — instant keyword results from the static index.
// POST /api/search?q= — same keyword results, plus Luna AI rerank (fail-OPEN).
//
// Self-contained ranker: LOCAL copy of the site-search weighting
// (title x5, tags x3, quick x2, detail x1 + prefix match). Deliberately does
// NOT import lib/site-search.ts (lands concurrently; this route must work
// with or without it). Reads public/search/index.json from disk, fail-open
// (missing/unreadable index => empty results, never a 500).

type IndexEntry = {
  id: string;
  href: string;
  title: string;
  quick?: string;
  detail?: string;
  tags?: string[];
  kind?: string;
  updated?: string;
};

type SearchHit = {
  href: string;
  title: string;
  quick: string;
  score: number;
  ai: boolean;
};

// --- local weighting (copy of the site-search contract) ---
const W_TITLE = 5;
const W_TAGS = 3;
const W_QUICK = 2;
const W_DETAIL = 1;

function tokenize(s: string): string[] {
  return String(s ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function wordsOf(s: string): string[] {
  return String(s ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((w) => w.length > 0);
}

// Exact substring hit => full weight; typo-tolerant prefix hit
// (either side starts with the other, min 3 chars) => 60% weight.
function fieldScore(field: string, token: string, weight: number): number {
  const f = String(field ?? "").toLowerCase();
  if (!f || !token) return 0;
  if (f.includes(token)) return weight;
  if (token.length >= 3) {
    const words = wordsOf(f);
    for (const w of words) {
      if (w.length >= 3 && (w.startsWith(token) || token.startsWith(w))) {
        return weight * 0.6;
      }
    }
  }
  return 0;
}

function scoreEntry(entry: IndexEntry, tokens: string[]): number {
  let score = 0;
  const tagsText = Array.isArray(entry.tags) ? entry.tags.join(" ") : "";
  for (const tok of tokens) {
    score += fieldScore(entry.title, tok, W_TITLE);
    score += fieldScore(tagsText, tok, W_TAGS);
    score += fieldScore(entry.quick ?? "", tok, W_QUICK);
    score += fieldScore(entry.detail ?? "", tok, W_DETAIL);
  }
  return Math.round(score * 10) / 10;
}

// --- static index load (fail-open) ---
let cachedIndex: { at: number; entries: IndexEntry[] } | null = null;

async function loadIndex(): Promise<IndexEntry[]> {
  const now = Date.now();
  if (cachedIndex && now - cachedIndex.at < 60_000) return cachedIndex.entries;
  try {
    const file = path.join(process.cwd(), "public", "search", "index.json");
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as
      | IndexEntry[]
      | { pages?: IndexEntry[]; entries?: IndexEntry[] };
    const entries = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.pages)
        ? parsed.pages
        : Array.isArray(parsed.entries)
          ? parsed.entries
          : [];
    const clean = entries.filter(
      (e) => e && typeof e.id === "string" && typeof e.href === "string",
    );
    cachedIndex = { at: now, entries: clean };
    return clean;
  } catch (err) {
    console.error(
      "[api/search] index load failed:",
      String(err instanceof Error ? err.message : err).slice(0, 200),
    );
    return [];
  }
}

function keywordSearch(entries: IndexEntry[], query: string, limit: number): SearchHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const scored: { entry: IndexEntry; score: number }[] = [];
  for (const entry of entries) {
    const score = scoreEntry(entry, tokens);
    if (score > 0) scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ entry, score }) => ({
    href: entry.href,
    title: entry.title,
    quick: String(entry.quick ?? ""),
    score,
    ai: false,
  }));
}

// --- 60s in-memory response cache ---
const responseCache = new Map<string, { at: number; body: unknown }>();
const CACHE_TTL_MS = 60_000;

function cacheGet(key: string): unknown | null {
  const hit = responseCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return hit.body;
}

function cacheSet(key: string, body: unknown): void {
  if (responseCache.size > 500) responseCache.clear();
  responseCache.set(key, { at: Date.now(), body });
}

// --- per-IP rate limit (layer-1 memory bucket, mirrors pexels route) ---
const SEARCH_MINUTE_LIMIT = 60;

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const first = fwd.split(",")[0]?.trim();
  if (first) return first.slice(0, 80);
  const real = req.headers.get("x-real-ip") ?? "";
  if (real.trim()) return real.trim().slice(0, 80);
  return "anon";
}

function cleanQuery(raw: string | null): string {
  return String(raw ?? "").trim().slice(0, 200);
}

// --- Luna rerank (moderation.ts call pattern, fail-OPEN) ---
const LUNA_BASE = "https://api.openai.com/v1";

async function lunaRerankIds(
  query: string,
  candidates: { id: string; title: string; quick: string }[],
): Promise<string[] | null> {
  const key = process.env.OPENAI_API_KEY ?? "";
  const model = process.env.LUNA_MODEL ?? "gpt-5.6-luna";
  if (!key) return null;
  const top = candidates.slice(0, 20);
  if (top.length === 0) return null;
  const list = top
    .map((c) => `- ${c.id}: ${c.title} — ${c.quick}`.slice(0, 200))
    .join("\n");
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch(`${LUNA_BASE}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 256,
          messages: [
            {
              role: "system",
              content:
                "You are Luna, a site-search reranker. Given the user query and the candidate pages below, reply with ONLY a JSON array of the candidate ids ordered best-match first for the query. Include only ids from the list, no commentary, no markdown.",
            },
            {
              role: "user",
              content: `Query: ${query.slice(0, 300)}\nCandidates:\n${list}`,
            },
          ],
        }),
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      console.error("[api/search] Luna HTTP", res.status);
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = String(data?.choices?.[0]?.message?.content ?? "");
    const start = content.indexOf("[");
    const end = content.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) return null;
    const ids = JSON.parse(content.slice(start, end + 1)) as unknown;
    if (!Array.isArray(ids)) return null;
    const known = new Set(top.map((c) => c.id));
    const ordered = ids.filter(
      (id): id is string => typeof id === "string" && known.has(id),
    );
    if (ordered.length === 0) return null;
    return ordered;
  } catch (err) {
    console.error(
      "[api/search] Luna fetch failed:",
      String(err instanceof Error ? err.message : err).slice(0, 200),
    );
    return null;
  }
}

export async function GET(req: Request) {
  const rl = rateLimit(`search:${clientIp(req)}`, SEARCH_MINUTE_LIMIT, 60_000);
  if (!rl.allowed)
    return fail("Rate limited. Slow down a touch.", 429, rateLimitHeaders(rl));

  const q = cleanQuery(new URL(req.url).searchParams.get("q"));
  if (!q) return ok({ results: [], ai: false });

  const cacheKey = `get:${q.toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return ok(cached as Record<string, unknown>);

  const entries = await loadIndex();
  const results = keywordSearch(entries, q, 10);
  const body = { results, ai: false };
  cacheSet(cacheKey, body);
  return ok(body);
}

export async function POST(req: Request) {
  const rl = rateLimit(`search:${clientIp(req)}`, SEARCH_MINUTE_LIMIT, 60_000);
  if (!rl.allowed)
    return fail("Rate limited. Slow down a touch.", 429, rateLimitHeaders(rl));

  const url = new URL(req.url);
  let q = cleanQuery(url.searchParams.get("q"));
  if (!q) {
    try {
      const body = (await req.json()) as { q?: unknown };
      q = cleanQuery(typeof body?.q === "string" ? body.q : null);
    } catch {
      q = "";
    }
  }
  if (!q) return ok({ results: [], ai: false });

  const cacheKey = `post:${q.toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return ok(cached as Record<string, unknown>);

  const entries = await loadIndex();
  const tokens = tokenize(q);
  const scored: { entry: IndexEntry; score: number }[] = [];
  for (const entry of entries) {
    const score = scoreEntry(entry, tokens);
    if (score > 0) scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const top20 = scored.slice(0, 20);

  // Luna rerank; ANY failure (no key, down, bad parse) falls through
  // to keyword order — search works with zero AI (fail-OPEN).
  let ai = false;
  let ordered = top20;
  let canUseLuna = false;
  if (hasServerSupabase()) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const eligibility = await checkAuthenticatedVendorEligibility(supabase, auth.user.id, "openai");
      canUseLuna = eligibility.allowed;
    }
  }
  const reranked = canUseLuna ? await lunaRerankIds(
    q,
    top20.map(({ entry }) => ({
      id: entry.id,
      title: entry.title,
      quick: String(entry.quick ?? ""),
    })),
  ) : null;
  if (reranked) {
    const byId = new Map(top20.map((s) => [s.entry.id, s]));
    const seen = new Set<string>();
    const next: typeof top20 = [];
    for (const id of reranked) {
      const hit = byId.get(id);
      if (hit && !seen.has(id)) {
        seen.add(id);
        next.push(hit);
      }
    }
    for (const s of top20) {
      if (!seen.has(s.entry.id)) next.push(s);
    }
    ordered = next;
    ai = true;
  }

  const results: SearchHit[] = ordered.slice(0, 10).map(({ entry, score }) => ({
    href: entry.href,
    title: entry.title,
    quick: String(entry.quick ?? ""),
    score,
    ai,
  }));
  const body = { results, ai };
  cacheSet(cacheKey, body);
  return ok(body);
}
