(function () {
    'use strict';

    // =========================================================================
    // GRAVEGAIN4D - CAMPAIGN MISSIONS (missions4d.js)
    // 10 missions mirroring window.GraveGainStoryMissions (shared titles,
    // subtitles, locations, themes, bosses, dialogue speakers/portraits,
    // rewards, unlocks - synced from shared at runtime when present) with 4D
    // objectives: tee-to-anchor putt with par, ana/kata gates, timeline
    // rewinds, world-shift kills, boss phases. Shared-only enrichment fields
    // (parSeconds / requisition / secondaryObjective / bossPhases on 9-10)
    // pass through untouched. Merges additively into an existing
    // window.GraveGain4DMissions array (root golf file) by missionId so
    // hole/par/foe-clear data is preserved - campaign fields win on conflict.
    // All dialogue lines and objective descriptions are original 4D prose.
    // Never throws during boot: every step is guarded.
    // =========================================================================

    function obj(id, desc, count) {
        return { id: id, desc: desc, count: count, current: 0 };
    }
    function line(speaker, text, portrait) {
        return { speaker: speaker, text: text, portrait: portrait };
    }

    var CAMPAIGN = [
        {
            id: 1, missionId: 1,
            title: 'Mission 1: LZ Crash Site Defense',
            subtitle: 'The Descent on MoonRock',
            location: 'Colony LZ Sector Alpha',
            dungeonTheme: 'metallic_ship',
            minFloor: 1,
            bossType: 'Goblin Zed Leader',
            dialogueBefore: [
                line('Valley Net', 'Tee box is hot, golfer! Wreckage across the fairway, skeletons in the craters - play your drive straight through the fracture.', '👱🏻‍♀️'),
                line('Private Lisa Park', 'Helmet sealed, putter ready. I will walk this ball from the tee to the anchor if I have to hole it through the W-axis.', '👩‍🚀')
            ],
            dialogueAfter: [
                line('Valley Net', 'Anchor putt drops! LZ green secured. One fold pinned flat - nine to go, soldier.', '👱🏻‍♀️')
            ],
            objectives: [
                obj('putt_anchor', 'Putt tee-to-anchor on hole 1 (finish at or under par)', 1),
                obj('gates_ana_kata', 'Thread 2 ana/kata gates on the crash fairway', 2),
                obj('worldshift_kills', 'Unfold 15 world-shifted crash-site threats', 15)
            ],
            par: 4, parSeconds: 300,
            requisition: { bonusHp: 15, dmgMult: 1.05 },
            rewardGold: 200, rewardUusd: 500, unlockedBy: 0
        },
        {
            id: 2, missionId: 2,
            title: 'Mission 2: Cleansing the Elven Groves',
            subtitle: 'Echoes of the Green Chronicle',
            location: 'Bioluminescent Forest Vaults',
            dungeonTheme: 'elven_grove',
            minFloor: 2,
            bossType: 'Elven Necromancer',
            dialogueBefore: [
                line('Queen Aelindra', 'The Mother Tree bleeds along two axes, golfer. The old arches still face ana - thread them and the grove will remember sunlight.', '🧝‍♀️'),
                line('Private Lisa Park', 'Then I putt for your ancestors, Majesty. Gates first, Necromancer last.', '👩‍🚀')
            ],
            dialogueAfter: [
                line('Queen Aelindra', 'The field runs clear down the fairway. The forest applauds in three timelines at once.', '🧝‍♀️')
            ],
            objectives: [
                obj('putt_anchor', 'Putt tee-to-anchor on hole 2 (finish at or under par)', 1),
                obj('gates_ana_kata', 'Thread 3 ana/kata arches in the groves', 3),
                obj('worldshift_kills', 'Unfold 20 undead grove corruptors', 20),
                obj('slay_boss', 'Defeat the Corrupted Elven Necromancer', 1)
            ],
            par: 4, parSeconds: 360,
            requisition: { bonusHp: 30, dmgMult: 1.1 },
            rewardGold: 350, rewardUusd: 800, unlockedBy: 1
        },
        {
            id: 3, missionId: 3,
            title: 'Mission 3: Deep In The Dwarven Vaults',
            subtitle: 'Sparkite & Steel',
            location: 'Central Highlands Deep Mines',
            dungeonTheme: 'dwarven_vault',
            minFloor: 3,
            bossType: 'Dwarven Zed High Thane',
            dialogueBefore: [
                line('Forgemaster Borin', 'Lower channels overrun, ancestal hammer trapped below! The masons cut gates facin ana - putt through em and the deep forge lends ye its aim.', '⛏️'),
                line('Valley Net', 'Sparkite concentrations spiking along the W-axis. Watch the rewind budget - the rock remembers every timeline.', '👱🏻‍♀️')
            ],
            dialogueAfter: [
                line('Forgemaster Borin', 'Ha! The mines are ours! The fold sits flat as a fresh fairway - drink up, hero!', '⛏️')
            ],
            objectives: [
                obj('putt_anchor', 'Putt tee-to-anchor on hole 3 (finish at or under par)', 1),
                obj('gates_ana_kata', 'Thread 3 mason-cut ana/kata gates', 3),
                obj('collect_shards', 'Recover 5 sparkite-fold crystals', 5),
                obj('slay_boss', 'Defeat the Armored High Thane Zed', 1)
            ],
            par: 5, parSeconds: 420,
            requisition: { bonusHp: 45, dmgMult: 1.15 },
            rewardGold: 500, rewardUusd: 1200, unlockedBy: 2
        },
        {
            id: 4, missionId: 4,
            title: 'Mission 4: Orc Nomad Outpost Siege',
            subtitle: 'Rage of the Southern Wastes',
            location: 'Crimson Sand Redoubts',
            dungeonTheme: 'orc_wastes',
            minFloor: 4,
            bossType: 'Huge Orc Zed Berserker',
            dialogueBefore: [
                line('Warchief Groknak', 'Dead-things on THREE axes this time! Good - more directions to charge! YOU putt, I RAGE!', '👹'),
                line('Private Lisa Park', 'Hold the gates with me, Groknak - I thread, you smash, the Berserker falls!', '👩‍🚀')
            ],
            dialogueAfter: [
                line('Warchief Groknak', 'GRAAAH! Under par AND under the horde! You hit like an Orc today!', '👹')
            ],
            objectives: [
                obj('putt_anchor', 'Putt tee-to-anchor on hole 4 (finish at or under par)', 1),
                obj('gates_ana_kata', 'Thread 4 war-gates across the redoubts', 4),
                obj('worldshift_kills', 'Unfold 30 Orc and Goblin Zeds', 30),
                obj('slay_boss', 'Slay the Huge Orc Zed Berserker', 1)
            ],
            par: 5, parSeconds: 480,
            requisition: { bonusHp: 60, dmgMult: 1.2 },
            rewardGold: 700, rewardUusd: 1600, unlockedBy: 3
        },
        {
            id: 5, missionId: 5,
            title: 'Mission 5: Signal in the Shallows',
            subtitle: 'Valley Net Uplink Restoration',
            location: 'Sub-surface Comms Relay 09',
            dungeonTheme: 'metallic_ship',
            minFloor: 5,
            bossType: 'Corrupted Drone Array',
            dialogueBefore: [
                line('Valley Net', 'Relay 09 must be re-aligned by hand - and the fracture echoes my own voice back at you. Trust the Prime call, ignore the Echo.', '👱🏻‍♀️'),
                line('Arty Fisher', 'Skull swarms nest the coils along kata! Short chips through the gates, golfer - no hero drives near live conduits!', '👨‍🔧')
            ],
            dialogueAfter: [
                line('Valley Net', 'Uplink online across all four axes! I can see Hades orbital movements - and your ball. Mostly your ball.', '👱🏻‍♀️')
            ],
            objectives: [
                obj('putt_anchor', 'Putt tee-to-anchor on hole 5 (finish at or under par)', 1),
                obj('gates_ana_kata', 'Thread 4 relay coil gates', 4),
                obj('rewind_limit', 'Finish using no more than 3 timeline rewinds', 3),
                obj('worldshift_kills', 'Unfold 25 relay-chamber hostiles', 25)
            ],
            par: 4, parSeconds: 540,
            requisition: { bonusHp: 75, dmgMult: 1.25 },
            rewardGold: 900, rewardUusd: 2000, unlockedBy: 4
        },
        {
            id: 6, missionId: 6,
            title: 'Mission 6: The Alchemical Catacombs',
            subtitle: "President Good's Legacy",
            location: 'Botany Core Sub-levels',
            dungeonTheme: 'toxic_catacombs',
            minFloor: 6,
            bossType: 'Toxic Chem-Golem',
            dialogueBefore: [
                line('President Angel Good', 'My own vats, turned to poison. The golem vents along kata where you cannot see it - trust the gates, golfer, and hazmat-putt straight.', '🌿'),
                line('Private Lisa Park', 'Visor sealed, rewinds counted. The air clears one fold at a time, Madam President.', '👩‍🚀')
            ],
            dialogueAfter: [
                line('President Angel Good', 'The sub-levels breathe again. Under par, under budget, unbelievable.', '🌿')
            ],
            objectives: [
                obj('putt_anchor', 'Putt tee-to-anchor on hole 6 (finish at or under par)', 1),
                obj('gates_ana_kata', 'Thread 5 filtration gates in the vats', 5),
                obj('rewind_limit', 'Finish using no more than 3 timeline rewinds', 3),
                obj('slay_boss', 'Destroy the Toxic Chem-Golem', 1),
                obj('worldshift_kills', 'Unfold 8 elite armored Zeds', 8)
            ],
            par: 5, parSeconds: 600,
            requisition: { bonusHp: 90, dmgMult: 1.3 },
            rewardGold: 1200, rewardUusd: 2500, unlockedBy: 5
        },
        {
            id: 7, missionId: 7,
            title: 'Mission 7: The Tomb of Clint Oldman',
            subtitle: "Guy Young's Paradox",
            location: 'Colonial Crypt of Honor',
            dungeonTheme: 'stone_crypt',
            minFloor: 7,
            bossType: 'Reanimated Patriarch Clint',
            dialogueBefore: [
                line('Guy Young', 'Grandfather slept two centuries and got five days of purple sky. Now the array has him. One quiet round, golfer - for the five days.', '👨‍🚀'),
                line('Private Lisa Park', 'For Clint. Every gate a year he slept, every putt a day he walked.', '👩‍🚀')
            ],
            dialogueAfter: [
                line('Guy Young', 'Rest again, Grandfather. Take his old sidearm - and take my thanks. Time is weird, but par is par.', '👨‍🚀')
            ],
            objectives: [
                obj('putt_anchor', 'Putt tee-to-anchor on hole 7 (finish at or under par)', 1),
                obj('gates_ana_kata', 'Thread 5 crypt gates of honor', 5),
                obj('rewind_limit', 'Finish using no more than 2 timeline rewinds', 2),
                obj('slay_boss', 'Defeat Reanimated Patriarch Clint', 1),
                obj('worldshift_kills', 'Unfold 30 tomb guardians', 30)
            ],
            par: 5, parSeconds: 660,
            requisition: { bonusHp: 105, dmgMult: 1.35 },
            rewardGold: 1600, rewardUusd: 3200, unlockedBy: 6
        },
        {
            id: 8, missionId: 8,
            title: 'Mission 8: Orbital Strike Calibration',
            subtitle: 'The MERCENARY Doctrine',
            location: 'Highland Peak Observatory',
            dungeonTheme: 'dwarven_vault',
            minFloor: 8,
            bossType: 'Bone Goliath Warlord',
            dialogueBefore: [
                line('Valley Net', 'LuckyStarShip needs manual laser targeting from the peak - your ball carries the designator. MERCENARY dreamed this shot. Verify it with science.', '👱🏻‍♀️'),
                line('Warchief Groknak', 'Bring the sky-fire! I hold the Warlord, YOU thread the gates and light the sky!', '👹')
            ],
            dialogueAfter: [
                line('Valley Net', 'Kinetic strike confirmed across the fracture! 80% of his perimeter forces unfolded at once!', '👱🏻‍♀️')
            ],
            objectives: [
                obj('putt_anchor', 'Putt tee-to-anchor on hole 8 (finish at or under par)', 1),
                obj('gates_ana_kata', 'Thread 6 observatory calibration gates', 6),
                obj('rewind_limit', 'Finish using no more than 2 timeline rewinds', 2),
                obj('slay_boss', 'Slay the Bone Goliath Warlord', 1),
                obj('worldshift_kills', 'Unfold 35 undead horde assault units', 35)
            ],
            par: 5, parSeconds: 720,
            requisition: { bonusHp: 120, dmgMult: 1.4 },
            rewardGold: 2200, rewardUusd: 4000, unlockedBy: 7
        },
        {
            id: 9, missionId: 9,
            title: 'Mission 9: Gate of the NecroGenesis',
            subtitle: 'The Breach of the Array',
            location: 'The Citadel Perimeter',
            dungeonTheme: 'citadel_darkness',
            minFloor: 9,
            bossType: 'Necro-Array Titan',
            dialogueBefore: [
                line('Queen Aelindra', 'The threshold, golfer. All four races stand behind your ball - thread the gauntlet gates and the Titan loses its shield.', '🧝‍♀️'),
                line('Forgemaster Borin', 'Smashed gates! Folded vectors! Leave none standin - ESPECIALLY not par!', '⛏️')
            ],
            dialogueAfter: [
                line('Valley Net', 'Perimeter breach successful. The doors to the tesseract sanctum stand open - and your card reads under par.', '👱🏻‍♀️')
            ],
            objectives: [
                obj('putt_anchor', 'Putt tee-to-anchor on hole 9 (finish at or under par)', 1),
                obj('gates_ana_kata', 'Thread 6 citadel gauntlet gates', 6),
                obj('rewind_limit', 'Finish using no more than 2 timeline rewinds', 2),
                obj('slay_boss', 'Destroy the Necro-Array Titan', 1),
                obj('worldshift_kills', 'Unfold 40 elite citadel guardians', 40)
            ],
            par: 5, parSeconds: 840,
            requisition: { bonusHp: 135, dmgMult: 1.45 },
            secondaryObjective: { id: 'gauntlet_waves', desc: 'Survive 3 citadel gauntlet waves before the Titan', count: 3 },
            bossPhases: [
                { name: 'PHASE I - ARRAY AWAKENS', hpMult: 1.0, adds: 2 },
                { name: 'PHASE II - SHIELD OF THE DEAD', hpMult: 1.0, adds: 3 },
                { name: "PHASE III - TITAN'S WRATH", hpMult: 1.0, adds: 4 }
            ],
            rewardGold: 3000, rewardUusd: 5500, unlockedBy: 8
        },
        {
            id: 10, missionId: 10,
            title: 'Mission 10: Lucifer\'s Shadow',
            subtitle: 'The Final Confrontation',
            location: "Lucifer Hades' Sanctum Core",
            dungeonTheme: 'citadel_darkness',
            minFloor: 10,
            bossType: 'Dr. Lucifer Hades (Consciousness Overlord)',
            dialogueBefore: [
                line('Dr. Lucifer Hades', 'Two centuries of solitude taught me the perfect line, golfer: sixteen corners, one cup. Flesh slices - but undeath putts ETERNAL!', '👑'),
                line('Private Lisa Park', 'Your round ends here, Lucifer. This putt is for MoonRock - FOR THE LIVING!', '👩‍🚀')
            ],
            dialogueAfter: [
                line('Valley Net', 'Array DEACTIVATED across Prime, Echo, and Dream! The field lies flat! MoonRock is SAVED!', '👱🏻‍♀️'),
                line('President Angel Good', 'Champion of four peoples and three timelines! Humanity and MoonRock have a future - under par, at last!', '🌿')
            ],
            objectives: [
                obj('putt_anchor', 'Putt tee-to-anchor on hole 10 (finish at or under par)', 1),
                obj('gates_ana_kata', 'Thread 7 tesseract sanctum gates', 7),
                obj('rewind_limit', 'Finish using no more than 1 timeline rewind', 1),
                obj('slay_boss', 'Defeat Dr. Lucifer Hades & Deactivate the Necromantic Array', 1)
            ],
            par: 5, parSeconds: 900,
            requisition: { bonusHp: 150, dmgMult: 1.5 },
            secondaryObjective: { id: 'conduit_overload', desc: 'Overload 3 array conduits during phase transitions', count: 3 },
            bossPhases: [
                { name: 'PHASE I - THE OVERLORD SCOFFS', hpMult: 1.0, adds: 2 },
                { name: 'PHASE II - NECROS INTERVENES', hpMult: 1.0, adds: 4 },
                { name: 'PHASE III - DEATH WEARS A CROWN', hpMult: 1.0, adds: 5 }
            ],
            rewardGold: 5000, rewardUusd: 10000, unlockedBy: 9
        }
    ];

    // Overlay verbatim shared fields (titles/subtitles/bosses/speakers/
    // portraits/rewards/unlocks/locations/themes/floors + 9-10 enrichment)
    // when the shared story file is present. Campaign 4D fields are kept.
    function syncFromShared() {
        try {
            var shared = window.GraveGainStoryMissions;
            if (!shared || typeof shared.length !== 'number') return;
            var byId = {};
            for (var s = 0; s < shared.length; s++) {
                var sm = shared[s];
                if (sm && (sm.id !== undefined)) byId[String(sm.id)] = sm;
            }
            var FIELDS = ['title', 'subtitle', 'location', 'dungeonTheme', 'minFloor',
                'bossType', 'rewardGold', 'rewardUusd', 'unlockedBy',
                'parSeconds', 'requisition', 'secondaryObjective', 'bossPhases'];
            for (var i = 0; i < CAMPAIGN.length; i++) {
                var c = CAMPAIGN[i];
                var src = byId[String(c.missionId)] || byId[String(c.id)];
                if (!src) continue;
                for (var f = 0; f < FIELDS.length; f++) {
                    try {
                        var k = FIELDS[f];
                        if (src[k] !== undefined) c[k] = src[k];
                    } catch (_) { /* ignore */ }
                }
                // Speakers + portraits mirror shared; 4D line text is kept.
                try {
                    if (Array.isArray(src.dialogueBefore) && Array.isArray(c.dialogueBefore)) {
                        for (var b = 0; b < c.dialogueBefore.length && b < src.dialogueBefore.length; b++) {
                            if (src.dialogueBefore[b].speaker) c.dialogueBefore[b].speaker = src.dialogueBefore[b].speaker;
                            if (src.dialogueBefore[b].portrait) c.dialogueBefore[b].portrait = src.dialogueBefore[b].portrait;
                        }
                    }
                    if (Array.isArray(src.dialogueAfter) && Array.isArray(c.dialogueAfter)) {
                        for (var a = 0; a < c.dialogueAfter.length && a < src.dialogueAfter.length; a++) {
                            if (src.dialogueAfter[a].speaker) c.dialogueAfter[a].speaker = src.dialogueAfter[a].speaker;
                            if (src.dialogueAfter[a].portrait) c.dialogueAfter[a].portrait = src.dialogueAfter[a].portrait;
                        }
                    }
                } catch (_) { /* ignore */ }
            }
        } catch (_) { /* never throw */ }
    }

    function keyOf(m) {
        try {
            var n = Number(m && (m.missionId !== undefined ? m.missionId : m.id));
            if (isFinite(n)) return String(n);
        } catch (_) { /* fall through */ }
        try { return String(m && (m.missionId !== undefined ? m.missionId : m.id)); } catch (_) { return ''; }
    }

    // Additive merge into a pre-existing GraveGain4DMissions array (root golf
    // file): preserve hole/par/foe-clear style fields, campaign wins the rest.
    function install() {
        try {
            syncFromShared();
            if (typeof window === 'undefined') return CAMPAIGN;
            var prev = window.GraveGain4DMissions;
            if (Array.isArray(prev) && prev !== CAMPAIGN && prev.length) {
                var want = {};
                for (var i = 0; i < CAMPAIGN.length; i++) want[keyOf(CAMPAIGN[i])] = CAMPAIGN[i];
                for (var p = 0; p < prev.length; p++) {
                    var old = prev[p];
                    if (!old || typeof old !== 'object') continue;
                    var hit = want[keyOf(old)];
                    if (hit) {
                        for (var k in old) {
                            try {
                                if (Object.prototype.hasOwnProperty.call(old, k) && hit[k] === undefined) hit[k] = old[k];
                            } catch (_) { /* ignore */ }
                        }
                    } else {
                        CAMPAIGN.push(old);
                    }
                }
            }
            window.GraveGain4DMissions = CAMPAIGN;
            return CAMPAIGN;
        } catch (_) {
            try {
                if (typeof window !== 'undefined') window.GraveGain4DMissions = CAMPAIGN;
            } catch (_) { /* ignore */ }
            return CAMPAIGN;
        }
    }

    install();
})();
