// GraveGain food batch 03: roster idx 18-26 (iron-coconut ... swift-pepper).
//
// Each item spreads its GRAVEGAIN_FOOD_ROSTER entry (emoji codepoints are
// never retyped) and carries the full gravegain1d/2d/3d/4d/5d x
// endless/mission/mmorpg stats table from buildFoodStatsTable(), plus one
// 4..120-char drop note per game/mode cell: endless notes name floors/foes,
// mission notes name the rewarding mission, mmorpg notes cover market/trade.

import { buildFoodStatsTable } from "@/lib/gravegain-food";
import type {
  GraveGainFoodGame,
  GraveGainFoodItemDef,
  GraveGainFoodMode,
} from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "./gravegain-food-roster";

type NoteTable = Record<GraveGainFoodGame, Record<GraveGainFoodMode, string>>;

function makeItem(id: string, notes: NoteTable): GraveGainFoodItemDef {
  const entry = GRAVEGAIN_FOOD_ROSTER.find((r) => r.id === id);
  if (!entry) throw new Error(`missing roster entry ${id}`);
  const stats = buildFoodStatsTable(entry.effect, entry.tier);
  (Object.keys(notes) as GraveGainFoodGame[]).forEach((game) => {
    (Object.keys(notes[game]) as GraveGainFoodMode[]).forEach((mode) => {
      stats[game][mode].note = notes[game][mode];
    });
  });
  return { ...entry, stats };
}

export const GRAVE_GAIN_FOOD_BATCH_03: GraveGainFoodItemDef[] = [
  makeItem("iron-coconut", {
    gravegain1d: {
      endless: "Floors 3-6, iron husks drop hard shells.",
      mission: "Mission 4 reward, palm grove harvest.",
      mmorpg: "Ward staple, shell-crate market trade.",
    },
    gravegain2d: {
      endless: "Floors 4-7, cracker crabs drop coconuts.",
      mission: "Mission 5 reward, iron palm tribute.",
      mmorpg: "Auction ward lots, cooper trade packs.",
    },
    gravegain3d: {
      endless: "Dungeon floors 4-8, vault apes drop it.",
      mission: "Mission 5 reward, deep palm vault cache.",
      mmorpg: "Bazaar hard-shell stock, guild ward deals.",
    },
    gravegain4d: {
      endless: "Dream fairways 3-6, iron W-hazards drop shell putts.",
      mission: "Mission 5 reward, palm green strong-swing cup.",
      mmorpg: "Dream ward counter, shell-crate trade.",
    },
    gravegain5d: {
      endless: "Prime universe hops 3-6, echo crabs drop shells before doom clock.",
      mission: "Mission 6 reward, iron-hop paradox tribute.",
      mmorpg: "Multiverse ward lots, cooper crate trade.",
    },
  }),
  makeItem("spore-cap", {
    gravegain1d: {
      endless: "Floors 1-3, cave bats drop thin veils.",
      mission: "Mission 1 reward, mushroom row pick.",
      mmorpg: "Market cheap, spore-sack trade bundles.",
    },
    gravegain2d: {
      endless: "Floors 1-4, spore mites drop pale caps.",
      mission: "Mission 2 reward, damp hollow harvest.",
      mmorpg: "Auction filler, herbalist trade lots.",
    },
    gravegain3d: {
      endless: "Dungeon floors 1-5, mold fiends drop it.",
      mission: "Mission 1 reward, spore vault gleaning.",
      mmorpg: "Bazaar bargain bins, peddler trade.",
    },
    gravegain4d: {
      endless: "Dream fairways 1-3, drowsy bat bogeys drop veil putts.",
      mission: "Mission 2 reward, mushroom row morning cup.",
      mmorpg: "Dream penny bite, spore-sack trade.",
    },
    gravegain5d: {
      endless: "Dream universe hops 1-3, echo mites drop caps before doom clock.",
      mission: "Mission 3 reward, hollow-hop paradox pick.",
      mmorpg: "Multiverse filler lots, herbalist trade.",
    },
  }),
  makeItem("bog-avocado", {
    gravegain1d: {
      endless: "Floors 2-5, bog toads drop soft fruit.",
      mission: "Mission 2 reward, marsh grove bundle.",
      mmorpg: "Market creamy, cushion-ward trade.",
    },
    gravegain2d: {
      endless: "Floors 2-6, mire sprites drop green flesh.",
      mission: "Mission 3 reward, sunken orchard pick.",
      mmorpg: "Auction pillow lots, grocer trade.",
    },
    gravegain3d: {
      endless: "Dungeon floors 3-7, fen wardens drop it.",
      mission: "Mission 3 reward, bog vault cache.",
      mmorpg: "Bazaar soft stock, caravan ward trade.",
    },
    gravegain4d: {
      endless: "Dream fairways 2-5, boggy W-hazards drop creamy putts.",
      mission: "Mission 4 reward, marsh green soft-cup quest.",
      mmorpg: "Dream creamy shelf, cushion-ward trade.",
    },
    gravegain5d: {
      endless: "Dream universe hops 2-5, mire sprites drop green fruit before doom clock.",
      mission: "Mission 4 reward, sunken-hop paradox pick.",
      mmorpg: "Multiverse pillow lots, grocer swap trade.",
    },
  }),
  makeItem("night-eggplant", {
    gravegain1d: {
      endless: "Floors 2-5, night slugs drop glossy fruit.",
      mission: "Mission 2 reward, moonlit row harvest.",
      mmorpg: "Market steady, fighter-fuel trade.",
    },
    gravegain2d: {
      endless: "Floors 3-6, dusk stalkers drop meaty veg.",
      mission: "Mission 3 reward, violet garden tribute.",
      mmorpg: "Auction strength lots, cook trade pacts.",
    },
    gravegain3d: {
      endless: "Dungeon floors 3-7, shade gardeners drop it.",
      mission: "Mission 3 reward, night vault bounty.",
      mmorpg: "Bazaar meaty stock, guild cook orders.",
    },
    gravegain4d: {
      endless: "Dream fairways 2-5, moonlit W-hazard slugs drop glossy putts.",
      mission: "Mission 4 reward, moon-green night cup.",
      mmorpg: "Dream steady fuel, fighter snack trade.",
    },
    gravegain5d: {
      endless: "Void universe hops 2-5, dusk shades drop night fruit before doom clock.",
      mission: "Mission 5 reward, violet-hop paradox garden.",
      mmorpg: "Multiverse strength lots, cook pact trade.",
    },
  }),
  makeItem("dirt-potato", {
    gravegain1d: {
      endless: "Floors 1-4, digger moles drop soil tubers.",
      mission: "Mission 1 reward, bonefire field sack.",
      mmorpg: "Market humble, bulk ration trade.",
    },
    gravegain2d: {
      endless: "Floors 1-5, tuber grubs drop dirt-caked spuds.",
      mission: "Mission 2 reward, coal-row harvest.",
      mmorpg: "Auction sack lots, camp cook trade.",
    },
    gravegain3d: {
      endless: "Dungeon floors 2-6, ash delvers drop it.",
      mission: "Mission 2 reward, ember field cache.",
      mmorpg: "Bazaar staple sacks, caravan ration deals.",
    },
    gravegain4d: {
      endless: "Dream fairways 1-4, molehill bunkers drop soil putts.",
      mission: "Mission 2 reward, bonefire field harvest cup.",
      mmorpg: "Dream humble sack, bulk ration trade.",
    },
    gravegain5d: {
      endless: "Prime universe hops 1-4, echo grubs drop tubers before doom clock.",
      mission: "Mission 3 reward, coal-hop paradox harvest.",
      mmorpg: "Multiverse sack lots, camp-cook trade.",
    },
  }),
  makeItem("lantern-carrot", {
    gravegain1d: {
      endless: "Floors 1-4, field rabbits drop crisp roots.",
      mission: "Mission 1 reward, lantern row thinning.",
      mmorpg: "Market swift, runner trade bundles.",
    },
    gravegain2d: {
      endless: "Floors 2-5, burrow sprinters drop orange roots.",
      mission: "Mission 2 reward, swift garden harvest.",
      mmorpg: "Auction speed kits, scout trade.",
    },
    gravegain3d: {
      endless: "Dungeon floors 2-6, warren dashers drop it.",
      mission: "Mission 2 reward, glow-bed cache.",
      mmorpg: "Bazaar quick stock, courier trade packs.",
    },
    gravegain4d: {
      endless: "Dream fairways 1-4, rabbit W-hazard racers drop crisp putts.",
      mission: "Mission 2 reward, lantern-row thinning cup.",
      mmorpg: "Dream swift shelf, runner bundle trade.",
    },
    gravegain5d: {
      endless: "Prime universe hops 1-4, echo runners drop roots before doom clock.",
      mission: "Mission 3 reward, trellis-hop paradox dash.",
      mmorpg: "Multiverse speed kits, scout swap trade.",
    },
  }),
  makeItem("gold-corn", {
    gravegain1d: {
      endless: "Floors 2-5, husk scarecrows drop golden ears.",
      mission: "Mission 2 reward, buttered row harvest.",
      mmorpg: "Market golden, harvest trade baskets.",
    },
    gravegain2d: {
      endless: "Floors 3-6, corn golems drop buttered cobs.",
      mission: "Mission 3 reward, sunfield tribute.",
      mmorpg: "Auction warm lots, feast-side trade.",
    },
    gravegain3d: {
      endless: "Dungeon floors 3-7, grain wardens drop it.",
      mission: "Mission 3 reward, golden vault store.",
      mmorpg: "Bazaar sweet stock, guild feast orders.",
    },
    gravegain4d: {
      endless: "Dream fairways 2-5, husk W-hazards drop golden putts.",
      mission: "Mission 4 reward, buttered-row harvest cup.",
      mmorpg: "Dream golden ear, harvest basket trade.",
    },
    gravegain5d: {
      endless: "Bloom universe hops 2-5, echo golems drop cobs before doom clock.",
      mission: "Mission 5 reward, sunfield-hop paradox tribute.",
      mmorpg: "Multiverse warm lots, feast-side trade.",
    },
  }),
  makeItem("dragon-pepper", {
    gravegain1d: {
      endless: "Floors 4-7, cinder drakes drop fire pods.",
      mission: "Mission 5 reward, dragon row trial.",
      mmorpg: "Market fiery, rage-food trade at premium.",
    },
    gravegain2d: {
      endless: "Floors 5-8, ember wyrmlings drop hot peppers.",
      mission: "Mission 6 reward, volcanic plot harvest.",
      mmorpg: "Auction rage lots, brawler trade bids.",
    },
    gravegain3d: {
      endless: "Dungeon floors 5-9, magma serpents drop it.",
      mission: "Mission 6 reward, fire vault bounty.",
      mmorpg: "Bazaar inferno stock, war-guild contracts.",
    },
    gravegain4d: {
      endless: "Dream fairways 4-7, cinder W-hazards drop fire putts.",
      mission: "Mission 7 reward, dragon-row trial cup.",
      mmorpg: "Dream fiery bite, bold snack trade.",
    },
    gravegain5d: {
      endless: "Void universe hops 4-7, echo drakes drop fire pods before doom clock.",
      mission: "Mission 8 reward, volcano-hop paradox trial.",
      mmorpg: "Multiverse heat lots, brave-trade bids.",
    },
  }),
  makeItem("swift-pepper", {
    gravegain1d: {
      endless: "Floors 1-4, garden skitters drop green pods.",
      mission: "Mission 1 reward, crisp row harvest.",
      mmorpg: "Market light, footwork trade kits.",
    },
    gravegain2d: {
      endless: "Floors 2-5, vine runners drop crunchy peppers.",
      mission: "Mission 2 reward, pepper trellis pick.",
      mmorpg: "Auction haste lots, duelist trade.",
    },
    gravegain3d: {
      endless: "Dungeon floors 2-6, greenhouse fiends drop it.",
      mission: "Mission 2 reward, green vault cache.",
      mmorpg: "Bazaar crisp stock, scout courier trade.",
    },
    gravegain4d: {
      endless: "Dream fairways 1-4, skitter W-hazards drop zippy putts.",
      mission: "Mission 2 reward, crisp-row sprint cup.",
      mmorpg: "Dream light bite, footwork kit trade.",
    },
    gravegain5d: {
      endless: "Prime universe hops 1-4, echo runners drop peppers before doom clock.",
      mission: "Mission 3 reward, trellis-hop paradox sprint.",
      mmorpg: "Multiverse haste lots, friendly duel trade.",
    },
  }),
];
