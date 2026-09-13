// GraveGain food batch 02: roster idx 9-17 (sour-wisp-apple ... brine-olive).
//
// Per-item 5-games x 3-modes stat tables via buildFoodStatsTable() plus a
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
    gravegain4d: {
      endless: "Dream fairways 1-4, giggly wisps guard tart putts.",
      mission: "Mission 4 reward, hedgerow mist cup quest.",
      mmorpg: "Dream snack cart, rookie caddie trade.",
    },
    gravegain5d: {
      endless: "Echo universe hops 1-4, mist bats drop fruit before doom clock.",
      mission: "Mission 5 reward, mist-hop paradox patrol.",
      mmorpg: "Multiverse snack staple, recruit trade stacks.",
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
    gravegain4d: {
      endless: "Dream fairways 2-5, humming W-hazards hide pale putts.",
      mission: "Mission 5 reward, chapel green twilight rite.",
      mmorpg: "Dream healer shelf, gentle trade bundles.",
    },
    gravegain5d: {
      endless: "Void universe hops 2-5, bell shades drop pears before doom clock.",
      mission: "Mission 6 reward, chapel-hop paradox vigil.",
      mmorpg: "Multiverse healer stock, chapel trade circle.",
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
    gravegain4d: {
      endless: "Dream fairways 4-8, brute bunkers drop velvet putts.",
      mission: "Mission 7 reward, grove cup defense round.",
      mmorpg: "Dream cook favorite, peach crate trade.",
    },
    gravegain5d: {
      endless: "Bloom universe hops 4-8, echo brutes drop peaches before doom clock.",
      mission: "Mission 8 reward, press-hop paradox harvest.",
      mmorpg: "Multiverse feast staple, cook-guild trade.",
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
    gravegain4d: {
      endless: "Dream fairways 5-9, thorn-dog bogeys drop cherry putts.",
      mission: "Mission 8 reward, brave-heart cup raid.",
      mmorpg: "Dream duel snack, friendly match trade.",
    },
    gravegain5d: {
      endless: "Void universe hops 5-9, echo bats drop cherries before doom clock.",
      mission: "Mission 9 reward, roost-hop paradox sweep.",
      mmorpg: "Multiverse arena snack, fair-play trade.",
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
    gravegain4d: {
      endless: "Dream fairways 3-7, briar W-hazard imps drop berry putts.",
      mission: "Mission 6 reward, briar-row escort cup.",
      mmorpg: "Dream jam stand, sweet bundle trade.",
    },
    gravegain5d: {
      endless: "Bloom universe hops 3-7, echo wolves drop berries before doom clock.",
      mission: "Mission 6 reward, fence-hop paradox patrol.",
      mmorpg: "Multiverse jam bundles, seasonal swap trade.",
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
    gravegain4d: {
      endless: "Dream fairways 6-10, starry W-hazards drop midnight putts.",
      mission: "Mission 9 reward, observatory star cup watch.",
      mmorpg: "Dream scholar treat, scribe stack trade.",
    },
    gravegain5d: {
      endless: "Static universe hops 6-10, echo owls drop star fruit before doom clock.",
      mission: "Mission 10 reward, archive-hop paradox study.",
      mmorpg: "Multiverse focus gem, study-hall trade.",
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
    gravegain4d: {
      endless: "Dream fairways 2-6, mossy W-hazards hide tangy putts.",
      mission: "Mission 5 reward, cellar green forage cup.",
      mmorpg: "Dream budget bite, caravan cooler trade.",
    },
    gravegain5d: {
      endless: "Dream universe hops 2-6, echo rats drop kiwis before doom clock.",
      mission: "Mission 5 reward, fungus-hop paradox sweep.",
      mmorpg: "Multiverse rookie buy, dive-shop trade.",
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
    gravegain4d: {
      endless: "Dream fairways 1-5, lamp-bug bunkers drop warm putts.",
      mission: "Mission 4 reward, greenhouse guard cup.",
      mmorpg: "Dream hearth stall, cook daily trade.",
    },
    gravegain5d: {
      endless: "Prime universe hops 1-5, echo sprites drop rounds before doom clock.",
      mission: "Mission 4 reward, greenhouse-hop paradox watch.",
      mmorpg: "Multiverse tavern staple, steady swap value.",
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
    gravegain4d: {
      endless: "Dream fairways 3-7, salty W-hazards drop olive putts.",
      mission: "Mission 6 reward, tide-gate hold cup.",
      mmorpg: "Dream ward shelf, guard tackle-box trade.",
    },
    gravegain5d: {
      endless: "Echo universe hops 3-7, tide husks drop olives before doom clock.",
      mission: "Mission 7 reward, salt-hop paradox patrol.",
      mmorpg: "Multiverse shield market, guard-guild trade.",
    },
  }),
];
