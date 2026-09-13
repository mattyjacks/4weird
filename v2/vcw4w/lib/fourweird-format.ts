/**
 * lib/fourweird-format.ts — universal `.4weird` project container helpers (Remastery Feature 10, §3.10).
 *
 * USAGE (any tool team — export/import/download/backup of game projects, NLE timelines,
 * sprite atlases, VCW suites):
 *   import { createContainer, validateContainer, serializeContainer, parseContainer } from "@/lib/fourweird-format";
 *   const c = createContainer("game_project", { title: "My Game", author: "me" }, { level: 1 });
 *   const json = serializeContainer(c);          // throws only on oversize, never on shape
 *   const back = parseContainer(json);           // { ok, container?, errors[] } — fail-open
 *
 * CONTRACT:
 * - Magic version tag `$4weird: 1` (README §3.10). parseContainer() accepts ONLY 1.
 * - Fail-open validation: validateContainer() returns { ok, errors[] }; parseContainer()
 *   never throws on malformed input (only serializeContainer() throws, and only for
 *   oversize payloads that could never download safely).
 * - Safety caps: max 200 assets, each dataBase64 max ~15MB chars, total serialized max
 *   ~64MB chars; filenames are basename-only (no path traversal); mime allowlist enforced.
 */

export const FOURWEIRD_MAGIC = 1;
export const FOURWEIRD_EXTENSION = ".4weird";

export type FourWeirdModule = "game_project" | "video_nle" | "sprite_atlas" | "vcw_suite";

export interface FourWeirdMetadata {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  appVersion: string;
  tags: string[];
}

export interface FourWeirdAsset {
  filename: string;
  mimeType: string;
  dataBase64: string;
}

export interface FourWeirdProjectContainer {
  $4weird: 1;
  module: FourWeirdModule;
  metadata: FourWeirdMetadata;
  payload: Record<string, unknown>;
  assets: FourWeirdAsset[];
}

export interface ContainerValidation {
  ok: boolean;
  errors: string[];
}

export interface ContainerParseResult extends ContainerValidation {
  container?: FourWeirdProjectContainer;
}

const MAX_ASSETS = 200;
const MAX_ASSET_CHARS = 15_000_000;
const MAX_TOTAL_CHARS = 64_000_000;

const ALLOWED_MIME_PREFIXES = ["image/", "audio/", "video/", "application/json", "text/plain"];
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function basename(filename: string): string {
  return String(filename ?? "").split(/[\\/]/).pop() ?? "";
}

/** Build a container with fresh id/createdAt. Metadata fields fall back to safe defaults. */
export function createContainer(
  moduleKind: FourWeirdModule,
  metadata: Partial<FourWeirdMetadata> & { title: string },
  payload: Record<string, unknown> = {},
  assets: FourWeirdAsset[] = [],
): FourWeirdProjectContainer {
  const now = new Date().toISOString();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `fw_${Date.now().toString(36)}_${Math.floor(Math.random() * 0xffffffff).toString(16)}`;
  return {
    $4weird: FOURWEIRD_MAGIC,
    module: moduleKind,
    metadata: {
      id,
      title: metadata.title,
      author: metadata.author ?? "unknown",
      createdAt: metadata.createdAt ?? now,
      appVersion: metadata.appVersion ?? "1.0.0",
      tags: Array.isArray(metadata.tags) ? metadata.tags.map(String).slice(0, 32) : [],
    },
    payload: isRecord(payload) ? payload : {},
    assets: Array.isArray(assets) ? assets.slice(0, MAX_ASSETS) : [],
  };
}

/** Shape + safety validation. Pure, never throws — returns { ok, errors }. */
export function validateContainer(value: unknown): ContainerValidation {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ["Container must be a JSON object."] };
  if (value["$4weird"] !== FOURWEIRD_MAGIC) {
    errors.push(`Bad magic tag: expected $4weird=${FOURWEIRD_MAGIC}.`);
  }
  const mod = value["module"];
  if (
    mod !== "game_project" &&
    mod !== "video_nle" &&
    mod !== "sprite_atlas" &&
    mod !== "vcw_suite"
  ) {
    errors.push("module must be game_project | video_nle | sprite_atlas | vcw_suite.");
  }
  const meta = value["metadata"];
  if (!isRecord(meta)) {
    errors.push("metadata must be an object.");
  } else {
    for (const key of ["id", "title", "author", "createdAt", "appVersion"]) {
      if (typeof meta[key] !== "string" || !String(meta[key])) errors.push(`metadata.${key} is required.`);
    }
    if (meta["tags"] !== undefined && !Array.isArray(meta["tags"])) {
      errors.push("metadata.tags must be an array.");
    }
  }
  if (value["payload"] !== undefined && !isRecord(value["payload"])) {
    errors.push("payload must be an object.");
  }
  const assets = value["assets"];
  if (!Array.isArray(assets)) {
    errors.push("assets must be an array.");
  } else {
    if (assets.length > MAX_ASSETS) errors.push(`Too many assets (max ${MAX_ASSETS}).`);
    assets.slice(0, MAX_ASSETS).forEach((asset: unknown, i: number) => {
      if (!isRecord(asset)) {
        errors.push(`assets[${i}] must be an object.`);
        return;
      }
      const filename = String(asset["filename"] ?? "");
      if (!filename || basename(filename) !== filename || filename.startsWith(".")) {
        errors.push(`assets[${i}].filename must be a plain basename (no paths).`);
      }
      const mime = String(asset["mimeType"] ?? "");
      if (!ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) {
        errors.push(`assets[${i}].mimeType not allowed: ${mime || "(empty)"}.`);
      }
      const data = String(asset["dataBase64"] ?? "");
      if (!data || data.length > MAX_ASSET_CHARS || !BASE64_RE.test(data.replace(/\s+/g, ""))) {
        errors.push(`assets[${i}].dataBase64 must be base64 within size caps.`);
      }
    });
  }
  return { ok: errors.length === 0, errors };
}

/** Serialize for download/share. Throws ONLY when the output exceeds MAX_TOTAL_CHARS. */
export function serializeContainer(container: FourWeirdProjectContainer): string {
  const json = JSON.stringify(container);
  if (json.length > MAX_TOTAL_CHARS) {
    throw new Error(`Container too large (${json.length} chars, max ${MAX_TOTAL_CHARS}).`);
  }
  return json;
}

/** Fail-open parse: malformed JSON or bad shape yields { ok: false, errors } — never throws. */
export function parseContainer(json: string): ContainerParseResult {
  let decoded: unknown;
  try {
    decoded = JSON.parse(String(json ?? "")) as unknown;
  } catch {
    return { ok: false, errors: ["Not valid JSON."] };
  }
  const validation = validateContainer(decoded);
  if (!validation.ok) return validation;
  return { ok: true, errors: [], container: decoded as FourWeirdProjectContainer };
}

/** Suggested download filename: `<id>.4weird` with unsafe chars stripped. */
export function containerFilename(container: FourWeirdProjectContainer): string {
  const safe = container.metadata.id.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 64) || "project";
  return `${safe}${FOURWEIRD_EXTENSION}`;
}
