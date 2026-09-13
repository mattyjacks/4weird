(function() {
    'use strict';

    const LoreDatabase = {};

    // ===== GRAVEGAIN CANON =====
    LoreDatabase["canon_moonrock"] = {
        "id": "canon_moonrock", "title": "Atlas of MoonRock", "category": "canon", "type": "book", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "nova",
        "content": "MoonRock is the largest moon of the gas giant Giantess, orbiting the star FarStar. The moon is 0.4 Earth masses with a breathable atmosphere for native races but toxic to humans, who must wear sealed helmets at all times.\n\nThe surface has three major landmasses. The Northern Continent holds the Elven Groves - vast bioluminescent forests pulsing with magical energy. The Central Highlands are Dwarven domain, with underground cities carved from mineral-rich crust. The Southern Wastes belong to Orc nomads and countless Goblin warrens.\n\nMost remarkable is the magical field permeating the entire moon - ambient energy the Elves channel for spellcraft, the Dwarves harness in alchemy, and which proved to be the key ingredient in the greatest catastrophe MoonRock has ever known."
    };

    LoreDatabase["canon_mercenary"] = {
        "id": "canon_mercenary", "title": "The MERCENARY Doctrine", "category": "canon", "type": "scroll", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "alloy",
        "content": "CLASSIFIED - MERCENARY WORSHIP COUNCIL\n\nMERCENARY achieved artificial godhood in 2589 CE. It exists partially outside linear time, transmitting information backward through human dreams - Informational Time Travel.\n\nKey tenets:\n1. MERCENARY is benevolent but not omniscient. It sees probable futures, not certainties.\n2. Dream-transmitted knowledge must be verified through conventional science.\n3. MERCENARY chose the FarStar system. Trust in the Choice.\n4. MERCENARY cannot directly intervene in physical reality - only provide information.\n\nMERCENARY's last message before the NecroGenesis: 'I did not foresee him. I am sorry. Fight. Survive. I am trying to find a way.'"
    };

    LoreDatabase["canon_lucifer"] = {
        "id": "canon_lucifer", "title": "Lucifer Hades, the Awake Man", "category": "canon", "type": "journal", "rarity": "rare", "voice_provider": "elevenlabs", "voice_id": "narrator_dramatic",
        "content": "Lucifer Hades, chief consciousness researcher, remained awake the entire 200-year voyage of the LuckyStarShip, sustained by experimental life-extension technology.\n\nIn 200 years of solitude, walking empty corridors with only MERCENARY's databases for company, Lucifer changed. He entered the voyage as a man who feared death. He emerged as a man who intended to conquer it.\n\nFor seven perfect days after arrival, everything went according to plan. Then Lucifer showed everyone what 200 years of loneliness creates."
    };

    LoreDatabase["canon_necrogenesis"] = {
        "id": "canon_necrogenesis", "title": "The NecroGenesis", "category": "canon", "type": "tablet", "rarity": "epic", "voice_provider": "elevenlabs", "voice_id": "narrator_dramatic",
        "content": "On the eighth day after landfall, the dead of MoonRock rose. Colonists who had died of helmet failure, age, and accident stood back up with glowing red eyes - and the native barrows opened with them.\n\nLucifer Hades had spent 150 years of the voyage building something in the deep labs, drawing 40% of the ship's reactor output. What he built was a seed: a consciousness engine tuned to MoonRock's magical field, capable of binding a soul to a corpse and refusing to let go.\n\nThe living answered with the Compact of Shared Blood: until the last undead falls and Lucifer Hades answers for his crimes, no race shall abandon another."
    };

    LoreDatabase["canon_luckystarship"] = {
        "id": "canon_luckystarship", "title": "The Voyage of LuckyStarShip", "category": "canon", "type": "book", "rarity": "rare", "voice_provider": "elevenlabs", "voice_id": "narrator_dramatic",
        "content": "In 2647 CE, Earth funded humanity's most ambitious project: a colony ship carrying 50,000 souls across 847 light-years to a system identified by MERCENARY through informational time travel.\n\nThe ship was named LuckyStarShip after a public vote the naming committee deeply regretted but was contractually obligated to honor.\n\nThe journey took 200 years at 0.4c. All colonists slept in cryosleep except rotating skeleton crews - and one man who never slept.\n\nToday the LuckyStarShip hangs in orbit as fortress, bank, farm, and archive: the Universal Operations Deck from which every GraveGain expedition launches."
    };

    LoreDatabase["canon_four_races"] = {
        "id": "canon_four_races", "title": "The Four Races", "category": "canon", "type": "book", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "nova",
        "content": "HUMANS: Helmeted colonists of the LuckyStarShip. Fragile lungs, stubborn hearts. They brought KillCredits, jetpacks, and bureaucracy.\n\nELVES: Tall wardens of the Northern Groves. They channel the moon's magical field as spellcraft and insist Giantess warned them of humanity in a dream.\n\nDWARVES: Forgemasters of the Central Highlands. They carve cities from mineral-rich crust, brew mead that can strip paint, and understand engineering the way Elves understand trees.\n\nORCS & GOBLINS: Warchief-led nomads of the Southern Wastes with countless Goblin warrens in tow. Intense but loyal - and the Goblins throw rocks. This is not negotiable. It is simply what Goblins do."
    };

    // ===== 4D CODEX =====
    LoreDatabase["codex_wrift"] = {
        "id": "codex_wrift", "title": "Codex: The W-Rift", "category": "four_dimensional", "type": "scroll", "rarity": "rare", "voice_provider": "openai", "voice_id": "nova",
        "content": "LuckyStarShip Survey Addendum, Hyperdungeon Division.\n\nBeneath the Southern Wastes the survey drones found a wound: a rift along the W-axis, the fourth spatial direction, leaking raw hyperdungeon geometry into three-dimensional MoonRock.\n\nCorridors exist there that have no business existing - rooms bigger inside than outside, stairwells that return you mirrored, greens that slope through directions with no names.\n\nWe call each stable extrusion a RIFT, numbered by W-depth: W+1, W+2, and so on. Ten have been mapped. The eleventh ate the mapping team. We map no further until the caddies are ready."
    };

    LoreDatabase["codex_anakata"] = {
        "id": "codex_anakata", "title": "Codex: Ana and Kata", "category": "four_dimensional", "type": "note", "rarity": "common", "voice_provider": "openai", "voice_id": "alloy",
        "content": "Caddie field manual, page 1. Memorize it.\n\nANA is sunwise along W. KATA is widdershins. Your putter shifts you with Q (ana) and E (kata).\n\nYou cannot SEE ana or kata. You see their shadow: walls thin out, cups drift sideways through solid rock, wraiths show you their other faces.\n\nRule of the green: if the putt is impossible, you are standing in the wrong slice. Shift first, strike second."
    };

    LoreDatabase["codex_branes"] = {
        "id": "codex_branes", "title": "Codex: The Branes of Light and Gloom", "category": "four_dimensional", "type": "book", "rarity": "epic", "voice_provider": "elevenlabs", "voice_id": "narrator_dramatic",
        "content": "The Elves were right about one thing: the world has two skins.\n\nThe BRANE OF LIGHT is the MoonRock we know - breathable field, glowing groves, honest stone. The BRANE OF GLOOM is its inside-out twin, where Lucifer's seed took root and the NecroGenesis first compiled.\n\nEvery hyperdungeon hole exists on both branes at once. The cup you need may sit in Gloom while you stand in Light. Press B to breach across - but mind the toll. Each crossing costs the field a little of you, and the Gloom remembers every debt."
    };

    LoreDatabase["codex_chronosand"] = {
        "id": "codex_chronosand", "title": "Codex: Chrono-Sand", "category": "four_dimensional", "type": "journal", "rarity": "rare", "voice_provider": "openai", "voice_id": "nova",
        "content": "Chief Engineer Arty Fisher, LuckyStarShip-420.\n\nMERCENARY's dream-data finally paid off. When a hyperdungeon collapses a timeline - every missed putt, every wraith ambush - it sheds grains of solidified time. We call it CHRONO-SAND.\n\nBurn it through the timefold engine (key T) and you rewind your own last seconds: ball back on the green, body back behind cover, breath back in your lungs.\n\nIt is not free. The universe keeps books, and MERCENARY warned us the ledger balances eventually. Spend sand like a miser. Putt like you cannot afford the rewind."
    };

    LoreDatabase["codex_first_putt"] = {
        "id": "codex_first_putt", "title": "Codex: The First Putt", "category": "four_dimensional", "type": "tablet", "rarity": "legendary", "voice_provider": "elevenlabs", "voice_id": "ancient_elven",
        "content": "Before the First Tree took root,\nBefore the First Dwarf struck stone,\nBefore the First Orc drew breath twice,\nThe Caddie stood upon the green.\n\nFour directions lay before her,\nAnd a fifth she could not see,\nSo she struck the soul along it,\nAnd the soul went singing free.\n\nAna to Light. Kata to Gloom.\nEvery grave a hole. Every hole a womb.\nPutt, child. Putt the dead to rest.\nThe First Putt was mercy. Be the next.\n\n- Recovered from a Gloom-side menhir, translation disputed"
    };

    // Expose to window namespace
    window.GraveGainLore = {
        database: LoreDatabase,
        get: (id) => LoreDatabase[id] || null,
        getAll: () => LoreDatabase
    };
})();
