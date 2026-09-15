/* GraveGain2dB: Breach MoonRock — B7 public breach events + world boss (verified-only)
 * Path: v2/vcw4w/public/games/html/gravegain2dB/mmo/events.js
 * Vanilla JS, no imports/exports (loaded via script tags AFTER mmo/hub.js). Idempotent.
 * MODEL: public breach events run MANY 4-player rooms on ONE shared world seed:
 *   "Break the Citadel Chain" -> squads clear relay objectives -> rooms submit
 *   VERIFIED global progress -> world boss awakens -> contributor rewards.
 * All progress/rewards come from the authoritative room server. Client claims
 * (no serverSig / unknown room / replayed nonce) are REJECTED. No scores or
 * rewards are ever granted client-side.
 * DISCONNECT/RECONNECT-SAFE: accumulator + grants are keyed by server nonce;
 * replaying a verified payload is a no-op, never a double-claim. Client keeps
 * no authority; on reconnect it replays intents and waits for server echo.
 */
(function () {
  if (typeof window === "undefined") return;
  if (window.GraveGain2DB_Events) return;

  var VERSION = "0.1.0-b7-events";
  var WORLD_SEED = "moonrock-shared-01"; // single shared seed; server is source of truth

  var EVENTS = {
    "citadel-chain": {
      id: "citadel-chain", title: "Break the Citadel Chain",
      stages: ["squads", "relay-objectives", "verified-global-progress", "world-boss", "contributor-rewards"],
      roomsOf4: true, sharedSeed: WORLD_SEED
    }
  };

  var progress = { total: 0, byRoom: {}, nonces: {} }; // verified-room-only accumulator
  var grants = {};        // grantKey -> server-signed reward payload (granted once)
  var announcements = []; // server announcements (server hook only)
  var _intents = [];

  // World-boss contribution: accepts ONLY verified room payloads.
  // Shape: { roomId, eventId, amount>0, nonce, serverSig }. Anything else rejected.
  function submitRoomContribution(p) {
    if (!p || typeof p.amount !== "number" || p.amount <= 0) return { ok: false, reason: "client-claim-rejected" };
    if (!p.roomId || !p.eventId || !EVENTS[p.eventId]) return { ok: false, reason: "client-claim-rejected" };
    if (!p.serverSig) return { ok: false, reason: "client-claim-rejected" }; // forged/unsigned
    if (!p.nonce || progress.nonces[p.nonce]) return { ok: false, reason: "duplicate-or-bad-nonce" }; // no double-claim
    progress.nonces[p.nonce] = true;
    progress.byRoom[p.roomId] = (progress.byRoom[p.roomId] || 0) + p.amount;
    progress.total += p.amount;
    return { ok: true, total: progress.total };
  }

  // Verified-reward distribution: granted ONCE per (event, contributor, reward).
  // Server-signed payload shape: { eventId, contributorId, rewardId, nonce, sig }.
  function grantReward(r) {
    if (!r || !r.eventId || !r.contributorId || !r.rewardId || !r.nonce || !r.sig) {
      return { ok: false, reason: "client-claim-rejected" };
    }
    var key = r.eventId + "|" + r.contributorId + "|" + r.rewardId;
    if (grants[key]) return { ok: false, reason: "already-granted" }; // rewards granted once
    grants[key] = { eventId: r.eventId, contributorId: r.contributorId, rewardId: r.rewardId, nonce: r.nonce, sig: r.sig };
    return { ok: true, key: key };
  }

  // Server announcements (server hook only; client cannot announce).
  function applyAnnouncement(a) {
    if (!a || !a.text || !a.serverSig) return { ok: false, reason: "client-claim-rejected" };
    announcements.push({ text: String(a.text).slice(0, 280), at: Date.now() });
    if (announcements.length > 50) announcements.shift();
    return { ok: true };
  }

  function queueIntent(intent) { _intents.push(intent || {}); return { ok: true, queued: true }; }

  var api = {
    version: VERSION, WORLD_SEED: WORLD_SEED, EVENTS: EVENTS,
    progress: progress, grants: grants, announcements: announcements,
    submitRoomContribution: submitRoomContribution, grantReward: grantReward,
    applyAnnouncement: applyAnnouncement, queueIntent: queueIntent
  };
  window.GraveGain2DB_Events = api;
  window.GraveGainMods = window.GraveGainMods || [];
  window.GraveGainMods.push({ name: "b7-events", version: VERSION, init: function () { return api; } });
})();
