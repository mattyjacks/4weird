// GraveGain food batch 04: roster idx 27-35 (cool-cucumber ... warming-ginger).
// Each item spreads its roster entry (id/name/emoji/blurb/effect/tier are never
// retyped) and carries a full 3-games x 3-modes stats table via
// buildFoodStatsTable() plus a 4..100-char drop note per game/mode cell:
// endless = floors/foes, mission = mission reward, mmorpg = market/trade note.

import { buildFoodStatsTable, type GraveGainFoodItemDef } from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "./gravegain-food-roster";

type GameKey = "gravegain1d" | "gravegain2d" | "gravegain3d";
type ModeKey = "endless" | "mission" | "mmorpg";
type Notes = Record<GameKey, Record<ModeKey, string>>;

function makeItem(id: string, notes: Notes): GraveGainFoodItemDef {
  const entry = GRAVEGAIN_FOOD_ROSTER.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown roster id: ${id}`);
  const stats = buildFoodStatsTable(entry.effect, entry.tier);
  (Object.keys(notes) as GameKey[]).forEach((game) => {
    (Object.keys(notes[game]) as ModeKey[]).forEach((mode) => {
      stats[game][mode] = { ...stats[game][mode], note: notes[game][mode] };
    });
  });
  return { ...entry, stats };
}

export const GRAVE_GAIN_FOOD_BATCH_04: GraveGainFoodItemDef[] = [
  makeItem("cool-cucumber", {
    gravegain1d: {
      endless: "Floors 2-6 frost imps drop chilled slices.",
      mission: "Mission 3 heal-cache reward.",
      mmorpg: "Market staple; cheap bulk trade.",
    },
    gravegain2d: {
      endless: "Floors 4-9 bog frogs drop cool rings.",
      mission: "Mission 5 garden-cache reward.",
      mmorpg: "Auction staple; new-player trade.",
    },
    gravegain3d: {
      endless: "Crypt floors 3-7 chillers drop it.",
      mission: "Mission 2 field-ration reward.",
      mmorpg: "Guild vendor staple; easy resale.",
    },
  }),
  makeItem("grave-lettuce", {
    gravegain1d: {
      endless: "Floors 1-5 crypt slugs drop dewy leaves.",
      mission: "Mission 2 sprout-patch reward.",
      mmorpg: "Market greens; steady low-price trade.",
    },
    gravegain2d: {
      endless: "Floors 3-8 garden ghouls drop heads.",
      mission: "Mission 4 greenhouse-cache reward.",
      mmorpg: "Auction greens; bundles sell fast.",
    },
    gravegain3d: {
      endless: "Vault floors 2-6 root mites drop it.",
      mission: "Mission 3 ration-crate reward.",
      mmorpg: "Guild pantry staple; fair resale.",
    },
  }),
  makeItem("iron-broccoli", {
    gravegain1d: {
      endless: "Floors 4-8 iron beetles drop florets.",
      mission: "Mission 4 ward-cache reward.",
      mmorpg: "Smith market ward-snack; firm price.",
    },
    gravegain2d: {
      endless: "Floors 5-10 moss golems drop stalks.",
      mission: "Mission 6 vanguard-cache reward.",
      mmorpg: "Auction ward staple; tanks buy bulk.",
    },
    gravegain3d: {
      endless: "Deep floors 4-9 ore crawlers drop it.",
      mission: "Mission 5 shield-ration reward.",
      mmorpg: "Guild quartermaster stock; good resale.",
    },
  }),
  makeItem("vampire-garlic", {
    gravegain1d: {
      endless: "Floors 5-10 crypt bats drop braids.",
      mission: "Mission 6 chapel-cache reward.",
      mmorpg: "Ward market premium; hunters pay well.",
    },
    gravegain2d: {
      endless: "Floors 6-12 risen thralls drop bulbs.",
      mission: "Mission 7 exorcist-cache reward.",
      mmorpg: "Auction premium ward; strong demand.",
    },
    gravegain3d: {
      endless: "Coffin floors 5-11 vamp spawn drop it.",
      mission: "Mission 6 relic-vault reward.",
      mmorpg: "Guild auction rare; high resale.",
    },
  }),
  makeItem("ogre-onion", {
    gravegain1d: {
      endless: "Floors 3-7 ogre grunts drop layers.",
      mission: "Mission 4 brawler-cache reward.",
      mmorpg: "Market ward bulk; kitchen trade.",
    },
    gravegain2d: {
      endless: "Floors 4-9 hill ogres drop rings.",
      mission: "Mission 5 guard-post reward.",
      mmorpg: "Auction ward bundles; steady sales.",
    },
    gravegain3d: {
      endless: "War floors 4-8 maulers drop it.",
      mission: "Mission 4 barracks-cache reward.",
      mmorpg: "Guild mess staple; fair resale.",
    },
  }),
  makeItem("mighty-peanut", {
    gravegain1d: {
      endless: "Floors 2-6 burrow rats drop shells.",
      mission: "Mission 3 trail-cache reward.",
      mmorpg: "Snack market favorite; quick flips.",
    },
    gravegain2d: {
      endless: "Floors 3-8 harvest sprites drop pods.",
      mission: "Mission 4 striker-cache reward.",
      mmorpg: "Auction power-snack; fighters buy bulk.",
    },
    gravegain3d: {
      endless: "Cache floors 3-7 kobolds drop it.",
      mission: "Mission 3 vanguard-ration reward.",
      mmorpg: "Guild canteen stock; brisk resale.",
    },
  }),
  makeItem("hex-beans", {
    gravegain1d: {
      endless: "Floors 4-9 hex crows drop speckled pods.",
      mission: "Mission 5 spell-cache reward.",
      mmorpg: "Caster market pick; spell-trade bait.",
    },
    gravegain2d: {
      endless: "Floors 5-10 rune hounds drop handfuls.",
      mission: "Mission 6 mage-tower reward.",
      mmorpg: "Auction strength staple; mages pay up.",
    },
    gravegain3d: {
      endless: "Rune floors 5-11 glyph fiends drop it.",
      mission: "Mission 6 arcane-vault reward.",
      mmorpg: "Guild enchanter stock; solid resale.",
    },
  }),
  makeItem("golem-chestnut", {
    gravegain1d: {
      endless: "Floors 3-7 pebble golems drop roast nuts.",
      mission: "Mission 4 bastion-cache reward.",
      mmorpg: "Ward market hearth-snack; steady value.",
    },
    gravegain2d: {
      endless: "Floors 4-9 stone sentries drop cones.",
      mission: "Mission 5 rampart-cache reward.",
      mmorpg: "Auction ward bundles; guards buy bulk.",
    },
    gravegain3d: {
      endless: "Forge floors 4-8 cinder fists drop it.",
      mission: "Mission 5 anvil-cache reward.",
      mmorpg: "Guild forge staple; reliable resale.",
    },
  }),
  makeItem("warming-ginger", {
    gravegain1d: {
      endless: "Floors 4-8 ember wisps drop warm roots.",
      mission: "Mission 5 sprint-cache reward.",
      mmorpg: "Scout market spice; racers pay well.",
    },
    gravegain2d: {
      endless: "Floors 5-10 ash sprinters drop knobs.",
      mission: "Mission 6 wind-road reward.",
      mmorpg: "Auction haste staple; couriers buy bulk.",
    },
    gravegain3d: {
      endless: "Ember floors 5-11 flame dancers drop it.",
      mission: "Mission 6 relay-cache reward.",
      mmorpg: "Guild scout reserve; brisk resale.",
    },
  }),
];
