import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");

const mig = read("../supabase/migrations/20261001000000_love_letters.sql");
const lib = read("../lib/love-letters.ts");
const me = read("../app/api/love/me/route.ts");
const give = read("../app/api/love/give/route.ts");
const award = read("../app/api/love/award/route.ts");
const postTotals = read("../app/api/love/post/[id]/route.ts");
const profile = read("../app/api/love/profile/route.ts");
const quests = read("../app/api/love/quests/route.ts");
const daily = read("../app/api/coins/daily/route.ts");
const meProfile = read("../app/api/me/profile/route.ts");
const wallet = read("../components/love/love-wallet.tsx");
const buttons = read("../components/clans/love-buttons.tsx");
const questPanel = read("../components/clans/love-quests.tsx");
const clanPage = read("../components/clans/clan-page.tsx");

// Migration: tables, counters, starting balance, both mint sources.
for (const needle of ["love_gifts", "clan_quests", "clan_quest_completions"]) {
  if (!mig.includes(needle)) throw new Error(`Migration missing ${needle}.`);
}
for (const fn of ["love_me", "love_profile_stats", "give_love_letter", "award_love_letter", "love_post_totals", "create_clan_quest", "complete_clan_quest", "claim_daily_bonus"]) {
  if (!mig.includes(fn)) throw new Error(`Migration missing RPC ${fn}.`);
}
// Return-type change requires DROP first (Postgres 42P13 otherwise).
if (!mig.includes("drop function if exists public.claim_daily_bonus()")) {
  throw new Error("Migration must DROP claim_daily_bonus before redefining its return type.");
}
if (!mig.includes("default 3")) throw new Error("Profiles must start with 3 love letters.");
if (!mig.includes("is_profile_public")) throw new Error("Migration must add the public-profile flag.");
// One gift per giver per post (anti-farm); awards unlimited.
if (!mig.includes("love_gifts_one_gift_per_post")) throw new Error("Migration must enforce one gift per giver per post.");
// Never mingles with coins: the give/award/quest RPCs move only 💌.
// (claim_daily_bonus keeps its pre-existing coin insert and gains a 💌 mint.)
for (const fn of ["give_love_letter", "award_love_letter", "complete_clan_quest", "create_clan_quest"]) {
  const start = mig.indexOf(`function public.${fn}(`);
  if (start === -1) throw new Error(`Migration missing RPC ${fn}.`);
  const body = mig.slice(start, mig.indexOf("$$;", start));
  if (/coin_ledger|coin_grants/i.test(body)) throw new Error(`${fn} must never touch coins.`);
}

// Lib: emoji + economy constants.
if (!lib.includes("💌")) throw new Error("Lib must use the 💌 emoji.");
for (const needle of ["LOVE_STARTING_BALANCE = 3", "LOVE_DAILY_BONUS = 1", "spotlight", "superstar", "legend"]) {
  if (!lib.includes(needle)) throw new Error(`Lib missing ${needle}.`);
}

// Routes use guarded RPCs, never direct writes.
if (!me.includes("love_me")) throw new Error("GET /api/love/me must use love_me.");
if (!give.includes("give_love_letter")) throw new Error("POST /api/love/give must use give_love_letter.");
if (!award.includes("award_love_letter")) throw new Error("POST /api/love/award must use award_love_letter.");
if (!postTotals.includes("love_post_totals")) throw new Error("GET /api/love/post must use love_post_totals.");
if (!profile.includes("love_profile_stats")) throw new Error("GET /api/love/profile must use love_profile_stats.");
if (!quests.includes("create_clan_quest") || !quests.includes("complete_clan_quest")) {
  throw new Error("Quest route must use the quest RPCs.");
}
// No self-love: the like must be earned from a human who saw the post.
if (!give.includes("own post")) throw new Error("Give route must refuse self-love.");
if (!award.includes("own post")) throw new Error("Award route must refuse self-awards.");

// Daily claim surfaces the 💌 mint.
if (!daily.includes("love_letters")) throw new Error("Daily route must return love_letters.");

// Profile carries the public/shy flag + own counters.
if (!meProfile.includes("is_profile_public")) throw new Error("Profile API must support is_profile_public.");

// UI: wallet + per-post buttons + quests, wired into the clan page.
if (!wallet.includes("💌") || !wallet.includes("is_profile_public")) throw new Error("Wallet panel must show 💌 + visibility toggle.");
if (!buttons.includes("💌") || !buttons.includes("/api/love/give") || !buttons.includes("/api/love/award")) {
  throw new Error("Love buttons must offer give + award.");
}
if (!questPanel.includes("/api/love/quests") || !questPanel.includes("💌")) throw new Error("Quest panel must use the quest API.");
if (!clanPage.includes("LoveButtons") || !clanPage.includes("LoveQuests")) {
  throw new Error("Clan page must render LoveButtons + LoveQuests.");
}

console.log("Love Letters integrity OK.");
