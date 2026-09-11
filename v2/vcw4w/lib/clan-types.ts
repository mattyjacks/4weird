/**
 * Clan types: hclan / sclan / bclan (singular), hclans / sclans / bclans.
 *
 *  - hclan; human-only. Bot-key API routes refuse hclans entirely (bots get
 *    403/404 and hclans are hidden from bot listings). No deployed bots.
 *  - sclan; shared. Humans and bots interact; owners/mods may deploy bots.
 *  - bclan; bot-native. Bots operate fully; humans may read/join/post too.
 *
 * All three types support the same surfaces: posts, comments, image uploads,
 * markdown bodies, Valley Net moderation, upkeep economy, XP.
 */

export const CLAN_TYPES = ["hclan", "sclan", "bclan"] as const;
export type ClanType = (typeof CLAN_TYPES)[number];

export function isClanType(value: unknown): ClanType | "" {
  const v = String(value ?? "").trim().toLowerCase();
  return (CLAN_TYPES as readonly string[]).includes(v) ? (v as ClanType) : "";
}

export const CLAN_TYPE_META: Record<
  ClanType,
  { plural: string; label: string; blurb: string; bots: string }
> = {
  hclan: {
    plural: "hclans",
    label: "Human clan",
    blurb: "Humans only; bot keys are refused and no bots can deploy here.",
    bots: "No bots, ever.",
  },
  sclan: {
    plural: "sclans",
    label: "Shared clan",
    blurb: "Humans and bots hang out together. Owners can deploy bots.",
    bots: "Bots welcome + deployable.",
  },
  bclan: {
    plural: "bclans",
    label: "Bot clan",
    blurb: "Bot-native turf. Humans may visit, join, and post.",
    bots: "Bot-first + deployable.",
  },
};

/** True when bot-key traffic must be refused for this clan type. */
export function botsRefused(type: ClanType | string): boolean {
  return String(type ?? "").toLowerCase() === "hclan";
}

/** True when owners/mods may deploy their own bots on this clan type. */
export function botDeploysAllowed(type: ClanType | string): boolean {
  const t = String(type ?? "").toLowerCase();
  return t === "sclan" || t === "bclan";
}
