import { readFileSync, existsSync } from "node:fs";

function must(cond, msg) {
  if (!cond) throw new Error(`verify-party-interop: ${msg}`);
}

function read(path) {
  must(existsSync(path), `missing file ${path}`);
  return readFileSync(path, "utf8");
}

const mig = read("supabase/migrations/20261014000000_party_interop.sql");

// 1. Four tables, deny-by-default RLS, RPC-only writes.
for (const token of ["party_links", "party_invites", "party_challenges", "party_posts"]) {
  must(mig.includes(token), `migration must include ${token}`);
}
for (const token of ["party_links_public_read", "party_challenges_public_read", "party_posts_visible_read", "party_invites_sides_read"]) {
  must(mig.includes(token), `migration must include RLS policy ${token}`);
}
must(mig.includes("No coin tables are touched") || !/coin_ledger|coin_grants|coin_lots/.test(mig), "party migration must never touch coin tables");

// 2. All four kinds everywhere.
for (const token of ["'individual', 'squad', 'clan', 'org'", "party_kind_valid", "party_can_act", "party_can_admin", "party_label", "party_entity_exists"]) {
  must(mig.includes(token), `migration must include ${token}`);
}
// Squads ARE teams: membership effects must land in the real tables.
for (const token of ["team_members", "clan_members", "org_members", "_party_invite_apply"]) {
  must(mig.includes(token), `migration must include ${token}`);
}
// Capability gates: squad officers, clan owner/mod, org invite power.
must(mig.includes("team.members.invite"), "squad admin must require team.members.invite");
must(mig.includes("org.members.invite"), "org admin must require org.members.invite");
must(mig.includes("role in ('owner', 'mod')"), "clan admin must require owner/mod");

// 3. RPC surface.
for (const token of [
  "party_resolve", "party_search", "party_follow", "party_unfollow",
  "party_invite_create", "party_invite_decide", "party_my_invites",
  "party_challenge_create", "party_challenge_decide",
  "party_post_create", "party_feed",
]) {
  must(mig.includes(token), `migration must include RPC ${token}`);
}
// Anti-spam bounds + self-interaction bans.
for (const token of ["too many pending invites", "too many open challenges", "too many posts", "cannot invite yourself", "cannot challenge yourself", "cannot follow yourself", "cannot target yourself"]) {
  must(mig.includes(token), `migration must include guard "${token}"`);
}
// Ally/rival form only through invites/challenges; never direct-written.
must(mig.includes("ally") && mig.includes("rival"), "migration must model ally/rival relations");
must(!/party_link_create|party_ally_create/.test(mig), "ally/rival must not have a direct-write RPC");

// 4. Routes.
const resolve = read("app/api/parties/resolve/route.ts");
must(resolve.includes("party_resolve") && resolve.includes("party_search"), "resolve route must serve lookup + search");
const links = read("app/api/parties/links/route.ts");
must(links.includes("party_follow") && links.includes("party_unfollow"), "links route must follow + unfollow");
const invites = read("app/api/parties/invites/route.ts");
must(invites.includes("party_invite_create") && invites.includes("party_my_invites"), "invites route must create + list inbox/outbox");
const decide = read("app/api/parties/invites/[id]/route.ts");
must(decide.includes("party_invite_decide"), "invite decide route must use the RPC");
const challenges = read("app/api/parties/challenges/route.ts");
must(challenges.includes("party_challenge_create"), "challenges route must create");
const cdecide = read("app/api/parties/challenges/[id]/route.ts");
must(cdecide.includes("party_challenge_decide") && cdecide.includes("complete"), "challenge decide route must accept/decline/cancel/complete");
const feed = read("app/api/parties/feed/route.ts");
must(feed.includes("party_post_create") && feed.includes("party_feed"), "feed route must post + list");
must(feed.includes("valleynetCheck"), "feed posts must pass Valley Net");
must(feed.includes("coin-free"), "feed route must state posting is coin-free");

// 5. Shared lib + UI.
const lib = read("lib/parties.ts");
for (const token of ["individual", "squad", "clan", "org", "isPartyKind", "isPartyId"]) {
  must(lib.includes(token), `lib/parties must include ${token}`);
}
must(lib.includes("squads ARE teams"), "lib must document the squad=team alias");
const hub = read("components/parties/party-hub.tsx");
for (const token of ["PartyHub", "/api/parties/resolve", "/api/parties/feed", "/api/parties/invites", "/api/parties/challenges", "kind:id", "Valley Net"]) {
  must(hub.includes(token), `party-hub must include ${token}`);
}
const squads = read("app/squads/page.tsx");
must(squads.includes("PartyHub"), "squads page must mount the PartyHub");

// 6. No sexual content in the new surfaces.
for (const [path, body] of [["party-hub", hub], ["party-migration", mig]]) {
  must(!/porn|hentai|nsfw|erotic|sex game/i.test(body), `${path} must not describe sexual content`);
}

console.log("Party interop checks OK: squads + clans + orgs + individuals follow, invite, challenge, post.");
