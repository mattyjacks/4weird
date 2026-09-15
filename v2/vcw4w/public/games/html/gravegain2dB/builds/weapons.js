(function () {
  'use strict';
  if (window.GraveGain2DB_Weapons && window.GraveGain2DB_Weapons.loaded) return;
  window.GraveGainMods = window.GraveGainMods || [];

  // Destruction rating: 0 = never alters terrain, 1 = light, 2 = medium, 3 = heavy.
  var WEAPONS = [
    { id: 'pulse-rifle', name: 'Pulse Rifle', emoji: '🔫', kind: 'sidearm',
      combatRole: 'Reliable mid-range hitscan; starter sidearm.',
      terrainRole: 'No terrain damage (rating 0). Safe everywhere.',
      destruction: 0, ammo: 'infinite',
      tradeoff: 'Lowest DPS; no noise/debris/friendly risk.',
      preBreakVisibility: 'N/A (never breaks).', neverDestroyObjective: true },
    { id: 'scatter', name: 'Scatter', emoji: '💥', kind: 'scavenged',
      combatRole: 'Close-range cone burst; room clearer.',
      terrainRole: 'Light chew on destructible cells adjacent to blast.',
      destruction: 1, ammo: 'limited-frequent',
      tradeoff: 'Loud; pellet spread risks friendlies at point blank.',
      preBreakVisibility: 'Cracks show on cells one hit from breaking.', neverDestroyObjective: true },
    { id: 'grave-launcher', name: 'Grave Launcher', emoji: '🚀', kind: 'scavenged',
      combatRole: 'Arcing rockets; heavy single-target + splash.',
      terrainRole: 'Medium crater on destructible cells.',
      destruction: 2, ammo: 'limited-frequent',
      tradeoff: 'Very loud; debris + self-splash; keep clear of allies.',
      preBreakVisibility: 'Target decal + cracked cells before detonation resolves.', neverDestroyObjective: true },
    { id: 'moonbeam', name: 'Moonbeam', emoji: '⚡', kind: 'scavenged',
      combatRole: 'Sustained piercing beam; boss/add melter.',
      terrainRole: 'Thin cut line through destructible cells only.',
      destruction: 1, ammo: 'limited-frequent',
      tradeoff: 'Beam glare reveals position; overheat downtime.',
      preBreakVisibility: 'Scorch highlight traces the cut before cells break.', neverDestroyObjective: true },
    { id: 'forged-saw', name: 'Forged Saw', emoji: '🪚', kind: 'scavenged',
      combatRole: 'Melee saw; highest close DPS.',
      terrainRole: 'Saws destructible cells at contact range.',
      destruction: 2, ammo: 'limited-frequent',
      tradeoff: 'Must be adjacent; sparks + noise; friendly contact risk.',
      preBreakVisibility: 'Sparks + crack overlay as the cut progresses.', neverDestroyObjective: true },
    { id: 'cryo', name: 'Cryo', emoji: '❄️', kind: 'scavenged',
      combatRole: 'Cone slow + shatter on frozen enemies.',
      terrainRole: 'No terrain damage (rating 0); freezes hazards for crossing.',
      destruction: 0, ammo: 'limited-frequent',
      tradeoff: 'Low damage alone; mist obscures vision briefly.',
      preBreakVisibility: 'N/A (never breaks).', neverDestroyObjective: true },
    { id: 'sun', name: 'Sun', emoji: '☀️', kind: 'scavenged',
      combatRole: 'Lobbed fire zones; area denial.',
      terrainRole: 'Light scorch on destructible cells in burn patch.',
      destruction: 1, ammo: 'limited-frequent',
      tradeoff: 'Fire hurts allies too; smoke debris limits sightlines.',
      preBreakVisibility: 'Burn decal previews the patch before cells break.', neverDestroyObjective: true },
    { id: 'harpoon', name: 'Harpoon', emoji: '⚓', kind: 'scavenged',
      combatRole: 'Single heavy bolt + pull on elites.',
      terrainRole: 'No terrain damage (rating 0); pins targets to walls.',
      destruction: 0, ammo: 'limited-frequent',
      tradeoff: 'Slow refire; tether can drag shooter toward heavies.',
      preBreakVisibility: 'N/A (never breaks).', neverDestroyObjective: true },
    { id: 'orbital', name: 'Orbital', emoji: '🎯', kind: 'scavenged-rare',
      combatRole: 'Designated orbital strike; deletes packs (rare drop).',
      terrainRole: 'Heavy crater on destructible cells in beacon radius.',
      destruction: 3, ammo: 'limited-rare',
      tradeoff: 'Long delay + loud siren; team must clear radius; biggest friendly risk.',
      preBreakVisibility: 'Beacon ring + siren + cracked cells well before impact.', neverDestroyObjective: true },
    { id: 'rescue-beacon', name: 'Rescue Beacon', emoji: '📡', kind: 'tactical',
      combatRole: 'No damage; revives allies + pings objectives in co-op.',
      terrainRole: 'No terrain damage (rating 0).',
      destruction: 0, ammo: 'limited-frequent',
      tradeoff: 'Occupies throwable slot; pulse visible to enemies.',
      preBreakVisibility: 'N/A (never breaks).', neverDestroyObjective: true }
  ];

  var RULES = {
    sidearmInfinite: true,
    scavengedAmmo: 'limited but frequent drops; never-zero-fight rule: drops guarantee a usable weapon before every forced fight',
    neverDestroyObjective: 'No weapon damages objective/protected cells, ever.',
    bossFallback: 'Boss arenas always allow direct-fire damage (sidearm chip) so no fight soft-locks on ammo.'
  };

  function byId(id) {
    for (var i = 0; i < WEAPONS.length; i++) if (WEAPONS[i].id === id) return WEAPONS[i];
    return null;
  }

  function starter() { return byId('pulse-rifle'); }

  function uniqueIds() {
    var seen = {}, dupes = [];
    WEAPONS.forEach(function (w) { if (seen[w.id]) dupes.push(w.id); seen[w.id] = true; });
    return { unique: dupes.length === 0, dupes: dupes };
  }

  // Guarded runtime hooks (no engine import; operate on plain objects).
  function canDamageCell(weaponId, cell) {
    var w = byId(weaponId);
    if (!w) return false;
    if (!cell) return true;
    if (cell.protected || cell.objective) return false;
    if (w.destruction <= 0) return false;
    return !!cell.destructible;
  }

  function grantAmmo(inventory, weaponId, amount) {
    if (!inventory || !byId(weaponId)) return inventory || null;
    inventory[weaponId] = inventory[weaponId] || { ammo: 0 };
    if (byId(weaponId).ammo === 'infinite') { inventory[weaponId].ammo = Infinity; return inventory; }
    inventory[weaponId].ammo += (amount || 1);
    return inventory;
  }

  var api = {
    loaded: true, slug: 'gravegain2dB',
    weapons: WEAPONS, rules: RULES,
    byId: byId, starter: starter, uniqueIds: uniqueIds,
    canDamageCell: canDamageCell, grantAmmo: grantAmmo,
    count: function () { return WEAPONS.length; }
  };

  window.GraveGain2DB_Weapons = api;
  window.GraveGainMods.push({ id: 'gravegain2dB-weapons', kind: 'weapons', api: api });
})();
