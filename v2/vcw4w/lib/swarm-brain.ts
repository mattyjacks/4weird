/**
 * Swarm brain: OpenClaw-style per-user internal brain for Agent Swarm Chat.
 *
 * One rule everywhere: memory and RAG ride the existing chat turn - no new
 * ledger, no new metered kind. Turns still meter via `meter_game_ai_usage`
 * (kind `inference`, game_slug `swarm`) with the 25% cut INCLUDED.
 *
 * What this module holds (100% pure, client-safe, unit-testable - no keys,
 * no network, no Supabase import; routes own all I/O):
 *
 * - Per-user brain: persona + terse fact bullets + goals + exec-mode
 *   preference. One brain per user, loaded every turn, injected as a
 *   token-cheap block (≤ SWARM_BRAIN_CONTEXT_CHARS).
 * - Token-cheap memory: deterministic fact extraction from plain chat
 *   ("remember that …", "my X is Y", "call me X", "my goal is …").
 *   Nothing inferred, nothing rewritten - bullets are quotes/near-quotes,
 *   capped in count and chars so memory costs ~100 tokens, not thousands.
 * - Internal RAG over the user's own .txt docs: chunk → stopword-filtered
 *   token-overlap scoring (no embeddings, no extra service, works on
 *   serverless cold starts). Top-K chunks join the prompt within a fixed
 *   char budget, each tagged `[doc: name]` for provenance.
 * - Execution routing (serverful vs serverless): `auto` defaults to
 *   serverless (in-request reasoning, what /swarm already does); heavy
 *   asks (GPU pods, renders, long jobs) resolve to serverful and the reply
 *   says which RunPod surface to use - never faked, never provisioned here.
 * - Auto-orchestration: when one message holds parallel work ("X and also
 *   Y", "in parallel", "meanwhile", "delegate"), the router proposes up to
 *   SWARM_MAX_CHILDREN child instances of itself (new swarm_sessions rows
 *   with parent_session_id), each with a deterministic subtask slice.
 */

export const SWARM_EXEC_MODES = ["auto", "serverless", "serverful"] as const;
export type SwarmExecMode = (typeof SWARM_EXEC_MODES)[number];

export function isSwarmExecMode(value: unknown): value is SwarmExecMode {
  return typeof value === "string" && (SWARM_EXEC_MODES as readonly string[]).includes(value);
}

/** Persona cap: one line, shown every turn. */
export const SWARM_BRAIN_PERSONA_MAX = 500;
/** Fact bullets kept per user; each ≤ this many chars. */
export const SWARM_BRAIN_FACT_MAX = 140;
export const SWARM_BRAIN_FACTS_MAX = 30;
/** Goals kept per user; each ≤ this many chars. */
export const SWARM_BRAIN_GOAL_MAX = 140;
export const SWARM_BRAIN_GOALS_MAX = 10;
/** Rolling one-line summary cap. */
export const SWARM_BRAIN_SUMMARY_MAX = 600;
/** Whole injected brain block cap (~150 tokens). */
export const SWARM_BRAIN_CONTEXT_CHARS = 600;

/** .txt doc caps: count per user, bytes per doc. */
export const SWARM_DOCS_MAX = 20;
export const SWARM_DOC_CHARS_MAX = 20_000;
export const SWARM_DOC_NAME_MAX = 80;
/** RAG: chunk window, top-K, total injected budget (~300 tokens). */
export const SWARM_RAG_CHUNK_CHARS = 800;
export const SWARM_RAG_TOP_K = 3;
export const SWARM_RAG_BUDGET_CHARS = 1200;

/** Auto-orchestration: max child instances spawned per turn. */
export const SWARM_MAX_CHILDREN = 2;

export type SwarmBrain = {
  persona: string;
  facts: string[];
  goals: string[];
  exec_mode: SwarmExecMode;
  memory_summary: string;
};

export function emptyBrain(): SwarmBrain {
  return { persona: "", facts: [], goals: [], exec_mode: "auto", memory_summary: "" };
}

export function cleanBrainPersona(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, SWARM_BRAIN_PERSONA_MAX);
}

export function cleanBrainFacts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const t = String(item ?? "").replace(/\s+/g, " ").trim().slice(0, SWARM_BRAIN_FACT_MAX);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= SWARM_BRAIN_FACTS_MAX) break;
  }
  return out;
}

export function cleanBrainGoals(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const t = String(item ?? "").replace(/\s+/g, " ").trim().slice(0, SWARM_BRAIN_GOAL_MAX);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= SWARM_BRAIN_GOALS_MAX) break;
  }
  return out;
}

export function cleanBrainSummary(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, SWARM_BRAIN_SUMMARY_MAX);
}

export function cleanDocName(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, SWARM_DOC_NAME_MAX);
}

/** .txt only: plain text, no markup, no binaries. Refuses empty/oversize. */
export function cleanDocContent(value: unknown): string {
  const t = String(value ?? "").replace(/\r\n?/g, "\n").trim();
  if (!t || t.length > SWARM_DOC_CHARS_MAX) return "";
  // Reject obvious non-text uploads (base64 blobs, data URLs, NUL bytes).
  if (t.includes("\0") || /^data:[a-z]+\/[a-z0-9.+-]+;base64,/i.test(t)) return "";
  return t;
}

/* ---------------------------------------------------------------------------
 * Token-cheap memory: extract terse fact bullets from a turn. Deterministic:
 * same inputs -> same bullets. Only explicit statements become memory -
 * never inferences, never rewrites beyond whitespace + length caps.
 * ------------------------------------------------------------------------- */

const FACT_PATTERNS: RegExp[] = [
  /\bremember that (.+)/i,
  /\bremember[:\s]+(.+)/i,
  /\bmy ([\w -]{1,40}) is ([^.!\n]{1,100})/i,
  /\bcall me ([\w -]{1,40})/i,
  /\bi (like|love|prefer|hate|dislike) ([^.!\n]{1,100})/i,
  /\bmy goal is ([^.!\n]{1,120})/i,
];

/** Pull up to 3 new fact/goal bullets from one user message. Pure. */
export function extractBrainBullets(message: string): { facts: string[]; goals: string[] } {
  const facts: string[] = [];
  const goals: string[] = [];
  const text = String(message ?? "");
  if (!text.trim()) return { facts, goals };
  for (const re of FACT_PATTERNS) {
    // Fresh regex state per pattern (global flag absent; one exec each).
    const m = re.exec(text);
    if (!m) continue;
    // Two-group patterns ("my X is Y", "I <verb> Y") carry the payload in
    // the LAST group; group 1 is the attribute/verb ("dog", "love") and
    // must never become the memory. Single-group patterns keep m[1].
    const last = (m[m.length - 1] ?? "").trim();
    if (m.length > 2 && (m[1] ?? "").trim().toLowerCase() === "goal") continue; // "my goal is …" belongs to the goal pattern below
    const raw = last;
    if (!raw) continue;
    if (/goal/i.test(re.source) && goals.length < 2) {
      const g = `Goal: ${raw}`.replace(/\s+/g, " ").trim().slice(0, SWARM_BRAIN_GOAL_MAX);
      if (g.length > 7) goals.push(g);
    } else if (facts.length < 3) {
      const f = raw.replace(/\s+/g, " ").trim().slice(0, SWARM_BRAIN_FACT_MAX);
      if (f.length > 2) facts.push(f);
    }
    if (facts.length >= 3 && goals.length >= 2) break;
  }
  return { facts, goals };
}

/** Merge new bullets into a brain, de-duplicated, capped. Pure. */
export function mergeBrainMemory(brain: SwarmBrain, input: { facts?: string[]; goals?: string[] }): SwarmBrain {
  const facts = [...brain.facts];
  for (const f of input.facts ?? []) {
    const t = String(f ?? "").replace(/\s+/g, " ").trim().slice(0, SWARM_BRAIN_FACT_MAX);
    if (t && !facts.includes(t)) facts.push(t);
  }
  const goals = [...brain.goals];
  for (const g of input.goals ?? []) {
    const t = String(g ?? "").replace(/\s+/g, " ").trim().slice(0, SWARM_BRAIN_GOAL_MAX);
    if (t && !goals.includes(t)) goals.push(t);
  }
  return {
    ...brain,
    facts: facts.slice(-SWARM_BRAIN_FACTS_MAX),
    goals: goals.slice(-SWARM_BRAIN_GOALS_MAX),
  };
}

/**
 * Compact brain block for the system prompt. Budgeted: persona first, then
 * goals, then facts, then the rolling summary - cut off at
 * SWARM_BRAIN_CONTEXT_CHARS so memory stays ~150 tokens.
 */
export function compactBrainContext(brain: SwarmBrain): string {
  const lines: string[] = [];
  if (brain.persona) lines.push(`Operator: ${brain.persona}`);
  for (const g of brain.goals.slice(0, 3)) lines.push(`• ${g}`);
  for (const f of brain.facts.slice(-8)) lines.push(`• ${f}`);
  if (brain.memory_summary) lines.push(`So far: ${brain.memory_summary}`);
  const joined = lines.join(" ").trim();
  if (!joined) return "";
  return `Memory: ${joined}`.slice(0, SWARM_BRAIN_CONTEXT_CHARS);
}

/**
 * Roll the one-line session summary forward: keep the newest turn's gist
 * plus the tail of the old summary, capped. Pure, no model call - the
 * summary is extractive, so it costs zero tokens to maintain.
 */
export function rollMemorySummary(previous: string, userMessage: string, replySnippet: string): string {
  const gist = `They asked "${String(userMessage ?? "").replace(/\s+/g, " ").trim().slice(0, 120)}"; swarm answered "${String(replySnippet ?? "").replace(/\s+/g, " ").trim().slice(0, 120)}".`;
  const tail = String(previous ?? "").replace(/\s+/g, " ").trim();
  return `${gist}${tail ? ` ${tail}` : ""}`.slice(0, SWARM_BRAIN_SUMMARY_MAX);
}

/* ---------------------------------------------------------------------------
 * Execution routing: serverless (in-request reasoning, the /swarm default)
 * vs serverful (a real RunPod pod/desktop the operator drives). Pure keyword
 * routing; the route layer turns "serverful" into an honest pointer
 * (provision links + status), never a faked provision.
 * ------------------------------------------------------------------------- */

const SERVERFUL_HINTS = [
  "gpu", "render", "blender", "train", "fine-tune", "pod", "desktop",
  "kasm", "vnc", "cuda", "long job", "overnight", "background job",
  "xonotic server", "game server",
];

/** Resolve where this turn runs. `auto` → serverless unless heavy hints. */
export function resolveExecMode(brainExec: SwarmExecMode, message: string): "serverless" | "serverful" {
  if (brainExec === "serverless") return "serverless";
  if (brainExec === "serverful") return "serverful";
  const t = String(message ?? "").toLowerCase();
  return SERVERFUL_HINTS.some((h) => t.includes(h)) ? "serverful" : "serverless";
}

/* ---------------------------------------------------------------------------
 * Internal RAG over the user's .txt docs. Tokenizer: lowercase alnum words
 * minus a small stopword set. Score = shared distinct tokens (+2 for title
 * hits, +1 per repeat capped). No embeddings, no service, deterministic.
 * ------------------------------------------------------------------------- */

const STOPWORDS = new Set(
  "a,an,and,are,as,at,be,but,by,for,from,has,have,he,in,into,is,it,its,of,on,or,she,that,the,their,them,they,this,to,was,we,were,will,with,you,your,what,when,where,which,who,how,why,can,could,should,would,do,does,did,not,no,yes,if,then,than,so,such,only,also,just,about,me,my,i".split(","),
);

export function tokenize(text: string): string[] {
  return String(text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export type BrainDoc = { id?: string; name: string; content: string };

export type RagChunk = { doc: string; chunk: string; score: number };

function chunkDoc(doc: BrainDoc): { doc: string; chunk: string }[] {
  const content = String(doc.content ?? "");
  const out: { doc: string; chunk: string }[] = [];
  for (let i = 0; i < content.length; i += SWARM_RAG_CHUNK_CHARS) {
    const chunk = content.slice(i, i + SWARM_RAG_CHUNK_CHARS).trim();
    if (chunk.length > 40) out.push({ doc: doc.name, chunk });
  }
  return out;
}

function scoreChunk(queryTokens: Set<string>, titleTokens: Set<string>, chunk: string): number {
  const seen = new Set<string>();
  let score = 0;
  for (const w of tokenize(chunk)) {
    if (!queryTokens.has(w) || seen.has(w)) continue;
    seen.add(w);
    score += 1 + (titleTokens.has(w) ? 2 : 0);
  }
  return score;
}

/**
 * Retrieve top-K chunks for a query within the char budget. Returns []
 * when nothing scores - the prompt then carries no RAG block (zero tokens).
 */
export function retrieveTxtChunks(query: string, docs: BrainDoc[], topK = SWARM_RAG_TOP_K): RagChunk[] {
  const qTokens = new Set(tokenize(query));
  if (!qTokens.size || !docs.length) return [];
  const scored: RagChunk[] = [];
  for (const doc of docs) {
    const titleTokens = new Set(tokenize(doc.name));
    for (const { chunk } of chunkDoc(doc)) {
      const score = scoreChunk(qTokens, titleTokens, chunk);
      if (score > 0) scored.push({ doc: doc.name, chunk, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const picked: RagChunk[] = [];
  let budget = SWARM_RAG_BUDGET_CHARS;
  for (const c of scored) {
    if (picked.length >= topK) break;
    const cost = c.chunk.length + c.doc.length + 16;
    if (cost > budget) continue;
    picked.push(c);
    budget -= cost;
  }
  return picked;
}

/** Render retrieved chunks as one tagged prompt block, budgeted. */
export function renderRagBlock(chunks: RagChunk[]): string {
  if (!chunks.length) return "";
  const parts = chunks.map((c) => `[doc: ${c.doc.slice(0, 40)}] ${c.chunk}`);
  return `Notes from your files: ${parts.join(" ")}`.slice(0, SWARM_RAG_BUDGET_CHARS + 64);
}

/* ---------------------------------------------------------------------------
 * Auto-orchestration: one message, parallel work → child instances of the
 * swarm itself. Pure decision + deterministic subtask slicing; the route
 * layer inserts the child swarm_sessions rows (parent_session_id) and the
 * children reason with the same brain + RAG on their own slice.
 * ------------------------------------------------------------------------- */

const SPAWN_HINTS = [
  "in parallel", "at the same time", "meanwhile", "delegate",
  "split up", "divide and conquer", "and also", "plus also",
];

export type SpawnPlan = { count: number; subtasks: string[] };

/** Decide whether this turn should fan out child instances. Pure. */
export function planSpawn(message: string, size: number): SpawnPlan {
  const text = String(message ?? "");
  const t = text.toLowerCase();
  const hinted = SPAWN_HINTS.some((h) => t.includes(h));
  let parts = text
    .split(/\s+and also\s+|\s+plus also\s+|;\s+|\n+\s*[-*]\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  // Comma lists ("research A, B, C in parallel") never match the splitter
  // above, so a hinted-but-unsplit message gets one comma pass. Unhinted
  // prose is untouched: everyday commas must not fan out sessions.
  if (hinted && parts.length < 2) {
    parts = text
      .split(/\s*,\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length > 8);
  }
  if (!hinted && parts.length < 2) return { count: 0, subtasks: [] };
  if (parts.length < 2) return { count: 0, subtasks: [] };
  // Children are extra instances beyond this session's own agents: cap both
  // by SWARM_MAX_CHILDREN and by what fits beside the current size (≤5 total
  // reasoning slices, mirroring SWARM_MAX_AGENTS). Each child takes one
  // subtask slice; the parent session keeps the overall goal.
  const count = Math.min(SWARM_MAX_CHILDREN, parts.length, Math.max(0, 5 - Math.max(1, size)));
  if (count < 1) return { count: 0, subtasks: [] };
  return { count, subtasks: parts.slice(0, count) };
}
