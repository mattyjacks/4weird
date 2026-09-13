// GraveGain food batch 01: roster idx 0-8 (grave-grapes ... orchard-apple).
//
// Each item spreads its GRAVEGAIN_FOOD_ROSTER entry (emoji codepoints are
// never retyped) and carries the full gravegain1d/2d/3d x
// endless/mission/mmorpg stats table from buildFoodStatsTable(), plus one
// 4..100-char drop note per game/mode cell: endless notes name floors/foes,
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

export const GRAVE_GAIN_FOOD_BATCH_01: GraveGainFoodItemDef[] = [
  makeItem("grave-grapes", {
    gravegain1d: {
      endless: "Floors 1-3, crypt bats drop clusters.",
      mission: "Mission 1 clear reward, vine rows.",
      mmorpg: "Market staple, cheap trade bundles.",
    },
    gravegain2d: {
      endless: "Floors 1-4, arbor spiders drop it.",
      mission: "Mission 2 reward, grove side path.",
      mmorpg: "Auction staple, bulk trade lots.",
    },
    gravegain3d: {
      endless: "Dungeon floors 1-5, cellar foes drop.",
      mission: "Mission 1 reward, crypt arbor cache.",
      mmorpg: "Bazaar staple, guild trade crates.",
    },
  }),
  makeItem("wraith-melon", {
    gravegain1d: {
      endless: "Floors 2-4, mist wisps drop slices.",
      mission: "Mission 2 reward, fog garden plot.",
      mmorpg: "Market find, chilled trade packs.",
    },
    gravegain2d: {
      endless: "Floors 2-5, wraiths drop pale rinds.",
      mission: "Mission 3 reward, mist maze chest.",
      mmorpg: "Auction lot, mist-farm trade deals.",
    },
    gravegain3d: {
      endless: "Dungeon floors 2-6, specters drop it.",
      mission: "Mission 2 reward, cold vault cache.",
      mmorpg: "Bazaar chill stock, caravan trade.",
    },
  }),
  makeItem("crypt-watermelon", {
    gravegain1d: {
      endless: "Floors 3-6, brute ghouls drop slabs.",
      mission: "Mission 3 reward, feast garden haul.",
      mmorpg: "Market bulk, party-share trade lots.",
    },
    gravegain2d: {
      endless: "Floors 3-7, pit brutes drop red slabs.",
      mission: "Mission 4 reward, grand harvest crate.",
      mmorpg: "Auction bulk, harvest festival trade.",
    },
    gravegain3d: {
      endless: "Dungeon floors 3-8, ogres drop slabs.",
      mission: "Mission 3 reward, deep grove bounty.",
      mmorpg: "Bazaar bulk, guild feast contracts.",
    },
  }),
  makeItem("ember-orange", {
    gravegain1d: {
      endless: "Floors 1-3, ember imps drop segments.",
      mission: "Mission 1 reward, warm grove trees.",
      mmorpg: "Market citrus, ember-farm trade.",
    },
    gravegain2d: {
      endless: "Floors 2-5, cinder bats drop glowing fruit.",
      mission: "Mission 2 reward, ember orchard rows.",
      mmorpg: "Auction citrus, glow-market trade.",
    },
    gravegain3d: {
      endless: "Dungeon floors 1-5, forge fiends drop it.",
      mission: "Mission 2 reward, ember vault stash.",
      mmorpg: "Bazaar glow stock, forge trade packs.",
    },
  }),
  makeItem("lantern-lemon", {
    gravegain1d: {
      endless: "Floors 2-4, lantern beetles drop it.",
      mission: "Mission 2 reward, sour grove pick.",
      mmorpg: "Market sour, scholar trade satchels.",
    },
    gravegain2d: {
      endless: "Floors 2-6, wisp moths drop sour fruit.",
      mission: "Mission 3 reward, lantern row harvest.",
      mmorpg: "Auction focus kits, scribe trade.",
    },
    gravegain3d: {
      endless: "Dungeon floors 3-7, crypt moths drop it.",
      mission: "Mission 3 reward, lantern vault trove.",
      mmorpg: "Bazaar scholar stock, guild scribes buy.",
    },
  }),
  makeItem("bog-banana", {
    gravegain1d: {
      endless: "Floors 1-4, bog slugs drop mushy fruit.",
      mission: "Mission 1 reward, marsh trail bundle.",
      mmorpg: "Market cheap, bog-runner trade.",
    },
    gravegain2d: {
      endless: "Floors 1-5, mire toads drop soft bunches.",
      mission: "Mission 2 reward, bog camp ration.",
      mmorpg: "Auction filler, caravan bulk trade.",
    },
    gravegain3d: {
      endless: "Dungeon floors 2-6, fen lurkers drop it.",
      mission: "Mission 2 reward, sunken path cache.",
      mmorpg: "Bazaar bargain bins, peddler trade.",
    },
  }),
  makeItem("crypt-pineapple", {
    gravegain1d: {
      endless: "Floors 3-6, thorn husks drop spiked fruit.",
      mission: "Mission 3 reward, deep grove tribute.",
      mmorpg: "Market prize, feast-platter trade.",
    },
    gravegain2d: {
      endless: "Floors 4-7, grove guardians drop gold fruit.",
      mission: "Mission 4 reward, golden spire offering.",
      mmorpg: "Auction showpiece, banquet trade deals.",
    },
    gravegain3d: {
      endless: "Dungeon floors 4-8, vine tyrants drop it.",
      mission: "Mission 4 reward, deep vault harvest.",
      mmorpg: "Bazaar luxury, guild banquet orders.",
    },
  }),
  makeItem("marrow-mango", {
    gravegain1d: {
      endless: "Floors 3-5, orchard drones drop honeyed fruit.",
      mission: "Mission 3 reward, marrow row gleaning.",
      mmorpg: "Market sweet, orchard trade baskets.",
    },
    gravegain2d: {
      endless: "Floors 3-7, marrow keepers drop ripe mangoes.",
      mission: "Mission 4 reward, honeyed vault cache.",
      mmorpg: "Auction sweet lots, grocer trade pacts.",
    },
    gravegain3d: {
      endless: "Dungeon floors 4-8, marrow wardens drop it.",
      mission: "Mission 4 reward, orchard heart bounty.",
      mmorpg: "Bazaar honeyed stock, guild grocer deals.",
    },
  }),
  makeItem("orchard-apple", {
    gravegain1d: {
      endless: "Floors 1-3, field crows drop crisp apples.",
      mission: "Mission 1 reward, surface orchard pick.",
      mmorpg: "Market classic, starter trade kits.",
    },
    gravegain2d: {
      endless: "Floors 1-4, scarecrow shades drop red fruit.",
      mission: "Mission 1 reward, farmstead bushel.",
      mmorpg: "Auction everyday lots, vendor trade.",
    },
    gravegain3d: {
      endless: "Dungeon floors 1-4, cellar rats drop apples.",
      mission: "Mission 1 reward, gate orchard ration.",
      mmorpg: "Bazaar everyday stock, rookie trade.",
    },
  }),
];
