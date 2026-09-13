/**
 * Fridge Simulator v2 food catalog — emoji food stats validator.
 *
 * Pure TypeScript: zero imports, no DOM, no Node APIs, SSR-safe. Safe to
 * import from server components, route handlers, and content modules.
 *
 * Relationship to the legacy bundle
 * (`v2/vcw4w/public/games/html/fridgesimulator/game.js`): the bundle's
 * `FOOD_STATS` (~34 entries: name/hunger/nutrition) plus `FOOD_PRICES` are
 * the source of truth this catalog mirrors. Every bundle entry is carried
 * over below with IDENTICAL name/hunger/nutrition values (price taken from
 * the bundle's FOOD_PRICES table); the bundle may mirror this file going
 * forward, but this module imports NOTHING from the bundle.
 *
 * Nutrition tuple shape: [protein, carb, vitamin] (matches the bundle's
 * CATEGORY_LABELS of Pro/Carb/Vit).
 */

export interface FridgeFood {
  name: string;
  price: number;
  hunger: number;
  nutrition: [number, number, number];
  category: string;
}

export const CATEGORIES = [
  "protein",
  "seafood",
  "carb",
  "fruit",
  "vegetable",
  "dairy",
  "fastfood",
  "meal",
  "asian",
  "dessert",
  "drink",
  "snack",
  "condiment",
] as const;

export type FridgeCategory = (typeof CATEGORIES)[number];

export const FRIDGE_FOODS: Record<string, FridgeFood> = {
  // ---- Bundle mirror: proteins (same name/hunger/nutrition as FOOD_STATS) ----
  "🍗": { name: "Chicken", hunger: 50, nutrition: [50, 0, 0], price: 3, category: "protein" },
  "🥩": { name: "Steak", hunger: 70, nutrition: [60, 0, 0], price: 4, category: "protein" },
  "🍖": { name: "Ribs", hunger: 60, nutrition: [50, 0, 0], price: 3.5, category: "protein" },
  "🐟": { name: "Fish", hunger: 45, nutrition: [50, 0, 0], price: 5, category: "protein" },
  "🥚": { name: "Egg", hunger: 30, nutrition: [30, 0, 0], price: 2, category: "protein" },
  "🫘": { name: "Beans", hunger: 40, nutrition: [30, 20, 0], price: 1.5, category: "protein" },
  "🧀": { name: "Cheese", hunger: 35, nutrition: [40, 0, 0], price: 3, category: "protein" },
  "🥜": { name: "Peanuts", hunger: 25, nutrition: [25, 10, 0], price: 2, category: "protein" },
  // ---- Bundle mirror: carbs ----
  "🍞": { name: "Bread", hunger: 40, nutrition: [10, 50, 0], price: 2, category: "carb" },
  "🍚": { name: "Rice", hunger: 35, nutrition: [0, 50, 0], price: 1.5, category: "carb" },
  "🍝": { name: "Pasta", hunger: 55, nutrition: [10, 60, 0], price: 2, category: "carb" },
  "🥔": { name: "Potato", hunger: 40, nutrition: [0, 30, 15], price: 1, category: "carb" },
  "🌽": { name: "Corn", hunger: 30, nutrition: [0, 30, 15], price: 1.5, category: "carb" },
  "🥖": { name: "Baguette", hunger: 45, nutrition: [10, 50, 0], price: 2.5, category: "carb" },
  "🥯": { name: "Bagel", hunger: 40, nutrition: [10, 50, 0], price: 2, category: "carb" },
  // ---- Bundle mirror: fruits ----
  "🍎": { name: "Apple", hunger: 20, nutrition: [0, 10, 40], price: 1, category: "fruit" },
  "🍌": { name: "Banana", hunger: 30, nutrition: [0, 20, 40], price: 0.8, category: "fruit" },
  "🍇": { name: "Grapes", hunger: 20, nutrition: [0, 10, 40], price: 2, category: "fruit" },
  "🍓": { name: "Strawberry", hunger: 15, nutrition: [0, 5, 40], price: 2.5, category: "fruit" },
  "🍊": { name: "Orange", hunger: 20, nutrition: [0, 5, 45], price: 1.2, category: "fruit" },
  "🍉": { name: "Watermelon", hunger: 25, nutrition: [0, 5, 30], price: 3, category: "fruit" },
  "🍑": { name: "Peach", hunger: 20, nutrition: [0, 10, 40], price: 1.5, category: "fruit" },
  // ---- Bundle mirror: vegetables ----
  "🥦": { name: "Broccoli", hunger: 20, nutrition: [10, 0, 45], price: 1.5, category: "vegetable" },
  "🥕": { name: "Carrot", hunger: 15, nutrition: [0, 10, 40], price: 1, category: "vegetable" },
  "🥬": { name: "Lettuce", hunger: 10, nutrition: [0, 0, 30], price: 1.5, category: "vegetable" },
  "🍅": { name: "Tomato", hunger: 15, nutrition: [0, 5, 35], price: 1.2, category: "vegetable" },
  "🥒": { name: "Cucumber", hunger: 10, nutrition: [0, 0, 30], price: 1, category: "vegetable" },
  "🧅": { name: "Onion", hunger: 10, nutrition: [0, 5, 25], price: 0.8, category: "vegetable" },
  "🧄": { name: "Garlic", hunger: 5, nutrition: [0, 0, 20], price: 0.5, category: "vegetable" },
  // ---- Bundle mirror: dairy / fats ----
  "🥛": { name: "Milk", hunger: 25, nutrition: [20, 0, 30], price: 2, category: "dairy" },
  "🧈": { name: "Butter", hunger: 20, nutrition: [15, 0, 15], price: 3, category: "dairy" },
  "🥥": { name: "Coconut", hunger: 30, nutrition: [10, 10, 30], price: 2, category: "dairy" },
  "🫒": { name: "Olive", hunger: 15, nutrition: [0, 0, 30], price: 4, category: "dairy" },
  "🥑": { name: "Avocado", hunger: 25, nutrition: [10, 0, 40], price: 1.5, category: "dairy" },

  // ---- Extended catalog: fruits ----
  "🍈": { name: "Melon", hunger: 25, nutrition: [0, 10, 35], price: 3, category: "fruit" },
  "🍋": { name: "Lemon", hunger: 10, nutrition: [0, 5, 45], price: 0.8, category: "fruit" },
  "🍍": { name: "Pineapple", hunger: 25, nutrition: [0, 15, 40], price: 2.5, category: "fruit" },
  "🥭": { name: "Mango", hunger: 25, nutrition: [0, 15, 40], price: 2, category: "fruit" },
  "🍏": { name: "Green Apple", hunger: 20, nutrition: [0, 10, 40], price: 1, category: "fruit" },
  "🍐": { name: "Pear", hunger: 20, nutrition: [0, 10, 40], price: 1.2, category: "fruit" },
  "🍒": { name: "Cherries", hunger: 15, nutrition: [0, 10, 40], price: 2.5, category: "fruit" },
  "🫐": { name: "Blueberries", hunger: 15, nutrition: [0, 10, 45], price: 3, category: "fruit" },
  "🥝": { name: "Kiwi", hunger: 15, nutrition: [0, 10, 45], price: 1.5, category: "fruit" },

  // ---- Extended catalog: vegetables & fungi ----
  "🍄": { name: "Mushroom", hunger: 15, nutrition: [10, 0, 30], price: 1.5, category: "vegetable" },
  "🍆": { name: "Eggplant", hunger: 15, nutrition: [0, 5, 35], price: 1.2, category: "vegetable" },
  "🌶️": { name: "Hot Pepper", hunger: 5, nutrition: [0, 0, 25], price: 0.8, category: "vegetable" },
  "🫑": { name: "Bell Pepper", hunger: 10, nutrition: [0, 5, 30], price: 1, category: "vegetable" },
  "🫚": { name: "Ginger", hunger: 5, nutrition: [0, 0, 20], price: 1, category: "vegetable" },
  "🫛": { name: "Pea Pod", hunger: 15, nutrition: [10, 10, 20], price: 1.2, category: "vegetable" },
  "🫜": { name: "Root Vegetable", hunger: 20, nutrition: [0, 20, 20], price: 1, category: "vegetable" },
  "🍠": { name: "Sweet Potato", hunger: 35, nutrition: [0, 35, 15], price: 1.2, category: "vegetable" },

  // ---- Extended catalog: proteins ----
  "🥓": { name: "Bacon", hunger: 45, nutrition: [45, 0, 0], price: 3.5, category: "protein" },
  "🌰": { name: "Chestnut", hunger: 25, nutrition: [10, 20, 5], price: 2, category: "protein" },

  // ---- Extended catalog: bakery / carbs ----
  "🥐": { name: "Croissant", hunger: 40, nutrition: [10, 50, 0], price: 2.5, category: "carb" },
  "🫓": { name: "Flatbread", hunger: 40, nutrition: [10, 50, 0], price: 2, category: "carb" },
  "🥨": { name: "Pretzel", hunger: 35, nutrition: [5, 50, 0], price: 2, category: "carb" },
  "🥞": { name: "Pancakes", hunger: 50, nutrition: [10, 55, 0], price: 3, category: "carb" },
  "🧇": { name: "Waffle", hunger: 50, nutrition: [10, 55, 0], price: 3, category: "carb" },

  // ---- Extended catalog: fast food ----
  "🍔": { name: "Burger", hunger: 65, nutrition: [30, 40, 0], price: 5, category: "fastfood" },
  "🍟": { name: "Fries", hunger: 50, nutrition: [5, 55, 0], price: 3, category: "fastfood" },
  "🍕": { name: "Pizza", hunger: 65, nutrition: [20, 50, 0], price: 5, category: "fastfood" },
  "🌭": { name: "Hot Dog", hunger: 55, nutrition: [25, 40, 0], price: 4, category: "fastfood" },
  "🥪": { name: "Sandwich", hunger: 50, nutrition: [20, 40, 5], price: 4, category: "fastfood" },
  "🌮": { name: "Taco", hunger: 50, nutrition: [25, 35, 5], price: 4, category: "fastfood" },
  "🌯": { name: "Burrito", hunger: 60, nutrition: [25, 45, 5], price: 4.5, category: "fastfood" },
  "🫔": { name: "Tamale", hunger: 50, nutrition: [15, 45, 5], price: 3.5, category: "fastfood" },
  "🥙": { name: "Stuffed Flatbread", hunger: 55, nutrition: [20, 40, 10], price: 4.5, category: "fastfood" },
  "🧆": { name: "Falafel", hunger: 45, nutrition: [20, 35, 5], price: 3.5, category: "fastfood" },

  // ---- Extended catalog: cooked meals ----
  "🍳": { name: "Fried Egg", hunger: 35, nutrition: [35, 0, 5], price: 2.5, category: "meal" },
  "🥘": { name: "Paella", hunger: 65, nutrition: [30, 40, 10], price: 6, category: "meal" },
  "🍲": { name: "Stew", hunger: 60, nutrition: [30, 30, 15], price: 5, category: "meal" },
  "🫕": { name: "Fondue", hunger: 50, nutrition: [35, 10, 5], price: 6, category: "meal" },
  "🥣": { name: "Bowl", hunger: 45, nutrition: [15, 35, 15], price: 4, category: "meal" },
  "🥗": { name: "Salad", hunger: 25, nutrition: [5, 5, 45], price: 3.5, category: "meal" },
  "🥫": { name: "Canned Food", hunger: 40, nutrition: [20, 30, 5], price: 2, category: "meal" },

  // ---- Extended catalog: asian ----
  "🍱": { name: "Bento", hunger: 55, nutrition: [25, 40, 10], price: 6, category: "asian" },
  "🍘": { name: "Rice Cracker", hunger: 20, nutrition: [0, 35, 0], price: 1.5, category: "asian" },
  "🍙": { name: "Rice Ball", hunger: 35, nutrition: [5, 45, 0], price: 2, category: "asian" },
  "🍛": { name: "Curry Rice", hunger: 60, nutrition: [20, 50, 10], price: 5, category: "asian" },
  "🍜": { name: "Noodles", hunger: 55, nutrition: [10, 55, 5], price: 4.5, category: "asian" },
  "🍢": { name: "Skewer", hunger: 45, nutrition: [35, 10, 5], price: 4, category: "asian" },
  "🍣": { name: "Sushi", hunger: 45, nutrition: [40, 20, 5], price: 6, category: "asian" },
  "🍥": { name: "Fish Cake", hunger: 30, nutrition: [25, 20, 0], price: 3, category: "asian" },
  "🥮": { name: "Moon Cake", hunger: 45, nutrition: [5, 55, 0], price: 4, category: "asian" },
  "🍡": { name: "Dango", hunger: 30, nutrition: [0, 45, 0], price: 2.5, category: "asian" },
  "🥟": { name: "Dumpling", hunger: 45, nutrition: [25, 35, 5], price: 4, category: "asian" },
  "🥠": { name: "Fortune Cookie", hunger: 15, nutrition: [0, 30, 0], price: 1, category: "asian" },
  "🥡": { name: "Takeout", hunger: 55, nutrition: [20, 45, 5], price: 5, category: "asian" },

  // ---- Extended catalog: seafood ----
  "🦀": { name: "Crab", hunger: 50, nutrition: [50, 0, 5], price: 7, category: "seafood" },
  "🦞": { name: "Lobster", hunger: 55, nutrition: [55, 0, 5], price: 8, category: "seafood" },
  "🦐": { name: "Shrimp", hunger: 40, nutrition: [45, 0, 5], price: 6, category: "seafood" },
  "🦑": { name: "Squid", hunger: 40, nutrition: [45, 0, 5], price: 6, category: "seafood" },
  "🦪": { name: "Oyster", hunger: 35, nutrition: [40, 0, 10], price: 6, category: "seafood" },
  "🍤": { name: "Shrimp Tempura", hunger: 45, nutrition: [35, 25, 0], price: 5.5, category: "seafood" },

  // ---- Extended catalog: desserts & sweets ----
  "🍦": { name: "Ice Cream", hunger: 30, nutrition: [5, 40, 0], price: 3, category: "dessert" },
  "🍧": { name: "Shaved Ice", hunger: 15, nutrition: [0, 30, 0], price: 2.5, category: "dessert" },
  "🍨": { name: "Sundae", hunger: 35, nutrition: [5, 45, 0], price: 3.5, category: "dessert" },
  "🍩": { name: "Donut", hunger: 35, nutrition: [5, 50, 0], price: 2, category: "dessert" },
  "🍪": { name: "Cookie", hunger: 25, nutrition: [5, 40, 0], price: 1.5, category: "dessert" },
  "🎂": { name: "Cake", hunger: 50, nutrition: [5, 60, 0], price: 6, category: "dessert" },
  "🍰": { name: "Shortcake", hunger: 40, nutrition: [5, 50, 5], price: 4, category: "dessert" },
  "🧁": { name: "Cupcake", hunger: 35, nutrition: [5, 50, 0], price: 3, category: "dessert" },
  "🥧": { name: "Pie", hunger: 45, nutrition: [5, 55, 5], price: 4, category: "dessert" },
  "🍫": { name: "Chocolate", hunger: 30, nutrition: [5, 40, 0], price: 2.5, category: "dessert" },
  "🍬": { name: "Candy", hunger: 15, nutrition: [0, 35, 0], price: 1, category: "dessert" },
  "🍭": { name: "Lollipop", hunger: 10, nutrition: [0, 30, 0], price: 1, category: "dessert" },
  "🍮": { name: "Custard", hunger: 30, nutrition: [10, 35, 0], price: 3, category: "dessert" },
  "🍯": { name: "Honey", hunger: 20, nutrition: [0, 40, 5], price: 3, category: "dessert" },

  // ---- Extended catalog: snacks & seasonings ----
  "🍿": { name: "Popcorn", hunger: 25, nutrition: [5, 40, 0], price: 2, category: "snack" },
  "🧂": { name: "Salt", hunger: 0, nutrition: [0, 0, 0], price: 0.5, category: "condiment" },

  // ---- Extended catalog: drinks ----
  "🍼": { name: "Baby Bottle", hunger: 20, nutrition: [15, 15, 15], price: 2, category: "drink" },
  "☕": { name: "Coffee", hunger: 5, nutrition: [0, 0, 0], price: 2.5, category: "drink" },
  "🫖": { name: "Teapot", hunger: 5, nutrition: [0, 0, 10], price: 2, category: "drink" },
  "🍵": { name: "Tea", hunger: 5, nutrition: [0, 0, 10], price: 2, category: "drink" },
  "🍶": { name: "Sake", hunger: 10, nutrition: [0, 10, 0], price: 5, category: "drink" },
  "🍾": { name: "Champagne", hunger: 10, nutrition: [0, 10, 0], price: 8, category: "drink" },
  "🍷": { name: "Wine", hunger: 10, nutrition: [0, 10, 0], price: 6, category: "drink" },
  "🍸": { name: "Cocktail", hunger: 10, nutrition: [0, 15, 0], price: 6, category: "drink" },
  "🍹": { name: "Tropical Drink", hunger: 15, nutrition: [0, 20, 10], price: 5, category: "drink" },
  "🍺": { name: "Beer", hunger: 15, nutrition: [0, 20, 0], price: 4, category: "drink" },
  "🍻": { name: "Beers", hunger: 20, nutrition: [0, 25, 0], price: 6, category: "drink" },
  "🥂": { name: "Clinking Glasses", hunger: 10, nutrition: [0, 10, 0], price: 7, category: "drink" },
  "🥃": { name: "Whiskey", hunger: 10, nutrition: [0, 10, 0], price: 6, category: "drink" },
  "🥤": { name: "Soda", hunger: 15, nutrition: [0, 35, 0], price: 2, category: "drink" },
  "🧋": { name: "Bubble Tea", hunger: 25, nutrition: [5, 40, 0], price: 3.5, category: "drink" },
  "🧃": { name: "Juice Box", hunger: 15, nutrition: [0, 25, 15], price: 1.5, category: "drink" },
  "🧉": { name: "Mate", hunger: 5, nutrition: [0, 0, 10], price: 2.5, category: "drink" },
};

/** Category for an emoji, or "unknown" when the emoji is not cataloged. */
export function categoryOf(emoji: string): string {
  const entry = FRIDGE_FOODS[emoji];
  return entry ? entry.category : "unknown";
}

function isBadEntry(emoji: string, entry: FridgeFood): string | null {
  if (!entry || typeof entry !== "object") return "bad entry for " + emoji + ": not an object";
  if (typeof entry.name !== "string" || entry.name.length === 0)
    return "bad entry for " + emoji + ": name must be a non-empty string";
  if (typeof entry.price !== "number" || !isFinite(entry.price) || entry.price < 0)
    return "bad entry for " + emoji + ": price must be a finite number >= 0";
  if (typeof entry.hunger !== "number" || !isFinite(entry.hunger) || entry.hunger < 0)
    return "bad entry for " + emoji + ": hunger must be a finite number >= 0";
  if (
    !Array.isArray(entry.nutrition) ||
    entry.nutrition.length !== 3 ||
    entry.nutrition.some(function (n) {
      return typeof n !== "number" || !isFinite(n) || n < 0;
    })
  )
    return "bad entry for " + emoji + ": nutrition must be [protein, carb, vitamin] numbers >= 0";
  if ((CATEGORIES as readonly string[]).indexOf(entry.category) === -1)
    return "bad entry for " + emoji + ": unknown category " + String(entry.category);
  return null;
}

/**
 * Validate a list of food emojis against the catalog. Returns one error
 * string per problem (missing entries and malformed entries); an empty
 * array means the list is fully valid.
 */
export function validateFridgeFoods(list: readonly string[]): string[] {
  const errors: string[] = [];
  if (!Array.isArray(list)) return ["validateFridgeFoods expects an array of emoji strings"];
  for (const emoji of list) {
    if (typeof emoji !== "string" || emoji.length === 0) {
      errors.push("bad entry: expected a non-empty emoji string, got " + String(emoji));
      continue;
    }
    const entry = FRIDGE_FOODS[emoji];
    if (!entry) {
      errors.push("missing: " + emoji + " is not in FRIDGE_FOODS");
      continue;
    }
    const bad = isBadEntry(emoji, entry);
    if (bad) errors.push(bad);
  }
  return errors;
}
