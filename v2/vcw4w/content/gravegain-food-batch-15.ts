// GraveGain food batch 15: oath-mugs ... mate-gourd (roster idx 120-126).
//
// Each entry spreads its roster row (...entry — emoji codepoints and blurbs
// are never retyped) and builds the full 3-games x 3-modes stat table via
// buildFoodStatsTable(entry.effect, entry.tier). Every game/mode cell carries
// a kid-safe drop note (fantasy brews/tonics tone, no alcohol words):
// endless = which floors/foes drop it, mission = which mission rewards it,
// mmorpg = market/trade note.

import { buildFoodStatsTable } from "@/lib/gravegain-food";
import type {
  GraveGainFoodGame,
  GraveGainFoodItemDef,
  GraveGainFoodMode,
} from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "./gravegain-food-roster";

type NoteGrid = Record<GraveGainFoodGame, Record<GraveGainFoodMode, string>>;

function makeItem(id: string, notes: NoteGrid): GraveGainFoodItemDef {
  const entry = GRAVEGAIN_FOOD_ROSTER.find((row) => row.id === id);
  if (!entry) throw new Error(`missing roster entry ${id}`);
  const stats = buildFoodStatsTable(entry.effect, entry.tier);
  (Object.keys(notes) as GraveGainFoodGame[]).forEach((game) => {
    (Object.keys(notes[game]) as GraveGainFoodMode[]).forEach((mode) => {
      stats[game][mode].note = notes[game][mode];
    });
  });
  return { ...entry, stats };
}

export const GRAVE_GAIN_FOOD_BATCH_15: GraveGainFoodItemDef[] = [
  makeItem("oath-mugs", {
    gravegain1d: {
      endless: "Oathbound skeletons drop them on floors 3-6.",
      mission: "Mission 4 oath-keeper reward for a full party.",
      mmorpg: "Market-stall mugs; parties trade full sworn sets.",
    },
    gravegain2d: {
      endless: "Dwarf oath-wardens drop them on floors 5-9.",
      mission: "Mission 7 keep-the-oath bonus reward chest.",
      mmorpg: "Guild market staple; sworn-party trade favorite.",
    },
    gravegain3d: {
      endless: "Crypt warlords drop paired mugs past floor 10.",
      mission: "Mission 12 war-council toast reward.",
      mmorpg: "High-volume auction mugs; guilds stockpile them.",
    },
  }),
  makeItem("toast-flutes", {
    gravegain1d: {
      endless: "Wisp heralds drop flutes on floors 2-5.",
      mission: "Mission 3 memorial-toast reward after the vigil.",
      mmorpg: "Plaza vendors sell memorial sets; giftable.",
    },
    gravegain2d: {
      endless: "Fallen-knight echoes drop them on floors 4-8.",
      mission: "Mission 6 remembrance feast toast reward.",
      mmorpg: "Steady market price; remembrance gifts trade well.",
    },
    gravegain3d: {
      endless: "Catacomb choirs drop flutes past floor 9.",
      mission: "Mission 11 lantern-vigil toast reward.",
      mmorpg: "Auction-house glitter lots; collectors bid high.",
    },
  }),
  makeItem("smoked-tonic", {
    gravegain1d: {
      endless: "Ember imps drop smoky tonics on floors 3-7.",
      mission: "Mission 5 cinder-warden hearth reward.",
      mmorpg: "Smoke-rack stall bottles; bold-flavor trade.",
    },
    gravegain2d: {
      endless: "Oak-ash golems drop it on floors 6-10.",
      mission: "Mission 8 old-oak cellar reward chest.",
      mmorpg: "Cellared lots fetch premiums at market.",
    },
    gravegain3d: {
      endless: "Charred treants drop vintage tonics past floor 11.",
      mission: "Mission 13 ember-throne tasting reward.",
      mmorpg: "Rare-vintage auction rows; guilds cellar cases.",
    },
  }),
  makeItem("trail-soda", {
    gravegain1d: {
      endless: "Goblin runners drop fizzy cups on floors 1-4.",
      mission: "Mission 2 trail-scout sprint reward.",
      mmorpg: "Cheap plaza fizz; new runners buy by the crate.",
    },
    gravegain2d: {
      endless: "Dust sprites drop sodas on floors 3-7.",
      mission: "Mission 5 wind-trail relay prize.",
      mmorpg: "Fizzy-cart refills; street vendors restock daily.",
    },
    gravegain3d: {
      endless: "Tunnel couriers drop chilled cups past floor 8.",
      mission: "Mission 10 deep-delver dash reward.",
      mmorpg: "Bulk-crate market; courier guilds corner supply.",
    },
  }),
  makeItem("pearl-tea", {
    gravegain1d: {
      endless: "Slime pearls hide in blobs on floors 2-5.",
      mission: "Mission 3 tea-garden rest-stop reward.",
      mmorpg: "Tea-stall cups; chewy-pearl blends trade daily.",
    },
    gravegain2d: {
      endless: "Pearl oozes drop creamy cups on floors 4-8.",
      mission: "Mission 6 milk-tea caravan escort reward.",
      mmorpg: "Caravan tea blends hold steady market value.",
    },
    gravegain3d: {
      endless: "Grotto pearl-keepers drop it past floor 9.",
      mission: "Mission 11 sunken tea-house salvage reward.",
      mmorpg: "Pearl-grade auction cups; connoisseurs trade up.",
    },
  }),
  makeItem("ration-juice", {
    gravegain1d: {
      endless: "Supply crates hold juice boxes on floors 1-5.",
      mission: "Mission 1 field-ration starter kit reward.",
      mmorpg: "Bulk ration crates; quartermasters trade cheap.",
    },
    gravegain2d: {
      endless: "Quartermaster ghosts drop rations on floors 3-6.",
      mission: "Mission 4 supply-line defense reward.",
      mmorpg: "Regiment-boxed lots move fast at market.",
    },
    gravegain3d: {
      endless: "Siege-store wraiths drop juice past floor 8.",
      mission: "Mission 9 depot-rescue ration reward.",
      mmorpg: "Depot-sealed cases; siege-stock traders hoard.",
    },
  }),
  makeItem("mate-gourd", {
    gravegain1d: {
      endless: "Campfire storytellers share gourds on floors 2-6.",
      mission: "Mission 3 shared-fire circle reward.",
      mmorpg: "Circle-gourds pass hand to hand at markets.",
    },
    gravegain2d: {
      endless: "Fire-tender spirits pass gourds on floors 5-9.",
      mission: "Mission 7 ember-circle gathering reward.",
      mmorpg: "Carved gourds trade as friendship tokens.",
    },
    gravegain3d: {
      endless: "Elder hearths offer gourds past floor 10.",
      mission: "Mission 12 great-hearth council reward.",
      mmorpg: "Heirloom gourds headline festival auctions.",
    },
  }),
];
