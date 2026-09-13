/**
 * Sandboxed mod/plugin runtime loader — games-lane Wave 3 slice.
 *
 * Remastery README Feature 12 (§3.12) full runtime: manifest-driven loading on
 * top of the W1 schema owner (`./game-mods` — imported, never re-landed).
 *
 * Contract:
 * - Every load validates via `validateGameModManifest` (W1 rules).
 * - Capabilities are allow-listed: only `RUNTIME_CAPABILITIES` are ever
 *   granted; anything else is denied with a reason, never silently ignored.
 * - Fail-open (§1.2 axiom 3): a bad manifest never bricks the shell — every
 *   entry point returns `{ ok, reason }` instead of throwing.
 * - Mod code is UNTRUSTED: it runs in an iframe with `allow-scripts` ONLY
 *   (re-exported `MOD_IFRAME_SANDBOX`), never `allow-same-origin`.
 *
 * Pure TypeScript: no React, no DOM, no secrets. Safe to import from server
 * components, route handlers, and client components (the plugins browser
 * page persists the registry to localStorage itself).
 */

import {
  GLOBAL_MOD_TARGET,
  MOD_IFRAME_SANDBOX,
  isModCompatibleWithGame,
  validateGameModManifest,
  type GameModManifest,
  type ModPermission,
} from "./game-mods";

export { MOD_IFRAME_SANDBOX };

/**
 * Capabilities the runtime shell actually implements. Subset of the W1
 * `MOD_PERMISSIONS` declaration allowlist: a manifest may DECLARE
 * `clipboard:read` / `clipboard:write` (valid per schema) but the loader
 * DENIES them at runtime with a reason — declaration is not a grant.
 */
export const RUNTIME_CAPABILITIES = [
  "storage:local",
  "audio:play",
  "interop:emit",
] as const satisfies readonly ModPermission[];

export type RuntimeCapability = (typeof RUNTIME_CAPABILITIES)[number];

function isRuntimeCapability(value: string): value is RuntimeCapability {
  return (RUNTIME_CAPABILITIES as readonly string[]).includes(value);
}

/** One denied capability + the human reason it was denied. */
export interface DeniedCapability {
  capability: string;
  reason: string;
}

/** Options for a single load attempt. */
export interface LoadModOptions {
  /** Game slug the mod should plug into (e.g. "gravegain3d"). */
  gameSlug: string;
  /**
   * When true (default), mods without `is_verified: true` are rejected.
   * The plugins browser page exposes this as the "verified-only" gate.
   */
  verifiedOnly?: boolean;
}

/** Fail-open outcome of one load attempt. Never throws. */
export interface LoadedMod {
  ok: boolean;
  /** Set when `ok` is true. */
  manifest: GameModManifest | null;
  /** Capabilities from the manifest the shell will actually grant. */
  grantedCapabilities: RuntimeCapability[];
  /** Declared-but-not-granted capabilities, each with a reason. */
  denied: DeniedCapability[];
  /** Machine-readable rejection reason when `ok` is false. */
  reason: string | null;
  /** Validation / compatibility error detail (empty when `ok`). */
  errors: string[];
}

/**
 * Validate + admit one manifest value for one game. Fail-open: invalid
 * input yields `{ ok: false, reason, errors }`, never an exception.
 */
export function loadModManifest(value: unknown, options: LoadModOptions): LoadedMod {
  const gameSlug = options.gameSlug?.trim() ?? "";
  if (!gameSlug) {
    return {
      ok: false,
      manifest: null,
      grantedCapabilities: [],
      denied: [],
      reason: "unknown-game",
      errors: ["gameSlug must be a non-empty string"],
    };
  }

  let parsed: GameModManifest | null = null;
  try {
    const result = validateGameModManifest(value);
    if (!result.ok || !result.manifest) {
      return {
        ok: false,
        manifest: null,
        grantedCapabilities: [],
        denied: [],
        reason: "invalid-manifest",
        errors: result.errors,
      };
    }
    parsed = result.manifest;
  } catch (err) {
    return {
      ok: false,
      manifest: null,
      grantedCapabilities: [],
      denied: [],
      reason: "invalid-manifest",
      errors: [`manifest validation threw: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  const manifest: GameModManifest = parsed;

  if (manifest.target_game !== GLOBAL_MOD_TARGET && !isModCompatibleWithGame(manifest, gameSlug)) {
    return {
      ok: false,
      manifest: null,
      grantedCapabilities: [],
      denied: [],
      reason: "incompatible-game",
      errors: [`mod targets "${manifest.target_game}" and does not apply to "${gameSlug}"`],
    };
  }

  if ((options.verifiedOnly ?? true) && manifest.is_verified !== true) {
    return {
      ok: false,
      manifest: null,
      grantedCapabilities: [],
      denied: [],
      reason: "unverified-blocked",
      errors: [`mod "${manifest.slug}" is not verified — disable the verified-only gate to load it`],
    };
  }

  const grantedCapabilities: RuntimeCapability[] = [];
  const denied: DeniedCapability[] = [];
  for (const permission of manifest.permissions ?? []) {
    if (isRuntimeCapability(permission)) {
      grantedCapabilities.push(permission);
    } else {
      denied.push({
        capability: permission,
        reason: `"${permission}" is a valid declaration but the runtime shell does not grant it — the mod loads without it`,
      });
    }
  }

  return {
    ok: true,
    manifest,
    grantedCapabilities,
    denied,
    reason: null,
    errors: [],
  };
}

/** Parse a JSON string then load it (e.g. a pasted `.4weird-mod.json`). */
export function loadModManifestJson(json: string, options: LoadModOptions): LoadedMod {
  try {
    return loadModManifest(JSON.parse(json) as unknown, options);
  } catch (err) {
    return {
      ok: false,
      manifest: null,
      grantedCapabilities: [],
      denied: [],
      reason: "invalid-manifest",
      errors: [`manifest is not valid JSON: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

/** Iframe mount props for a loaded mod. Sandbox is always allow-scripts only. */
export interface ModMount {
  src: string;
  sandbox: typeof MOD_IFRAME_SANDBOX;
  title: string;
}

/** Build the sandboxed iframe mount for an admitted manifest. */
export function modMountFor(manifest: GameModManifest): ModMount {
  return {
    src: manifest.script_url,
    sandbox: MOD_IFRAME_SANDBOX,
    title: `${manifest.name} v${manifest.version} (sandboxed mod)`,
  };
}

/* ---------------------------------------------------------------------------
 * Per-game registry (enable/disable). Plain data + pure helpers; the page
 * owns persistence (localStorage) so this module stays DOM-free.
 * ------------------------------------------------------------------------- */

/** One registry entry: an admitted manifest + its per-game enabled flag. */
export interface ModRegistryEntry {
  manifest: GameModManifest;
  /** Game slug this entry was admitted for. */
  gameSlug: string;
  enabled: boolean;
}

/** Registry keyed by mod slug (one entry per slug). */
export type ModRegistry = Record<string, ModRegistryEntry>;

/** Admit a manifest value into a registry copy. Fail-open — returns the
 *  unchanged registry plus the load outcome. */
export function registerMod(
  registry: ModRegistry,
  value: unknown,
  options: LoadModOptions,
): { registry: ModRegistry; loaded: LoadedMod } {
  const loaded = loadModManifest(value, options);
  if (!loaded.ok || !loaded.manifest) return { registry, loaded };
  const manifest = loaded.manifest;
  return {
    registry: {
      ...registry,
      [manifest.slug]: { manifest, gameSlug: options.gameSlug.trim(), enabled: true },
    },
    loaded,
  };
}

/** Flip one entry's enabled flag (unknown slug → unchanged copy). */
export function setModEnabled(registry: ModRegistry, slug: string, enabled: boolean): ModRegistry {
  const entry = registry[slug];
  if (!entry) return registry;
  return { ...registry, [slug]: { ...entry, enabled } };
}

/** Remove one entry (unknown slug → unchanged copy). */
export function removeMod(registry: ModRegistry, slug: string): ModRegistry {
  if (!registry[slug]) return registry;
  const next = { ...registry };
  delete next[slug];
  return next;
}

/** Enabled entries admitted for `gameSlug` (global-target mods included). */
export function enabledModsForGame(registry: ModRegistry, gameSlug: string): ModRegistryEntry[] {
  return Object.values(registry).filter(
    (entry) =>
      entry.enabled &&
      (entry.manifest.target_game === GLOBAL_MOD_TARGET || entry.gameSlug === gameSlug),
  );
}

/** Serialize a registry for localStorage. Never throws (falls back to "{}"). */
export function serializeRegistry(registry: ModRegistry): string {
  try {
    return JSON.stringify(registry);
  } catch {
    return "{}";
  }
}

/**
 * Restore a registry from a localStorage string. Every entry is re-validated
 * through the loader (fail-open): bad rows are dropped with reasons, valid
 * rows keep their stored enabled flag.
 */
export function deserializeRegistry(
  json: string,
  options: LoadModOptions,
): { registry: ModRegistry; dropped: { slug: string; reason: string }[] } {
  const dropped: { slug: string; reason: string }[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(json) as unknown;
  } catch {
    return { registry: {}, dropped: [{ slug: "(payload)", reason: "invalid-manifest" }] };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { registry: {}, dropped: [{ slug: "(payload)", reason: "invalid-manifest" }] };
  }
  let registry: ModRegistry = {};
  for (const [slug, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof entry !== "object" || entry === null) {
      dropped.push({ slug, reason: "invalid-manifest" });
      continue;
    }
    const { manifest, enabled } = entry as { manifest?: unknown; enabled?: unknown };
    const loaded = loadModManifest(manifest, options);
    if (!loaded.ok || !loaded.manifest) {
      dropped.push({ slug, reason: loaded.reason ?? "invalid-manifest" });
      continue;
    }
    registry = {
      ...registry,
      [slug]: {
        manifest: loaded.manifest,
        gameSlug: options.gameSlug.trim(),
        enabled: enabled === true,
      },
    };
  }
  return { registry, dropped };
}
