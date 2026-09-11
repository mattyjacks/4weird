/**
 * Standardized cosmetics inventory; the ONE shop for looks across the whole
 * app. Every item costs COSMETIC_PRICE_COINS (10), works on the Buddy avatar,
 * and is looks-only: nothing here changes gameplay anywhere, so there is no
 * pay-to-win vector to audit per game. Gameplay boosts live under dev
 * charges (singleplayer only, capped); never in this catalog.
 *
 * Pure module (imports ./economy only): transpile-runnable under node.
 */

import { COSMETIC_PRICE_COINS } from "./economy";
import type { AvatarKind } from "../components/buddy/avatars/types";

export const COSMETIC_SLOTS = ["hat", "glasses", "outfit", "accessory", "effect"] as const;
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];

export type CosmeticItem = {
  id: string;
  slot: CosmeticSlot;
  name: string;
  blurb: string;
  /** Always COSMETIC_PRICE_COINS; enforced by catalog check below. */
  price: number;
  /** Avatar kinds that can wear it. */
  kinds: AvatarKind[];
};

const ALL: AvatarKind[] = ["cube", "cloud", "anime"];

function item(id: string, slot: CosmeticSlot, name: string, blurb: string, kinds: AvatarKind[] = ALL): CosmeticItem {
  return { id, slot, name, blurb, price: COSMETIC_PRICE_COINS, kinds };
}

export const COSMETIC_CATALOG: CosmeticItem[] = [
  // ---- Hats (8) ----
  item("hat-cap", "hat", "Joycap", "Sporty forward cap with a star button."),
  item("hat-crown", "hat", "Tiny Crown", "Royalty, pocket-sized."),
  item("hat-tophat", "hat", "Mini Top Hat", "Fancy evenings in the dungeon."),
  item("hat-halo", "hat", "Soft Halo", "Hovering ring of pure good behavior."),
  item("hat-headphones", "hat", "DJ Headphones", "Oversized cans, always playing."),
  item("hat-wizard", "hat", "Wee Wizard Hat", "Pointy, starry, slightly tilted."),
  item("hat-beanie", "hat", "Cozy Beanie", "With a pom-pom. Obviously."),
  item("hat-viking", "hat", "Viking Helm", "Tiny horns, big courage.", ["cube", "anime"]),
  // ---- Glasses (4) ----
  item("glasses-shades", "glasses", "Cool Shades", "Deal-with-it energy."),
  item("glasses-round", "glasses", "Scholar Rounds", "Brass rounds for smart cookies."),
  item("glasses-star", "glasses", "Star Specs", "See the world in star shape."),
  item("glasses-monocle", "glasses", "Monocle", "One eye, very distinguished."),
  // ---- Outfits (4): full-body themes + chest emblem ----
  item("outfit-midnight", "outfit", "Midnight Onyx", "Deep-space black-violet theme."),
  item("outfit-rosegold", "outfit", "Rose Gold", "Warm metallic blush theme."),
  item("outfit-slime", "outfit", "Slime Pop", "Glossy arcade-green theme."),
  item("outfit-frost", "outfit", "Frostbite", "Icy pale-blue theme."),
  // ---- Accessories (5) ----
  item("acc-scarf", "accessory", "Hero Scarf", "Flutters dramatically. No wind needed."),
  item("acc-bowtie", "accessory", "Bow Tie", "Dapper in 0.2 seconds."),
  item("acc-backpack", "accessory", "Tiny Backpack", "Carries snacks, canonically."),
  item("acc-medal", "accessory", "Gold Medal", "For outstanding lounging."),
  item("acc-flower", "accessory", "Daisy", "Freshly picked, never wilts."),
  // ---- Effects (3) ----
  item("fx-sparkles", "effect", "Sparkle Orbit", "Three twinkles circle you forever."),
  item("fx-halo-ring", "effect", "Floor Halo", "A glowing ring to stand on."),
  item("fx-bubbles", "effect", "Bubble Buddies", "Two bubbles bob alongside."),
];

const BY_ID = new Map(COSMETIC_CATALOG.map((c) => [c.id, c]));

export function cosmeticById(id: unknown): CosmeticItem | undefined {
  return BY_ID.get(String(id ?? "").trim().toLowerCase());
}

export function cosmeticsForSlot(slot: CosmeticSlot): CosmeticItem[] {
  return COSMETIC_CATALOG.filter((c) => c.slot === slot);
}

export function cosmeticsForAvatar(kind: AvatarKind): CosmeticItem[] {
  return COSMETIC_CATALOG.filter((c) => c.kinds.includes(kind));
}

/** Equipped look: at most one item per slot. Color stays free (never sold). */
export type AvatarLoadout = {
  hat?: string;
  glasses?: string;
  outfit?: string;
  accessory?: string;
  effect?: string;
};

export const EMPTY_LOADOUT: AvatarLoadout = {};

export function cleanLoadoutIds(value: unknown): AvatarLoadout {
  const row = (value ?? {}) as Record<string, unknown>;
  const out: AvatarLoadout = {};
  for (const slot of COSMETIC_SLOTS) {
    const id = String(row[slot] ?? "").trim().toLowerCase();
    if (id) (out as Record<string, string>)[slot] = id;
  }
  return out;
}

/**
 * Validate a loadout against owned item ids + avatar kind. Returns item ids
 * in slot order, or an error string the widget can show verbatim.
 */
export function validateLoadout(
  loadout: AvatarLoadout,
  ownedIds: readonly string[],
  kind: AvatarKind,
): { ok: true; ids: string[] } | { ok: false; error: string } {
  const owned = new Set(ownedIds.map((s) => String(s).trim().toLowerCase()));
  const ids: string[] = [];
  for (const slot of COSMETIC_SLOTS) {
    const raw = String((loadout as Record<string, unknown>)[slot] ?? "").trim().toLowerCase();
    if (!raw) continue;
    const def = cosmeticById(raw);
    if (!def) return { ok: false, error: `Unknown cosmetic: ${raw}.` };
    if (def.slot !== slot) return { ok: false, error: `${def.name} is ${def.slot} gear, not ${slot} gear.` };
    if (!owned.has(def.id)) return { ok: false, error: `${def.name} is not yours yet; buy it for ${def.price} coins first.` };
    if (!def.kinds.includes(kind)) return { ok: false, error: `${def.name} doesn't fit the ${kind} avatar.` };
    ids.push(def.id);
  }
  return { ok: true, ids };
}

/** Outfit theme colors (the only thing an outfit repaints). */
export const OUTFIT_COLORS: Record<string, string> = {
  "outfit-midnight": "#2a2138",
  "outfit-rosegold": "#e8a798",
  "outfit-slime": "#58d68d",
  "outfit-frost": "#bfe6ff",
};

export function outfitColor(outfitId: string | undefined): string | null {
  if (!outfitId) return null;
  return OUTFIT_COLORS[outfitId] ?? null;
}
