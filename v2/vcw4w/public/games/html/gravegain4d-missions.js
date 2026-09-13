(function () {
    'use strict';

    // =========================================================================
    // GRAVEGAIN4D MISSIONS — same 10-mission canon as
    // gravegain_shared_missions.js (LZ Crash -> Hades Array), retold through
    // 4D folding / time lenses. Canon speaker lines are verbatim; added 4D
    // narrator lines are clearly marked with speaker "4D Narrator [fold-lens]"
    // and a "[4D]" text prefix. Never throws; idempotent.
    // Lore grounding: content/gravegain-epic-saga.ts (saga canon),
    // content/gravegain3d-modes.ts (President Angel Good botanist-president,
    // Elder Mirathiel seer echo, Warchief Groknak orc ally).
    // =========================================================================

    try {
        if (typeof window === 'undefined') return;
        if (window.GraveGain4DMissions) return;

        var root = window;

        var MISSIONS = [
            {
                id: 1,
                title: "Mission 1: LZ Crash Site Defense",
                subtitle: "The Descent on MoonRock",
                category: "human_history",
                location: "Colony LZ Sector Alpha",
                dungeonTheme: "metallic_ship",
                minFloor: 1,
                bossType: "Goblin Zed Leader",
                foldLens: "XW fold (crash-debris plane)",
                timeFork: "prime-descent",
                dreamSeed: 4201,
                dialogueBefore: [
                    { speaker: "Valley Net", text: "Dropship 420 hit heavy ground-to-air flak from reanimated artillery. LZ is hot!", portrait: "👱🏻‍♀️" },
                    { speaker: "Private Lisa Park", text: "My helmet seal is holding, but skeletons are crawling out of the craters!", portrait: "👩‍🚀" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] Fold the XW plane and the same crater shows its echo: Dropship 420 landing twice, once burning. Hold the fold to see which landing the zeds crawl from.", portrait: "🌀" }
                ],
                dialogueAfter: [
                    { speaker: "Valley Net", text: "LZ secured. Survivors falling back to the perimeter. Excellent shooting, soldier.", portrait: "👱🏻‍♀️" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] Unfold XW: both landings collapse into one secured LZ. The echo burial detail rests again.", portrait: "🌀" }
                ],
                objectives: [
                    { id: "slay_all", desc: "Eliminate all 15 initial undead threats at the crash site", count: 15, current: 0 }
                ],
                rewardGold: 200,
                rewardUusd: 500,
                unlockedBy: 0
            },
            {
                id: 2,
                title: "Mission 2: Cleansing the Elven Groves",
                subtitle: "Echoes of the Green Chronicle",
                category: "elven_history",
                location: "Bioluminescent Forest Vaults",
                dungeonTheme: "elven_grove",
                minFloor: 2,
                bossType: "Elven Necromancer",
                foldLens: "YW fold (root-memory plane)",
                timeFork: "green-chronicle-echo",
                dreamSeed: 4202,
                dialogueBefore: [
                    { speaker: "Queen Aelindra", text: "The ancient Mother Tree bleeds corruption. Our fallen seers walk again, bound to Hades' array.", portrait: "🧝‍♀️" },
                    { speaker: "Private Lisa Park", text: "We'll destroy the necromantic anchors and free your ancestors.", portrait: "👩‍🚀" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] Elder Mirathiel's seer-echo lives in the YW fold: rotate and the fallen seers stand beside their living selves. Cut the anchors in both planes.", portrait: "🌀" }
                ],
                dialogueAfter: [
                    { speaker: "Queen Aelindra", text: "The forest whispers its gratitude. The magical field is purifying in this sector.", portrait: "🧝‍♀️" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] The Mother Tree's two timelines braid back into one canopy. The field hums clean.", portrait: "🌀" }
                ],
                objectives: [
                    { id: "slay_boss", desc: "Defeat the Corrupted Elven Necromancer", count: 1, current: 0 },
                    { id: "slay_minions", desc: "Slay 20 undead grove corruptors", count: 20, current: 0 }
                ],
                rewardGold: 350,
                rewardUusd: 800,
                unlockedBy: 1
            },
            {
                id: 3,
                title: "Mission 3: Deep In The Dwarven Vaults",
                subtitle: "Sparkite & Steel",
                category: "dwarven_tales",
                location: "Central Highlands Deep Mines",
                dungeonTheme: "dwarven_vault",
                minFloor: 3,
                bossType: "Dwarven Zed High Thane",
                foldLens: "ZW fold (vein-depth plane)",
                timeFork: "sparkite-vein-fork",
                dreamSeed: 4203,
                dialogueBefore: [
                    { speaker: "Forgemaster Borin", text: "Our lower forge channels have been overrun! My ancestor's legendary Golem Hammer lies trapped below.", portrait: "⛏️" },
                    { speaker: "Valley Net", text: "Detecting high concentrations of unrefined Sparkite ore. Exercise extreme caution.", portrait: "👱🏻‍♀️" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] Fold ZW and the mine gains a fourth shaft: sparkite veins glow where the Golem Hammer fell in every fork. Dig the echo vein first.", portrait: "🌀" }
                ],
                dialogueAfter: [
                    { speaker: "Forgemaster Borin", text: "Ha! The mines are ours again! Have a flagon of dwarf ale on me, hero!", portrait: "⛏️" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] Veins merge; the Hammer is one Hammer again. The Array starves of fuel in all forks.", portrait: "🌀" }
                ],
                objectives: [
                    { id: "collect_ore", desc: "Recover 5 Sparkite Power Crystals", count: 5, current: 0 },
                    { id: "slay_boss", desc: "Defeat the Armored High Thane Zed", count: 1, current: 0 }
                ],
                rewardGold: 500,
                rewardUusd: 1200,
                unlockedBy: 2
            },
            {
                id: 4,
                title: "Mission 4: Orc Nomad Outpost Siege",
                subtitle: "Rage of the Southern Wastes",
                category: "orc_stories",
                location: "Crimson Sand Redoubts",
                dungeonTheme: "orc_wastes",
                minFloor: 4,
                bossType: "Huge Orc Zed Berserker",
                foldLens: "XW fold (gate-siege plane)",
                timeFork: "groknak-blood-fork",
                dreamSeed: 4204,
                dialogueBefore: [
                    { speaker: "Warchief Groknak", text: "Weak dead-things swarm our clan gates! Orcs do not die sitting down! TO WAR!", portrait: "👹" },
                    { speaker: "Private Lisa Park", text: "Hold the line with Groknak until our heavy artillery locks target!", portrait: "👩‍🚀" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] Warchief Groknak, orc ally, holds the gate in two forks at once: rotate XW and his risen blood answers his living rage. Stand with both Groknaks.", portrait: "🌀" }
                ],
                dialogueAfter: [
                    { speaker: "Warchief Groknak", text: "GRAAAH! Good fighting, human! You hit like an Orc warrior today!", portrait: "👹" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] The gates collapse into one timeline. One Groknak roars; the other finally rests.", portrait: "🌀" }
                ],
                objectives: [
                    { id: "survive_waves", desc: "Defeat 30 Orc and Goblin Zeds", count: 30, current: 0 },
                    { id: "slay_boss", desc: "Slay the Huge Orc Zed Berserker", count: 1, current: 0 }
                ],
                rewardGold: 700,
                rewardUusd: 1600,
                unlockedBy: 3
            },
            {
                id: 5,
                title: "Mission 5: Signal in the Shallows",
                subtitle: "Valley Net Uplink Restoration",
                category: "human_history",
                location: "Sub-surface Comms Relay 09",
                dungeonTheme: "metallic_ship",
                minFloor: 5,
                bossType: "Corrupted Drone Array",
                foldLens: "YW fold (signal-echo plane)",
                timeFork: "relay-jam-fork",
                dreamSeed: 4205,
                dialogueBefore: [
                    { speaker: "Valley Net", text: "Dr. Hades is broadcasting jamming signals across all sub-light frequencies. I need you to manually re-align Relay 09.", portrait: "👱🏻‍♀️" },
                    { speaker: "Arty Fisher", text: "Watch out for flying skull swarms near the energy coils!", portrait: "👨‍🔧" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] The jamming lives one fold over: rotate YW and Relay 09's clean signal shines beside its jammed twin. Align the echo dish to blind Hades.", portrait: "🌀" }
                ],
                dialogueAfter: [
                    { speaker: "Valley Net", text: "Uplink online! Planetary sensors are now tracking Hades' orbital movements.", portrait: "👱🏻‍♀️" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] Both relays lock as one. The skull swarms fall out of the fourth direction.", portrait: "🌀" }
                ],
                objectives: [
                    { id: "slay_skulls", desc: "Destroy 15 Flying Skulls guarding the relay", count: 15, current: 0 },
                    { id: "slay_all", desc: "Clear all 25 hostile entities in the relay chamber", count: 25, current: 0 }
                ],
                rewardGold: 900,
                rewardUusd: 2000,
                unlockedBy: 4
            },
            {
                id: 6,
                title: "Mission 6: The Alchemical Catacombs",
                subtitle: "President Good's Legacy",
                category: "the_necrogenesis",
                location: "Botany Core Sub-levels",
                dungeonTheme: "toxic_catacombs",
                minFloor: 6,
                bossType: "Toxic Chem-Golem",
                foldLens: "ZW fold (vat-mist plane)",
                timeFork: "botany-poison-fork",
                dreamSeed: 4206,
                dialogueBefore: [
                    { speaker: "President Angel Good", text: "Hades corrupted our botanical incubation vats to generate toxic cloud weaponry. Neutralize the Chem-Golem!", portrait: "🌿" },
                    { speaker: "Private Lisa Park", text: "Visor switched to hazmat mode. Moving in!", portrait: "👩‍🚀" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] President Angel Good, botanist-president, remembers clean vats in the other fork: fold ZW and her unpoisoned garden overlays the toxic one. Purge what differs.", portrait: "🌀" }
                ],
                dialogueAfter: [
                    { speaker: "President Angel Good", text: "The air in the sub-levels is clearing. The colony owes you a great debt.", portrait: "🌿" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] The colony breathes in both timelines now. One garden, one debt, paid.", portrait: "🌀" }
                ],
                objectives: [
                    { id: "slay_boss", desc: "Destroy the Toxic Chem-Golem", count: 1, current: 0 },
                    { id: "slay_elites", desc: "Slay 8 Elite Armored Zeds", count: 8, current: 0 }
                ],
                rewardGold: 1200,
                rewardUusd: 2500,
                unlockedBy: 5
            },
            {
                id: 7,
                title: "Mission 7: The Tomb of Clint Oldman",
                subtitle: "Guy Young's Paradox",
                category: "human_history",
                location: "Colonial Crypt of Honor",
                dungeonTheme: "stone_crypt",
                minFloor: 7,
                bossType: "Reanimated Patriarch Clint",
                foldLens: "XW fold (paradox-rest plane)",
                timeFork: "clint-paradox-fork",
                dreamSeed: 4207,
                dialogueBefore: [
                    { speaker: "Guy Young", text: "My grandfather Clint was the first to die naturally on MoonRock... now his tomb is pulsing with dark array energy.", portrait: "👨‍🚀" },
                    { speaker: "Private Lisa Park", text: "We will give him back his peace, Guy. I promise.", portrait: "👩‍🚀" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] Time broke around Clint Oldman: in the XW fold he sleeps and wakes at once. Fold gently — grant both Clints the same final rest.", portrait: "🌀" }
                ],
                dialogueAfter: [
                    { speaker: "Guy Young", text: "Thank you. He's at rest once more. Take his ancient service sidearm-it'll serve you well.", portrait: "👨‍🚀" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] The paradox seals. One grave, one peace, across every fork.", portrait: "🌀" }
                ],
                objectives: [
                    { id: "slay_boss", desc: "Defeat Reanimated Patriarch Clint", count: 1, current: 0 },
                    { id: "slay_all", desc: "Clear all 30 tomb guardians", count: 30, current: 0 }
                ],
                rewardGold: 1600,
                rewardUusd: 3200,
                unlockedBy: 6
            },
            {
                id: 8,
                title: "Mission 8: Orbital Strike Calibration",
                subtitle: "The MERCENARY Doctrine",
                category: "human_history",
                location: "Highland Peak Observatory",
                dungeonTheme: "dwarven_vault",
                minFloor: 8,
                bossType: "Bone Goliath Warlord",
                foldLens: "YW fold (targeting plane)",
                timeFork: "kinetic-strike-fork",
                dreamSeed: 4208,
                dialogueBefore: [
                    { speaker: "Valley Net", text: "Targeting coordinates for LuckyStarShip's kinetic orbital strike require manual laser targeting from the peak.", portrait: "👱🏻‍♀️" },
                    { speaker: "Warchief Groknak", text: "Bring down the fire from the sky! Burn the horde to ashes!", portrait: "👹" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] The laser only locks when folded: rotate YW and the Bone Goliath's echo overlaps its body. Paint the overlap — the strike hits every fork.", portrait: "🌀" }
                ],
                dialogueAfter: [
                    { speaker: "Valley Net", text: "Kinetic strike confirmed! 80% of Hades' perimeter forces obliterated!", portrait: "👱🏻‍♀️" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] Fire falls through the fourth direction. One flash, every timeline burned clean.", portrait: "🌀" }
                ],
                objectives: [
                    { id: "slay_boss", desc: "Slay the Bone Goliath Warlord", count: 1, current: 0 },
                    { id: "slay_minions", desc: "Defeat 35 undead horde assault units", count: 35, current: 0 }
                ],
                rewardGold: 2200,
                rewardUusd: 4000,
                unlockedBy: 7
            },
            {
                id: 9,
                title: "Mission 9: Gate of the NecroGenesis",
                subtitle: "The Breach of the Array",
                category: "the_necrogenesis",
                location: "The Citadel Perimeter",
                dungeonTheme: "citadel_darkness",
                minFloor: 9,
                bossType: "Necro-Array Titan",
                foldLens: "ZW fold (citadel-breach plane)",
                timeFork: "titan-breach-fork",
                dreamSeed: 4209,
                dialogueBefore: [
                    { speaker: "Queen Aelindra", text: "This is it. The threshold of Hades' inner sanctum. All four races stand behind you!", portrait: "🧝‍♀️" },
                    { speaker: "Forgemaster Borin", text: "Smashed through their gates! Leave none of these monsters standing!", portrait: "⛏️" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] All four races stand in every fork: fold ZW and the Citadel gates align across timelines. Breach once, breach everywhere.", portrait: "🌀" }
                ],
                dialogueAfter: [
                    { speaker: "Valley Net", text: "Perimeter breach successful. The doors to Lucifer Hades' chamber are unlocked.", portrait: "👱🏻‍♀️" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] The Titan falls in all planes at once. One door opens into the Sanctum Core.", portrait: "🌀" }
                ],
                objectives: [
                    { id: "slay_boss", desc: "Destroy the Necro-Array Titan", count: 1, current: 0 },
                    { id: "slay_all", desc: "Eliminate 40 elite citadel guardians", count: 40, current: 0 }
                ],
                rewardGold: 3000,
                rewardUusd: 5500,
                unlockedBy: 8,
                parSeconds: 840,
                requisition: { bonusHp: 135, dmgMult: 1.45 },
                secondaryObjective: { id: "gauntlet_waves", desc: "Survive 3 citadel gauntlet waves before the Titan", count: 3 },
                bossPhases: [
                    { name: "PHASE I - ARRAY AWAKENS", hpMult: 1.0, adds: 2 },
                    { name: "PHASE II - SHIELD OF THE DEAD", hpMult: 1.0, adds: 3 },
                    { name: "PHASE III - TITAN'S WRATH", hpMult: 1.0, adds: 4 }
                ]
            },
            {
                id: 10,
                title: "Mission 10: Lucifer's Shadow",
                subtitle: "The Final Confrontation",
                category: "the_necrogenesis",
                location: "Lucifer Hades' Sanctum Core",
                dungeonTheme: "citadel_darkness",
                minFloor: 10,
                bossType: "Dr. Lucifer Hades (Consciousness Overlord)",
                foldLens: "XW+YW+ZW tesseract fold (sanctum-core plane)",
                timeFork: "hades-final-fork",
                dreamSeed: 4210,
                dialogueBefore: [
                    { speaker: "Dr. Lucifer Hades", text: "200 years of solitude showed me the ultimate truth: flesh is weak, but consciousness bound to undeath is ETERNAL!", portrait: "👑" },
                    { speaker: "Private Lisa Park", text: "Your nightmare ends here, Lucifer. For MoonRock! For Earth! FOR THE LIVING!", portrait: "👩‍🚀" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] Hades hid his consciousness between folds: rotate the full tesseract and his ETERNAL echo has nowhere left to hide. End him in every fork at once.", portrait: "🌀" }
                ],
                dialogueAfter: [
                    { speaker: "Valley Net", text: "Necromantic Array DEACTIVATED. Planetary signal terminated. MoonRock is SAVED!", portrait: "👱🏻‍♀️" },
                    { speaker: "President Angel Good", text: "You did it! The four races are free. Humanity and MoonRock have a real future together!", portrait: "🌿" },
                    { speaker: "4D Narrator [fold-lens]", text: "[4D] The Array collapses across all timelines. One MoonRock, one peace, alive in 4D.", portrait: "🌀" }
                ],
                objectives: [
                    { id: "slay_boss", desc: "Defeat Dr. Lucifer Hades & Deactivate the Necromantic Array", count: 1, current: 0 }
                ],
                rewardGold: 5000,
                rewardUusd: 10000,
                unlockedBy: 9,
                parSeconds: 900,
                requisition: { bonusHp: 150, dmgMult: 1.5 },
                secondaryObjective: { id: "conduit_overload", desc: "Overload 3 array conduits during phase transitions", count: 3 },
                bossPhases: [
                    { name: "PHASE I - THE OVERLORD SCOFFS", hpMult: 1.0, adds: 2 },
                    { name: "PHASE II - NECROS INTERVENES", hpMult: 1.0, adds: 4 },
                    { name: "PHASE III - DEATH WEARS A CROWN", hpMult: 1.0, adds: 5 }
                ]
            }
        ];

        function getMission(id) {
            for (var i = 0; i < MISSIONS.length; i++) {
                if (MISSIONS[i].id === id) return MISSIONS[i];
            }
            return null;
        }

        function getAllMissions() {
            return MISSIONS.slice();
        }

        root.GraveGain4DMissions = {
            VERSION: "4d-1.0.0",
            MISSIONS: MISSIONS,
            getMission: getMission,
            getAllMissions: getAllMissions
        };

        try {
            if (root.GraveGainMods && typeof root.GraveGainMods.push === "function") {
                root.GraveGainMods.push({ name: "gravegain4d-missions" });
            } else if (!root.GraveGainMods) {
                root.GraveGainMods = [{ name: "gravegain4d-missions" }];
            }
        } catch (e) { /* never throw */ }
    } catch (e) { /* never throw */ }
})();
