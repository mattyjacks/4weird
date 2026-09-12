import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const fail = (msg) => {
  throw new Error(msg);
};

const mig = read("../supabase/migrations/20261016000000_clan_forum.sql");
const boardsMig = read("../supabase/migrations/20261017000100_clan_boards.sql");
const forum = read("../lib/clan-forum.ts");
const clanPage = read("../components/clans/clan-page.tsx");
const voteButtons = read("../components/clans/forum-vote.tsx");
const comments = read("../components/clans/forum-comments.tsx");
const clanDetail = read("../app/api/clans/[slug]/route.ts");
const humanPost = read("../app/api/clans/[slug]/post/route.ts");
const humanComment = read("../app/api/clans/post/[id]/comment/route.ts");
const postVote = read("../app/api/clans/post/[id]/vote/route.ts");
const commentVote = read("../app/api/clans/comment/[id]/vote/route.ts");
const flairRoute = read("../app/api/clans/post/[id]/flair/route.ts");
const boardRoute = read("../app/api/clans/post/[id]/board/route.ts");
const botPost = read("../app/api/bot/bclans/[slug]/post/route.ts");
const botComment = read("../app/api/bot/bclans/post/[id]/comment/route.ts");
const botDetail = read("../app/api/bot/bclans/[slug]/route.ts");

// --- Naming: the word must not appear in forum code --------------------------
// (Pre-existing game bundles + plans are out of scope and unchecked here.)
for (const [name, src] of [
  ["migration", mig],
  ["boards migration", boardsMig],
  ["lib/clan-forum.ts", forum],
  ["clan-page", clanPage],
  ["forum-vote", voteButtons],
  ["forum-comments", comments],
  ["clan detail route", clanDetail],
  ["post vote route", postVote],
  ["comment vote route", commentVote],
  ["flair route", flairRoute],
  ["board route", boardRoute],
  ["bot post route", botPost],
  ["bot comment route", botComment],
  ["bot detail route", botDetail],
]) {
  if (/reddit/i.test(src)) fail(`${name} must not mention that word.`);
}

// --- Migration -----------------------------------------------------------------
if (!mig.includes("create table if not exists public.clan_votes")) {
  fail("Migration must create clan_votes.");
}
for (const rpc of ["vote_clan_post", "vote_clan_comment", "set_post_flair", "backfill_clan_forum_counters", "maintain_clan_comment_count"]) {
  if (!mig.includes(rpc)) fail(`Migration must define ${rpc}.`);
}
if (!mig.includes("parent_id") || !mig.includes("clan_comments_parent_fk")) {
  fail("Migration must add threaded parent_id with its FK.");
}
if (!mig.includes("clan_posts_flair_check")) fail("Migration must add the flair allowlist check.");
if (!mig.includes("create_comment(") || !mig.includes("p_parent_id")) {
  fail("Migration must extend create_comment with p_parent_id.");
}
if (!mig.includes("clan_votes_own_read")) fail("Migration must let users read their own votes.");
if (/create policy \S+ on public\.clan_votes/i.test(mig) && !mig.includes("clan_votes_own_read")) {
  fail("clan_votes must have no client write policy.");
}
if (mig.includes("for insert to anon, authenticated") && mig.includes("clan_votes")) {
  fail("clan_votes must have no client INSERT policy (RPCs only).");
}
// Toggle semantics: same value clears.
if (!mig.includes("p_value = 0 or (v_old is not null and v_old = p_value)")) {
  fail("Vote RPCs must toggle off a repeated vote.");
}

// --- Shared lib ------------------------------------------------------------------
for (const token of ["CLAN_FLAIRS", "normalizeFlair", "normalizeSort", "hotScore", "sortClanPosts", "CLAN_FORUM_MAX_THREAD_DEPTH"]) {
  if (!forum.includes(token)) fail(`lib/clan-forum.ts must export ${token}.`);
}
for (const f of ["Discussion", "LFG", "Question", "Clip", "Strat", "Meme", "News", "OC"]) {
  if (!forum.includes(`"${f}"`)) fail(`Flair allowlist must include ${f}.`);
}
// SQL allowlist must mirror the TS one.
for (const f of ["Discussion", "LFG", "Question", "Clip", "Strat", "Meme", "News", "OC"]) {
  if (!mig.includes(`'${f}'`)) fail(`Migration flair check must include ${f}.`);
}

// --- API routes --------------------------------------------------------------------
for (const token of ["vote_clan_post", "Invalid vote"]) {
  if (!postVote.includes(token)) fail(`Post vote route must include ${token}.`);
}
for (const token of ["vote_clan_comment", "Invalid vote"]) {
  if (!commentVote.includes(token)) fail(`Comment vote route must include ${token}.`);
}
if (!flairRoute.includes("set_post_flair")) fail("Flair route must use set_post_flair.");
if (!humanPost.includes("normalizeFlair") || !humanPost.includes("set_post_flair")) {
  fail("Human post route must accept + persist flair.");
}
if (!humanComment.includes("p_parent_id")) fail("Human comment route must pass p_parent_id.");
if (!humanComment.includes("export async function GET")) {
  fail("Comment route must expose GET for threaded listing.");
}
for (const token of ["normalizeSort", "normalizeFlair", "sortClanPosts", "myPostVotes"]) {
  if (!clanDetail.includes(token)) fail(`Clan detail route must include ${token}.`);
}

// --- UI ------------------------------------------------------------------------------
for (const token of ["VoteButtons", "CommentSection", "SORT_TABS", "CLAN_FLAIRS", "openComments", "setFlair"]) {
  if (!clanPage.includes(token)) fail(`ClanPage must include ${token}.`);
}
if (!voteButtons.includes("/api/clans/post/") || !voteButtons.includes("/api/clans/comment/")) {
  fail("VoteButtons must hit both vote endpoints.");
}
for (const token of ["parent_id", "buildThreads", "CLAN_FORUM_MAX_THREAD_DEPTH"]) {
  if (!comments.includes(token)) fail(`CommentSection must include ${token}.`);
}
if (comments.includes("dangerouslySetInnerHTML")) fail("CommentSection must render via MarkdownView.");

// --- Boards: four forums in one clan --------------------------------------------
if (!boardsMig.includes("PREREQUISITE MISSING") || !boardsMig.includes("20261016000000_clan_forum.sql")) {
  fail("Boards migration must guard on the forum prerequisite (clan_votes).");
}
if (!boardsMig.includes("clan_posts_board_check")) fail("Boards migration must add the board check.");
for (const b of ["'h'", "'s'", "'b'", "'a'"]) {
  if (!boardsMig.includes(b)) fail(`Boards migration must define board ${b}.`);
}
for (const rpc of ["set_post_board", "create_post"]) {
  if (!boardsMig.includes(rpc)) fail(`Boards migration must define ${rpc}.`);
}
if (!boardsMig.includes("p_board")) fail("Boards migration must thread p_board through create_post.");
if (!boardsMig.includes("bots and agents only")) fail("Boards migration must refuse wrong-lane writes.");
for (const token of ["CLAN_BOARDS", "CLAN_BOARD_META", "isClanBoard", "normalizeBoard", "humanMayWriteBoard", "botMayWriteBoard"]) {
  if (!forum.includes(token)) fail(`lib/clan-forum.ts must export ${token}.`);
}
// Human routes gate the bots-only lane; the board-move route exists.
for (const [name, src] of [["post", humanPost], ["comment", humanComment], ["post vote", postVote], ["comment vote", commentVote], ["flair", flairRoute]]) {
  if (!src.includes("bots and agents only")) fail(`Human ${name} route must refuse the bots-only lane.`);
}
if (!boardRoute.includes("set_post_board")) fail("Board route must use set_post_board.");
if (!humanPost.includes("p_board")) fail("Human post route must pass p_board.");
if (!clanDetail.includes("normalizeBoard") || !clanDetail.includes("boardFilter")) {
  fail("Clan detail route must filter by board.");
}
// Bot routes refuse the humans-only lane; bot reads hide it.
for (const token of ["isClanBoard", "humans-only", "board: rawBoard"]) {
  if (!botPost.includes(token)) fail(`Bot post route must include ${token}.`);
}
if (!botComment.includes("humans-only")) fail("Bot comment route must refuse the humans-only board.");
if (!botDetail.includes('neq("board", "h")')) fail("Bot detail must hide the humans-only board.");
// UI: board tabs + picker + badges + move control + read-only bot threads.
for (const token of ["CLAN_BOARD_META", "boardFilter", "newBoard", "BOARD_BADGE", "setBoard"]) {
  if (!clanPage.includes(token)) fail(`ClanPage must include ${token}.`);
}
if (!comments.includes("readOnly")) fail("CommentSection must render bots-only threads read-only.");

console.log("Clan forum integrity OK.");
