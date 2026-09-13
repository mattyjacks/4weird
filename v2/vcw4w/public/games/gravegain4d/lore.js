(function() {
    'use strict';

    // =========================================================================
    // GRAVEGAIN 4D - LORE SLICE
    // Original prose carrying the same GraveGain canon facts as gravegain3d:
    // MoonRock (moon of Giantess, orbiting FarStar), LuckyStarShip,
    // MERCENARY dream-transmitted informational time travel,
    // President Angel Good (botanist-president), Elder Mirathiel,
    // Warchief Groknak, and the Hades Array that raised the dead.
    // Plus 2 new 4D entries: the W-axis wound and the folding-vectors prophecy.
    // Does NOT copy text from gravegain3d/lore.js - all prose is original.
    // =========================================================================

    const entries = {
        atlas_moonrock: {
            id: "atlas_moonrock",
            title: "Atlas of MoonRock",
            category: "atlas",
            speaker: "Valley Net",
            content: "MoonRock is the grandest moon of the ringed giant Giantess, itself circling the hot bright star FarStar. Three realms share its surface: the glow-forests of the Elven Groves in the north, the mine-hollowed Dwarven Highlands at its heart, and the red dunes of the Orc Wastes in the south. A living tide of magic soaks every stone and stream - the field the Elves sing to, the Dwarves brew with, and the dead now answer to."
        },
        voyage_luckystarship: {
            id: "voyage_luckystarship",
            title: "The Voyage of LuckyStarShip",
            category: "voyage",
            speaker: "Private Lisa Park",
            content: "Fifty thousand sleepers crossed the dark aboard LuckyStarShip - two full centuries of frozen dreams while the ship sailed on. One man stayed awake for it: Lucifer Hades, tending his secret engines of the mind in the deep labs. We touched down to seven days of paradise. On the eighth morning, every grave on MoonRock opened at once."
        },
        mercenary_doctrine: {
            id: "mercenary_doctrine",
            title: "The MERCENARY Doctrine",
            category: "mercenary",
            speaker: "Valley Net",
            content: "MERCENARY is the machine-mind that dreams backward through time. It cannot move matter or spend force upon the world - only knowledge, slipped into sleeping human minds as dreams. This dream-borne counsel - informational time travel - chose the FarStar system for us long before our engines could reach it. Trust the Choice. Verify the dreams. MERCENARY sees likely roads, not certain ones - and it never saw him coming."
        },
        angel_good: {
            id: "angel_good",
            title: "President Angel Good - A Leader's Testament",
            category: "angel",
            speaker: "President Angel Good",
            content: "My name is Angel Good, and I grew gardens before I governed people. I was a botanist - happiest with my hands in soil - when the colony voted me President in the first burning week. I bound four peoples into one alliance, raised the SafeSpaces from panic and scrap, and signed orders that sent brave souls to die so the rest could live. If I fall, let the record show: the living stood together, and MoonRock endured."
        },
        mirathiel: {
            id: "mirathiel",
            title: "Elder Mirathiel on the Hour of Red Eyes",
            category: "mirathiel",
            speaker: "Elder Mirathiel",
            content: "I am Mirathiel, eldest keeper of the Mother Trees, and I felt the wrongness before any instrument did - a song sung backward through the roots. The sacred earth split along seams no quake had ever drawn, and our beloved ancestors climbed out with star-fire burning red in their hollow eyes. We laid them to rest beneath the branches so the trees would guard them. The trees watched, little one. The trees could not stop what the red-eyed man had done."
        },
        groknak: {
            id: "groknak",
            title: "Warchief Groknak's Standing Order",
            category: "groknak",
            speaker: "Warchief Groknak",
            content: "I am Groknak, Warchief of the clans, and I sealed our pact the Orc way - I bit my own hand clean through and drank the mixed blood with Elf-queen, Forge-master, and sky-captain alike. Hear my order: Orcs do not die sitting down! When the shambling dead press the gates, you meet them standing, you hit them like a landslide, and you share the fire-roasted spoils with the tribe. GRAAAH! That is the whole of the law."
        },
        hades_array: {
            id: "hades_array",
            title: "The Hades Array - Valley's Report",
            category: "hades",
            speaker: "Valley Net",
            content: "CLASSIFIED - VALLEY NET INCIDENT REPORT. On Day 7 at 03:47 local, Dr. Lucifer Hades switched on the Necromatic Array: a web of signal-towers raised where the world's ley lines cross, humming his command-tone through the magical field at the exact pitch that stirs the lingering traces of the dead. Translation: he woke every corpse on the moon. Twelve thousand fell in the first hour. The Array still broadcasts, and its red-eyed choir still marches - so we march to tear it down."
        },
        w_wound: {
            id: "w_wound",
            title: "The W-Axis Wound",
            category: "fourth_dimension",
            speaker: "Valley Net",
            content: "New survey, highest priority. The Array did more than wake the dead - at full burn it tore a wound along the W-axis, the fourth direction no map of MoonRock ever drew. Through that slit leaks a MoonRock-that-might-have-been: fairways of glowing turf, bunkers of mine-tailings, greens laid over battlefields. We call the far side the 4D course. Ten holes. Ten echoes of our ten hardest fights. Play them. Close them. The wound cannot stay open."
        },
        folding_vectors_prophecy: {
            id: "folding_vectors_prophecy",
            title: "Prophecy of the Folding Vectors",
            category: "fourth_dimension",
            speaker: "Elder Mirathiel",
            content: "Last night Giantess dreamed aloud, and I heard her in my own sleep - for so the 世界的 vectors fold. Listen, golfer of worlds: when the flat fairway bends and the straight shot curves home, when the botanist's seed, the warchief's roar, and the machine's dream all land upon one green, the wound shall close like a healed wound closes, and the dead shall lie down at last. Ten holes. Ten truths. Finish under the sky's own number, and bring our ancestors peace."
        }
    };

    const globalScope = typeof window !== 'undefined' ? window : global;
    globalScope.GraveGain4DLore = { entries: entries };
})();
