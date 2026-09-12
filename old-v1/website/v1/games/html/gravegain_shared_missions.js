(function() {
    'use strict';

    // =========================================================================
    // GRAVEGAIN SHARED 10-MISSION STORY ENGINE
    // Shared between GraveGain2D and GraveGain3D
    // =========================================================================

    const StoryMissions = [
        {
            id: 1,
            title: "Mission 1: LZ Crash Site Defense",
            subtitle: "The Descent on MoonRock",
            category: "human_history",
            location: "Colony LZ Sector Alpha",
            dungeonTheme: "metallic_ship",
            minFloor: 1,
            bossType: "Goblin Zed Leader",
            dialogueBefore: [
                { speaker: "Valley Net", text: "Dropship 420 hit heavy ground-to-air flak from reanimated artillery. LZ is hot!", portrait: "🤖" },
                { speaker: "Private Lisa Park", text: "My helmet seal is holding, but skeletons are crawling out of the craters!", portrait: "👩‍🚀" }
            ],
            dialogueAfter: [
                { speaker: "Valley Net", text: "LZ secured. Survivors falling back to the perimeter. Excellent shooting, soldier.", portrait: "🤖" }
            ],
            objectives: [
                { id: "slay_all", desc: "Eliminate all 15 initial undead threats at the crash site", count: 15, current: 0 }
            ],
            rewardGold: 200,
            rewardUusd: 500,
            unlockedBy: 0 // Mission 1 is unlocked by default
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
            dialogueBefore: [
                { speaker: "Queen Aelindra", text: "The ancient Mother Tree bleeds corruption. Our fallen seers walk again, bound to Hades' array.", portrait: "🧝‍♀️" },
                { speaker: "Private Lisa Park", text: "We'll destroy the necromantic anchors and free your ancestors.", portrait: "👩‍🚀" }
            ],
            dialogueAfter: [
                { speaker: "Queen Aelindra", text: "The forest whispers its gratitude. The magical field is purifying in this sector.", portrait: "🧝‍♀️" }
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
            dialogueBefore: [
                { speaker: "Forgemaster Borin", text: "Our lower forge channels have been overrun! My ancestor's legendary Golem Hammer lies trapped below.", portrait: "⛏️" },
                { speaker: "Valley Net", text: "Detecting high concentrations of unrefined Sparkite ore. Exercise extreme caution.", portrait: "🤖" }
            ],
            dialogueAfter: [
                { speaker: "Forgemaster Borin", text: "Ha! The mines are ours again! Have a flagon of dwarf ale on me, hero!", portrait: "⛏️" }
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
            dialogueBefore: [
                { speaker: "Warchief Groknak", text: "Weak dead-things swarm our clan gates! Orcs do not die sitting down! TO WAR!", portrait: "👹" },
                { speaker: "Private Lisa Park", text: "Hold the line with Groknak until our heavy artillery locks target!", portrait: "👩‍🚀" }
            ],
            dialogueAfter: [
                { speaker: "Warchief Groknak", text: "GRAAAH! Good fighting, human! You hit like an Orc warrior today!", portrait: "👹" }
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
            dialogueBefore: [
                { speaker: "Valley Net", text: "Dr. Hades is broadcasting jamming signals across all sub-light frequencies. I need you to manually re-align Relay 09.", portrait: "🤖" },
                { speaker: "Arty Fisher", text: "Watch out for flying skull swarms near the energy coils!", portrait: "👨‍🔧" }
            ],
            dialogueAfter: [
                { speaker: "Valley Net", text: "Uplink online! Planetary sensors are now tracking Hades' orbital movements.", portrait: "🤖" }
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
            dialogueBefore: [
                { speaker: "President Angel Good", text: "Hades corrupted our botanical incubation vats to generate toxic cloud weaponry. Neutralize the Chem-Golem!", portrait: "🌿" },
                { speaker: "Private Lisa Park", text: "Visor switched to hazmat mode. Moving in!", portrait: "👩‍🚀" }
            ],
            dialogueAfter: [
                { speaker: "President Angel Good", text: "The air in the sub-levels is clearing. The colony owes you a great debt.", portrait: "🌿" }
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
            dialogueBefore: [
                { speaker: "Guy Young", text: "My grandfather Clint was the first to die naturally on MoonRock... now his tomb is pulsing with dark array energy.", portrait: "👨‍🚀" },
                { speaker: "Private Lisa Park", text: "We will give him back his peace, Guy. I promise.", portrait: "👩‍🚀" }
            ],
            dialogueAfter: [
                { speaker: "Guy Young", text: "Thank you. He's at rest once more. Take his ancient service sidearm-it'll serve you well.", portrait: "👨‍🚀" }
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
            dialogueBefore: [
                { speaker: "Valley Net", text: "Targeting coordinates for LuckyStarShip's kinetic orbital strike require manual laser targeting from the peak.", portrait: "🤖" },
                { speaker: "Warchief Groknak", text: "Bring down the fire from the sky! Burn the horde to ashes!", portrait: "👹" }
            ],
            dialogueAfter: [
                { speaker: "Valley Net", text: "Kinetic strike confirmed! 80% of Hades' perimeter forces obliterated!", portrait: "🤖" }
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
            dialogueBefore: [
                { speaker: "Queen Aelindra", text: "This is it. The threshold of Hades' inner sanctum. All four races stand behind you!", portrait: "🧝‍♀️" },
                { speaker: "Forgemaster Borin", text: "Smashed through their gates! Leave none of these monsters standing!", portrait: "⛏️" }
            ],
            dialogueAfter: [
                { speaker: "Valley Net", text: "Perimeter breach successful. The doors to Lucifer Hades' chamber are unlocked.", portrait: "🤖" }
            ],
            objectives: [
                { id: "slay_boss", desc: "Destroy the Necro-Array Titan", count: 1, current: 0 },
                { id: "slay_all", desc: "Eliminate 40 elite citadel guardians", count: 40, current: 0 }
            ],
            rewardGold: 3000,
            rewardUusd: 5500,
            unlockedBy: 8
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
            dialogueBefore: [
                { speaker: "Dr. Lucifer Hades", text: "200 years of solitude showed me the ultimate truth: flesh is weak, but consciousness bound to undeath is ETERNAL!", portrait: "👑" },
                { speaker: "Private Lisa Park", text: "Your nightmare ends here, Lucifer. For MoonRock! For Earth! FOR THE LIVING!", portrait: "👩‍🚀" }
            ],
            dialogueAfter: [
                { speaker: "Valley Net", text: "Necromantic Array DEACTIVATED. Planetary signal terminated. MoonRock is SAVED!", portrait: "🤖" },
                { speaker: "President Angel Good", text: "You did it! The four races are free. Humanity and MoonRock have a real future together!", portrait: "🌿" }
            ],
            objectives: [
                { id: "slay_boss", desc: "Defeat Dr. Lucifer Hades & Deactivate the Necromantic Array", count: 1, current: 0 }
            ],
            rewardGold: 5000,
            rewardUusd: 10000,
            unlockedBy: 9
        }
    ];

    class StoryEngine {
        static SAVE_KEY = 'gravegain_shared_story_progress_v1';

        static getProgress() {
            try {
                const data = localStorage.getItem(StoryEngine.SAVE_KEY);
                if (data) return JSON.parse(data);
            } catch (e) {
                console.error("Failed to read story progress:", e);
            }
            return {
                completedMissions: [], // [1, 2, ...]
                stars: {}, // { 1: 3, 2: 2 }
                currentMissionId: null,
                totalStoryKills: 0
            };
        }

        static saveProgress(progress) {
            try {
                localStorage.setItem(StoryEngine.SAVE_KEY, JSON.stringify(progress));
            } catch (e) {
                console.error("Failed to save story progress:", e);
            }
        }

        static getMission(id) {
            return StoryMissions.find(m => m.id === id) || null;
        }

        static getAllMissions() {
            return StoryMissions;
        }

        static isUnlocked(missionId) {
            if (missionId === 1) return true;
            const progress = StoryEngine.getProgress();
            const mission = StoryEngine.getMission(missionId);
            if (!mission) return false;
            return progress.completedMissions.includes(mission.unlockedBy);
        }

        static completeMission(missionId, starsGained = 3) {
            const progress = StoryEngine.getProgress();
            if (!progress.completedMissions.includes(missionId)) {
                progress.completedMissions.push(missionId);
            }
            progress.stars[missionId] = Math.max(progress.stars[missionId] || 0, starsGained);
            StoryEngine.saveProgress(progress);
        }
    }

    const globalScope = typeof window !== 'undefined' ? window : global;
    globalScope.GraveGainStoryMissions = StoryMissions;
    globalScope.GraveGainStoryEngine = StoryEngine;
})();
