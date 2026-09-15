/* GraveGain2dB: Breach MoonRock — B7 MMO Hub stub (LuckyStarShip presence/parties/chat/season)
 * Path: v2/vcw4w/public/games/html/gravegain2dB/mmo/hub.js
 * Vanilla JS, no imports/exports (loaded via script tags). Idempotent.
 * STUB ONLY: no network. Real presence/chat/party state comes from the
 * authoritative room server; all client calls below queue intent and wait
 * for server hooks (applyPresence/applyChat/applyUnlock). Client NEVER
 * grants scores, rewards, or unlocks — validator rejects client claims.
 * FOUR-PLAYER CO-OP AMPLIFY-CHAOS: hub squads are 1-4 breachmates; full
 * 4-stack multiplies spawn density + relay chaos, never difficulty-gates.
 */
(function () {
  if (typeof window === "undefined") return;
  if (window.GraveGain2DB_Hub) return;

  var VERSION = "0.1.0-b7-hub";
  var RACES = ["human", "elf", "dwarf", "orc"];
  var CLASSES = ["breacher", "warden", "sparkwright", "gravedigger"];
  var EMOTES = [":gg:", ": breach:", ":skull:", ":star:", ":elf:", ":orc:", ":dwarf:", ":ship:"];
  var MAX_PARTY = 4;

  var state = {
    presence: [],          // server-applied only
    party: null,           // { id, code, members:[ids max 4] }
    friends: [],
    loadout: { race: "human", cls: "breacher" },
    inMission: false,      // when true, loadout swap refused (pre-mission only)
    season: { id: "s1-breach", xp: 0, level: 1 }, // server-applied only
    codex: {},             // server-applied unlocks only
    chat: [],              // server-applied only
    _intents: []           // outbound intent queue for server wiring
  };

  function norm(s, fb) {
    s = String(s || "").toLowerCase();
    return s || fb;
  }

  // --- Loadout: race/class swap pre-mission, NEVER locked pre-mission ---
  function setLoadout(race, cls) {
    if (state.inMission) return { ok: false, reason: "locked-in-mission" };
    race = norm(race, "human"); cls = norm(cls, "breacher");
    if (RACES.indexOf(race) < 0 || CLASSES.indexOf(cls) < 0) return { ok: false, reason: "bad-loadout" };
    state.loadout = { race: race, cls: cls }; // free swap, never locked pre-mission
    state._intents.push({ kind: "loadout", loadout: { race: race, cls: cls } });
    return { ok: true, loadout: { race: race, cls: cls } };
  }

  // --- Party (1-4) + friends/lobby codes (intent only; server confirms) ---
  function makeCode(prefix) {
    var abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", s = "";
    for (var i = 0; i < 5; i++) s += abc[(Math.random() * abc.length) | 0];
    return (prefix || "BR") + "-" + s; // display code; server issues authoritative one
  }
  function createParty(hostId) {
    state.party = { id: "p-" + Date.now(), code: makeCode("BR"), members: [String(hostId || "p1")] };
    state._intents.push({ kind: "party-create", party: state.party });
    return { ok: true, party: state.party };
  }
  function joinByCode(code, whoId) {
    state._intents.push({ kind: "party-join", code: String(code || ""), who: String(whoId || "") });
    return { ok: true, queued: true }; // server validates code + 4-cap
  }
  function addFriend(id) {
    state._intents.push({ kind: "friend-add", who: String(id || "") });
    return { ok: true, queued: true };
  }

  // --- Chat + emoji emotes (intent only; server echoes via applyChat) ---
  function sendChat(who, text) {
    state._intents.push({ kind: "chat", who: String(who || ""), text: String(text || "").slice(0, 280) });
    return { ok: true, queued: true };
  }
  function react(who, emote) {
    if (EMOTES.indexOf(emote) < 0) return { ok: false, reason: "bad-emote" };
    state._intents.push({ kind: "emote", who: String(who || ""), emote: emote });
    return { ok: true, queued: true };
  }

  // --- Authoritative server hooks ONLY (sole writers of presence/chat/season/codex) ---
  function applyPresence(list) {
    if (!Array.isArray(list)) return { ok: false };
    state.presence = list.slice(0, 64);
    return { ok: true, n: state.presence.length };
  }
  function applyChat(entry) {
    if (!entry || !entry.who) return { ok: false };
    state.chat.push({ who: String(entry.who), text: String(entry.text || "").slice(0, 280), emote: entry.emote || null });
    if (state.chat.length > 100) state.chat.shift();
    return { ok: true };
  }
  function applySeason(delta) { // { xp } from verified room server only
    if (!delta || typeof delta.xp !== "number" || delta.xp <= 0) return { ok: false, reason: "client-claim-rejected" };
    if (!delta.serverSig) return { ok: false, reason: "client-claim-rejected" };
    state.season.xp += delta.xp;
    while (state.season.xp >= state.season.level * 1000) { state.season.xp -= state.season.level * 1000; state.season.level++; }
    return { ok: true, level: state.season.level };
  }
  function applyUnlock(unlock) { // { key, serverSig } shared codex/event unlocks
    if (!unlock || !unlock.key || !unlock.serverSig) return { ok: false, reason: "client-claim-rejected" };
    state.codex[unlock.key] = true;
    return { ok: true };
  }
  // Stub validator: any direct client claim without serverSig is rejected.
  function rejectClientClaim(c) { return { ok: false, reason: "client-claim-rejected", got: !!c }; }

  var api = {
    version: VERSION, RACES: RACES, CLASSES: CLASSES, EMOTES: EMOTES, MAX_PARTY: MAX_PARTY,
    state: state, setLoadout: setLoadout, createParty: createParty, joinByCode: joinByCode,
    addFriend: addFriend, sendChat: sendChat, react: react,
    applyPresence: applyPresence, applyChat: applyChat, applySeason: applySeason, applyUnlock: applyUnlock,
    rejectClientClaim: rejectClientClaim
  };
  window.GraveGain2DB_Hub = api;
  window.GraveGainMods = window.GraveGainMods || [];
  window.GraveGainMods.push({ name: "b7-hub", version: VERSION, init: function () { return api; } });
})();
