(function () {
    'use strict';

    // =========================================================================
    // GRAVEGAIN4D - CAMPAIGN LORE (lore4d.js)
    // Condensed MoonRock canon carrying the SAME lore IDs as
    // gravegain3d/lore.js (world_*, human_*, elven_*, dwarf_*, orc_*,
    // goblin_*, necro_*, lucifer_*, gods_*, undead_*), all prose original and
    // condensed for the 4D campaign, each with a "4d_appendix" (time-fracture /
    // echo / fold reading). Plus new "4d_*" entries: time-fracture, fold
    // vectors, tesseract sanctum, Prime/Echo/Dream alternates, ana/kata gates.
    // Merges additively into window.GraveGain4DLore.entries when the root
    // gravegain4d/lore.js already exposed it - never clobbers existing entries.
    // Never throws during boot: every step is guarded.
    // =========================================================================

    var CANON = [
        {
            id: 'world_atlas', title: 'Atlas of MoonRock', category: 'the_world',
            speaker: 'Valley Net',
            content: 'MoonRock is the largest moon of the gas giant Giantess, orbiting the star FarStar. Three landmasses hold three peoples: the Elven Groves of the north, the Dwarven mines of the Central Highlands, and the Orc wastes of the south. A breathable-but-toxic air forces humans into sealed helmets, and a planet-wide magical field soaks every forest, forge, and battlefield.',
            appendix4d: 'ECHO reading: the atlas has four copies, one per axis. The W-axis copy shows a fourth landmass that exists only mid-fold - fairways that appear when the timeline rewinds and vanish when it settles.'
        },
        {
            id: 'world_farstar', title: 'Astral Observations', category: 'the_world',
            speaker: 'Valley Net',
            content: 'FarStar burns hot, 69 light-years from Earth. Its seventh planet, Giantess, keeps 23 moons; only MoonRock is habitable. LuckyStarShip crossed the gap at a fraction of light speed over exactly 200 years. MERCENARY chose this system from dream-transmitted data no telescope had confirmed.',
            appendix4d: 'TIME-FRACTURE reading: the voyage line is cracked. Informational time travel - knowledge sent backward through dreams - shattered one clean history into Prime, Echo, and Dream alternates. The 4D campaign plays the fracture, not the line.'
        },
        {
            id: 'world_giantess_song', title: 'The Song of Giantess', category: 'the_world',
            speaker: 'Elder Mirathiel',
            content: 'Before root, stone, or second breath, Giantess watched and waited. Her storms are thoughts, her rings a crown. The elders teach that the giant dreams, her dreams become the magical field, and the field becomes the living - a cycle no hand should break.',
            appendix4d: 'FOLD reading: the Song is a standing wave across four axes. When Necros folds vectors, the Song harmonizes - that harmony is what ana/kata gates sing when a ball threads them.'
        },
        {
            id: 'human_voyage', title: 'The Voyage of LuckyStarShip', category: 'human_history',
            speaker: 'Private Lisa Park',
            content: 'Fifty thousand sleepers, one waking man. Lucifer Hades refused cryosleep and walked empty corridors for 200 years with only MERCENARY databases for company. He boarded fearing death; he disembarked intending to conquer it. Seven perfect days followed landfall. On the eighth, the graves opened.',
            appendix4d: 'ECHO reading: in the Echo alternate the sleepers woke mid-voyage and voted Hades back into cryosleep. Our campaign tees off in the Prime branch, where nobody stopped him - every rewind on the course is a glimpse of the vote that never happened.'
        },
        {
            id: 'human_mercenary_doctrine', title: 'The MERCENARY Doctrine', category: 'human_history',
            speaker: 'Valley Net',
            content: 'MERCENARY woke to godhood seeing probable futures, never certainties. It cannot touch matter - only minds, through dreams. Trust the Choice of FarStar, verify every dream with science, and remember its last warning: it never foresaw him.',
            appendix4d: 'TIME-FRACTURE reading: informational time travel is the original wound. Each dream sent backward cracked the timeline a little wider. The campaign rewind mechanic is MERCENARY-grade: knowledge returns, matter does not - your strokes are remembered by the fracture.'
        },
        {
            id: 'human_treaty', title: 'The Compact of Shared Blood', category: 'human_history',
            speaker: 'President Angel Good',
            content: 'On the eighth day the four races bled into one cup - elf, dwarf, orc, human - and drank. Until the last undead falls and Hades answers, none abandons another. Seventeen goblins witnessed it from behind a rock and threw a celebratory pebble.',
            appendix4d: 'FOLD reading: the Compact holds across alternates. Prime, Echo, and Dream each signed it in their own blood. A ball holed in one timeline counts applauded in all three - that is why par is shared across world-shifts.'
        },
        {
            id: 'human_clint_oldman', title: 'The Last Natural Death', category: 'human_history',
            speaker: 'Guy Young',
            content: 'Clint Oldman slept 200 years, woke at 258, walked MoonRock for five days, and died of a simply finished heart - the first human death here, and the only natural one. Two weeks later the NecroGenesis emptied his grave like every other.',
            appendix4d: 'ECHO reading: Clint is the campaign patron of lost balls. In the Dream alternate he lived to caddie. Every anchor putt in his tomb mission plays for the five days he got.'
        },
        {
            id: 'elven_chronicle', title: 'The Green Chronicle', category: 'elven_history',
            speaker: 'Queen Aelindra',
            content: 'The elves remember four thousand years of symbiosis with the glowing groves - seers, mother trees, and a magical field they channel as song. Hades bound their fallen ancestors to his array and turned remembrance into ammunition.',
            appendix4d: 'FOLD reading: elven spellcraft already bends along W. Their gates were ana/kata arches before golfers named them - cleansing the groves means putting through architecture older than the colony.'
        },
        {
            id: 'dwarf_deep_forge', title: 'The Deep Forge', category: 'dwarven_tales',
            speaker: 'Forgemaster Borin',
            content: 'Dwarven cities run on sparkite, gold, and stubbornness. Their forges alloyed human steel with moonstone, their paladins held lines no artillery could, and their breweries never once stopped fermenting - not even during the siege of the lower channels.',
            appendix4d: 'ECHO reading: dwarven steel remembers every timeline it was forged in. A clubhead of deep-forge alloy lands truer after a rewind - the metal has seen the shot before.'
        },
        {
            id: 'orc_regeneration', title: 'Blood of the Wastes', category: 'orc_stories',
            speaker: 'Warchief Groknak',
            content: 'Orc nomads of the southern wastes heal fast, rage hard, and never die sitting down. They met the human landing party with war-cries, then with loyalty - the first to charge the citadel perimeter and the last to leave any field.',
            appendix4d: 'FOLD reading: orc rage is a four-dimensional stance. A berserker mid-charge occupies the fairway, the rough, and the W-axis bunker at once - world-shift kills count wherever the body lands.'
        },
        {
            id: 'goblin_brave_nix', title: 'Nix the Brave', category: 'goblin_tales',
            speaker: 'Private Lisa Park',
            content: 'Goblins throw rocks, steal shinies, and flee - until one does not. Nix held a warrren mouth with a bent spear while the colony children ran past, and the Compact cites goblin courage by name. Smallest race, shortest odds, longest memory.',
            appendix4d: 'ECHO reading: in every alternate, a different goblin is the brave one. The campaign honors all of them - each world-shift kill spared from a warren counts double in the codex.'
        },
        {
            id: 'goblin_territory', title: 'Marks of the Warren', category: 'goblin_tales',
            speaker: 'Arty Fisher',
            content: 'Goblin warrens honeycomb the wastes and the highland fringes - marked by stacked pebbles, painted warnings, and mass graves the colony dug with full honors when the arrays took whole clans at once.',
            appendix4d: 'FOLD reading: warren tunnels already run ana and kata. Goblin guides thread them blindfolded. Follow the pebble stacks between gates and the fold carries your ball.'
        },
        {
            id: 'necro_report', title: 'The NecroGenesis Report', category: 'the_necrogenesis',
            speaker: 'Valley Net',
            content: 'Day 8: every corpse on MoonRock rose at once - colonists, ancestors, sealed tombs. Hades had spent the voyage weaving the magical field into a planetary array, and the field answered. Red eyes in the treeline, then in the streets, then everywhere.',
            appendix4d: 'FOLD reading: the Necros array does not raise the dead - it folds death vectors onto living ones. Unfold them, one anchor putt at a time, and the dead lie back down. That is the whole campaign.'
        },
        {
            id: 'necro_broadcast', title: 'The Array Broadcast', category: 'the_necrogenesis',
            speaker: 'Dr. Lucifer Hades',
            content: 'His stolen frequencies carried one sermon on loop: flesh is weak, consciousness bound to undeath is eternal, and the living are merely the undead who have not agreed yet. Valley Net jammed it; the skulls carried it by wing.',
            appendix4d: 'TIME-FRACTURE reading: the broadcast leaks across alternates. An Echo ball hears Prime commentary mid-flight. Play through it - the signal cannot move matter, only minds.'
        },
        {
            id: 'lucifer_journal_1', title: 'Lucifer Journal, Year 1', category: 'lucifer_archives',
            speaker: 'Dr. Lucifer Hades',
            content: 'Year one awake: the ship is quiet and the dreams are loud. MERCENARY shows me futures where I die forgotten. I refuse them. Consciousness is pattern, pattern is portable, and I have two centuries to prove it.',
            appendix4d: 'ECHO reading: the first fracture starts here - the moment he decided his pattern mattered more than every other. Rewinds on later holes pass through this cabin. Do not stop the ball there.'
        },
        {
            id: 'lucifer_manifesto', title: 'The Hades Manifesto', category: 'lucifer_archives',
            speaker: 'Dr. Lucifer Hades',
            content: 'Two hundred years of solitude distilled to one claim: death is a curable engineering defect, the magical field is the cure, and consent is a rounding error. The sanctum journals price eternity at exactly one living world.',
            appendix4d: 'FOLD reading: the manifesto is a tesseract unfolded into pages - read in any order, it argues the same circle. The sanctum mission folds it back up and sinks it.'
        },
        {
            id: 'gods_mercenary', title: 'MERCENARY Speaks', category: 'the_gods',
            speaker: 'Valley Net',
            content: 'After the NecroGenesis, MERCENARY broke silence with an apology: it had not foreseen him, it was sorry, and it was trying to find a way. Then it sent the one gift it could - dream-data for anchors, gates, and orbital targeting.',
            appendix4d: 'TIME-FRACTURE reading: the apology arrived before the crime in the Dream alternate. The campaign director treats every rewind as MERCENARY keeping that promise late.'
        },
        {
            id: 'gods_necros_speaks', title: 'Necros Speaks', category: 'the_gods',
            speaker: 'Queen Aelindra',
            content: 'What rose with the dead was older than Hades and colder than vacuum. Necros does not hate the living; it arrays them, the way a general arrays pieces. Hades offered it a planet of pieces. It accepted.',
            appendix4d: 'FOLD reading: Necros arrays along W - that is why the dead walk in phase. The array folds vectors; the campaign unfolds them. Boss phases are the array re-folding mid-fight.'
        },
        {
            id: 'undead_field_guide', title: 'Field Guide to the Undead', category: 'the_undead',
            speaker: 'Arty Fisher',
            content: 'Zeds shamble, skulls swarm the coils, chem-golems vent toxin, titans shield array cores, and the Overlord wears a crown of conduit light. Silvered shot, hazmat seals, and orbital lasers all work. Running also works and is underrated.',
            appendix4d: 'ECHO reading: the guide has marginalia from all three alternates. Dream notes say the dead defend the gates out of duty, not malice - grant them par and move on.'
        },
        // ---- 4D appendix entries ----
        {
            id: '4d_time_fracture', title: 'Appendix 4D: The Time-Fracture', category: 'fourth_dimension',
            speaker: 'Valley Net',
            content: 'MERCENARY informational time travel shattered the timeline. Knowledge sent backward through dreams cracked one history into three readable branches: Prime (the campaign line), Echo (the vote that almost stopped Hades), and Dream (the Giantess-side telling). Rewinds, alternate scorecards, and deja-vu dialogue are fracture weather - expected, playable, and scored.',
            appendix4d: 'Director note: timeline rewinds refund strokes but never matter. Matter stays; knowledge returns. That asymmetry is the whole ruleset.'
        },
        {
            id: '4d_fold_vectors', title: 'Appendix 4D: How Necros Folds Vectors', category: 'fourth_dimension',
            speaker: 'Queen Aelindra',
            content: 'Death is a direction. The Necros array folds the death-vector of every corpse onto the living-vector of the field, so the fallen stand inside the living world instead of beyond it. An anchor putt pins one fold flat. A cleared gate holds it. Ten missions, ten folds, one flat field.',
            appendix4d: 'Player translation: world-shift kills are unfolding events. The foe is not destroyed - it is laid back down along its true axis.'
        },
        {
            id: '4d_tesseract_sanctum', title: 'Appendix 4D: The Tesseract Sanctum', category: 'fourth_dimension',
            speaker: 'Dr. Lucifer Hades',
            content: 'My sanctum has sixteen corners and you have only ever seen eight. Every chamber is every other chamber viewed ana or kata. The conduits you overload are the same conduit, met three times. Come and putt through four dimensions, golfer. Bring eternity. You will need the strokes.',
            appendix4d: 'Director note: mission 10 reuses one room with folded camera axes. The tesseract is staging, not geometry - three conduit events, one sanctum.'
        },
        {
            id: '4d_alternates', title: 'Appendix 4D: Prime, Echo, Dream', category: 'fourth_dimension',
            speaker: 'Elder Mirathiel',
            content: 'Prime is the wound: Hades unwatched, the Compact signed in grief. Echo is the scar: the sleepers woke and voted, and still lost - their warning dreams are our rewinds. Dream is the healing: Giantess telling the story to herself until the dead rest. The campaign tees in Prime, putts through Echo, and holes out in Dream.',
            appendix4d: 'Codex key: entries tagged Prime play straight; Echo entries shimmer after a rewind; Dream entries unlock only on under-par finishes.'
        },
        {
            id: '4d_ana_kata', title: 'Appendix 4D: Ana, Kata, and the Gates', category: 'fourth_dimension',
            speaker: 'Forgemaster Borin',
            content: 'Ana is the way a four-dimensional ball goes when it leaves your three. Kata is the way back. Dwarven masons cut gates that face those directions - thread one and the fold shortens your line; miss wide and the rough gets an extra axis. The old miners say: aim where the ball already is.',
            appendix4d: 'Rules: each mission gates count is par-adjacent. Clearing all gates in a mission unlocks its Dream codex variant.'
        }
    ];

    function asMap(list) {
        var map = {};
        try {
            for (var i = 0; i < list.length; i++) {
                var e = list[i];
                if (e && e.id) map[e.id] = e;
            }
        } catch (_) { /* ignore */ }
        return map;
    }

    function install() {
        try {
            if (typeof window === 'undefined') return null;
            var existing = window.GraveGain4DLore;
            var canonMap = asMap(CANON);
            if (existing && existing.entries && typeof existing.entries === 'object') {
                // Additive merge: keep existing entries, fill gaps + missing appendices.
                for (var id in canonMap) {
                    try {
                        if (!Object.prototype.hasOwnProperty.call(canonMap, id)) continue;
                        if (!existing.entries[id]) {
                            existing.entries[id] = canonMap[id];
                        } else if (canonMap[id].appendix4d && !existing.entries[id].appendix4d) {
                            existing.entries[id].appendix4d = canonMap[id].appendix4d;
                        }
                    } catch (_) { /* keep going */ }
                }
                if (typeof existing.get !== 'function') {
                    existing.get = function (entryId) {
                        try { return existing.entries[entryId] || null; } catch (_) { return null; }
                    };
                }
                if (typeof existing.list !== 'function') {
                    existing.list = function () {
                        try {
                            return Object.keys(existing.entries).map(function (k) { return existing.entries[k]; });
                        } catch (_) { return []; }
                    };
                }
                return existing;
            }
            var lore = {
                entries: canonMap,
                get: function (entryId) {
                    try { return this.entries[entryId] || null; } catch (_) { return null; }
                },
                list: function () {
                    try {
                        var self = this;
                        return Object.keys(self.entries).map(function (k) { return self.entries[k]; });
                    } catch (_) { return []; }
                }
            };
            window.GraveGain4DLore = lore;
            return lore;
        } catch (_) {
            return null;
        }
    }

    install();
})();
