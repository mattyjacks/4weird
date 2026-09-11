/**
 * Clan XP + levels + badges. Gamification for clan life: posting, commenting,
 * deploying bots, and funding upkeep earn XP; totals map to level titles;
 * milestones mint badges. Anti-farm: award_clan_xp() caps 100 XP/day/user.
 */

export const CLAN_XP_POST = 10;
export const CLAN_XP_COMMENT = 3;
export const CLAN_XP_BOT_DEPLOY = 15;
export const CLAN_XP_UPKEEP_FUNDED = 20;
export const CLAN_XP_DAILY_CAP = 100;

export type ClanLevel = { level: number; title: string; xp: number };

export const CLAN_LEVELS: ClanLevel[] = [
  { level: 1, title: "Newblood", xp: 0 },
  { level: 2, title: "Regular", xp: 25 },
  { level: 3, title: "Grinder", xp: 60 },
  { level: 4, title: "Veteran", xp: 120 },
  { level: 5, title: "Warchief", xp: 250 },
  { level: 6, title: "Legend of the Weird", xp: 500 },
];

export function clanLevelForXp(totalXp: number): ClanLevel {
  let cur = CLAN_LEVELS[0];
  for (const l of CLAN_LEVELS) {
    if (totalXp >= l.xp) cur = l;
  }
  return cur;
}

export const CLAN_BADGES = ["founder", "first-post", "valley-guardian", "patron", "centurion"] as const;
export type ClanBadge = (typeof CLAN_BADGES)[number];

export const CLAN_BADGE_META: Record<ClanBadge, { label: string; blurb: string }> = {
  founder: { label: "Founder", blurb: "Started the clan." },
  "first-post": { label: "First Words", blurb: "Published a post in the clan." },
  "valley-guardian": { label: "Valley Guardian", blurb: "Helped Valley Net keep the clan safe." },
  patron: { label: "Patron", blurb: "Funded the clan wallet with 100+ coins." },
  centurion: { label: "Centurion", blurb: "Earned 100+ lifetime XP in the clan." },
};
