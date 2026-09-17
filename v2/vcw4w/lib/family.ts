/**
 * Family accounts; shared shapes + validation for Parent/Child accounts.
 *
 * Two independent axes (see supabase/migrations/20260924000002_family_accounts.sql):
 * - family_role: 'solo' | 'parent' (full Supabase accounts; only Adult 18+
 *   accounts may become 'parent' and create children - COPPA consent)
 * - age_band: 'unknown' (legacy) | 'kid' (legacy full-account rows only) |
 *   'teen' (13-17) | 'adult' (18+). Full accounts are 13+ only: signup
 *   requires teen/adult, PATCH rejects kid/unknown, and teen bands block
 *   Adults (18+) titles server-side. No DOB is ever collected.
 * - Child sub-accounts (kid_accounts): parent-attested band kid/teen/adult,
 *   Clan-style `username#1234` + password login, NO Supabase user.
 */

export type FamilyRole = "solo" | "parent";
export type AgeBand = "unknown" | "kid" | "teen" | "adult";
export type KidStatus = "active" | "suspended";

export type KidAccount = {
  id: string;
  username: string;
  discriminator: string;
  age_band: Exclude<AgeBand, "unknown">;
  status: KidStatus;
  created_at: string;
  last_login_at: string | null;
};

export type KidControls = {
  kid_id: string;
  daily_minutes: number | null;
  allowed_start: string;
  allowed_end: string;
  timezone: string;
  monthly_cap_coins: number;
  /** Maximum child spend in any rolling 60-minute window; zero disables. */
  hourly_cap_coins?: number;
  hard_stop: boolean;
  /** Empty means all games; non-empty is the parent's explicit allowlist. */
  allowed_games?: string[];
  /** Optional IDs such as game:slug, app:slug, ai:vendor, or service:slug. */
  allowed_features?: string[];
  updated_at: string;
};

export function isGameAllowlist(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 500) return null;
  const slugs = value.map((item) => String(item).trim().toLowerCase());
  if (slugs.some((slug) => !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug))) return null;
  return [...new Set(slugs)];
}

export function isFeatureAllowlist(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 500) return null;
  const features = value.map((item) => String(item).trim().toLowerCase());
  if (features.some((feature) => !/^(game|app|ai|service):[a-z0-9][a-z0-9_-]{0,63}$/.test(feature))) return null;
  return [...new Set(features)];
}

/** Only entries in a feature's category constrain that category; games also have their legacy game allowlist. */
export function canKidUseFeature(
  controls: Pick<KidControls, "allowed_features"> | null | undefined,
  feature: string,
): boolean {
  const allowed = controls?.allowed_features;
  if (!Array.isArray(allowed) || allowed.length === 0) return true;
  const normalized = feature.trim().toLowerCase();
  const category = normalized.split(":", 1)[0];
  const categoryRules = allowed.filter((item) => item.startsWith(`${category}:`));
  return categoryRules.length === 0 || categoryRules.includes(normalized);
}

export function kidHandle(username: string, discriminator: string): string {
  return `${username}#${discriminator}`;
}

/** Parse `username#1234` (split on the LAST # so pasted handles survive). */
export function parseKidHandle(value: unknown): { username: string; discriminator: string } | null {
  const v = String(value ?? "").trim().toLowerCase();
  const hash = v.lastIndexOf("#");
  if (hash <= 0) return null;
  const username = v.slice(0, hash);
  const discriminator = v.slice(hash + 1);
  if (!/^[a-z0-9_-]{3,24}$/.test(username)) return null;
  if (!/^[0-9]{4}$/.test(discriminator)) return null;
  return { username, discriminator };
}

export function isKidUsername(value: unknown): string {
  const v = String(value ?? "").trim().toLowerCase();
  return /^[a-z0-9_-]{3,24}$/.test(v) ? v : "";
}

export function isAgeBand(value: unknown): AgeBand | null {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "unknown" || v === "kid" || v === "teen" || v === "adult" ? v : null;
}

export function isKidBand(value: unknown): Exclude<AgeBand, "unknown"> | null {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "kid" || v === "teen" || v === "adult" ? v : null;
}

/** Minimum catalog age a band may play: kid→0+, teen→13+, adult→18+. */
export function bandMinAge(band: string): number {
  if (band === "adult") return 18;
  if (band === "teen") return 13;
  return 0;
}

export const KID_SESSION_COOKIE = "kid_session";
/** 7-day child sessions (PQ HNDL window): sliding refresh extends while active. */
export const KID_SESSION_DAYS = 7;
export const MAX_KIDS_PER_PARENT = 10;
