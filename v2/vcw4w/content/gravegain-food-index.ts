// GraveGain food index: union of all 15 batch tables (v2 layer catalog truth).
//
// 127 consumables, one per food emoji, each served in gravegain1d,
// gravegain2d, gravegain3d, gravegain4d and gravegain5d across endless, mission and mmorpg modes with
// per-game/per-mode balanced numbers from deriveFoodStats() (see
// lib/gravegain-food.ts). Runtime overlay bundle (gravegain-loot.js) and
// catalog/PlayGate wiring go through the integrator QUEUE.md request — this
// module is the data source, never the wiring.

import type {
  GraveGainFoodGame,
  GraveGainFoodItemDef,
  GraveGainFoodMode,
} from "@/lib/gravegain-food";
import { GRAVE_GAIN_FOOD_BATCH_01 } from "./gravegain-food-batch-01";
import { GRAVE_GAIN_FOOD_BATCH_02 } from "./gravegain-food-batch-02";
import { GRAVE_GAIN_FOOD_BATCH_03 } from "./gravegain-food-batch-03";
import { GRAVE_GAIN_FOOD_BATCH_04 } from "./gravegain-food-batch-04";
import { GRAVE_GAIN_FOOD_BATCH_05 } from "./gravegain-food-batch-05";
import { GRAVE_GAIN_FOOD_BATCH_06 } from "./gravegain-food-batch-06";
import { GRAVE_GAIN_FOOD_BATCH_07 } from "./gravegain-food-batch-07";
import { GRAVE_GAIN_FOOD_BATCH_08 } from "./gravegain-food-batch-08";
import { GRAVE_GAIN_FOOD_BATCH_09 } from "./gravegain-food-batch-09";
import { GRAVE_GAIN_FOOD_BATCH_10 } from "./gravegain-food-batch-10";
import { GRAVE_GAIN_FOOD_BATCH_11 } from "./gravegain-food-batch-11";
import { GRAVE_GAIN_FOOD_BATCH_12 } from "./gravegain-food-batch-12";
import { GRAVE_GAIN_FOOD_BATCH_13 } from "./gravegain-food-batch-13";
import { GRAVE_GAIN_FOOD_BATCH_14 } from "./gravegain-food-batch-14";
import { GRAVE_GAIN_FOOD_BATCH_15 } from "./gravegain-food-batch-15";

export const GRAVE_GAIN_FOOD_ALL: readonly GraveGainFoodItemDef[] = [
  ...GRAVE_GAIN_FOOD_BATCH_01,
  ...GRAVE_GAIN_FOOD_BATCH_02,
  ...GRAVE_GAIN_FOOD_BATCH_03,
  ...GRAVE_GAIN_FOOD_BATCH_04,
  ...GRAVE_GAIN_FOOD_BATCH_05,
  ...GRAVE_GAIN_FOOD_BATCH_06,
  ...GRAVE_GAIN_FOOD_BATCH_07,
  ...GRAVE_GAIN_FOOD_BATCH_08,
  ...GRAVE_GAIN_FOOD_BATCH_09,
  ...GRAVE_GAIN_FOOD_BATCH_10,
  ...GRAVE_GAIN_FOOD_BATCH_11,
  ...GRAVE_GAIN_FOOD_BATCH_12,
  ...GRAVE_GAIN_FOOD_BATCH_13,
  ...GRAVE_GAIN_FOOD_BATCH_14,
  ...GRAVE_GAIN_FOOD_BATCH_15,
];

export const GRAVE_GAIN_FOOD_COUNT = GRAVE_GAIN_FOOD_ALL.length;

export const GRAVE_GAIN_FOOD_BY_ID: Readonly<
  Record<string, GraveGainFoodItemDef>
> = Object.fromEntries(GRAVE_GAIN_FOOD_ALL.map((item) => [item.id, item]));

/** Every item served in one game+mode, with its tuned stats attached. */
export function getFoodFor(
  game: GraveGainFoodGame,
  mode: GraveGainFoodMode,
): readonly (GraveGainFoodItemDef & {
  serving: GraveGainFoodItemDef["stats"][GraveGainFoodGame][GraveGainFoodMode];
})[] {
  return GRAVE_GAIN_FOOD_ALL.map((item) => ({
    ...item,
    serving: item.stats[game][mode],
  }));
}

/** Items of one effect kind (same effect in every game/mode by construction). */
export function getFoodByEffect(
  effect: GraveGainFoodItemDef["effect"],
): readonly GraveGainFoodItemDef[] {
  return GRAVE_GAIN_FOOD_ALL.filter((item) => item.effect === effect);
}
