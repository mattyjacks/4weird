/**
 * VibeCodeWorker DebugPlay visual-QA foundation (Remastery Feature 03, §3.3).
 *
 * NEW-file slice: frame-downsample metadata, last-5-decision loop guard,
 * interopBus `code:fix-available` emission, and `analyzeGameFrameWithAI`
 * against OpenRouter with a fail-open heuristic fallback (no key, network
 * fault, or bad payload → heuristic result, never a throw).
 *
 * Pure logic only: routes own auth, rate limits, and persistence. No
 * secrets live here — the OpenRouter key is read from the server runtime
 * environment at call time and never logged or returned.
 */

export const DEBUG_PLAY_DOWNSAMPLE = { width: 640, height: 360 } as const;

/** Maximum accepted frame payload (data-URL chars) before analysis. */
export const DEBUG_PLAY_MAX_FRAME_CHARS = 8_000_000;

/** How many consecutive identical decisions trigger the loop guard. */
export const DEBUG_PLAY_LOOP_WINDOW = 5;

export type DebugPlaySeverity = "critical" | "warning" | "cosmetic";

export interface BugReport {
  id: string;
  timestampSeconds: number;
  severity: DebugPlaySeverity;
  title: string;
  description: string;
  suggestedFixDiff?: string;
  screenshotBase64: string;
}

export interface DebugPlayAnalysis {
  bugs: BugReport[];
  nextInput: string;
  /** "ai" when OpenRouter answered; "heuristic" for any fail-open path. */
  source: "ai" | "heuristic";
  /** True when the loop guard concluded the player is stuck. */
  stuck: boolean;
}

export interface LoopGuardState {
  decisions: string[];
  frameHash: string | null;
  repeats: number;
}

export interface LoopGuardResult {
  stuck: boolean;
  repeats: number;
  state: LoopGuardState;
}

/**
 * Downsample plan: scale a source frame to fit inside 640x360 preserving
 * aspect ratio (never upscale). Callers do the pixel work (canvas /
 * Sharp / client); this keeps the target canonical per spec §3.3 tip 1.
 */
export function downsamplePlan(
  srcWidth: number,
  srcHeight: number,
  maxWidth = DEBUG_PLAY_DOWNSAMPLE.width,
  maxHeight = DEBUG_PLAY_DOWNSAMPLE.height,
): { width: number; height: number; scale: number } {
  const w = Math.max(1, Math.floor(srcWidth) || 1);
  const h = Math.max(1, Math.floor(srcHeight) || 1);
  const scale = Math.min(1, maxWidth / w, maxHeight / h);
  return {
    width: Math.max(1, Math.floor(w * scale)),
    height: Math.max(1, Math.floor(h * scale)),
    scale,
  };
}

/** Strip a `data:image/...;base64,` prefix; pass through raw base64. */
export function stripDataUrlPrefix(frame: string): string {
  const at = frame.indexOf("base64,");
  return at >= 0 ? frame.slice(at + "base64,".length) : frame;
}

/** Fresh loop-guard state (last decisions + last frame hash). */
export function createLoopGuard(): LoopGuardState {
  return { decisions: [], frameHash: null, repeats: 0 };
}

/**
 * Last-5-decision loop guard (spec §3.3 tip 2): when the analyzer suggests
 * the same action DEBUG_PLAY_LOOP_WINDOW times consecutively AND the frame
 * hash has not changed, the player is stuck against an invisible wall.
 * Pure function — the caller persists `state` between frames.
 */
export function checkLoopGuard(
  prev: LoopGuardState,
  decision: string,
  frameHash: string | null,
): LoopGuardResult {
  const norm = String(decision ?? "idle").trim() || "idle";
  const decisions = [...prev.decisions, norm].slice(-DEBUG_PLAY_LOOP_WINDOW);
  const lastHash = prev.frameHash;
  const sameDecision =
    decisions.length === DEBUG_PLAY_LOOP_WINDOW &&
    decisions.every((d) => d === norm);
  const hashUnchanged =
    frameHash !== null && lastHash !== null && frameHash === lastHash;
  const repeats =
    prev.decisions.length > 0 && prev.decisions[prev.decisions.length - 1] === norm
      ? prev.repeats + 1
      : 1;
  const stuck = sameDecision && hashUnchanged;
  return {
    stuck,
    repeats,
    state: { decisions, frameHash: frameHash ?? lastHash, repeats },
  };
}

export interface FixAvailableEvent {
  code: "fix-available";
  bugId: string;
  gameSlug: string;
  diff: string;
}

/**
 * Emit a `code:fix-available` event on the cross-tool interop bus
 * (spec §3.3 tip 3). Fail-open: never throws; resolves false when no bus
 * is present (e.g. server-side route context).
 */
export function emitFixAvailable(event: FixAvailableEvent): boolean {
  try {
    const bus = (globalThis as unknown as {
      interopBus?: { emit?: (name: string, payload: unknown) => void };
    }).interopBus;
    if (!bus || typeof bus.emit !== "function") return false;
    bus.emit("code:fix-available", event);
    return true;
  } catch {
    return false;
  }
}

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `dp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
  }
}

/**
 * Fail-open heuristic fallback: always returns a well-formed analysis
 * without any network call. Tiny/empty frames hint at a blank or
 * failed capture (warning); otherwise a cosmetic all-clear. When the
 * loop guard reports stuck, the bug list gains a warning and the next
 * input flips to a recovery action instead of repeating the loop.
 */
export function heuristicAnalysis(
  frameBase64: string,
  gameSlug: string,
  timestampSeconds: number,
  stuck: boolean,
  stuckDecision: string,
): DebugPlayAnalysis {
  const bytes = stripDataUrlPrefix(frameBase64).length;
  const bugs: BugReport[] = [];
  if (bytes < 1024) {
    bugs.push({
      id: makeId(),
      timestampSeconds,
      severity: "warning",
      title: "Blank or missing frame",
      description: `Captured frame for "${gameSlug}" is empty or suspiciously small (${bytes} chars); the canvas may have failed to render or capture.`,
      screenshotBase64: frameBase64.slice(0, 512),
    });
  }
  if (stuck) {
    bugs.push({
      id: makeId(),
      timestampSeconds,
      severity: "warning",
      title: "Possible soft-lock: repeated input, static frame",
      description: `The analyzer suggested "${stuckDecision}" ${DEBUG_PLAY_LOOP_WINDOW} times consecutively with an unchanged frame; the player entity may be stuck against an invisible collision wall.`,
      screenshotBase64: frameBase64.slice(0, 512),
    });
  }
  return {
    bugs,
    nextInput: stuck ? "jump" : "idle",
    source: "heuristic",
    stuck,
  };
}

/**
 * Analyze one downsampled game frame with a multi-modal LLM via OpenRouter.
 * Fail-open: any missing key, network fault, non-OK status, or unparseable
 * payload falls back to {@link heuristicAnalysis} — callers always get a
 * well-formed `{ bugs, nextInput }` and never a rejection for AI reasons.
 */
export async function analyzeGameFrameWithAI(
  frameBase64: string,
  gameSlug: string,
  currentCodeSnippet?: string,
  opts?: { timestampSeconds?: number; signal?: AbortSignal },
): Promise<DebugPlayAnalysis> {
  const timestampSeconds = opts?.timestampSeconds ?? 0;
  const slug = String(gameSlug ?? "").trim() || "unknown-game";
  const apiKey = (process.env.OPENROUTER_API_KEY ?? "").trim();
  if (!apiKey) {
    return heuristicAnalysis(frameBase64, slug, timestampSeconds, false, "idle");
  }

  try {
    const systemPrompt =
      `You are DebugPlay, an AI automated game QA engineer inspecting gameplay frames for the game "${slug}". ` +
      `Analyze the provided screenshot. Detect visual bugs (black screen, missing textures, player clipping out of bounds, broken UI). ` +
      `Suggest whether the game is running normally and output the next recommended controller action (e.g., "arrow_right", "space", "idle"). ` +
      `Format output strictly as JSON with shape {"bugs": [{"id": string, "severity": "critical"|"warning"|"cosmetic", "title": string, "description": string, "suggestedFixDiff": string?}], "nextInput": string}.`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    const onAbort = () => controller.abort();
    opts?.signal?.addEventListener("abort", onAbort, { once: true });
    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this game frame (downsampled to ${DEBUG_PLAY_DOWNSAMPLE.width}x${DEBUG_PLAY_DOWNSAMPLE.height}). Source snippet: ${currentCodeSnippet ?? "N/A"}`,
                },
                { type: "image_url", image_url: { url: frameBase64 } },
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
      opts?.signal?.removeEventListener("abort", onAbort);
    }

    if (!response.ok) {
      return heuristicAnalysis(frameBase64, slug, timestampSeconds, false, "idle");
    }
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const parsed = JSON.parse(
      data.choices?.[0]?.message?.content ?? "{}",
    ) as { bugs?: unknown; nextInput?: unknown };
    const bugs = Array.isArray(parsed.bugs)
      ? (parsed.bugs as Record<string, unknown>[]).map((b) => ({
          id: String(b["id"] ?? makeId()),
          timestampSeconds,
          severity: (["critical", "warning", "cosmetic"] as const).includes(
            b["severity"] as DebugPlaySeverity,
          )
            ? (b["severity"] as DebugPlaySeverity)
            : ("cosmetic" as const),
          title: String(b["title"] ?? "Untitled observation").slice(0, 200),
          description: String(b["description"] ?? "").slice(0, 2000),
          ...(typeof b["suggestedFixDiff"] === "string" && b["suggestedFixDiff"]
            ? { suggestedFixDiff: b["suggestedFixDiff"].slice(0, 8000) }
            : {}),
          screenshotBase64: frameBase64.slice(0, 512),
        }))
      : [];
    const nextInput =
      typeof parsed.nextInput === "string" && parsed.nextInput.trim()
        ? parsed.nextInput.trim().slice(0, 64)
        : "idle";
    return { bugs, nextInput, source: "ai", stuck: false };
  } catch {
    return heuristicAnalysis(frameBase64, slug, timestampSeconds, false, "idle");
  }
}
