// GraveGain food batch 02: roster idx 9-17 (sour-wisp-apple ... brine-olive).
//
// Per-item 3-games x 3-modes stat tables via buildFoodStatsTable() plus a
// drop note per game/mode cell (endless: floors/foes, mission: mission reward,
// mmorpg: market/trade note). Roster blurbs/emoji arrive via spread (...entry).

import {
  buildFoodStatsTable,
  type GraveGainFoodGame,
  type GraveGainFoodItemDef,
  type GraveGainFoodMode,
} from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "./gravegain-food-roster";

type NoteGrid = Record<GraveGainFoodGame, Record<GraveGainFoodMode, string>>;

function food(id: string, notes: NoteGrid): GraveGainFoodItemDef {
  const entry = GRAVEGAIN_FOOD_ROSTER.find((e) => e.id === id);
  if (!entry) throw new Error(`missing roster entry ${id}`);
  const stats = buildFoodStatsTable(entry.effect, entry.tier);
  (Object.keys(notes) as GraveGainFoodGame[]).forEach((game) => {
    (Object.keys(notes[game]) as GraveGainFoodMode[]).forEach((mode) => {
      stats[game][mode].note = notes[game][mode];
    });
  });
  return { ...entry, stats };
}

export const GRAVE_GAIN_FOOD_BATCH_02: GraveGainFoodItemDef[] = [
  food("sour-wisp-apple", {
    gravegain1d: {
      endless: "Lanes 1-4: wisp bats drop it along the misty hedgerows.",
      mission: "Mission 3 reward for clearing the orchard ambush.",
      mmorpg: "Cheap auction staple; new delvers flip stacks daily.",
    },
    gravegain2d: {
      endless: "Floors 1-5: wisp swarms drop it near orchard gates.",
      mission: "Mission 4 rescue cache holds a crisp dozen.",
      mmorpg: "Market snack; guilds buy in bulk for recruits.",
    },
    gravegain3d: {
      endless: "Vault tiers 1-3: ghost sprites drop it in the grove.",
      mission: "Mission 2 orchard sweep pays out fresh baskets.",
      mmorpg: "Tradable commons; orchard farmers list it cheap.",
    },
  }),
  food("ghost-pear", {
    gravegain1d: {
      endless: "Lanes 2-5: pale wisps drop it past the fogline.",
      mission: "Mission 4 shrine offering grants humming pears.",
      mmorpg: "Soft-price listed; healers keep spares to sell.",
    },
    gravegain2d: {
      endless: "Floors 2-6: bell phantoms drop it in chapels.",
      mission: "Mission 5 chapel vigil rewards ghost pears.",
      mmorpg: "Auction regular; chapel guilds trade it freely.",
    },
    gravegain3d: {
      endless: "Crypt tiers 1-4: choir shades drop it mid-hum.",
      mission: "Mission 3 choirhall rite pays pear bundles.",
      mmorpg: "Listed by orchard mystics; fair barter value.",
    },
  }),
  food("velvet-peach", {
    gravegain1d: {
      endless: "Lanes 4-8: orchard brutes drop ripe velvet hauls.",
      mission: "Mission 6 grove defense grants peach crates.",
      mmorpg: "Mid-tier auction fruit; cooks pay a premium.",
    },
    gravegain2d: {
      endless: "Floors 4-9: pit brutes drop it near juice presses.",
      mission: "Mission 7 press-house run rewards peach baskets.",
      mmorpg: "Feast-guild staple; steady market turnover.",
    },
    gravegain3d: {
      endless: "Vault tiers 3-6: golden apes drop it in arbors.",
      mission: "Mission 6 arbor siege pays velvet peach chests.",
      mmorpg: "Traded by arbor farmers; honors guild credit.",
    },
  }),
  food("blood-cherries", {
    gravegain1d: {
      endless: "Lanes 5-9: thorn hounds drop dark cherry sprays.",
      mission: "Mission 7 blood-orchard raid rewards cherries.",
      mmorpg: "Bounty-board fruit; duelists buy before matches.",
    },
    gravegain2d: {
      endless: "Floors 5-10: blood bats drop them off rafters.",
      mission: "Mission 8 roost purge pays cherry satchels.",
      mmorpg: "PvP snack; arena vendors flip it at markup.",
    },
    gravegain3d: {
      endless: "Crypt tiers 3-7: gore crows drop tart clusters.",
      mission: "Mission 7 crow-nest sweep grants cherry jars.",
      mmorpg: "Listed by blood-gardeners; fair duel-trade.",
    },
  }),
  food("bramble-strawberry", {
    gravegain1d: {
      endless: "Lanes 3-7: thorn rows hide it on briar imps.",
      mission: "Mission 5 briar-row escort pays berry boxes.",
      mmorpg: "Sweet market mover; jam-makers bid it up.",
    },
    gravegain2d: {
      endless: "Floors 3-8: briar wolves drop it near fences.",
      mission: "Mission 6 fence-line patrol grants berry tins.",
      mmorpg: "Traded in jam bundles; seasonal price bumps.",
    },
    gravegain3d: {
      endless: "Hedge tiers 2-5: bramble sprites drop ripe rows.",
      mission: "Mission 5 hedge-maze dash rewards berry packs.",
      mmorpg: "Market favorite; hedge guilds sell it fresh.",
    },
  }),
  food("star-blueberries", {
    gravegain1d: {
      endless: "Lanes 6-10: star sprites drop them past midnight.",
      mission: "Mission 8 observatory watch grants star tins.",
      mmorpg: "Scholar snack; scribes pay well for stacks.",
    },
    gravegain2d: {
      endless: "Floors 6-11: ink owls drop them in libraries.",
      mission: "Mission 9 archive delve rewards star pouches.",
      mmorpg: "Focus-trader gem; study halls buy in bulk.",
    },
    gravegain3d: {
      endless: "Vault tiers 4-8: constellation wisps drop them.",
      mission: "Mission 8 star-chart quest pays berry charts.",
      mmorpg: "Listed by star-charters; solid barter value.",
    },
  }),
  food("dungeon-kiwi", {
    gravegain1d: {
      endless: "Lanes 2-6: moss gremlins drop it in damp cuts.",
      mission: "Mission 4 cellar forage grants kiwi sacks.",
      mmorpg: "Budget heal; caravan hawkers sell it cheap.",
    },
    gravegain2d: {
      endless: "Floors 2-6: cellar rats drop it near fungus beds.",
      mission: "Mission 5 fungus-bed sweep pays kiwi crates.",
      mmorpg: "Rookie market buy; dive shops stock it deep.",
    },
    gravegain3d: {
      endless: "Moss tiers 1-4: cave newts drop zesty clutches.",
      mission: "Mission 3 moss-grotto probe grants kiwi nets.",
      mmorpg: "Grotto farmers list it; easy starter trade.",
    },
  }),
  food("heart-tomato", {
    gravegain1d: {
      endless: "Lanes 1-5: grow-lamp beetles drop warm rounds.",
      mission: "Mission 3 greenhouse guard pays tomato boxes.",
      mmorpg: "Hearth-stall staple; cooks trade it daily.",
    },
    gravegain2d: {
      endless: "Floors 1-6: lamp sprites drop it in greenhouses.",
      mission: "Mission 4 greenhouse watch grants red baskets.",
      mmorpg: "Tavern buy-list item; steady copper value.",
    },
    gravegain3d: {
      endless: "Grow tiers 1-5: lamp wardens drop ripe hearts.",
      mission: "Mission 2 grow-lamp rite rewards tomato rows.",
      mmorpg: "Growers auction it; feast halls bid often.",
    },
  }),
  food("brine-olive", {
    gravegain1d: {
      endless: "Lanes 3-7: salt crabs drop briny pocket wards.",
      mission: "Mission 5 tide-gate hold grants olive jars.",
      mmorpg: "Ward-trader pick; tanks buy pre-raid stacks.",
    },
    gravegain2d: {
      endless: "Floors 3-8: tide husks drop it along salt pans.",
      mission: "Mission 6 salt-pan patrol pays olive pouches.",
      mmorpg: "Shield-market regular; guard guilds flip it.",
    },
    gravegain3d: {
      endless: "Brine tiers 2-6: salt sirens drop filmed olives.",
      mission: "Mission 5 brine-cistern dive grants olive casks.",
      mmorpg: "Listed by tide merchants; solid ward barter.",
    },
  }),
];
