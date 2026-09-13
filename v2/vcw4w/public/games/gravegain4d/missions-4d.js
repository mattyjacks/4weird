(function() {
    'use strict';

    // =========================================================================
    // GRAVEGAIN 4D - 10-HOLE MISSION CANON
    // Ten golf holes mirroring the ten shared story missions
    // (see gravegain_shared_missions.js - referenced by name only, never copied):
    // same 10 mission titles, same speakers, same bosses (as course hazards),
    // same locations/themes, same reward numbers - reskinned as golf objectives
    // (finish each hole at or under par, plus an optional foe-clear bonus).
    // All dialogue lines are original golf-flavored prose.
    // =========================================================================

    const Missions = [
        {
            hole: 1,
            missionId: 1,
            title: "Mission 1: LZ Crash Site Defense",
            subtitle: "Opening Drive on the Crash Green",
            location: "Colony LZ Sector Alpha",
            dungeonTheme: "metallic_ship",
            bossType: "Goblin Zed Leader",
            dialogueBefore: [
                { speaker: "Valley Net", text: "Tee up, golfer! The fairway is littered with wreckage and the rough is crawling!", portrait: "👱🏻‍♀️" },
                { speaker: "Private Lisa Park", text: "Helmet sealed, driver ready. I'll play through the skeletons!", portrait: "👩‍🚀" }
            ],
            dialogueAfter: [
                { speaker: "Valley Net", text: "Hole one carded! The green is ours - beautiful opening drive, soldier.", portrait: "👱🏻‍♀️" }
            ],
            objectives: [
                { id: "finish_hole", desc: "Finish hole 1 at or under par", count: 1, current: 0 },
                { id: "foe_clear", desc: "Clear 15 undead hazards on the fairway", count: 15, current: 0 }
            ],
            par: 4,
            rewardGold: 200,
            rewardUusd: 500
        },
        {
            hole: 2,
            missionId: 2,
            title: "Mission 2: Cleansing the Elven Groves",
            subtitle: "Fairway of the Green Chronicle",
            location: "Bioluminescent Forest Vaults",
            dungeonTheme: "elven_grove",
            bossType: "Elven Necromancer",
            dialogueBefore: [
                { speaker: "Queen Aelindra", text: "Our sacred fairway festers, golfer. The fallen seers hold the back nine in undeath.", portrait: "🧝‍♀️" },
                { speaker: "Private Lisa Park", text: "I'll chip through the corruption and sink the cure, Your Majesty.", portrait: "👩‍🚀" }
            ],
            dialogueAfter: [
                { speaker: "Queen Aelindra", text: "The grove applauds your round. The turf glows clean where your ball has passed.", portrait: "🧝‍♀️" }
            ],
            objectives: [
                { id: "finish_hole", desc: "Finish hole 2 at or under par", count: 1, current: 0 },
                { id: "foe_clear", desc: "Sink the Corrupted Elven Necromancer hazard plus 20 grove corruptors", count: 21, current: 0 }
            ],
            par: 4,
            rewardGold: 350,
            rewardUusd: 800
        },
        {
            hole: 3,
            missionId: 3,
            title: "Mission 3: Deep In The Dwarven Vaults",
            subtitle: "Sparkite Bunker Play",
            location: "Central Highlands Deep Mines",
            dungeonTheme: "dwarven_vault",
            bossType: "Dwarven Zed High Thane",
            dialogueBefore: [
                { speaker: "Forgemaster Borin", text: "This hole is one great bunker, hero! My hammer lies buried in the deepest trap!", portrait: "⛏️" },
                { speaker: "Valley Net", text: "Reading rich sparkite sands in the bunkers. Play the blast shot carefully.", portrait: "👱🏻‍♀️" }
            ],
            dialogueAfter: [
                { speaker: "Forgemaster Borin", text: "Out of the sand in style! Drinks are on the house tonight!", portrait: "⛏️" }
            ],
            objectives: [
                { id: "finish_hole", desc: "Finish hole 3 at or under par", count: 1, current: 0 },
                { id: "foe_clear", desc: "Recover 5 Sparkite balls and blast the High Thane from the bunker", count: 6, current: 0 }
            ],
            par: 5,
            rewardGold: 500,
            rewardUusd: 1200
        },
        {
            hole: 4,
            missionId: 4,
            title: "Mission 4: Orc Nomad Outpost Siege",
            subtitle: "Rage on the Wasteland Links",
            location: "Crimson Sand Redoubts",
            dungeonTheme: "orc_wastes",
            bossType: "Huge Orc Zed Berserker",
            dialogueBefore: [
                { speaker: "Warchief Groknak", text: "Long hole! Dead-things crowd the fairway! Grip club! HIT HARD! TO WAR!", portrait: "👹" },
                { speaker: "Private Lisa Park", text: "Playing alongside Groknak - I will hold the fairway till the artillery putt drops!", portrait: "👩‍🚀" }
            ],
            dialogueAfter: [
                { speaker: "Warchief Groknak", text: "GRAAAH! You drive like an Orc warrior! This hole is OURS!", portrait: "👹" }
            ],
            objectives: [
                { id: "finish_hole", desc: "Finish hole 4 at or under par", count: 1, current: 0 },
                { id: "foe_clear", desc: "Drive through 30 Orc and Goblin Zed hazards, then the Berserker", count: 31, current: 0 }
            ],
            par: 5,
            rewardGold: 700,
            rewardUusd: 1600
        },
        {
            hole: 5,
            missionId: 5,
            title: "Mission 5: Signal in the Shallows",
            subtitle: "Uplink at the Water Hazard",
            location: "Sub-surface Comms Relay 09",
            dungeonTheme: "metallic_ship",
            bossType: "Corrupted Drone Array",
            dialogueBefore: [
                { speaker: "Valley Net", text: "My relay mast is the pin on this hole, golfer. Someone flooded the approach with jamming static!", portrait: "👱🏻‍♀️" },
                { speaker: "Arty Fisher", text: "Mind the water hazard - skull swarms nest round the pin!", portrait: "👨‍🔧" }
            ],
            dialogueAfter: [
                { speaker: "Valley Net", text: "Signal sunk! The pin is ours and the whole course is on the scoreboard!", portrait: "👱🏻‍♀️" }
            ],
            objectives: [
                { id: "finish_hole", desc: "Finish hole 5 at or under par", count: 1, current: 0 },
                { id: "foe_clear", desc: "Splash out 15 skull hazards and 25 relay-chamber foes", count: 40, current: 0 }
            ],
            par: 3,
            rewardGold: 900,
            rewardUusd: 2000
        },
        {
            hole: 6,
            missionId: 6,
            title: "Mission 6: The Alchemical Catacombs",
            subtitle: "President Good's Toxic Dogleg",
            location: "Botany Core Sub-levels",
            dungeonTheme: "toxic_catacombs",
            bossType: "Toxic Chem-Golem",
            dialogueBefore: [
                { speaker: "President Angel Good", text: "My old gardens curdle into a poisoned dogleg, golfer. Putt the Chem-Golem into the ground!", portrait: "🌿" },
                { speaker: "Private Lisa Park", text: "Hazmat visor down, putter up. Reading this green!", portrait: "👩‍🚀" }
            ],
            dialogueAfter: [
                { speaker: "President Angel Good", text: "The air smells sweet again. That putt saved the colony's lungs.", portrait: "🌿" }
            ],
            objectives: [
                { id: "finish_hole", desc: "Finish hole 6 at or under par", count: 1, current: 0 },
                { id: "foe_clear", desc: "Chip in past 8 elite hazards and hole out the Chem-Golem", count: 9, current: 0 }
            ],
            par: 4,
            rewardGold: 1200,
            rewardUusd: 2500
        },
        {
            hole: 7,
            missionId: 7,
            title: "Mission 7: The Tomb of Clint Oldman",
            subtitle: "A Memorial Par Three",
            location: "Colonial Crypt of Honor",
            dungeonTheme: "stone_crypt",
            bossType: "Reanimated Patriarch Clint",
            dialogueBefore: [
                { speaker: "Guy Young", text: "Grandfather Clint sleeps - slept - beneath this green. The Array has him pacing it like a lost caddie.", portrait: "👨‍🚀" },
                { speaker: "Private Lisa Park", text: "One gentle round, Guy. We'll lay him back to rest under par.", portrait: "👩‍🚀" }
            ],
            dialogueAfter: [
                { speaker: "Guy Young", text: "He's still now. Take his old brass tee - it always found the fairway.", portrait: "👨‍🚀" }
            ],
            objectives: [
                { id: "finish_hole", desc: "Finish hole 7 at or under par", count: 1, current: 0 },
                { id: "foe_clear", desc: "Play through 30 tomb guardians and lay the Patriarch to rest", count: 31, current: 0 }
            ],
            par: 3,
            rewardGold: 1600,
            rewardUusd: 3200
        },
        {
            hole: 8,
            missionId: 8,
            title: "Mission 8: Orbital Strike Calibration",
            subtitle: "Sky-Cannon at the Peak Tee",
            location: "Highland Peak Observatory",
            dungeonTheme: "dwarven_vault",
            bossType: "Bone Goliath Warlord",
            dialogueBefore: [
                { speaker: "Valley Net", text: "This elevated tee needs your laser rangefinder, golfer - paint the pin for the sky-cannon!", portrait: "👱🏻‍♀️" },
                { speaker: "Warchief Groknak", text: "Call the sky-fire down the fairway! Burn their scorecard to ash!", portrait: "👹" }
            ],
            dialogueAfter: [
                { speaker: "Valley Net", text: "Direct hit! The sky-cannon eagle has wiped their front nine off the board!", portrait: "👱🏻‍♀️" }
            ],
            objectives: [
                { id: "finish_hole", desc: "Finish hole 8 at or under par", count: 1, current: 0 },
                { id: "foe_clear", desc: "Outdrive 35 horde hazards and topple the Bone Goliath", count: 36, current: 0 }
            ],
            par: 5,
            rewardGold: 2200,
            rewardUusd: 4000
        },
        {
            hole: 9,
            missionId: 9,
            title: "Mission 9: Gate of the NecroGenesis",
            subtitle: "The Citadel's Narrow Fairway",
            location: "The Citadel Perimeter",
            dungeonTheme: "citadel_darkness",
            bossType: "Necro-Array Titan",
            dialogueBefore: [
                { speaker: "Queen Aelindra", text: "Beyond this narrow fairway waits his inner green. All four peoples walk the ropes with you!", portrait: "🧝‍♀️" },
                { speaker: "Forgemaster Borin", text: "Straight down the middle! Smash every trap between you and that pin!", portrait: "⛏️" }
            ],
            dialogueAfter: [
                { speaker: "Valley Net", text: "Fairway breached! The final tee stands open before you!", portrait: "👱🏻‍♀️" }
            ],
            objectives: [
                { id: "finish_hole", desc: "Finish hole 9 at or under par", count: 1, current: 0 },
                { id: "foe_clear", desc: "Thread 40 citadel guardians and fell the Necro-Array Titan", count: 41, current: 0 }
            ],
            par: 5,
            rewardGold: 3000,
            rewardUusd: 5500
        },
        {
            hole: 10,
            missionId: 10,
            title: "Mission 10: Lucifer's Shadow",
            subtitle: "The Championship Putt",
            location: "Lucifer Hades' Sanctum Core",
            dungeonTheme: "citadel_darkness",
            bossType: "Dr. Lucifer Hades (Consciousness Overlord)",
            dialogueBefore: [
                { speaker: "Dr. Lucifer Hades", text: "Two centuries alone taught me the perfect swing, golfer: flesh slices, but undeath putts ETERNAL!", portrait: "👑" },
                { speaker: "Private Lisa Park", text: "Your round ends here, Lucifer. This putt is for MoonRock - FOR THE LIVING!", portrait: "👩‍🚀" }
            ],
            dialogueAfter: [
                { speaker: "Valley Net", text: "IT DROPS! The Array is silent! MoonRock takes the championship!", portrait: "👱🏻‍♀️" },
                { speaker: "President Angel Good", text: "Champion of four peoples! Our future is par - no, under par - at last!", portrait: "🌿" }
            ],
            objectives: [
                { id: "finish_hole", desc: "Finish hole 10 at or under par", count: 1, current: 0 },
                { id: "foe_clear", desc: "Sink the final putt past Dr. Lucifer Hades and silence the Array", count: 1, current: 0 }
            ],
            par: 4,
            rewardGold: 5000,
            rewardUusd: 10000
        }
    ];

    const globalScope = typeof window !== 'undefined' ? window : global;
    globalScope.GraveGain4DMissions = Missions;
})();
