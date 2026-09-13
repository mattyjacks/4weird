/* gravegain5d-bestiary.js - GraveGain5D enemy roster module (v1.0.0).
 *
 * Series-true roster for the 5D multiverse chapter (canon: content/gravegain5d-lore.ts):
 * after the 4D tour, Cartographer Null charts six parallel Arroyos - Prime,
 * Echo, Dream, Void, Bloom, Static. Four base kinds (shambler/swarm/brute/
 * necro) anchor the Prime charter table; four lattice natives (echo-wisp,
 * bloom-thresh, static-ghoul, void-maw) embody Echo, Bloom, Static, Void.
 *
 * Pattern: gravegain-enemies.js (VARIANTS + pickVariant + GraveGainMods entry).
 * Advisory-only roster data: no DOM, no game-state writes, no deps.
 *
 * Contract: vanilla IIFE, idempotent (if window.GraveGain5DBestiary return),
 * never throws (guarded try/catch), capped helpers, ASCII-only strings
 * (emoji fields excepted), teen-clean (kid lines praise, no gore/drugs).
 */
(function () {
  "use strict";
  try {
    if (typeof window === "undefined") return;
    if (window.GraveGain5DBestiary) return; // idempotent under double-injection

    var VERSION = "1.0.0";

    // behavior enum: charger | spitter | brute | summoner | lurker
    // threat: 1 (fodder) .. 5 (mini-boss). hpMul/atkMul scale the base kind.
    var VARIANTS = [
      { id: "shambler", name: "Prime Shambler", emoji: "\uD83E\uDDDF", hpMul: 1.0, atkMul: 1.0, behavior: "charger", threat: 1,
        taunt: { kid: "Nice footwork, rookie! Keep marching!", teen: "Prime charter holds. It marches anyway." } },
      { id: "swarm", name: "Skull Swarm", emoji: "\uD83E\uDDB4", hpMul: 0.6, atkMul: 1.1, behavior: "charger", threat: 1,
        taunt: { kid: "Great hustle! Look at them rattle along!", teen: "Teeth first, questions later." } },
      { id: "brute", name: "Vault Brute", emoji: "\uD83E\uDDF1", hpMul: 2.0, atkMul: 1.2, behavior: "brute", threat: 4,
        taunt: { kid: "Wow, what a strong guard! Hold your ground!", teen: "MoonRock vault muscle. It does not hurry." } },
      { id: "necro", name: "Array Necro", emoji: "\uD83D\uDD2E", hpMul: 1.2, atkMul: 1.3, behavior: "summoner", threat: 3,
        taunt: { kid: "Super steady chanting! Stay sharp, cartographer!", teen: "The Array speaks through it. Do not answer." } },
      { id: "echo-wisp", name: "Echo Wisp", emoji: "\u2728", hpMul: 0.7, atkMul: 1.2, behavior: "lurker", threat: 2,
        taunt: { kid: "Pretty lights! Great spotting, star scout!", teen: "Mirathiel's echo wears its face. Look away." } },
      { id: "bloom-thresh", name: "Bloom Thresh", emoji: "\uD83C\uDF38", hpMul: 1.1, atkMul: 1.0, behavior: "spitter", threat: 2,
        taunt: { kid: "Lovely petals! Fine work keeping clear!", teen: "Bloom kept the laughter. The pollen keeps you." } },
      { id: "static-ghoul", name: "Static Ghoul", emoji: "\uD83D\uDCFA", hpMul: 1.3, atkMul: 1.1, behavior: "spitter", threat: 3,
        taunt: { kid: "Loud and fuzzy! Nice ears, brave listener!", teen: "Static kept the noise. It calls the pack." } },
      { id: "void-maw", name: "Void Maw", emoji: "\uD83D\uDD73", hpMul: 1.8, atkMul: 1.4, behavior: "brute", threat: 5,
        taunt: { kid: "Big hungry shadow! Stellar dodging, champ!", teen: "Void kept the hunger. Hades files what is left." } }
    ];

    var MAX_VARIANTS = 8;

    function mulberry32(seed) {
      var a = seed | 0;
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    // Deterministic pick for a (seed, cycle) pair. Higher cycles bias
    // toward higher-threat variants. Pure function, capped, never throws.
    function pickVariant(seed, cycle) {
      try {
        seed = (seed | 0) || 1;
        cycle = Math.max(0, cycle | 0);
        var rng = mulberry32((seed ^ Math.imul(cycle + 1, 2654435761)) | 0);
        var minThreat = cycle >= 4 ? 3 : cycle >= 2 ? 2 : 1;
        var pool = [];
        for (var i = 0; i < VARIANTS.length && pool.length < MAX_VARIANTS; i++) {
          if (VARIANTS[i].threat >= minThreat) pool.push(VARIANTS[i]);
        }
        if (!pool.length) pool = VARIANTS.slice(0, MAX_VARIANTS);
        return pool[Math.floor(rng() * pool.length)] || VARIANTS[0];
      } catch (e) { return VARIANTS[0]; }
    }

    function variantById(id) {
      try {
        for (var i = 0; i < VARIANTS.length; i++) {
          if (VARIANTS[i].id === id) return VARIANTS[i];
        }
      } catch (e) { /* ignore */ }
      return null;
    }

    try {
      window.GraveGain5DBestiary = {
        VERSION: VERSION,
        VARIANTS: VARIANTS,
        pickVariant: pickVariant,
        variantById: variantById
      };
    } catch (e) { /* never throw */ }

    try {
      window.GraveGainMods = window.GraveGainMods || [];
      window.GraveGainMods.push("gravegain5d-bestiary");
    } catch (e) { /* never throw */ }
  } catch (e) { /* never throw */ }
})();
