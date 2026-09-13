// GraveGain food batch 04: roster idx 27-35 (cool-cucumber ... warming-ginger).
// Each item spreads its roster entry (id/name/emoji/blurb/effect/tier are never
// retyped) and carries a full 3-games x 3-modes stats table via
// buildFoodStatsTable() plus a 4..100-char drop note per game/mode cell:
// endless = floors/foes, mission = mission reward, mmorpg = market/trade note.

import { buildFoodStatsTable, type GraveGainFoodItemDef, type GraveGainFoodModeStats } from "@/lib/gravegain-food";
import { GRAVEGAIN_FOOD_ROSTER } from "./gravegain-food-roster";

type GameKey = "gravegain1d" | "gravegain2d" | "gravegain3d" | "gravegain4d" | "gravegain5d";
type BaseGameKey = "gravegain1d" | "gravegain2d" | "gravegain3d";
type ModeKey = "endless" | "mission" | "mmorpg";
type Notes = Record<GameKey, Record<ModeKey, string>>;

function makeItem(id: string, notes: Notes): GraveGainFoodItemDef {
  const entry = GRAVEGAIN_FOOD_ROSTER.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown roster id: ${id}`);
  const stats = buildFoodStatsTable(entry.effect, entry.tier);
  const table = stats as unknown as Record<GameKey, Record<ModeKey, GraveGainFoodModeStats>>;
  (Object.keys(notes) as GameKey[]).forEach((game) => {
    (Object.keys(notes[game]) as ModeKey[]).forEach((mode) => {
      if (game === "gravegain4d" || game === "gravegain5d") {
        table[game] = table[game] ?? ({} as Record<ModeKey, GraveGainFoodModeStats>);
        table[game][mode] = { ...stats.gravegain3d[mode], note: notes[game][mode] };
      } else {
        const base = game as BaseGameKey;
        stats[base][mode] = { ...stats[base][mode], note: notes[game][mode] };
      }
    });
  });
  return { ...entry, stats };
}

export const GRAVE_GAIN_FOOD_BATCH_04: GraveGainFoodItemDef[] = [
  makeItem("cool-cucumber", {
    gravegain1d: {
      endless: "Floors 2-6 frost imps drop chilled slices.",
      mission: "Mission 3 heal-cache reward.",
      mmorpg: "Market staple; cheap bulk trade.",
    },
    gravegain2d: {
      endless: "Floors 4-9 bog frogs drop cool rings.",
      mission: "Mission 5 garden-cache reward.",
      mmorpg: "Auction staple; new-player trade.",
    },
    gravegain3d: {
      endless: "Crypt floors 3-7 chillers drop it.",
      mission: "Mission 2 field-ration reward.",
      mmorpg: "Guild vendor staple; easy resale.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 2-5: bunker imps drop chilled slices.",
      mission: "Mission 3 birdie-trial reward for clean putt goals.",
      mmorpg: "Clubhouse market staple; caddies trade cool bundles.",
    },
    gravegain5d: {
      endless: "Prime universe floors 2-5: echo sprites drop cool pods.",
      mission: "Mission 4 hop-run reward across the dream universe.",
      mmorpg: "Portal-market staple; hop traders swap it in bulk.",
    },
  }),
  makeItem("grave-lettuce", {
    gravegain1d: {
      endless: "Floors 1-5 crypt slugs drop dewy leaves.",
      mission: "Mission 2 sprout-patch reward.",
      mmorpg: "Market greens; steady low-price trade.",
    },
    gravegain2d: {
      endless: "Floors 3-8 garden ghouls drop heads.",
      mission: "Mission 4 greenhouse-cache reward.",
      mmorpg: "Auction greens; bundles sell fast.",
    },
    gravegain3d: {
      endless: "Vault floors 2-6 root mites drop it.",
      mission: "Mission 3 ration-crate reward.",
      mmorpg: "Guild pantry staple; fair resale.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 1-4: rough rogues drop dewy leaves.",
      mission: "Mission 2 par-trial reward for tidy putt goals.",
      mmorpg: "Clubhouse greens stand; fair trade for young caddies.",
    },
    gravegain5d: {
      endless: "Echo universe floors 1-4: void moles drop leafy heads.",
      mission: "Mission 3 paradox-plot reward for patient hoppers.",
      mmorpg: "Cross-universe greens; bloom vendors bundle it cheap.",
    },
  }),
  makeItem("iron-broccoli", {
    gravegain1d: {
      endless: "Floors 4-8 iron beetles drop florets.",
      mission: "Mission 4 ward-cache reward.",
      mmorpg: "Smith market ward-snack; firm price.",
    },
    gravegain2d: {
      endless: "Floors 5-10 moss golems drop stalks.",
      mission: "Mission 6 vanguard-cache reward.",
      mmorpg: "Auction ward staple; tanks buy bulk.",
    },
    gravegain3d: {
      endless: "Deep floors 4-9 ore crawlers drop it.",
      mission: "Mission 5 shield-ration reward.",
      mmorpg: "Guild quartermaster stock; good resale.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 4-7: sand-trap golems drop florets.",
      mission: "Mission 4 iron-tee trial reward for steady swings.",
      mmorpg: "Clubhouse ward-snack; guards pay firm coin for bulk.",
    },
    gravegain5d: {
      endless: "Void universe floors 4-8: static sentries drop stalks.",
      mission: "Mission 5 hop-warden reward for brave universe hops.",
      mmorpg: "Portal-market ward staple; tanks bulk-buy across hops.",
    },
  }),
  makeItem("vampire-garlic", {
    gravegain1d: {
      endless: "Floors 5-10 crypt bats drop braids.",
      mission: "Mission 6 chapel-cache reward.",
      mmorpg: "Ward market premium; hunters pay well.",
    },
    gravegain2d: {
      endless: "Floors 6-12 risen thralls drop bulbs.",
      mission: "Mission 7 exorcist-cache reward.",
      mmorpg: "Auction premium ward; strong demand.",
    },
    gravegain3d: {
      endless: "Coffin floors 5-11 vamp spawn drop it.",
      mission: "Mission 6 relic-vault reward.",
      mmorpg: "Guild auction rare; high resale.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 5-8: W-hazard bats drop braids.",
      mission: "Mission 6 night-nine reward for brave putt goals.",
      mmorpg: "Clubhouse premium ward; night caddies pay well.",
    },
    gravegain5d: {
      endless: "Dream universe floors 5-9: paradox thralls drop bulbs.",
      mission: "Mission 6 void-hop reward for sealing the echo rift.",
      mmorpg: "Portal-market premium; hunters trade it universe-wide.",
    },
  }),
  makeItem("ogre-onion", {
    gravegain1d: {
      endless: "Floors 3-7 ogre grunts drop layers.",
      mission: "Mission 4 brawler-cache reward.",
      mmorpg: "Market ward bulk; kitchen trade.",
    },
    gravegain2d: {
      endless: "Floors 4-9 hill ogres drop rings.",
      mission: "Mission 5 guard-post reward.",
      mmorpg: "Auction ward bundles; steady sales.",
    },
    gravegain3d: {
      endless: "War floors 4-8 maulers drop it.",
      mission: "Mission 4 barracks-cache reward.",
      mmorpg: "Guild mess staple; fair resale.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 3-6: fairway ogres drop layers.",
      mission: "Mission 4 bogey-trial reward for bold putt goals.",
      mmorpg: "Clubhouse kitchen bulk; cooks trade savory stacks.",
    },
    gravegain5d: {
      endless: "Bloom universe floors 3-6: echo maulers drop rings.",
      mission: "Mission 4 hop-brawl reward for friendly sparring.",
      mmorpg: "Portal-market kitchen staple; steady hop-trade sales.",
    },
  }),
  makeItem("mighty-peanut", {
    gravegain1d: {
      endless: "Floors 2-6 burrow rats drop shells.",
      mission: "Mission 3 trail-cache reward.",
      mmorpg: "Snack market favorite; quick flips.",
    },
    gravegain2d: {
      endless: "Floors 3-8 harvest sprites drop pods.",
      mission: "Mission 4 striker-cache reward.",
      mmorpg: "Auction power-snack; fighters buy bulk.",
    },
    gravegain3d: {
      endless: "Cache floors 3-7 kobolds drop it.",
      mission: "Mission 3 vanguard-ration reward.",
      mmorpg: "Guild canteen stock; brisk resale.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 2-5: putt-gremlins drop shells.",
      mission: "Mission 3 caddie-sprint reward for speedy putt goals.",
      mmorpg: "Clubhouse snack favorite; quick flips at the turn.",
    },
    gravegain5d: {
      endless: "Static universe floors 2-5: bloom rats drop crisp pods.",
      mission: "Mission 3 star-hop reward for zippy trail runners.",
      mmorpg: "Portal-market power-snack; fighters buy hop bundles.",
    },
  }),
  makeItem("hex-beans", {
    gravegain1d: {
      endless: "Floors 4-9 hex crows drop speckled pods.",
      mission: "Mission 5 spell-cache reward.",
      mmorpg: "Caster market pick; spell-trade bait.",
    },
    gravegain2d: {
      endless: "Floors 5-10 rune hounds drop handfuls.",
      mission: "Mission 6 mage-tower reward.",
      mmorpg: "Auction strength staple; mages pay up.",
    },
    gravegain3d: {
      endless: "Rune floors 5-11 glyph fiends drop it.",
      mission: "Mission 6 arcane-vault reward.",
      mmorpg: "Guild enchanter stock; solid resale.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 4-7: W-hazard crows drop pods.",
      mission: "Mission 5 spell-tee reward for clever putt goals.",
      mmorpg: "Clubhouse caster pick; mages trade charmed handfuls.",
    },
    gravegain5d: {
      endless: "Echo universe floors 4-8: rune hounds drop handfuls.",
      mission: "Mission 6 paradox-tower reward for riddle hoppers.",
      mmorpg: "Portal-market spell staple; mages pay up in hops.",
    },
  }),
  makeItem("golem-chestnut", {
    gravegain1d: {
      endless: "Floors 3-7 pebble golems drop roast nuts.",
      mission: "Mission 4 bastion-cache reward.",
      mmorpg: "Ward market hearth-snack; steady value.",
    },
    gravegain2d: {
      endless: "Floors 4-9 stone sentries drop cones.",
      mission: "Mission 5 rampart-cache reward.",
      mmorpg: "Auction ward bundles; guards buy bulk.",
    },
    gravegain3d: {
      endless: "Forge floors 4-8 cinder fists drop it.",
      mission: "Mission 5 anvil-cache reward.",
      mmorpg: "Guild forge staple; reliable resale.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 3-6: bunker golems drop roast nuts.",
      mission: "Mission 4 bastion-nine reward for steady putt goals.",
      mmorpg: "Clubhouse hearth-snack; steady value for defenders.",
    },
    gravegain5d: {
      endless: "Prime universe floors 3-6: stone sentries drop cones.",
      mission: "Mission 5 rampart-hop reward for patient guards.",
      mmorpg: "Portal-market guard staple; bulk bins at hop gates.",
    },
  }),
  makeItem("warming-ginger", {
    gravegain1d: {
      endless: "Floors 4-8 ember wisps drop warm roots.",
      mission: "Mission 5 sprint-cache reward.",
      mmorpg: "Scout market spice; racers pay well.",
    },
    gravegain2d: {
      endless: "Floors 5-10 ash sprinters drop knobs.",
      mission: "Mission 6 wind-road reward.",
      mmorpg: "Auction haste staple; couriers buy bulk.",
    },
    gravegain3d: {
      endless: "Ember floors 5-11 flame dancers drop it.",
      mission: "Mission 6 relay-cache reward.",
      mmorpg: "Guild scout reserve; brisk resale.",
    },
    gravegain4d: {
      endless: "Dream fairway holes 4-7: ember caddies drop warm roots.",
      mission: "Mission 5 sunrise-tee reward for brisk putt goals.",
      mmorpg: "Clubhouse spice shelf; racers pay well for warmups.",
    },
    gravegain5d: {
      endless: "Bloom universe floors 4-7: solar wisps drop warm knobs.",
      mission: "Mission 6 dawn-hop reward for speedy universe runs.",
      mmorpg: "Portal-market haste spice; couriers bulk-buy for hops.",
    },
  }),
];
