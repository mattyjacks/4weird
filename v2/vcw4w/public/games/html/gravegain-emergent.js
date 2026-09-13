/* GraveGain emergent endless-dungeon content (agent A9, v2-native).
 * Pure data + seeded picker. NO DOM, no events, no fetch/eval.
 * Teen-clean by default; adult-only entries carry explicit flags
 * (drugsAdultOnly / goreAdultOnly) for the host to gate by age band.
 * Mode contract: kid = no blood (sparkles), teen = blood minimal,
 * all = adults-only (drugs usable only in all).
 */
(function () {
    'use strict';
    if (window.GraveGainEmergent) return;

    var VERSION = '1.0.0';

    /* Seeded RNG (mulberry32). */
    function mulberry32(seed) {
        var a = seed >>> 0;
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function num(v, dflt, min) {
        var n = Math.floor(Number(v));
        if (!isFinite(n)) n = dflt;
        if (n < min) n = min;
        return n;
    }

    function byId(arr, id) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].id === id) return arr[i];
        }
        return null;
    }

    /* Altar rez copy branches by age band via opts.mode. */
    var ALTAR_REZ = {
        kid: 'Offer rainbow sparkles at the glitter altar to wake the sleeper with giggles.',
        teen: 'Offer blood at the bone altar to wake the fallen — keep your helmet sealed.',
        all: 'Offer blood at the bone altar to wake the fallen — the Array is watching.'
    };

    var SIDEQUESTS = [
        { id: 'escort-ghost', title: 'Escort Ghost', emoji: '👻', giver: 'Sister Tallow',
          objective: 'Guide the pale ghost through 3 haunted halls to the moonlit gate.',
          twist: 'It remembers your name from a past run.',
          reward: '+50 gold, ghost-lantern charm', drugsAdultOnly: false, goreAdultOnly: false },
        { id: 'altar-choice', title: 'Altar Choice', emoji: '🩸', giver: 'One-Eyed Marrow',
          objective: 'Choose an offering at the bone altar to wake the fallen sleeper.',
          twist: 'The altar keeps a copy of whoever wakes.',
          reward: 'Revive + altar blessing', drugsAdultOnly: false, goreAdultOnly: false,
          rezText: ALTAR_REZ,
          textFor: function (opts) {
              var m = opts && opts.mode ? String(opts.mode).toLowerCase() : 'teen';
              if (m === 'kid') return ALTAR_REZ.kid;
              if (m === 'all') return ALTAR_REZ.all;
              return ALTAR_REZ.teen;
          } },
        { id: 'cursed-chest', title: 'Cursed Chest', emoji: '🧰', giver: 'Pip the Moss Peddler',
          objective: 'Carry the rattling chest to the bell tower without opening it.',
          twist: 'It whispers your kill count back at you.',
          reward: '120 gold', drugsAdultOnly: false, goreAdultOnly: false },
        { id: 'lost-courier', title: 'Lost Courier', emoji: '📯', giver: 'Grave-Tender Sable',
          objective: 'Find the lost message satchel in the goblin warren.',
          twist: 'The letter is addressed to you.',
          reward: 'Map fragment', drugsAdultOnly: false, goreAdultOnly: false },
        { id: 'mirror-duel', title: 'Mirror Duel', emoji: '🪞', giver: 'Rusty Valve',
          objective: 'Defeat your mirror double in the relay shallows.',
          twist: 'It fights with your last run’s victories.',
          reward: 'Mirror-shard blade', drugsAdultOnly: false, goreAdultOnly: true },
        { id: 'famine-rats', title: 'Famine Rats', emoji: '🐀', giver: 'Cook Rumblepot',
          objective: 'Clear the ration cellar of swarm rats before supper.',
          twist: 'The rats built a tiny altar to Groknak.',
          reward: 'Endless stew bowl', drugsAdultOnly: false, goreAdultOnly: false },
        { id: 'bell-tower', title: 'Bell Tower', emoji: '🔔', giver: 'Bell Warden',
          objective: 'Climb the leaning tower and ring the dawn bell.',
          twist: 'The bell rings you back on the way down.',
          reward: '+1 max resolve', drugsAdultOnly: false, goreAdultOnly: false },
        { id: 'vein-collapse', title: 'Vein Collapse', emoji: '⛏️', giver: 'Borin Ironhold',
          objective: 'Shore up the collapsing sparkite vein before it buries the shaft.',
          twist: 'Something down there is breathing.',
          reward: '6 sparkite shards', drugsAdultOnly: false, goreAdultOnly: true }
    ];

    var ACTIVITIES = [
        { id: 'dice-shrine', title: 'Dice Shrine', emoji: '🎲',
          rule: 'Offer a streak, roll 2 bone dice; 7+ blesses the next floor, snake-eyes costs 10 gold.',
          drugsAdultOnly: false, goreAdultOnly: false },
        { id: 'fishing-rift', title: 'Fishing Rift', emoji: '🎣',
          rule: 'Cast into the glowing rift; moonfish pay gold, old boots pay luck.',
          drugsAdultOnly: false, goreAdultOnly: false },
        { id: 'target-range', title: 'Target Range', emoji: '🎯',
          rule: '5 shots, 3 bullseyes win a charm; misses feed the target mimic.',
          drugsAdultOnly: false, goreAdultOnly: false },
        { id: 'mushroom-circle', title: 'Mushroom Circle', emoji: '🍄',
          rule: 'Adults-only dreamcap rite (18+); in kid/teen it is a decorative glow ring — look, don’t nibble.',
          drugsAdultOnly: true, goreAdultOnly: false },
        { id: 'sparring-pit', title: 'Sparring Pit', emoji: '🥊',
          rule: 'Best-of-3 friendly bouts with the war band; winner takes ration tokens.',
          drugsAdultOnly: false, goreAdultOnly: false },
        { id: 'star-map', title: 'Star Map', emoji: '🔭',
          rule: 'Chart the LuckyStarShip’s path; finish a constellation to reveal the next floor’s event early.',
          drugsAdultOnly: false, goreAdultOnly: false }
    ];

    var NPCS = [
        { id: 'hollow-courier', name: 'Hollow Courier', emoji: '📬', role: 'Dead letter carrier',
          drugsAdultOnly: false, goreAdultOnly: false, lines: [
              'Letters for the living, letters for the corpses. {kills} deliveries and counting.',
              'Postage is {gold} gold, payable in teeth or tokens. No refunds past floor {floor}.',
              'I walked through blood and static to reach floor {floor}. Sign here, hero.',
              'Your record of {kills} victories precedes you. Even the hollow ones whisper it.'
          ] },
        { id: 'bell-warden', name: 'Bell Warden', emoji: '🔔', role: 'Keeper of the dawn bell',
          drugsAdultOnly: false, goreAdultOnly: false, lines: [
              'The bell has tolled {kills} victories. Each one rings a little sweeter.',
              'Polishing the clapper costs {gold} gold. Rust never sleeps, little hero.',
              'Floor {floor} trembles when I ring. Hold your helmet and hum along.',
              'A corpse in the belfry still keeps time. Mind the rope.'
          ] },
        { id: 'spore-nun', name: 'Spore Nun', emoji: '🍄', role: 'Dreamcap mystic',
          drugsAdultOnly: true, goreAdultOnly: false, lines: [
              'The dreamcap ring glows for those with {kills} victories. Breathe easy, drifter.',
              'My spore-tea costs {gold} gold — adults only, little mushroom. The ring decides who dreams.',
              'On floor {floor} the veil is thin. One sip and you will see the hollow ones.',
              'The Mother Tree dreamed of your {gold} gold and laughed. Spend it kindly.'
          ] },
        { id: 'cursed-cartographer', name: 'Cursed Cartographer', emoji: '🗺️', role: 'Mapmaker of doomed floors',
          drugsAdultOnly: false, goreAdultOnly: true, lines: [
              'I ink my maps in blood. {kills} battles mapped, and the pen is still wet.',
              'This chart of floor {floor} cost me a finger. Yours costs {gold} gold.',
              'Your corpse is already drawn on the next floor. Walk around it.',
              'Every X marks someone who ignored me. {kills} Xs and counting.'
          ] },
        { id: 'ember-kid', name: 'Ember Kid', emoji: '🔥', role: 'Kid-friendly spark tender',
          drugsAdultOnly: false, goreAdultOnly: false, lines: [
              'I keep the cozy fire lit! It has warmed {kills} heroes — you are my favorite!',
              'Toasty marshmallows cost {gold} gold, but smiles are free!',
              'Floor {floor} is chilly. Take an ember-hug before you go!',
              'My sparks do happy dances when you win! Dance with us!'
          ] },
        { id: 'wandering-anvil', name: 'Wandering Anvil', emoji: '⚒️', role: 'Traveling blacksmith',
          drugsAdultOnly: false, goreAdultOnly: false, lines: [
              'Bring me {gold} gold and I will hammer your blade straight. {kills} victories deserve a sharp edge.',
              'I forged on floor {floor} once. The anvil still remembers the tune.',
              'Kill the rust first, hero. Then kill the doubt. Then the monsters.',
              'Your armor has seen {kills} fights. Let old Anvil sing it back into shape.'
          ] }
    ];

    /* Seeded event pick with pity timer: floor % 4 forces an npc,
     * so an npc is guaranteed at least every 4 floors. */
    function nextEvent(seedState) {
        var s = seedState || {};
        var floor = num(s.floor, 1, 1);
        var kills = num(s.kills, 0, 0);
        var gold = num(s.gold, 0, 0);
        var seed = num(s.seed, 1, 0) >>> 0;
        var rng, ref;
        if (floor % 4 === 0) {
            rng = mulberry32((seed ^ Math.imul(floor, 2654435761)) >>> 0);
            ref = NPCS[Math.floor(rng() * NPCS.length) % NPCS.length];
            return { kind: 'npc', ref: ref };
        }
        rng = mulberry32((seed + Math.imul(floor, 97) + Math.imul(kills, 13) + gold) >>> 0);
        var r = rng();
        if (r < 0.4) {
            ref = SIDEQUESTS[Math.floor(rng() * SIDEQUESTS.length) % SIDEQUESTS.length];
            return { kind: 'quest', ref: ref };
        }
        if (r < 0.7) {
            ref = ACTIVITIES[Math.floor(rng() * ACTIVITIES.length) % ACTIVITIES.length];
            return { kind: 'activity', ref: ref };
        }
        ref = NPCS[Math.floor(rng() * NPCS.length) % NPCS.length];
        return { kind: 'npc', ref: ref };
    }

    /* Fill {kills}/{gold}/{floor} placeholders; kid mode strips blood words. */
    function dialogueFor(npcId, ctx) {
        var npc = byId(NPCS, npcId);
        if (!npc) return '';
        var c = ctx || {};
        var kills = String(num(c.kills, 0, 0));
        var gold = String(num(c.gold, 0, 0));
        var floor = String(num(c.floor, 1, 1));
        var mode = c.mode ? String(c.mode).toLowerCase() : 'teen';
        var idx = (num(c.floor, 1, 1) + num(c.kills, 0, 0) + num(c.gold, 0, 0)) % npc.lines.length;
        var line = npc.lines[idx].split('{kills}').join(kills).split('{gold}').join(gold).split('{floor}').join(floor);
        if (mode === 'kid') {
            line = line.replace(/corpse/gi, 'sleeper').replace(/blood/gi, 'sparkle').replace(/kill/gi, 'nap');
        }
        return line;
    }

    window.GraveGainEmergent = {
        VERSION: VERSION,
        SIDEQUESTS: SIDEQUESTS,
        ACTIVITIES: ACTIVITIES,
        NPCS: NPCS,
        nextEvent: nextEvent,
        dialogueFor: dialogueFor
    };
})();
