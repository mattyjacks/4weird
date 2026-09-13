/**
 * ValleyNet skills system (Remastery Feature 13, Wave 2).
 *
 * Pure, unit-testable half of the skills surface: skill manifest schema,
 * an allow-listed permission model, an in-memory registry, and a fail-open
 * loader. Routes own auth, rate limits, SSRF-guarded fetches, and execution.
 *
 * A skill manifest is `{ name, version, permissions, entry }`:
 *   - name: kebab-case id, 1-64 chars (`echo`, `frame-scout`).
 *   - version: semver `MAJOR.MINOR.PATCH` with an optional short prerelease.
 *   - permissions: every entry must appear in VCW_SKILL_PERMISSIONS
 *     (allow-list). Unknown permissions fail the manifest closed.
 *   - entry: `builtin:<id>` for sandboxed builtins, or a relative,
 *     scheme-less path with no `..` segments for future file-backed skills.
 *     Absolute paths, URLs, and parent escapes are rejected.
 *
 * Fail-open loader: loadSkillRegistry() never throws. Invalid manifests are
 * collected in `skipped` with an index + reason so reviewers see what was
 * dropped instead of getting a 500.
 *
 * SSRF note: URL safety itself lives in the canonical server-only guard
 * (lib/ssrf-guard.ts: checkEgressUrl/fetchEgressUrl). This module never
 * fetches; the route validates any caller-supplied sourceUrl there before
 * the skill ever sees it.
 */

/** Allow-listed skill permissions. Unknown strings fail closed at parse. */
export const VCW_SKILL_PERMISSIONS = [
  "skill.describe",
  "skill.echo",
  "run.observe",
  "run.step.read",
  "gateway.quote.read",
  "net.fetch",
] as const;

export type VcwSkillPermission = (typeof VCW_SKILL_PERMISSIONS)[number];

export function isVcwSkillPermission(value: unknown): value is VcwSkillPermission {
  return (
    typeof value === "string" &&
    (VCW_SKILL_PERMISSIONS as readonly string[]).includes(value)
  );
}

export interface VcwSkillManifest {
  name: string;
  version: string;
  permissions: VcwSkillPermission[];
  entry: string;
  description: string;
}

export interface VcwSkillSummary {
  name: string;
  version: string;
  permissions: VcwSkillPermission[];
  description: string;
}

const SKILL_NAME_RE = /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/;
const SKILL_VERSION_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}(-[A-Za-z0-9.-]{1,32})?$/;
const BUILTIN_ENTRY_RE = /^builtin:[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/;

/** Relative, scheme-less entry paths only: no URLs, no absolute paths, no `..`. */
export function isSafeSkillEntry(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) return false;
  if (BUILTIN_ENTRY_RE.test(value)) return true;
  const v = value.trim();
  if (v !== value) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v)) return false; // scheme (http:, data:, ...)
  if (v.startsWith("/") || v.startsWith("\\")) return false;
  const segments = v.split(/[\\/]/);
  if (segments.some((s) => s === "" || s === "." || s === "..")) return false;
  return true;
}

export function cleanSkillName(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().slice(0, 64);
}

export type ParseSkillResult =
  | { manifest: VcwSkillManifest }
  | { error: string };

/**
 * Validate an unknown value as a skill manifest. Unknown permissions fail
 * the manifest closed; extra fields are ignored (never trusted).
 */
export function parseVcwSkillManifest(input: unknown): ParseSkillResult {
  if (typeof input !== "object" || input === null) {
    return { error: "Skill manifest must be an object." };
  }
  const raw = input as Record<string, unknown>;
  const name = cleanSkillName(raw.name);
  if (!SKILL_NAME_RE.test(name)) {
    return { error: "Invalid skill name (kebab-case, 1-64 chars)." };
  }
  const version = String(raw.version ?? "").trim();
  if (!SKILL_VERSION_RE.test(version)) {
    return { error: "Invalid skill version (semver MAJOR.MINOR.PATCH)." };
  }
  if (!Array.isArray(raw.permissions)) {
    return { error: "Skill permissions must be an array." };
  }
  if (raw.permissions.length > 16) {
    return { error: "Too many skill permissions (max 16)." };
  }
  const permissions: VcwSkillPermission[] = [];
  for (const p of raw.permissions) {
    if (!isVcwSkillPermission(p)) {
      return { error: `Unknown skill permission: ${String(p ?? "").slice(0, 64)}.` };
    }
    if (!permissions.includes(p)) permissions.push(p);
  }
  const entry = String(raw.entry ?? "").trim();
  if (!isSafeSkillEntry(entry)) {
    return { error: "Invalid skill entry (builtin:<id> or safe relative path)." };
  }
  const description = String(raw.description ?? "").trim().slice(0, 500);
  return { manifest: { name, version, permissions, entry, description } };
}

/** Runtime permission check: allow-listed at parse, enforced again here. */
export function skillHasPermission(
  manifest: VcwSkillManifest,
  permission: string,
): boolean {
  if (!isVcwSkillPermission(permission)) return false;
  return manifest.permissions.includes(permission);
}

/** Names every required permission the manifest does not grant. */
export function missingSkillPermissions(
  manifest: VcwSkillManifest,
  required: readonly string[],
): string[] {
  return required.filter((p) => !skillHasPermission(manifest, p));
}

export interface VcwSkillRegistry {
  register(input: unknown): { manifest: VcwSkillManifest } | { error: string };
  get(name: string): VcwSkillManifest | null;
  list(): VcwSkillManifest[];
}

export function createSkillRegistry(seed: readonly unknown[] = []): VcwSkillRegistry {
  const byName = new Map<string, VcwSkillManifest>();
  const registry: VcwSkillRegistry = {
    register(input: unknown) {
      const parsed = parseVcwSkillManifest(input);
      if ("error" in parsed) return parsed;
      if (byName.has(parsed.manifest.name)) {
        return { error: `Duplicate skill name: ${parsed.manifest.name}.` };
      }
      byName.set(parsed.manifest.name, parsed.manifest);
      return { manifest: parsed.manifest };
    },
    get(name: string) {
      return byName.get(cleanSkillName(name)) ?? null;
    },
    list() {
      return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
  };
  for (const item of seed) {
    // Fail-open seeding: a bad seed entry never breaks the registry.
    try {
      registry.register(item);
    } catch {
      // collect nothing here; loadSkillRegistry() reports skips instead.
    }
  }
  return registry;
}

export interface VcwSkillLoadReport {
  registry: VcwSkillRegistry;
  skills: VcwSkillManifest[];
  skipped: { index: number; reason: string }[];
}

/**
 * Fail-open loader: builds a registry from untrusted inputs, skipping (and
 * reporting) invalid or duplicate manifests instead of throwing. Never throws.
 */
export function loadSkillRegistry(inputs: readonly unknown[]): VcwSkillLoadReport {
  const skipped: { index: number; reason: string }[] = [];
  try {
    const registry = createSkillRegistry();
    inputs.forEach((item, index) => {
      try {
        const res = registry.register(item);
        if ("error" in res) skipped.push({ index, reason: res.error });
      } catch {
        skipped.push({ index, reason: "Unparsable skill manifest." });
      }
    });
    return { registry, skills: registry.list(), skipped };
  } catch {
    return { registry: createSkillRegistry(), skills: [], skipped };
  }
}

export function toSkillSummary(manifest: VcwSkillManifest): VcwSkillSummary {
  return {
    name: manifest.name,
    version: manifest.version,
    permissions: [...manifest.permissions],
    description: manifest.description,
  };
}

export function listSkillSummaries(registry: VcwSkillRegistry): VcwSkillSummary[] {
  return registry.list().map(toSkillSummary);
}

/** Sandboxed echo builtin: reflects bounded JSON input, executes nothing. */
export const ECHO_SKILL_NAME = "echo" as const;
export const ECHO_SKILL_ENTRY = "builtin:echo" as const;
export const MAX_SKILL_INPUT_BYTES = 64 * 1024;

export const ECHO_SKILL_MANIFEST: VcwSkillManifest = {
  name: ECHO_SKILL_NAME,
  version: "1.0.0",
  permissions: ["skill.describe", "skill.echo"],
  entry: ECHO_SKILL_ENTRY,
  description: "Sandboxed echo skill: reflects bounded JSON input, executes nothing.",
};

export interface EchoSkillSource {
  url: string;
  bytes: number;
  preview: string;
}

export type RunSkillResult = { result: unknown } | { error: string };

function inputTooLarge(input: unknown): boolean {
  try {
    return JSON.stringify(input ?? null).length > MAX_SKILL_INPUT_BYTES;
  } catch {
    return true;
  }
}

/** Pure echo runner: deterministic reflection, no code execution, no fetch. */
export function runEchoSkill(input: unknown, source?: EchoSkillSource): RunSkillResult {
  if (inputTooLarge(input)) {
    return { error: `Skill input too large (max ${MAX_SKILL_INPUT_BYTES} bytes).` };
  }
  if (inputTooLarge(source ?? null)) {
    return { error: "Skill source preview too large." };
  }
  // Structured clone via JSON so the result is always JSON-serializable.
  try {
    const echo = JSON.parse(JSON.stringify(input ?? null)) as unknown;
    const result: Record<string, unknown> = { echo };
    if (source) result.source = { ...source };
    return { result };
  } catch {
    return { error: "Skill input is not JSON-serializable." };
  }
}

/**
 * Sandboxed dispatcher: only `builtin:*` entries run, and only known
 * builtins. File/http entries return an explicit error (never fetched or
 * executed here) so a manifest can never smuggle code execution.
 */
export function runRegisteredSkill(
  registry: VcwSkillRegistry,
  name: string,
  input: unknown,
  source?: EchoSkillSource,
): RunSkillResult {
  const manifest = registry.get(name);
  if (!manifest) return { error: `Unknown skill: ${cleanSkillName(name)}.` };
  if (manifest.entry === ECHO_SKILL_ENTRY) {
    if (!skillHasPermission(manifest, "skill.echo")) {
      return { error: "Skill entry is not granted the echo permission." };
    }
    return runEchoSkill(input, source);
  }
  if (manifest.entry.startsWith("builtin:")) {
    return { error: `Unsupported builtin entry: ${manifest.entry.slice(0, 64)}.` };
  }
  return { error: "File-backed skill entries are not executable in the sandbox." };
}

/** Default registry: echo builtin seeded fail-open (seed is trusted). */
export function defaultSkillRegistry(): VcwSkillRegistry {
  const { registry } = loadSkillRegistry([ECHO_SKILL_MANIFEST]);
  return registry;
}
