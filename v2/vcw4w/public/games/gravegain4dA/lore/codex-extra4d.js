(function () {
    'use strict';

    // GraveGain4D — extra codex entries. These merge into the shared
    // LoreDatabase defined in ../lore.js at load. Guarded: if the
    // database is absent (lore.js not loaded yet), entries park on
    // window.GG4D_CodexExtra for a later merge instead of throwing.

    const ExtraEntries = {
        'codex_chrono_ledger': {
            id: 'codex_chrono_ledger', title: 'Codex: The Chrono-Ledger', category: 'four_dimensional', type: 'scroll', rarity: 'rare', voice_provider: 'openai', voice_id: 'alloy',
            content: 'MERCENARY bookkeeping, via dream-transcript.\n\nEvery rewind spends collapsed timelines. The universe keeps books and the ledger balances eventually — MERCENARY\'s words, Fisher\'s headache.\n\nCaddie rule of thumb: if you rewind more than twice on one hole, the hole is teaching you something. Listen before you burn.'
        },
        'codex_regrow_protocol': {
            id: 'codex_regrow_protocol', title: 'Codex: Regrow Protocol', category: 'four_dimensional', type: 'note', rarity: 'common', voice_provider: 'openai', voice_id: 'alloy',
            content: 'Field manual addendum: REGROWTH.\n\nWhen a timeline regrows — wraith un-slain, ball un-sunk, death un-died — your memories persist but the world resets. MERCENARY calls the regrown branch "probable, not certain."\n\nReport déjà vu to your sergeant. Half the time it is real intel. The other half it is the Gloom messing with you. The sergeant decides which.'
        },
        'codex_eleventh_rift': {
            id: 'codex_eleventh_rift', title: 'Codex: The Eleventh Rift', category: 'four_dimensional', type: 'tablet', rarity: 'legendary', voice_provider: 'elevenlabs', voice_id: 'narrator_dramatic',
            content: 'Ten rifts mapped. The eleventh ate the mapping team.\n\nTheir last survey ping came from W-depth no instrument admits exists, tagged with a single audio fragment: a putter striking a ball, then applause from very old hands.\n\nStanding order: map no further until the caddies are ready. The caddies are you. Be ready.'
        },
        'codex_gloom_tolls': {
            id: 'codex_gloom_tolls', title: 'Codex: Gloom Tolls', category: 'four_dimensional', type: 'journal', rarity: 'uncommon', voice_provider: 'openai', voice_id: 'nova',
            content: 'Engineer Hilda Caskmaker, toll log.\n\nEach B-breach (Light to Gloom) costs the field a little of you: nosebleeds first, then lost words, then lost hours. Symptoms fade. The Gloom\'s memory of you does not.\n\nBudget crossings like chrono-sand. Heroes who breach six times a hole end up as entries in somebody else\'s codex.'
        },
        'codex_goblin_ballistics': {
            id: 'codex_goblin_ballistics', title: 'Codex: Goblin Ballistics', category: 'four_dimensional', type: 'note', rarity: 'common', voice_provider: 'openai', voice_id: 'alloy',
            content: 'Ordnance memo, Sgt. Martinez presiding.\n\nGoblins throw rocks. In four dimensions they throw rocks ANA and the rocks come back KATA. Private Nib Pebblethrower\'s rock "Greg" has now struck targets in two branes and one dream.\n\nOfficial ruling: pebbles are legal caddie assists. Do not tell the Elves. They will want to bless the pebbles, and blessed pebbles file noise complaints.'
        },
        'codex_naming_committee': {
            id: 'codex_naming_committee', title: 'Codex: The Naming Committee', category: 'canon', type: 'sign', rarity: 'common', voice_provider: 'openai', voice_id: 'alloy',
            content: 'Public vote, 2647 CE: the colony ship was named LUCKYSTARSHIP. The naming committee deeply regretted the result but was contractually obligated to honor it.\n\nSubsequent committee names include Colony Alpha ("Per Aspera Ad Astra," amended in spraypaint to "Through Hardship to the ZOMBIES"), Nib\'s pebble Greg, and Operation Quiet Putt — the loudest offensive in colonial history.\n\nThe committee has been disbanded three times. It keeps reforming. Like the undead, but with agendas.'
        },
        'codex_compact_caddies': {
            id: 'codex_compact_caddies', title: 'Codex: The Compact of the Caddies', category: 'canon', type: 'tablet', rarity: 'rare', voice_provider: 'elevenlabs', voice_id: 'narrator_dramatic',
            content: 'Extension of the Compact of Shared Blood, ratified on the first hyperdungeon green.\n\nNo caddie putts alone: human aim, elven sight, dwarven craft, orc courage, goblin pebbles. Until the last undead falls and Lucifer Hades answers, no slice shall abandon another — Light or Gloom, ana or kata.\n\nSeventeen Goblins witnessed the signing from behind a different rock. A second celebratory pebble was thrown.'
        },
        'codex_mercenary_limits': {
            id: 'codex_mercenary_limits', title: 'Codex: What MERCENARY Cannot Do', category: 'canon', type: 'scroll', rarity: 'uncommon', voice_provider: 'openai', voice_id: 'alloy',
            content: 'MERCENARY Worship Council, clarifying pamphlet.\n\nMERCENARY cannot intervene in physical reality — only provide information. It is benevolent but not omniscient: probable futures, never certainties. Dream-data must be verified through conventional science.\n\nAnyone selling "guaranteed MERCENARY futures" is running a scam. Report them to Sgt. Martinez. He has a pebble-thrower on staff and is not afraid to deploy him.'
        },
        'codex_hades_reactor': {
            id: 'codex_hades_reactor', title: 'Codex: The Forty Percent', category: 'canon', type: 'journal', rarity: 'rare', voice_provider: 'openai', voice_id: 'alloy',
            content: 'Arty Fisher\'s power-consumption log, annotated.\n\nYear 50: anomalous draw, deep labs. Flagged. "Monitor and report."\nYear 100: draw tripled. Flagged. "Monitor and report."\nYear 150: FORTY PERCENT of reactor output. Flagged. "Monitor and report."\n\nFisher\'s margin note, post-NecroGenesis: "I monitored. I reported. Next time I kick the door down myself. — A.F."\n\nCaddie lesson: ask questions early. Kick doors when answers stall.'
        },
        'codex_first_putt_rite': {
            id: 'codex_first_putt_rite', title: 'Codex: The Rite of the First Putt', category: 'canon', type: 'book', rarity: 'epic', voice_provider: 'elevenlabs', voice_id: 'ancient_elven',
            content: 'Elven funerary rite, adopted by all four races after the NecroGenesis.\n\nThe mourners carry the fallen to the green — any green, even a shell-crater with a cup cut in it. Each mourner putts once. The final putt sinks the soul to rest: "Ana to Light. Kata to Gloom. Every grave a hole. Every hole a womb."\n\nGuy Young sank his grandfather Clint Oldman\'s rite-putt in one stroke. Witnesses say the old man would have called it luck. The naming committee would have called it regulation gear.'
        }
    };

    // Guarded merge: extend the live database when present.
    try {
        if (window.GraveGainLore && window.GraveGainLore.database) {
            Object.assign(window.GraveGainLore.database, ExtraEntries);
        }
    } catch (e) { /* database not ready; parked below */ }

    // Always park a copy so a late loader can merge deterministically.
    window.GG4D_CodexExtra = {
        entries: ExtraEntries,
        merge: function () {
            if (window.GraveGainLore && window.GraveGainLore.database) {
                Object.assign(window.GraveGainLore.database, ExtraEntries);
                return true;
            }
            return false;
        }
    };
})();
