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
    gravegain4d: {
      endless: "Dream fairway oath bunkers stand firm; skeleton caddies drop mugs on holes 3-6.",
      mission: "Mission 4 Oath-Keeper Putt reward for the sworn goal.",
      mmorpg: "Fairway oath stalls trade sworn sets near the W-hazard.",
    },
    gravegain5d: {
      endless: "Prime-universe oathbound echoes drop mugs across void hops.",
      mission: "Mission 4 Oath Paradox reward spanning one echo hop.",
      mmorpg: "Echo-market guilds stockpile mugs for hopper parties.",
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
    gravegain4d: {
      endless: "Dream fairway memorial rough glitters; wisp heralds drop flutes on holes 2-5.",
      mission: "Mission 3 Memorial Putt reward for the vigil goal.",
      mmorpg: "Plaza fairway vendors sell toast sets past the W-hazard.",
    },
    gravegain5d: {
      endless: "Dream-universe fallen-knight echoes drop flutes over bloom hops.",
      mission: "Mission 3 Remembrance Paradox reward after one hop.",
      mmorpg: "Void-market collectors bid on flutes for hopper halls.",
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
    gravegain4d: {
      endless: "Dream fairway cinder bunkers smoke; ember imps drop tonics on holes 3-6.",
      mission: "Mission 5 Cinder Putt reward for the hearth goal.",
      mmorpg: "Smoke-rack fairway stalls trade bottles by the W-hazard.",
    },
    gravegain5d: {
      endless: "Echo-universe charred treants drop vintage tonics over void hops.",
      mission: "Mission 5 Smoke Paradox reward across two hops.",
      mmorpg: "Prime-market cellars auction vintage lots to hoppers.",
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
    gravegain4d: {
      endless: "Dream fairway sprint bunkers fizz; goblin runners drop cups on holes 1-4.",
      mission: "Mission 2 Trail-Scout Putt reward for the speedy goal.",
      mmorpg: "Fizzy fairway carts sell trail cups beside the W-hazard.",
    },
    gravegain5d: {
      endless: "Static-universe dust sprites drop sodas along echo hops.",
      mission: "Mission 2 Sprint Paradox reward for a quick hop dash.",
      mmorpg: "Bloom-market vendors restock fizzy crates for hoppers daily.",
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
    gravegain4d: {
      endless: "Dream fairway pearl traps hide bubbles; slime caddies drop cups on holes 2-5.",
      mission: "Mission 3 Tea-Garden Putt reward for the pearl goal.",
      mmorpg: "Tea fairway stalls trade chewy cups near the W-hazard.",
    },
    gravegain5d: {
      endless: "Dream-universe pearl oozes drop creamy cups over echo hops.",
      mission: "Mission 3 Pearl Paradox reward after a caravan hop.",
      mmorpg: "Static-market caravans hold tea value for hopper trade.",
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
    gravegain4d: {
      endless: "Dream fairway supply bunkers stock boxes; crate sprites drop juice on holes 1-4.",
      mission: "Mission 1 Field-Ration Putt reward for the starter goal.",
      mmorpg: "Quartermaster fairway carts trade ration crates by the W-hazard.",
    },
    gravegain5d: {
      endless: "Prime-universe supply echoes drop juice boxes across static hops.",
      mission: "Mission 1 Supply Paradox reward for a single hop.",
      mmorpg: "Void-market quartermasters bulk-trade crates to hoppers.",
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
    gravegain4d: {
      endless: "Dream fairway campfire rough glows; storyteller caddies share gourds on holes 2-5.",
      mission: "Mission 3 Shared-Fire Putt reward for the circle goal.",
      mmorpg: "Circle fairway stalls pass gourds hand to hand by the W-hazard.",
    },
    gravegain5d: {
      endless: "Echo-universe fire-tender spirits pass gourds over bloom hops.",
      mission: "Mission 3 Ember-Circle Paradox reward across one hop.",
      mmorpg: "Dream-market carvers trade gourds as hopper friendship tokens.",
    },
  }),
];
