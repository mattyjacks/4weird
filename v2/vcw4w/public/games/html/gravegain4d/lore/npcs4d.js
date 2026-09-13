(function () {
    'use strict';

    // GraveGain4D — living NPCs. Voiced bark lines reacting to mission
    // progress and W-slice position. Read-only companion to lore.js;
    // this file never mutates LoreDatabase.
    //
    // Bark trigger vocabulary (matched by the game, not by this file):
    //   "m01_intro" ... "m10_complete" — mission progress markers
    //   "slice_light" | "slice_gloom"   — current brane
    //   "w_ana" | "w_kata"              — last Q/E shift direction
    //   "w_deep"                        — W+4 or deeper
    //   "rewind" | "regrow"             — chrono-sand / regrow events
    //   "idle"                          — fallback campfire lines

    const NPCs = [
        // ===== HUMANS =====
        {
            id: 'npc_sgt_martinez',
            name: 'Sgt. Martinez',
            race: 'human',
            role: 'Expedition sergeant, LuckyStarShip security detail',
            voice_provider: 'openai',
            voice_id: 'onyx',
            epitaph: 'Keeps a paper roster of all fifty thousand names. Crosses out the risen ones in red.',
            barks: [
                { trigger: 'm01_intro', line: 'Helmets sealed, safeties off. The naming committee called this ship LuckyStarShip, so luck is regulation gear now.' },
                { trigger: 'm04_complete', line: 'Fourth rift mapped and we are still breathing. Somebody tell the committee we earned a better name.' },
                { trigger: 'slice_gloom', line: 'Eyes on the dark, caddies. This brane is where the eighth day never ended.' },
                { trigger: 'w_deep', line: 'W-plus-four and my compass is praying. Stay ana of the walls that breathe.' },
                { trigger: 'idle', line: 'You miss a putt, you fetch your own ball. You miss a wraith, I fetch you.' }
            ]
        },
        {
            id: 'npc_lisa_park',
            name: 'Pvt. Lisa Park',
            race: 'human',
            role: 'Rifleman, author of the letter that will never be sent',
            voice_provider: 'openai',
            voice_id: 'nova',
            epitaph: 'Wrote home to a mother dead two hundred years. Still writes. Somebody has to remember.',
            barks: [
                { trigger: 'm02_complete', line: 'Two rifts down. Mom, if you can hear this — I stood next to an Orc today and felt safer than in boot camp.' },
                { trigger: 'm07_complete', line: 'A Dwarf paladin once stood over my body till the medic came. I fight every hole like I owe him one. Because I do.' },
                { trigger: 'slice_light', line: 'Light brane, clean air in the helmet. Almost pretty enough to forget the red eyes.' },
                { trigger: 'rewind', line: 'Sand burned, seconds back. MERCENARY says these futures are probable, not promised. I will take probable.' },
                { trigger: 'idle', line: 'Jetpack on, helmet on, worries off. That is the whole orientation pamphlet, really.' }
            ]
        },
        // ===== ELVES =====
        {
            id: 'npc_ambassador_vaelith',
            name: 'Ambassador Vaelith',
            race: 'elf',
            role: 'Elven ambassador of the Northern Groves, first to greet the LuckyStarShip',
            voice_provider: 'elevenlabs',
            voice_id: 'ancient_elven',
            epitaph: 'Pointed at Giantess and said "She told us in a dream." Has not been wrong since.',
            barks: [
                { trigger: 'm01_intro', line: 'Giantess dreamed your coming, little helmeted ones. She did not dream your courage — that, you brought yourselves.' },
                { trigger: 'm05_complete', line: 'Five rifts sealed in Light. The Groves pulse brighter tonight. Even the First Tree approves, and it approves of nothing.' },
                { trigger: 'slice_gloom', line: 'Tread softly. The Gloom is the world\'s inside-out skin, and it remembers every debt. So do I.' },
                { trigger: 'w_kata', line: 'Kata — widdershins along W. You walk where roots dream. Mind the mirrored stairwells.' },
                { trigger: 'idle', line: 'Before the First Dwarf struck stone, the Caddie stood upon the green. Putt, child. Be the next mercy.' }
            ]
        },
        {
            id: 'npc_warden_thalanil',
            name: 'Warden Thalanil',
            race: 'elf',
            role: 'Grove warden, hyperdungeon guide',
            voice_provider: 'openai',
            voice_id: 'fable',
            epitaph: 'Can read wall-thinning like weather. Lost a brother to the eleventh rift. Maps no further without caddies.',
            barks: [
                { trigger: 'm03_complete', line: 'Three rifts, and the walls still thin for you. The field likes your swing, caddie. Do not waste its affection.' },
                { trigger: 'w_ana', line: 'Ana — sunwise. Feel how the cup drifts sideways through stone? Shift first, strike second.' },
                { trigger: 'w_deep', line: 'Deeper than W-plus-three the groves cannot hear you. I can. Stay in my voice.' },
                { trigger: 'slice_light', line: 'In Light the stone is honest. Trust the slope you can see.' }
            ]
        },
        // ===== DWARVES =====
        {
            id: 'npc_paladin_dain',
            name: 'Paladin Dain Stonefist',
            race: 'dwarf',
            role: 'Dwarven paladin — the one who stood over Pvt. Park\'s body in the letter home',
            voice_provider: 'openai',
            voice_id: 'onyx',
            epitaph: 'Held a horde off a fallen rifleman with a cracked shield and a war-hymn. Never learned her name. Never needed to.',
            barks: [
                { trigger: 'm02_complete', line: 'Aye, Park! That was for the day I stood over ye. Next round of paint-stripping mead is on me — if we live.' },
                { trigger: 'm06_complete', line: 'Six rifts. My axe has tasted Gloom-stone and Light-stone both. Stone is stone. Evil is evil. Swing accordingly.' },
                { trigger: 'slice_gloom', line: 'Breach toll paid, shield up. The Gloom takes a little of ye each crossing — give it yer worst parts.' },
                { trigger: 'regrow', line: 'Ha! Timeline regrown and I remember dyin\'. MERCENARY calls it probable. My shield calls it Tuesday.' },
                { trigger: 'idle', line: 'Engineering is just stone that listens. Swing like ye mean the maintenance schedule.' }
            ]
        },
        {
            id: 'npc_hilda_caskmaker',
            name: 'Hilda Caskmaker',
            race: 'dwarf',
            role: 'Forge-engineer, chrono-sand engine tender under Chief Fisher',
            voice_provider: 'openai',
            voice_id: 'shimmer',
            epitaph: 'Keeps the timefold engine fed and the mead barrels fuller. In that order. Mostly.',
            barks: [
                { trigger: 'm04_complete', line: 'Engine\'s humming sweet as a tapped keg. Fisher taught me the sands; the Dwarves taught me the patience.' },
                { trigger: 'rewind', line: 'There goes the sand — grains of every missed putt ye ever made. Spend it like a miser, caddie!' },
                { trigger: 'w_ana', line: 'Putter shifts ana and the whole green sighs. Dwarven alchemy wishes it were this elegant.' },
                { trigger: 'idle', line: 'Forty percent of a reactor he drew for one hundred fifty years, and nobody asked questions. We ask questions now.' }
            ]
        },
        // ===== ORCS & GOBLINS =====
        {
            id: 'npc_grash_bloodtusk',
            name: 'Grash Bloodtusk',
            race: 'orc',
            role: 'Warchief liaison of the Southern Wastes nomads',
            voice_provider: 'elevenlabs',
            voice_id: 'warlord_orc',
            epitaph: 'Bit his own hand clean through to seal the Compact. Would do it again. Offers to demonstrate.',
            barks: [
                { trigger: 'm01_intro', line: 'LITTLE HELMETS! Big rifts! The Compact says no race abandons another — so GRASH abandons NOBODY. Swing hard!' },
                { trigger: 'm08_complete', line: 'Eight rifts! The Wastes sing your name, caddie. Even the barrows are nervous, and they are already dead.' },
                { trigger: 'slice_gloom', line: 'Gloom-side smells like old graves and older lies. Good. Grash likes knowing where the enemy sleeps.' },
                { trigger: 'w_deep', line: 'Deep W! The air gets opinionated down here. Breathe through the rage. Putt through the wall.' },
                { trigger: 'idle', line: 'Goblins throw rocks. This is not tactics. This is simply what Goblins do. Respect it.' }
            ]
        },
        {
            id: 'npc_nib_pebblethrower',
            name: 'Nib Pebblethrower',
            race: 'goblin',
            role: 'Pebble-thrower first class, Compact celebration veteran',
            voice_provider: 'openai',
            voice_id: 'pixie',
            epitaph: 'One of the seventeen Goblins behind the rock at the Compact. Threw the celebratory pebble. Has never stopped.',
            barks: [
                { trigger: 'm01_intro', line: 'Nib throw pebble! Pebble go ana! Pebble come back kata! Pebble is FOUR-DIMENSIONAL now!' },
                { trigger: 'm10_complete', line: 'Ten rifts! Nib threw celebratory pebble for every one! Nib\'s arm is legend! Nib\'s shoulder is filing complaint!' },
                { trigger: 'slice_light', line: 'Light brane pretty! Pebble shines! Nib almost not throw it! ...Nib throw it.' },
                { trigger: 'regrow', line: 'Timeline regrow! Nib get pebble BACK! Best magic! Better than elf sparkle!' },
                { trigger: 'idle', line: 'Naming committee name ship LuckyStarShip. Nib name pebble Greg. Greg is better name. Greg never miss.' }
            ]
        }
    ];

    function getById(id) {
        return NPCs.find((n) => n.id === id) || null;
    }

    function barksFor(npcId, trigger) {
        const npc = getById(npcId);
        if (!npc) return [];
        if (!trigger) return npc.barks.slice();
        const exact = npc.barks.filter((b) => b.trigger === trigger);
        if (exact.length) return exact;
        return npc.barks.filter((b) => b.trigger === 'idle');
    }

    window.GG4D_NPCs = {
        list: NPCs,
        getById: getById,
        barksFor: barksFor
    };
})();
