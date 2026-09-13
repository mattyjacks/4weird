// GraveGain food batch 07: ember-fries ... falafel-plate (roster idx 53-61).
//
// Each item spreads its GRAVEGAIN_FOOD_ROSTER entry (emoji codepoints are
// never retyped) and carries the full 3-games x 3-modes stats table from
// buildFoodStatsTable() plus a drop note per game/mode cell:
// endless = floors/foes, mission = mission reward, mmorpg = market/trade.

import {
  buildFoodStatsTable,
  type GraveGainFoodGame,
  type GraveGainFoodItemDef,
  type GraveGainFoodMode,
} from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "@/content/gravegain-food-roster";

type BatchNotes = Record<GraveGainFoodGame, Record<GraveGainFoodMode, string>>;

function makeFoodItem(id: string, notes: BatchNotes): GraveGainFoodItemDef {
  const entry = GRAVEGAIN_FOOD_ROSTER.find((r) => r.id === id);
  if (!entry) throw new Error(`missing roster entry ${id}`);
  const stats = buildFoodStatsTable(entry.effect, entry.tier);
  const games = Object.keys(notes) as GraveGainFoodGame[];
  for (const game of games) {
    const modes = Object.keys(notes[game]) as GraveGainFoodMode[];
    for (const mode of modes) {
      stats[game][mode].note = notes[game][mode];
    }
  }
  return { ...entry, stats };
}

export const GRAVE_GAIN_FOOD_BATCH_07: GraveGainFoodItemDef[] = [
  makeFoodItem("ember-fries", {
    gravegain1d: {
      endless: "Floors 1-4: ember imps and fry-cart wrecks drop cones.",
      mission: "Mission 2 clear reward: one hot paper cone.",
      mmorpg: "Cheap auction staple; bulk fry stacks move fast.",
    },
    gravegain2d: {
      endless: "Floors 2-6: street-goblin fry cooks drop cones.",
      mission: "Night-market dash side-mission reward.",
      mmorpg: "Street vendors list it cheap; undercut daily.",
    },
    gravegain3d: {
      endless: "Dungeon food stalls on floors 1-5 drop it.",
      mission: "Patrol mission cache: still-warm fry boxes.",
      mmorpg: "Trade chat favorite; buy in stacks of twenty.",
    },
  }),
  makeFoodItem("whole-pizza", {
    gravegain1d: {
      endless: "Floors 5-9: oven golems and baker ghosts drop it.",
      mission: "Mission 6 feast reward: a whole bubbling pie.",
      mmorpg: "Party-size pie; guild banks stockpile slices.",
    },
    gravegain2d: {
      endless: "Floors 4-8: pizzeria mimics drop whole pies.",
      mission: "Block-party defense mission grand reward.",
      mmorpg: "Sells whole only; slicers flip portions uptown.",
    },
    gravegain3d: {
      endless: "Deep-hall feasters on floors 6-10 drop pies.",
      mission: "Banquet-hall clearance mission reward pie.",
      mmorpg: "High trade volume before weekend raid nights.",
    },
  }),
  makeFoodItem("alley-hotdog", {
    gravegain1d: {
      endless: "Floors 1-5: alley hounds and cart ghosts drop it.",
      mission: "Mission 3 street-sweep reward: mustard included.",
      mmorpg: "Cheapest power snack on the open market.",
    },
    gravegain2d: {
      endless: "Floors 2-5: hotdog vendors turned undead drop it.",
      mission: "Back-alley brawl mission winner's snack.",
      mmorpg: "New-player flipping good; steady small margins.",
    },
    gravegain3d: {
      endless: "Sewer stalls on floors 1-4 drop wrapped dogs.",
      mission: "Undercity patrol mission field ration.",
      mmorpg: "Bulk-cart deals clog trade windows nightly.",
    },
  }),
  makeFoodItem("packed-sandwich", {
    gravegain1d: {
      endless: "Floors 3-7: picnic wraiths and lunchbox mimics drop it.",
      mission: "Mission 4 delve-prep reward: packed triangles.",
      mmorpg: "Reliable heal listing; delves buy by the dozen.",
    },
    gravegain2d: {
      endless: "Floors 3-8: park-ghoul picnickers drop sandwiches.",
      mission: "Long-delve commissary mission reward pack.",
      mmorpg: "Comm guilds bulk-buy for expedition kits.",
    },
    gravegain3d: {
      endless: "Camp ruins on floors 2-7 yield packed lunches.",
      mission: "Supply-run mission pays in sandwich crates.",
      mmorpg: "Crate market stable; spoilage-proof investment.",
    },
  }),
  makeFoodItem("caravan-taco", {
    gravegain1d: {
      endless: "Floors 4-8: caravan raiders and spice ghosts drop it.",
      mission: "Mission 5 escort reward: a crunchy taco.",
      mmorpg: "Spice-route traders list it at a premium.",
    },
    gravegain2d: {
      endless: "Floors 5-9: roadside stand skeletons drop tacos.",
      mission: "Caravan guard mission bonus: taco satchel.",
      mmorpg: "Satchel bundles fetch good caravan-hub prices.",
    },
    gravegain3d: {
      endless: "Trade-road ambushers on floors 4-8 drop tacos.",
      mission: "Spice-road convoy mission reward crate.",
      mmorpg: "Convoy futures market; buy before the rush.",
    },
  }),
  makeFoodItem("trail-burrito", {
    gravegain1d: {
      endless: "Floors 5-10: trail cooks and pack-mule ghosts drop it.",
      mission: "Mission 7 trailblaze reward: one tight burrito.",
      mmorpg: "Full-meal listing; raiders pay well for wraps.",
    },
    gravegain2d: {
      endless: "Floors 4-9: campsite ghouls drop wrapped burritos.",
      mission: "Summit-trail mission summit-cache reward.",
      mmorpg: "Summit-season demand spikes; stockpile early.",
    },
    gravegain3d: {
      endless: "Mountain-pass camps on floors 5-9 drop it.",
      mission: "Pass-clearing mission quartermaster reward.",
      mmorpg: "Quartermaster contracts keep prices firm.",
    },
  }),
  makeFoodItem("steamed-tamale", {
    gravegain1d: {
      endless: "Floors 2-6: steam-vent sprites and husk ghosts drop it.",
      mission: "Mission 3 hearth-tending reward: warm tamales.",
      mmorpg: "Comfort-food niche; hearth guilds buy steady.",
    },
    gravegain2d: {
      endless: "Floors 3-7: market-steamer mimics drop parcels.",
      mission: "Harvest-festival mission steamer-basket reward.",
      mmorpg: "Festival weeks double the basket price.",
    },
    gravegain3d: {
      endless: "Hot-spring caves on floors 3-6 drop parcels.",
      mission: "Spring-watch mission supply parcel reward.",
      mmorpg: "Parcel lots trade quietly; low fees, slow fill.",
    },
  }),
  makeFoodItem("garden-pita", {
    gravegain1d: {
      endless: "Floors 3-7: garden sprites and hedge ghosts drop it.",
      mission: "Mission 4 garden-weeding reward: fresh pitas.",
      mmorpg: "Green-market staple; herbalists bid often.",
    },
    gravegain2d: {
      endless: "Floors 2-6: greenhouse ghouls drop stuffed pitas.",
      mission: "Greenhouse defense mission harvest reward.",
      mmorpg: "Harvest-day auctions flood, then prices rebound.",
    },
    gravegain3d: {
      endless: "Overgrown halls on floors 2-6 drop pitas.",
      mission: "Grove-mapping mission botanist reward.",
      mmorpg: "Botanist circles trade pitas for cuttings.",
    },
  }),
  makeFoodItem("falafel-plate", {
    gravegain1d: {
      endless: "Floors 3-6: falafel-fryer imps and oil ghosts drop it.",
      mission: "Mission 4 market-aid reward: golden plate.",
      mmorpg: "Humble listing with loyal repeat buyers.",
    },
    gravegain2d: {
      endless: "Floors 3-7: chickpea-golem crumbs yield plates.",
      mission: "Street-fair cookoff mission tasting reward.",
      mmorpg: "Cookoff season bumps plate prices nicely.",
    },
    gravegain3d: {
      endless: "Courtyard kitchens on floors 3-7 drop plates.",
      mission: "Kitchen-clearing mission chef reward.",
      mmorpg: "Chef guilds contract monthly plate supply.",
    },
  }),
];
