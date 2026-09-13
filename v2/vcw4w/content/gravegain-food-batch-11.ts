// GraveGain food batch 11: traveler-takeout ... pearl-oyster (v2 layer).
//
// Six roster entries (idx 89-94) with full gravegain1d/2d/3d x
// endless/mission/mmorpg stat tables via buildFoodStatsTable() plus a
// 4..100-char drop note per game/mode cell. Identity (emoji, blurb, effect,
// tier) is copied by spread from GRAVEGAIN_FOOD_ROSTER — never retyped.

import { buildFoodStatsTable } from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "@/content/gravegain-food-roster";
import type {
  GraveGainFoodGame,
  GraveGainFoodItemDef,
  GraveGainFoodMode,
} from "@/lib/gravegain-food";

function lookup(id: string) {
  const found = GRAVEGAIN_FOOD_ROSTER.find((entry) => entry.id === id);
  if (!found) throw new Error(`gravegain-food-batch-11: missing roster entry ${id}`);
  return found;
}

type ExtraGame = "gravegain4d" | "gravegain5d";
type NotesGrid = Record<
  GraveGainFoodGame | ExtraGame,
  Record<GraveGainFoodMode, string>
>;

function noted(id: string, notes: NotesGrid): GraveGainFoodItemDef {
  const entry = lookup(id);
  const stats = buildFoodStatsTable(entry.effect, entry.tier);
  for (const game of Object.keys(notes) as (GraveGainFoodGame | ExtraGame)[]) {
    for (const mode of Object.keys(notes[game]) as GraveGainFoodMode[]) {
      stats[game][mode].note = notes[game][mode];
    }
  }
  return { ...entry, stats };
}

export const GRAVE_GAIN_FOOD_BATCH_11_IDS = [
  "traveler-takeout",
  "king-crab",
  "abyss-lobster",
  "dart-shrimp",
  "ink-squid",
  "pearl-oyster",
] as const;

export const GRAVE_GAIN_FOOD_BATCH_11: GraveGainFoodItemDef[] = [
  noted("traveler-takeout", {
    gravegain1d: {
      endless: "Roadside carriers drop it on floors 2-4; camp cooks stock it.",
      mission: "Courier Run reward: deliver 3 boxes, keep one.",
      mmorpg: "Tradable; roadside stalls list it cheap in bulk stacks.",
    },
    gravegain2d: {
      endless: "Caravan ambushers drop it on floors 3-6; inns hide more.",
      mission: "Supply Line reward for escorting the noodle cart.",
      mmorpg: "Tradable; auction staple, priced per stack of five.",
    },
    gravegain3d: {
      endless: "Dungeon porters drop it in depths 1-3; shrines serve it.",
      mission: "Wayfarer Pact reward after mapping three zones.",
      mmorpg: "Tradable; guild canteens buy and sell it daily.",
    },
    gravegain4d: {
      endless: "Dream fairway roadside carriers drop takeout near hole 1 putt goal.",
      mission: "Reward for Caddie Courier Putt mission 2 on the dream fairway.",
      mmorpg: "Fairway roadside stalls list it cheap near W-hazards.",
    },
    gravegain5d: {
      endless: "Prime-universe porters drop it; one hop reaches echo shrines.",
      mission: "Reward for Wayfarer Paradox mission 3 across three hops.",
      mmorpg: "Bloom-market canteens buy and sell it daily to hoppers.",
    },
  }),
  noted("king-crab", {
    gravegain1d: {
      endless: "Pincer crabs drop claws on floors 4-7; tide pools hide more.",
      mission: "Claw Hunt reward for besting the crab captain.",
      mmorpg: "Tradable; shell market pays premium for intact claws.",
    },
    gravegain2d: {
      endless: "Armored shore crabs drop it on floors 5-8; wrecks hold caches.",
      mission: "Tidebreaker reward after holding the pier line.",
      mmorpg: "Tradable; auction bids spike before siege weekends.",
    },
    gravegain3d: {
      endless: "Crab knights drop it in depths 3-5; grottos cache it.",
      mission: "Sunken Throne reward for cracking the guard.",
      mmorpg: "Tradable; guild vaults stockpile it for raid nights.",
    },
    gravegain4d: {
      endless: "Dream fairway pincer crabs drop claws by the water hazard.",
      mission: "Reward for Claw Putt mission 4 past the W-hazard pond.",
      mmorpg: "Clubhouse shell market pays premium for intact claws.",
    },
    gravegain5d: {
      endless: "Echo-universe crab knights drop it after void hops.",
      mission: "Reward for Sunken Throne Paradox mission 5 in prime universe.",
      mmorpg: "Static-market vaults stockpile it for raid-night hoppers.",
    },
  }),
  noted("abyss-lobster", {
    gravegain1d: {
      endless: "Trench lobsters drop tails on floors 5-8; dark pools hide them.",
      mission: "Deep Dive reward for lighting three trench beacons.",
      mmorpg: "Tradable; trench traders barter tails for lantern oil.",
    },
    gravegain2d: {
      endless: "Crusher lobsters drop it on floors 6-9; vents guard nests.",
      mission: "Pressure Test reward after surviving the vents.",
      mmorpg: "Tradable; auction lists it under battle meats.",
    },
    gravegain3d: {
      endless: "Abyss wardens drop it in depths 4-6; smokers hide more.",
      mission: "Hadal Crown reward for beating the abyss warden.",
      mmorpg: "Tradable; raid kitchens pay top coin for full tails.",
    },
    gravegain4d: {
      endless: "Dream fairway trench lobsters lurk by deep W-hazard pools.",
      mission: "Reward for Deep Dive Putt mission 6 at hole 14.",
      mmorpg: "Fairway trench traders barter tails for golf lantern oil.",
    },
    gravegain5d: {
      endless: "Void-universe abyss wardens drop it across two hops.",
      mission: "Reward for Hadal Paradox mission 6 in echo universe.",
      mmorpg: "Prime-market raid kitchens pay top coin for full tails.",
    },
  }),
  noted("dart-shrimp", {
    gravegain1d: {
      endless: "Reef darters drop it on floors 3-6; currents carry more.",
      mission: "Current Race reward for beating the tide clock.",
      mmorpg: "Tradable; courier guilds buy it by the bundle.",
    },
    gravegain2d: {
      endless: "Arrow shrimp drop it on floors 4-7; kelp beds hide schools.",
      mission: "Skirmish Dash reward for three fast clears.",
      mmorpg: "Tradable; sprinters flip it before race events.",
    },
    gravegain3d: {
      endless: "Void shrimp drop it in depths 2-4; rifts scatter them wide.",
      mission: "Slipstream reward after riding three rift currents.",
      mmorpg: "Tradable; arena vendors stock it on tournament days.",
    },
    gravegain4d: {
      endless: "Dream fairway reef darters zip past putt goals at hole 4.",
      mission: "Reward for Current Putt mission 3 beating the tide clock.",
      mmorpg: "Fairway courier guilds buy swift shrimp by the bundle.",
    },
    gravegain5d: {
      endless: "Bloom-universe void shrimp scatter wide across rift hops.",
      mission: "Reward for Slipstream Paradox mission 4 in dream universe.",
      mmorpg: "Echo-market arena vendors stock it on tournament days.",
    },
  }),
  noted("ink-squid", {
    gravegain1d: {
      endless: "Ink squids drop it on floors 2-5; dark coves hide schools.",
      mission: "Blackout reward for inking three watch posts.",
      mmorpg: "Tradable; scribe stalls buy spare ink sacs cheap.",
    },
    gravegain2d: {
      endless: "Reef squids drop it on floors 3-6; wrecks shelter them.",
      mission: "Fog Run reward for a no-alarm clear.",
      mmorpg: "Tradable; night market lists it in swift-snack rows.",
    },
    gravegain3d: {
      endless: "Deep squids drop it in depths 1-3; ink clouds mark nests.",
      mission: "Silent Tide reward after shadowing the patrol.",
      mmorpg: "Tradable; apprentice racers bulk-buy it for drills.",
    },
    gravegain4d: {
      endless: "Dream fairway ink squids cloud the water hazard at hole 6.",
      mission: "Reward for Blackout Putt mission 3 with sneaky putt goals.",
      mmorpg: "Clubhouse scribe stalls buy spare ink sacs cheap.",
    },
    gravegain5d: {
      endless: "Dream-universe deep squids mark nests across one hop.",
      mission: "Reward for Silent Tide Paradox mission 5 in void universe.",
      mmorpg: "Static-market racers bulk-buy it before drill hops.",
    },
  }),
  noted("pearl-oyster", {
    gravegain1d: {
      endless: "Bed oysters drop it on floors 2-5; shallows hide clusters.",
      mission: "Pearl Dive reward for prying five shells.",
      mmorpg: "Tradable; jewelers pay extra for unopened shells.",
    },
    gravegain2d: {
      endless: "Grotto oysters drop it on floors 3-6; reefs guard beds.",
      mission: "Low Tide reward after mapping the oyster beds.",
      mmorpg: "Tradable; boardwalk stalls sell it beside bait.",
    },
    gravegain3d: {
      endless: "Vault oysters drop it in depths 1-3; sunken ships hold beds.",
      mission: "Drowned Vault reward for raising the lockbox.",
      mmorpg: "Tradable; collectors bid high on pearled shells.",
    },
    gravegain4d: {
      endless: "Dream fairway bed oysters cluster near the calm putt goal.",
      mission: "Reward for Pearl Putt mission 5 prying five shells.",
      mmorpg: "Fairway jewelers pay extra for unopened shells.",
    },
    gravegain5d: {
      endless: "Prime-universe vault oysters hide in ships across hops.",
      mission: "Reward for Drowned Vault Paradox mission 6 in echo universe.",
      mmorpg: "Void-market collectors bid high on pearled shells.",
    },
  }),
];
