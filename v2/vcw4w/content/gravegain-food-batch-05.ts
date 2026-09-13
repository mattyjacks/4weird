// GraveGain food batch 05: roster idx 36-43 (v2 layer catalog data).
//
// Each item spreads its GRAVEGAIN_FOOD_ROSTER entry (id, name, emoji, blurb,
// effect, tier — emoji codepoints and blurbs are roster truth, never retyped)
// and carries the full 3-games x 3-modes stats table from
// buildFoodStatsTable(effect, tier), plus a drop note on every game/mode cell:
// endless = which floors/foes drop it, mission = which mission rewards it,
// mmorpg = market/trade note. Validated by validateFoodBatch().

import {
  buildFoodStatsTable,
  GRAVEGAIN_FOOD_GAMES,
  GRAVEGAIN_FOOD_MODES,
} from "@/lib/gravegain-food";
import type {
  GraveGainFoodGame,
  GraveGainFoodItemDef,
  GraveGainFoodMode,
} from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "@/content/gravegain-food-roster";

type NoteGrid = Record<GraveGainFoodGame, Record<GraveGainFoodMode, string>>;

function makeFoodItem(id: string, notes: NoteGrid): GraveGainFoodItemDef {
  const entry = GRAVEGAIN_FOOD_ROSTER.find((e) => e.id === id);
  if (!entry) throw new Error(`missing roster entry ${id}`);
  const stats = buildFoodStatsTable(entry.effect, entry.tier);
  for (const game of GRAVEGAIN_FOOD_GAMES) {
    for (const mode of GRAVEGAIN_FOOD_MODES) {
      stats[game][mode].note = notes[game][mode];
    }
  }
  return { ...entry, stats };
}

export const GRAVE_GAIN_FOOD_BATCH_05: GraveGainFoodItemDef[] = [
  makeFoodItem("pod-peas", {
    gravegain1d: {
      endless: "Floors 1-3 pea-pods burst from bog imps and sprinters.",
      mission: "Mission 2 clear reward for the garden-sprint trial.",
      mmorpg: "Cheap market snack; new runners trade stacks of it.",
    },
    gravegain2d: {
      endless: "Floors 2-5 drop from vine sprites and quick wolves.",
      mission: "Scout-mission reward for timed courier runs.",
      mmorpg: "Stall staple; bulk-traded by courier guilds.",
    },
    gravegain3d: {
      endless: "Greenhouse depths floors 3-6 drop from pod tenders.",
      mission: "Dungeon-dash mission bonus for fast clears.",
      mmorpg: "Auction-house cheap; speed-runners bulk buy.",
    },
  }),
  makeFoodItem("sootcap", {
    gravegain1d: {
      endless: "Ash-vent floors 3-5 drop from soot bats and cinder imps.",
      mission: "Mission 5 reward for surviving the ash-fall trial.",
      mmorpg: "Mid-price ward cap; alchemists buy in bulk.",
    },
    gravegain2d: {
      endless: "Floors 4-7 drop from ash elementals and soot sprites.",
      mission: "Siege-mission reward for holding the vent line.",
      mmorpg: "Steady auction trade; tank guilds stockpile it.",
    },
    gravegain3d: {
      endless: "Volcanic depths floors 5-8 drop from cinder hulks.",
      mission: "Ember-vault mission prize for flawless wards.",
      mmorpg: "Premium ward good; listed by ash-market vendors.",
    },
  }),
  makeFoodItem("grave-root", {
    gravegain1d: {
      endless: "Floors 2-4 unearthed from grave moles and barrow roots.",
      mission: "Mission 3 reward for cleansing the old gravesoil.",
      mmorpg: "Herbalist stalls sell fresh-dug grave-root daily.",
    },
    gravegain2d: {
      endless: "Floors 3-6 drop from tomb gardeners and soil wraiths.",
      mission: "Harvest-mission reward for the crypt-garden plot.",
      mmorpg: "Apothecary trade good; healers buy bundles.",
    },
    gravegain3d: {
      endless: "Deep-soil floors 4-7 drop from root golems.",
      mission: "Earth-shrine mission prize for patient delvers.",
      mmorpg: "High-demand heal root on the dungeon exchange.",
    },
  }),
  makeFoodItem("bonefire-bread", {
    gravegain1d: {
      endless: "Floors 1-2 drop from camp goblins and ember rats.",
      mission: "Mission 1 camp ration for first-time delvers.",
      mmorpg: "Cheapest market bread; gifted to newcomers.",
    },
    gravegain2d: {
      endless: "Floors 1-4 drop from bakery imps and camp cooks.",
      mission: "Supply-mission staple for patrol routes.",
      mmorpg: "Baker stalls flood the market; nearly free.",
    },
    gravegain3d: {
      endless: "Ember-hall floors 1-3 drop from fire sprites.",
      mission: "Garrison-mission ration for long dungeon watches.",
      mmorpg: "Bulk-traded garrison bread across server stalls.",
    },
  }),
  makeFoodItem("goblin-croissant", {
    gravegain1d: {
      endless: "Floors 1-3 snatched from goblin bakers and skitterers.",
      mission: "Mission 2 pastry-heist reward for quick fingers.",
      mmorpg: "Flaky craze good; pastry stalls trade it daily.",
    },
    gravegain2d: {
      endless: "Floors 2-5 drop from market goblins and dash imps.",
      mission: "Courier-mission reward for beating the pastry clock.",
      mmorpg: "Courier guilds bulk-buy croissants for runs.",
    },
    gravegain3d: {
      endless: "Goblin-market depths floors 2-5 drop from pastry chefs.",
      mission: "Night-market mission prize for stealthy shoppers.",
      mmorpg: "Trendy speed snack; prices spike before races.",
    },
  }),
  makeFoodItem("crypt-baguette", {
    gravegain1d: {
      endless: "Floors 2-4 drop from crypt bakers and shield rats.",
      mission: "Mission 3 melee-trial reward for heavy hitters.",
      mmorpg: "Brawler staple; weapon shops bundle it free.",
    },
    gravegain2d: {
      endless: "Floors 3-6 drop from oven golems and crust fiends.",
      mission: "Arena-mission prize for first-blood victories.",
      mmorpg: "Arena vendors sell bout-ready baguettes.",
    },
    gravegain3d: {
      endless: "Deep-bakery floors 4-7 drop from loaf guardians.",
      mission: "War-camp mission reward for siege crews.",
      mmorpg: "Siege-guild bulk order; steady exchange price.",
    },
  }),
  makeFoodItem("traveler-flatbread", {
    gravegain1d: {
      endless: "Floors 1-3 drop from roadside bandits and pack rats.",
      mission: "Mission 2 road-ward reward for escorted caravans.",
      mmorpg: "Caravan stalls sell ward flatbread to travelers.",
    },
    gravegain2d: {
      endless: "Floors 2-5 drop from dust nomads and trail wolves.",
      mission: "Escort-mission ration for long desert treks.",
      mmorpg: "Nomad traders swap flatbread for trail maps.",
    },
    gravegain3d: {
      endless: "Pilgrim-pass floors 3-6 drop from stone sentries.",
      mission: "Pilgrim-mission keepsake for safe arrivals.",
      mmorpg: "Cheap travel ward; always listed in bulk.",
    },
  }),
  makeFoodItem("knot-pretzel", {
    gravegain1d: {
      endless: "Floors 1-3 drop from salt imps and tavern brawlers.",
      mission: "Mission 2 tavern-brawl reward for standing firm.",
      mmorpg: "Tavern vendors sell salted knots for coppers.",
    },
    gravegain2d: {
      endless: "Floors 2-5 drop from pretzel monks and salt fiends.",
      mission: "Bastion-mission reward for shield-wall drills.",
      mmorpg: "Guard guilds issue pretzels as duty snacks.",
    },
    gravegain3d: {
      endless: "Salt-mine floors 3-6 drop from crystal guardians.",
      mission: "Mine-hold mission prize for steady defenders.",
      mmorpg: "Duty-snack trade; bulk bins at every gate stall.",
    },
  }),
];
