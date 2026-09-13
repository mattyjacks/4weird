// GraveGain food batch 12: roster idx 95-103 (crypt-icecream ... harvest-pie).
//
// Each item spreads its roster entry (emoji codepoints never retyped) and
// carries a full gravegain1d/2d/3d x endless/mission/mmorpg stats table via
// buildFoodStatsTable() plus a drop note per game/mode cell:
// endless = floors/foes, mission = mission reward, mmorpg = market/trade.

import { buildFoodStatsTable, type GraveGainFoodItemDef } from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "./gravegain-food-roster";

type GameKey = "gravegain1d" | "gravegain2d" | "gravegain3d" | "gravegain4d" | "gravegain5d";
type ModeKey = "endless" | "mission" | "mmorpg";
type NoteGrid = Record<GameKey, Record<ModeKey, string>>;

function makeFoodItem(id: string, notes: NoteGrid): GraveGainFoodItemDef {
  const entry = GRAVEGAIN_FOOD_ROSTER.find((item) => item.id === id);
  if (!entry) throw new Error(`Missing roster entry: ${id}`);
  const stats = buildFoodStatsTable(entry.effect, entry.tier);
  (Object.keys(notes) as GameKey[]).forEach((game) => {
    (Object.keys(notes[game]) as ModeKey[]).forEach((mode) => {
      stats[game][mode].note = notes[game][mode];
    });
  });
  return { ...entry, stats };
}

export const GRAVE_GAIN_FOOD_BATCH_12: GraveGainFoodItemDef[] = [
  makeFoodItem("crypt-icecream", {
    gravegain1d: {
      endless: "Floors 6-10 crypt bats drop it; chill chests too.",
      mission: "Mission 7 clear reward; Frost Cellar cache.",
      mmorpg: "Market staple; cheap tradable chill heal.",
    },
    gravegain2d: {
      endless: "Floors 12-18 frost ghouls drop cones often.",
      mission: "Mission 14 arctic route bonus reward.",
      mmorpg: "Auction staple; bulk chill-heal trades.",
    },
    gravegain3d: {
      endless: "Ice crypt floors 20+ wights drop it.",
      mission: "Mission 21 frozen vault clear reward.",
      mmorpg: "Hub vendor favorite; steady resale value.",
    },
    gravegain4d: {
      endless: "Dream fairway crypt bats drop cones near the frost W-hazard.",
      mission: "Reward for Frost Putt mission 7 at the chill green.",
      mmorpg: "Fairway chill carts trade cones at the clubhouse.",
    },
    gravegain5d: {
      endless: "Void-universe frost ghouls drop cones across echo hops.",
      mission: "Reward for Frozen Paradox mission 9 in dream universe.",
      mmorpg: "Static-market vendors move bulk chill-heal tubs.",
    },
  }),
  makeFoodItem("shave-ice", {
    gravegain1d: {
      endless: "Floors 3-7 swift imps drop cups; sprint caches.",
      mission: "Mission 4 time-trial bronze reward.",
      mmorpg: "Cheap speed snack; market bundles of five.",
    },
    gravegain2d: {
      endless: "Floors 8-14 wind sprites drop it mid-run.",
      mission: "Mission 11 courier dash completion prize.",
      mmorpg: "Racer staple; tradable sprint cups.",
    },
    gravegain3d: {
      endless: "Storm halls 16+ harpies drop iced cups.",
      mission: "Mission 19 gale gauntlet speed reward.",
      mmorpg: "Guild sprint kits include tradable cups.",
    },
    gravegain4d: {
      endless: "Dream fairway swift imps drop iced cups by putt goals.",
      mission: "Reward for Breeze Putt mission 4 in the time trial.",
      mmorpg: "Fairway sprint carts sell bundles of five cups.",
    },
    gravegain5d: {
      endless: "Echo-universe wind sprites drop it mid-hop.",
      mission: "Reward for Gale Paradox mission 6 across two hops.",
      mmorpg: "Bloom-market racers flip sprint cups before races.",
    },
  }),
  makeFoodItem("triple-scoop", {
    gravegain1d: {
      endless: "Floors 7-11 dessert golems drop scoops.",
      mission: "Mission 8 sweet-tooth side quest reward.",
      mmorpg: "Parlor special; trades well in stacks.",
    },
    gravegain2d: {
      endless: "Floors 13-19 sugar wraiths drop bowls.",
      mission: "Mission 15 morale feast bonus reward.",
      mmorpg: "Party heal stock; auction house regular.",
    },
    gravegain3d: {
      endless: "Banquet halls 22+ oozes drop sundaes.",
      mission: "Mission 23 dessert vault clear reward.",
      mmorpg: "Premium heal dessert; high trade demand.",
    },
    gravegain4d: {
      endless: "Dream fairway dessert golems drop scoops at hole 8.",
      mission: "Reward for Sweet Putt mission 8 at the sundae green.",
      mmorpg: "Fairway parlors trade triple stacks to happy putters.",
    },
    gravegain5d: {
      endless: "Dream-universe sugar wraiths drop bowls after hops.",
      mission: "Reward for Morale Paradox mission 7 in prime universe.",
      mmorpg: "Prime-market auction houses list party heal tubs.",
    },
  }),
  makeFoodItem("ring-donut", {
    gravegain1d: {
      endless: "Floors 2-6 sugar imps drop glazed rings.",
      mission: "Mission 3 study-hall focus reward.",
      mmorpg: "Apprentice focus snack; cheap trades.",
    },
    gravegain2d: {
      endless: "Floors 9-13 scholar ghosts drop rings.",
      mission: "Mission 12 library trial focus prize.",
      mmorpg: "Scribe staple; sold in dozen bundles.",
    },
    gravegain3d: {
      endless: "Archive floors 17+ ink fiends drop rings.",
      mission: "Mission 20 lore vault puzzle reward.",
      mmorpg: "Raid focus box filler; steady market.",
    },
    gravegain4d: {
      endless: "Dream fairway sugar imps drop glazed rings near hole 2.",
      mission: "Reward for Study Putt mission 3 by the quiet green.",
      mmorpg: "Caddie scribes sell dozen bundles at the turn.",
    },
    gravegain5d: {
      endless: "Static-universe scholar ghosts drop rings across hops.",
      mission: "Reward for Lore Paradox mission 6 in echo universe.",
      mmorpg: "Void-market raid kits include rings as focus filler.",
    },
  }),
  makeFoodItem("scout-cookie", {
    gravegain1d: {
      endless: "Floors 2-5 gate scouts drop cookie crates.",
      mission: "Mission 2 gate patrol signup reward.",
      mmorpg: "Newbie focus treat; gate-market cheap.",
    },
    gravegain2d: {
      endless: "Floors 7-12 ranger shades drop tins.",
      mission: "Mission 10 trail watch bonus reward.",
      mmorpg: "Scout guild cookie drive trade goods.",
    },
    gravegain3d: {
      endless: "Outpost floors 15+ sentries drop crates.",
      mission: "Mission 18 border patrol commendation.",
      mmorpg: "Charity auction cookie lots; tradable.",
    },
    gravegain4d: {
      endless: "Dream fairway gate scouts drop cookie crates at hole 1.",
      mission: "Reward for Patrol Putt mission 2 signing up at the gate.",
      mmorpg: "Fairway gate markets sell newbie treats cheap.",
    },
    gravegain5d: {
      endless: "Prime-universe ranger shades drop tins across trail hops.",
      mission: "Reward for Trail Paradox mission 5 in bloom universe.",
      mmorpg: "Echo-market scout drives trade tins for charity.",
    },
  }),
  makeFoodItem("victory-cake", {
    gravegain1d: {
      endless: "Floor 10 boss drops whole victory cakes.",
      mission: "Mission 9 floor-clear celebration reward.",
      mmorpg: "Trophy feast; premium auction centerpiece.",
    },
    gravegain2d: {
      endless: "Floor 20 boss drops candle-lit cakes.",
      mission: "Mission 16 campaign finale grand prize.",
      mmorpg: "Guild hall feast cake; top-tier trades.",
    },
    gravegain3d: {
      endless: "Floor 30 dungeon lord drops grand cakes.",
      mission: "Mission 24 raid victory banquet reward.",
      mmorpg: "Legendary feast; whale-market showpiece.",
    },
    gravegain4d: {
      endless: "Dream fairway bosses drop victory cakes at the final putt goal.",
      mission: "Reward for Champion Putt mission 9 clearing the back nine.",
      mmorpg: "Clubhouse trophy tables auction whole cakes to winners.",
    },
    gravegain5d: {
      endless: "Prime-universe dungeon lords drop grand cakes after hops.",
      mission: "Reward for Grand Finale Paradox mission 8 in void universe.",
      mmorpg: "Static-market whales bid high on legendary feast cakes.",
    },
  }),
  makeFoodItem("slice-cake", {
    gravegain1d: {
      endless: "Floors 5-9 party sprites drop slices.",
      mission: "Mission 6 birthday side quest reward.",
      mmorpg: "Tavern slice trade; party leftovers sold.",
    },
    gravegain2d: {
      endless: "Floors 11-16 baker ghosts drop slices.",
      mission: "Mission 13 bakery defense bonus prize.",
      mmorpg: "Feast platter slice; market steady seller.",
    },
    gravegain3d: {
      endless: "Feast halls 19+ servants drop slices.",
      mission: "Mission 22 royal banquet event reward.",
      mmorpg: "Banquet caterer stock; bulk tradable.",
    },
    gravegain4d: {
      endless: "Dream fairway party sprites drop slices near W-hazards.",
      mission: "Reward for Birthday Putt mission 6 at the party green.",
      mmorpg: "Fairway taverns sell leftover slices to putters.",
    },
    gravegain5d: {
      endless: "Echo-universe baker ghosts drop slices across feast hops.",
      mission: "Reward for Banquet Paradox mission 7 in dream universe.",
      mmorpg: "Bloom-market caterers stock bulk slices for feasts.",
    },
  }),
  makeFoodItem("swirl-cupcake", {
    gravegain1d: {
      endless: "Floors 3-6 sugar mites drop swirl cups.",
      mission: "Mission 4 bake-along starter reward.",
      mmorpg: "Pocket treat; cheapest market heal.",
    },
    gravegain2d: {
      endless: "Floors 8-12 imp bakers drop frosted cups.",
      mission: "Mission 11 oven-escort bonus reward.",
      mmorpg: "Pocket heal multipacks; brisk trades.",
    },
    gravegain3d: {
      endless: "Pantry floors 14+ crumb fiends drop cups.",
      mission: "Mission 17 pantry raid sweet prize.",
      mmorpg: "Raid pocket-heal filler; easy resale.",
    },
    gravegain4d: {
      endless: "Dream fairway sugar mites drop swirl cups by hole 3.",
      mission: "Reward for Bake-Along Putt mission 4 for starters.",
      mmorpg: "Fairway pocket carts sell the cheapest market heal.",
    },
    gravegain5d: {
      endless: "Dream-universe imp bakers drop frosted cups after hops.",
      mission: "Reward for Oven Paradox mission 6 in echo universe.",
      mmorpg: "Prime-market multipacks move briskly between hops.",
    },
  }),
  makeFoodItem("harvest-pie", {
    gravegain1d: {
      endless: "Floors 4-8 harvest husks drop warm pies.",
      mission: "Mission 5 autumn fair first prize.",
      mmorpg: "Harvest stall pie; fair-price trades.",
    },
    gravegain2d: {
      endless: "Floors 10-15 field reapers drop pies.",
      mission: "Mission 13 harvest escort full reward.",
      mmorpg: "Feast-table pie; guild pantry staple.",
    },
    gravegain3d: {
      endless: "Orchard crypts 18+ scarecrows drop pies.",
      mission: "Mission 21 harvest festival finale pie.",
      mmorpg: "Seasonal feast pie; festival resale high.",
    },
    gravegain4d: {
      endless: "Dream fairway harvest husks drop warm pies at hole 10.",
      mission: "Reward for Autumn Putt mission 5 at the fairway fair.",
      mmorpg: "Fairway harvest stalls trade pies at fair prices.",
    },
    gravegain5d: {
      endless: "Bloom-universe field reapers drop pies across orchard hops.",
      mission: "Reward for Harvest Paradox mission 7 in prime universe.",
      mmorpg: "Echo-market pantries stock feast pies for guilds.",
    },
  }),
];
