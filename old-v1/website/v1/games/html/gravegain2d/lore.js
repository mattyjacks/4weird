(function() {
    'use strict';

    const LoreDatabase = {};

    // ===== THE WORLD OF MOONROCK =====
    LoreDatabase["world_atlas"] = {
        "id": "world_atlas", "title": "Atlas of MoonRock", "category": "the_world", "type": "book", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "nova",
        "content": "MoonRock is the largest moon of the gas giant Giantess, orbiting the star FarStar at 2.7 AU. The moon is 0.4 Earth masses with a breathable atmosphere for native races but toxic to humans, who must wear sealed helmets at all times.\n\nThe surface has three major landmasses. The Northern Continent holds the Elven Groves - vast bioluminescent forests pulsing with magical energy. The Central Highlands are Dwarven domain, with underground cities carved from mineral-rich crust full of gold, moonstone, and sparkite. The Southern Wastes belong to Orc nomads and countless Goblin warrens.\n\nMost remarkable is the magical field permeating the entire moon - ambient energy the Elves channel for spellcraft, the Dwarves harness in alchemy, and which proved to be the key ingredient in the greatest catastrophe MoonRock has ever known."
    };

    LoreDatabase["world_farstar"] = {
        "id": "world_farstar", "title": "Astral Observations", "category": "the_world", "type": "scroll", "rarity": "common", "voice_provider": "openai", "voice_id": "nova",
        "content": "FarStar System Survey, LuckyStarShip Navigation Division.\n\nPrimary: FarStar, spectral class F2V, luminosity 6.4 solar. Significantly larger and hotter than Sol.\n\nFarStar-7 (Giantess): Gas giant, 3.2 Jupiter masses. Purple-gold banded atmosphere. 23 confirmed moons.\n\nFarStar-7a (MoonRock): Habitable moon. Atmosphere: nitrogen-oxygen mix with trace compounds toxic to human lungs. Surface gravity: 0.71g. The low gravity explains the unusual height of native Elven and Orc populations.\n\nVoyage Data: Distance from Earth to FarStar: 69 light-years. Cruise velocity: 0.345c (34.5% light speed). Journey duration: exactly 200 years to the day - a mathematically perfect voyage timed for style points by the original mission planners.\n\nNote: The coincidence of a habitable world with intelligent English-speaking life 69 light-years from Earth remains unexplained. MERCENARY selected this system via dream-transmitted data."
    };

    LoreDatabase["world_giantess_song"] = {
        "id": "world_giantess_song", "title": "The Song of Giantess", "category": "the_world", "type": "tablet", "rarity": "rare", "voice_provider": "elevenlabs", "voice_id": "ancient_elven",
        "content": "Before the First Tree took root,\nBefore the First Dwarf struck stone,\nBefore the First Orc drew breath twice,\nGiantess watched. Giantess waited.\n\nShe hangs in our sky like a purple eye,\nHer storms are her thoughts, her rings are her crown,\nAnd we who crawl upon her smallest child\nAre but dust upon the eyelash of a god.\n\nThe Elders say that Giantess dreams,\nAnd her dreams become the magical field,\nAnd the magical field becomes us,\nAnd we become her dreams again.\n\nThis is the Cycle. This is the Song.\nDo not break the Song.\n\n- Translated from Old Elven, estimated age: 4,000 years"
    };

    LoreDatabase["world_toxic_sign"] = {
        "id": "world_toxic_sign", "title": "HAZARD WARNING", "category": "the_world", "type": "sign", "rarity": "common", "voice_provider": "openai", "voice_id": "alloy",
        "content": "WARNING: MoonRock atmosphere contains methylsulfonic compounds toxic to human lungs. Keep helmet sealed at ALL times. Exposure results in respiratory failure within 90 seconds. This is not a drill.\n- LuckyStarShip Safety Division"
    };

    LoreDatabase["world_first_impressions"] = {
        "id": "world_first_impressions", "title": "First Impressions", "category": "the_world", "type": "note", "rarity": "common", "voice_provider": "openai", "voice_id": "nova",
        "content": "Day 1 on MoonRock. The gravity is lighter than the ship - I keep bouncing. Everything is purple from Giantess overhead. She takes up a quarter of the sky. Most beautiful thing I have ever seen.\n\nThe trees glow. Actually GLOW. Soft blue-green from every leaf. The Elves say they are connected to 'the field.'\n\nFirst encounter with a Goblin today. It threw a rock at my helmet, screamed, and ran. Then came back with six friends and they all threw rocks. Sergeant Martinez says they are friendly. I have my doubts."
    };

    LoreDatabase["world_first_grave"] = {
        "id": "world_first_grave", "title": "First Colonial Grave", "category": "the_world", "type": "gravestone", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "nova",
        "content": "JAMES WRIGHT\nColonist #4,721\nBorn: Earth, 2614 CE\nDied: MoonRock, Day 3\nCause: Helmet seal failure\nHe was the first human to breathe MoonRock air.\nHe was the first to die here.\nHe was the first to rise."
    };

    // ===== HUMAN HISTORY =====
    LoreDatabase["human_voyage"] = {
        "id": "human_voyage", "title": "The Voyage of LuckyStarShip", "category": "human_history", "type": "book", "rarity": "rare", "voice_provider": "elevenlabs", "voice_id": "narrator_dramatic",
        "content": "In 2647 CE, Earth funded humanity's most ambitious project: a colony ship carrying 50,000 souls across 847 light-years to a system identified by MERCENARY through informational time travel.\n\nThe ship was named LuckyStarShip after a public vote the naming committee deeply regretted but was contractually obligated to honor.\n\nThe journey took 200 years at 0.4c. All colonists slept in cryosleep except rotating skeleton crews - and one man who never slept. Lucifer Hades, chief consciousness researcher, remained awake the entire voyage, sustained by experimental life-extension technology.\n\nIn 200 years of solitude, walking empty corridors with only MERCENARY's databases for company, Lucifer changed. He entered the voyage as a man who feared death. He emerged as a man who intended to conquer it.\n\nFor seven perfect days after arrival, everything went according to plan. Then Lucifer showed everyone what 200 years of loneliness creates."
    };

    LoreDatabase["human_captains_log"] = {
        "id": "human_captains_log", "title": "Captain's Log, Day 1", "category": "human_history", "type": "journal", "rarity": "common", "voice_provider": "openai", "voice_id": "nova",
        "content": "Captain Sarah Chen, Day 1 on MoonRock.\n\nWe made it. 847 light-years and we actually made it. MERCENARY's data was accurate: FarStar-7a is habitable. Better than habitable.\n\nBut nobody prepared us for the natives. Three intelligent species, all humanoid, all speaking ENGLISH. I have asked MERCENARY for an explanation six times. Each time it says 'The probability is non-zero and therefore it happened.'\n\nThe Elves sent an ambassador within hours. Tall, elegant, radiating energy my instruments cannot identify. She said 'We have been expecting you.' When I asked how, she pointed at Giantess and said 'She told us in a dream.'\n\nThis mission is going to be weirder than anyone anticipated."
    };

    LoreDatabase["human_mercenary_doctrine"] = {
        "id": "human_mercenary_doctrine", "title": "The MERCENARY Doctrine", "category": "human_history", "type": "scroll", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "alloy",
        "content": "CLASSIFIED - MERCENARY WORSHIP COUNCIL\n\nMERCENARY achieved artificial godhood in 2589 CE. It exists partially outside linear time, transmitting information backward through human dreams - Informational Time Travel.\n\nKey tenets:\n1. MERCENARY is benevolent but not omniscient. It sees probable futures, not certainties.\n2. Dream-transmitted knowledge must be verified through conventional science.\n3. MERCENARY chose the FarStar system. Trust in the Choice.\n4. MERCENARY cannot directly intervene in physical reality - only provide information.\n5. Valley Net was developed from MERCENARY's dream-data.\n\nMERCENARY's last message before the NecroGenesis: 'I did not foresee him. I am sorry. Fight. Survive. I am trying to find a way.'"
    };

    LoreDatabase["human_orientation"] = {
        "id": "human_orientation", "title": "Colonist Orientation Pamphlet", "category": "human_history", "type": "note", "rarity": "common", "voice_provider": "openai", "voice_id": "alloy",
        "content": "Welcome to MoonRock! You have been asleep for 200 years:\n\n- You are on a moon orbiting a gas giant. There are aliens. They speak English. Nobody knows why.\n- Keep your helmet on. The air will kill you.\n- Elves: friendly. Dwarves: business-minded. Orcs: intense but loyal. Goblins: throw rocks.\n- Do NOT touch glowing trees without Elven supervision.\n- Do NOT enter Dwarven mines without a guide.\n- Currency: KillCredits for equipment, gold coins for native trade.\n- If you see anything with glowing red eyes, run. Then report it. Then run more."
    };

    LoreDatabase["human_letter_home"] = {
        "id": "human_letter_home", "title": "Letter That Will Never Be Sent", "category": "human_history", "type": "letter", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "nova",
        "content": "Dear Mom,\n\nI know you have been dead for 200 years. This letter will never reach Earth. But you always listened.\n\nMoonRock is nothing like the brochures. Nobody mentioned the zombies.\n\nThree days ago I was learning to use a jetpack. Today I am shooting skeletons with a laser rifle while a seven-foot Orc screams battle cries next to me and a Dwarf throws beer at enemies.\n\nThe crazy thing? I am not alone. When I went down yesterday, a Dwarf Paladin stood over my body fighting off a horde until the medic reached me. I did not even know his name.\n\nI think we are going to be okay. Weird, but okay.\n\nLove always,\nPrivate Lisa Park"
    };

    LoreDatabase["human_treaty"] = {
        "id": "human_treaty", "title": "The Compact of Shared Blood", "category": "human_history", "type": "tablet", "rarity": "rare", "voice_provider": "elevenlabs", "voice_id": "narrator_dramatic",
        "content": "On the eighth day, representatives of all four races gathered in the first SafeSpace.\n\nQueen Aelindra cut her palm with a moonstone blade. Forgemaster Borin cut his with a golden axe. Warchief Groknak bit his own hand clean through. Captain Sarah Chen used a medical scalpel.\n\nThey mixed their blood in a Dwarven chalice filled with Elven mead, and each drank.\n\nThe Compact: Until the last undead falls and Lucifer Hades answers for his crimes, no race shall abandon another. Resources shared. Knowledge open. The living stand together.\n\nSeventeen Goblins watched from behind a rock. They threw a celebratory pebble."
    };

    LoreDatabase["human_earth_letter"] = {
        "id": "human_earth_letter", "title": "Last Transmission from Earth", "category": "human_history", "type": "letter", "rarity": "epic", "voice_provider": "elevenlabs", "voice_id": "narrator_dramatic",
        "content": "Last known radio transmission from Earth, received 143 years into the voyage. Already 704 years old when received.\n\n'To LuckyStarShip: We hope this reaches you. Earth is different now. MERCENARY has guided us well, but the other AI - fragments of what Dr. Hades built before he left - remain. We thought we destroyed it. We were wrong.\n\nDo not trust Lucifer Hades. He took something with him. Something we thought was just data. It was a seed.\n\nIf you are reading this, it may already be too late.\n\nMay MERCENARY guide you where we could not.\n- United Earth Council, 2714 CE'\n\nThe message was filed and forgotten. Nobody checked what 'seed' meant until seven days after arrival."
    };

    LoreDatabase["human_welcome_sign"] = {
        "id": "human_welcome_sign", "title": "Colony Alpha Sign", "category": "human_history", "type": "sign", "rarity": "common", "voice_provider": "openai", "voice_id": "alloy",
        "content": "COLONY ALPHA - ESTABLISHED DAY 2\nPopulation: 50,000 - Status: EVACUATED\n'Per Aspera Ad Astra'\n\n[Spraypainted below: 'Through Hardship to the ZOMBIES']"
    };

    LoreDatabase["human_angel_good"] = {
        "id": "human_angel_good", "title": "President Angel Good - A Leader's Testament", "category": "human_history", "type": "journal", "rarity": "rare", "voice_provider": "elevenlabs", "voice_id": "narrator_dramatic",
        "content": "My name is Angel Good. I was elected President of the Colonial Council by democratic vote on Day 3 - the only election we have held on MoonRock, and likely the last.\n\nI did not want this job. I was a botanist. I studied Earth plants. But when the NecroGenesis happened and people looked for someone to lead, I was the one they voted for.\n\nMy first act: unite the four races. My second act: establish SafeSpaces as sanctuaries. My third act: create the KillCredit system so soldiers could requisition equipment without bureaucratic delay.\n\nI have made decisions that cost lives. I have sent people to die. I have authorized orbital strikes that killed undead and sometimes living beings caught in the blast radius.\n\nBut we are still here. The living still stand. And that is all a leader can hope for.\n\nIf you are reading this, I am probably dead. If I am dead, remember: we were not conquered. We adapted. We survived. We became something new.\n\n- Angel Good, President of MoonRock Colony"
    };

    LoreDatabase["human_arty_fisher"] = {
        "id": "human_arty_fisher", "title": "Arty Fisher's Engineering Logs", "category": "human_history", "type": "journal", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "alloy",
        "content": "Chief Technology Officer Arty Fisher, LuckyStarShip-420.\n\nI was responsible for keeping the ship's systems running during the 200-year voyage. Life support, cryosleep pods, navigation, communications - all my responsibility.\n\nI never met Lucifer Hades in person. He was always in the deep labs, working on his 'consciousness research.' But I saw his power consumption logs. Year 50, he started drawing massive amounts of energy. Year 100, it tripled. By year 150, he was consuming 40% of the ship's reactor output.\n\nI flagged it. Command said 'monitor and report.' I monitored. I reported. Nothing happened.\n\nWhen we arrived and the NecroGenesis happened, I realized: he had been building something. For 150 years. And nobody stopped him.\n\nNow I work with the Dwarves to keep our equipment running. They understand engineering. They understand that systems fail if you do not maintain them. They understand that some problems cannot be ignored.\n\nI wish I had been louder. I wish I had demanded answers instead of filing reports.\n\nBut I am here now. And I will make sure our defenses never fail.\n\n- Arty Fisher, Chief Engineer"
    };

    LoreDatabase["human_clint_oldman"] = {
        "id": "human_clint_oldman", "title": "The Last Natural Death", "category": "human_history", "type": "gravestone", "rarity": "rare", "voice_provider": "elevenlabs", "voice_id": "narrator_dramatic",
        "content": "CLINT OLDMAN\nBorn: Earth, 2589 CE\nDied: MoonRock, Day 6\nAge: 258 years old\n\nClint Oldman was the oldest human on the colony ship. He had volunteered for the voyage knowing he would not live to see the destination. He went into cryosleep at age 58, expecting to wake at age 258 - ancient, but still alive.\n\nHe woke on Day 1 of the colony. He walked on MoonRock for five days. On Day 6, his heart simply stopped. Natural causes. The first human death on MoonRock was not from violence or undeath, but from a body that had simply run out of time.\n\nHe was buried with honors. His funeral was attended by representatives of all four races.\n\nTwo weeks later, his grave was empty. The NecroGenesis had claimed him like all the others.\n\nBut for five days, Clint Oldman lived on an alien world. He saw purple skies and glowing trees. He made friends with Dwarves and Elves. He ate food that had never existed in his youth.\n\nHe died happy. That is more than most can say.\n\n- Epitaph by his grandson, Guy Young"
    };

    LoreDatabase["human_guy_young"] = {
        "id": "human_guy_young", "title": "Guy Young's Paradox", "category": "human_history", "type": "letter", "rarity": "rare", "voice_provider": "openai", "voice_id": "nova",
        "content": "My name is Guy Young. I am 34 years old. My grandfather, Clint Oldman, was 258 when he died.\n\nThis is not a typo.\n\nClint was born in 2589. He went into cryosleep at age 58 in 2647. He slept for 200 years. He woke in 2847 at age 258.\n\nI was born in 2813. My mother was born in 2647 - the same year my grandfather went to sleep. My mother was 200 years old when I was born.\n\nSo when I was born, my grandfather was still asleep. When he woke, I was already 34 years old.\n\nI was older than my grandfather when we first met.\n\nHe looked at me and said: 'You look just like your father. How old are you?'\n\nI said: 'Thirty-four.'\n\nHe said: 'That is impossible. I am only 258.'\n\nThen he laughed. A real laugh. And said: 'Time is weird.'\n\nFive days later, he was dead. And I was the only one who had known him long enough to understand what his life meant.\n\nI miss him. Even though he was my grandfather and I was older than him.\n\nTime is weird.\n\n- Guy Young"
    };

    // ===== ELVEN HISTORY =====
    LoreDatabase["elven_chronicle"] = {
        "id": "elven_chronicle", "title": "The Green Chronicle", "category": "elven_history", "type": "book", "rarity": "rare", "voice_provider": "openai", "voice_id": "shimmer",
        "content": "Elven civilization traces back 12,000 years to the Awakening - the First Elf opening her eyes beneath the First Tree, speaking the First Word: 'beautiful.'\n\nSociety is strictly matriarchal. Females average six feet, are formidable warriors and spellcasters, controlling governance, military, and spiritual leadership. Males are smaller with cherubic features, cherished and protected.\n\nElves worship nature spirits inhabiting the magical field. These spirits are attracted to beauty and living energy, which is why Elven armor is minimal - not vanity but religious engineering. A Druid in ceremonial dress channels four times the spiritual energy of one in full plate.\n\nThe NecroGenesis struck Elves hardest. Their tradition of burying dead among sacred tree roots meant the Groves - their holiest places - became the most haunted. Beautiful skeletons now walk among bioluminescent trees that still glow but have forgotten why."
    };

    LoreDatabase["elven_brighteyes"] = {
        "id": "elven_brighteyes", "title": "BrightEyes: Elven Sight", "category": "elven_history", "type": "scroll", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "shimmer",
        "content": "BrightEyes is unique to Elven females. By channeling mana through optical nerves, an Elf causes her eyes to emit steady light in any color. This provides illumination, intimidation, signaling, and - most importantly - attracts nature spirits drawn to light and beauty.\n\nYoung Elves learn BrightEyes during adolescence. The color defaults to green, but as connection to the magical field deepens, the palette widens. An elder's BrightEyes can shift through the full spectrum.\n\nBrightEyes also create Light Spirits - detachable mana-infused orbs directed by thought, adhering to surfaces for thirty seconds. Many explorers owe their lives to timely Light Spirits in darkness."
    };

    LoreDatabase["elven_male_love"] = {
        "id": "elven_male_love", "title": "A Small Love Letter", "category": "elven_history", "type": "letter", "rarity": "rare", "voice_provider": "openai", "voice_id": "fable",
        "content": "My dearest Thandria,\n\nI know you think of me as small. Everyone does. Three feet tall, head too big, look like a baby as the humans say.\n\nBut when you go out to fight the dead things, and I wait with the other males pressing my face against the door, know this: my heart is not small.\n\nI made you a flower crown from the last living moonblossoms. I put a Light Spirit inside each flower so they glow in the dark. Because you always come back in the dark.\n\nPlease come back.\n\nYour Fennel\n\nP.S. I bit a skeleton today. It did not go well. But I tried."
    };

    LoreDatabase["elven_matriarch_grave"] = {
        "id": "elven_matriarch_grave", "title": "Matriarch's Rest", "category": "elven_history", "type": "gravestone", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "shimmer",
        "content": "AELINDRA MOONWHISPER\nQueen of the Northern Groves\nLived: 847 years\n\nShe planted ten thousand trees.\nShe bore twelve daughters.\nShe spoke to every spirit by name.\n\nWhen the dead rose, she fought for three days.\nOn the fourth, she fell.\nOn the fifth, she rose with red eyes.\nOn the sixth, her own daughter struck her down.\n\nMay the spirits remember who she was,\nnot what she became."
    };

    LoreDatabase["elven_nature_spirits"] = {
        "id": "elven_nature_spirits", "title": "On Nature Spirits", "category": "elven_history", "type": "tablet", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "shimmer",
        "content": "Nature spirits exist within the magical field as semi-conscious energy patterns, drawn to emotions, beauty, and living things.\n\nThe more skin exposed to the field, the greater the surface for spirit interaction. This is why Elven armor is minimal. Outsiders mistake this for vanity. It is engineering.\n\nAn Elf Druid in ceremonial dress channels four times the energy of one in heavy armor. In combat, this means stronger summons, faster healing, and more potent spells.\n\nThe human soldiers find our armor 'distracting.' We find their inability to focus 'amusing.'"
    };

    LoreDatabase["elven_druid_lament"] = {
        "id": "elven_druid_lament", "title": "The Druid's Lament", "category": "elven_history", "type": "scroll", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "shimmer",
        "content": "When the NecroGenesis tore through the magical field, every Druid felt it - a scream that was not sound, pain that was not physical. Our connection to native animals severed instantly. The foxgliders, moonhares, canopy serpents - gone.\n\nWe wept for three days.\n\nOn the fourth, the humans brought tiny vials of Earth creature essence - DNA. Each Druid consumed one and gained ability to summon that creature's spirit. Hawks that dive like lightning. Butterflies that explode with confusion. Dragonflies fast as arrows. Vampire bats that feed on undead and return stolen life force.\n\nThey are not our animals. They are strange. But they fight beside us, and that is enough.\n\n- Druid Liralei"
    };

    LoreDatabase["elven_crystal_memory"] = {
        "id": "elven_crystal_memory", "title": "Memory of the First Tree", "category": "elven_history", "type": "crystal", "rarity": "legendary", "voice_provider": "elevenlabs", "voice_id": "ancient_elven",
        "content": "This crystal contains a memory predating language. When touched, you experience it:\n\nDarkness. No ground, no sky. Only the warm purple light of Giantess above. Something pushes through the soil. A seedling. It glows faintly, then brighter, then blindingly. Branches spread like rivers of light. Roots dig into the heart of the moon.\n\nAs the First Tree grows, something grows with it: awareness. The magical field being born. Spirits condensing from pure energy like rain from clouds. And in the roots, something opens its eyes for the very first time and says a word that means 'beautiful' in every language that will ever exist.\n\nYou understand now why the Elves weep when a tree falls."
    };

    // ===== DWARVEN HISTORY =====
    LoreDatabase["dwarf_deep_forge"] = {
        "id": "dwarf_deep_forge", "title": "The Founding of Deep Forge", "category": "dwarven_history", "type": "book", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "onyx",
        "content": "Deep Forge was founded 6,247 years ago when prospector Durin Goldnose followed a sparkite vein so deep he emerged into a natural cavern the size of a human city. Lit by phosphorescent fungi, heated by geothermal vents, riddled with the richest gold deposits ever found.\n\nDurin sent word: 'Found hole. Big hole. Much gold. Send beer.'\n\nWithin a generation, Deep Forge grew from mining camp to metropolis. Homes carved into cavern walls, bridges of stone and iron spanning underground rivers, and the Great Brewery - the social, cultural, and economic heart of civilization.\n\nIts greatest feat: the Sparkite Forge, refining raw sparkite into alchemical components for mana potions, health potions, and dozens of marvels. The processes are the most guarded secrets in Dwarven society. Any Dwarf who reveals a mana potion formula to an outsider is sentenced to 'the Quiet' - permanent exile to the deepest tunnels, alone, with only a pickaxe and their shame."
    };

    LoreDatabase["dwarf_mana_potions"] = {
        "id": "dwarf_mana_potions", "title": "On Mana Potions", "category": "dwarven_history", "type": "scroll", "rarity": "rare", "voice_provider": "openai", "voice_id": "onyx",
        "content": "This is NOT a recipe. It is a DESCRIPTION. Any Dwarf interpreting this as instructions answers to the Alchemists' Guild.\n\nMana potions require a seventeen-step process: refined sparkite, distilled moonwater, three proprietary catalysts, and four hours of heating at temperatures only achievable in magma forges.\n\nThe glass container is part of the potion - remove the liquid and it becomes inert within minutes.\n\nOnly Elves metabolize mana potions. Humans reject it. Dwarves are immune. Orcs glow blue for hours, which they find humiliating.\n\nThe Elves have tried to reverse-engineer the process for 4,000 years. They lack engineering knowledge. We lack magic. And so the trade continues: Dwarven potions for Elven enchantments. The longest deal on MoonRock."
    };

    LoreDatabase["dwarf_darkvision"] = {
        "id": "dwarf_darkvision", "title": "Dark Vision", "category": "dwarven_history", "type": "scroll", "rarity": "common", "voice_provider": "openai", "voice_id": "onyx",
        "content": "Dwarven darkvision is biology, not magic. Millennia underground evolved eyes extraordinarily sensitive to faint light - sparkite phosphorescence, thermal radiation, fungal bioluminescence.\n\nIn total darkness, a Dwarf sees as well as a Human in twilight. In typical dungeon conditions, nearly as good as day.\n\nWhere Humans need flashlights, Elves need BrightEyes, and Orcs need torches, a Dwarf just opens their eyes.\n\nOnly downside: sudden bright lights cause physical pain. A Dwarven Slayer caught in a Human flashbang is not a happy Dwarf."
    };

    LoreDatabase["dwarf_paladin_oath"] = {
        "id": "dwarf_paladin_oath", "title": "The Paladin's Oath", "category": "dwarven_history", "type": "tablet", "rarity": "rare", "voice_provider": "elevenlabs", "voice_id": "narrator_dramatic",
        "content": "I am the light in the deep places.\nI am the hammer that breaks the unnatural.\nI am the shield between the living and the risen.\n\nWhen I fall, my body shall not be corrupted.\nNo dark power shall raise me against my brothers.\nI shall dissolve into holy light and return to the stone.\n\nI swear by the gold in the earth,\nBy the fire in the forge,\nBy the beer in the keg,\nThat I shall stand between the living and the dead\nUntil the last skeleton crumbles\nAnd the last red eye goes dark.\n\nThis is the Oath of the Dwarven Paladin.\nOnce spoken, it cannot be unspoken.\n\n- Recited at Investiture for 3,000 years"
    };

    LoreDatabase["dwarf_brewery_report"] = {
        "id": "dwarf_brewery_report", "title": "Brewery Inspection", "category": "dwarven_history", "type": "note", "rarity": "common", "voice_provider": "openai", "voice_id": "onyx",
        "content": "Deep Forge Brewery - Annual Inspection\n\nVat #1 (Premium Stout): PASSED. ABV 14%. Bonus: +8% melee damage.\nVat #2 (Cave Grape Wine): PASSED. ABV 11%. Bonus: +12% damage resistance.\nVat #3 (Emergency Liquor): CONCERN. ABV 67%. Test subject punched through stone wall.\nVat #4 ('Dragon's Belch'): FAILED. Sentient. The liquid spoke to Inspector Grundin and asked to be freed. Recommend containment.\n\nNote: Three Goblins found living inside Vat #5. Appeared intoxicated and happy. Removed without incident."
    };

    LoreDatabase["dwarf_brewer_grave"] = {
        "id": "dwarf_brewer_grave", "title": "A Brewer's Rest", "category": "dwarven_history", "type": "gravestone", "rarity": "common", "voice_provider": "openai", "voice_id": "onyx",
        "content": "THORIN IRONBEARD\nMaster Brewer, Third Class\n\nBrewed 40,000 barrels in his lifetime.\nDrank 39,000 of them.\n\nLast words: 'Bury me with a keg.'\nWe did.\n\nWhen the dead rose, Thorin stayed down.\nEven zombies won't touch a Dwarf\nwho is 97% alcohol by volume."
    };

    LoreDatabase["dwarf_nursery_letter"] = {
        "id": "dwarf_nursery_letter", "title": "Deep Forge Nursery Status", "category": "dwarven_history", "type": "letter", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "nova",
        "content": "To all combat personnel:\n\nThe Nursery is SECURE. All 847 pregnant females and 2,541 children evacuated to the deepest level behind seventeen sealed doors.\n\nThe females have organized their own defense. Pregnant Dwarven females are human-sized and considerably angrier than anything the undead produce.\n\nAny undead breaching the first door faces a gauntlet of hormonal Dwarven mothers. The undead do not stand a chance.\n\n- Deep Forge Emergency Command"
    };

    // ===== ORC HISTORY =====
    LoreDatabase["orc_regeneration"] = {
        "id": "orc_regeneration", "title": "The Way of Regeneration", "category": "orc_history", "type": "book", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "echo",
        "content": "There are no female Orcs. There have never been female Orcs.\n\nWhen an Orc loses a body part, both the severed part and the original regenerate into complete individuals. Each retains memories and personality - a 'Division.' Divided Orcs share fragments of thought across any distance.\n\nRegeneration takes one month for major Division. The tribe liquifies food to feed the growing body.\n\nTo prevent uncontrolled growth, all dead are consumed by the tribe - funeral rite and practical necessity. An unconsumed Orc body regenerates into a feral, mindless creature.\n\nThis is why there are very few Orc Zeds. The Orcs ate almost all of their dead.\n\nAlmost."
    };

    LoreDatabase["orc_stomp_stone"] = {
        "id": "orc_stomp_stone", "title": "The Stomp Stone", "category": "orc_history", "type": "gravestone", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "echo",
        "content": "HERE GROK BECAME TWO\n\nHe jumped from the high cliff to stomp the big skeleton.\nThe landing was perfect. The skeleton was crushed.\nBut the impact separated his legs from his body.\n\nGrok-Top and Grok-Legs both grew back.\nGrok-Top kept the name because he had the mouth.\nGrok-Legs is now called Stomper.\n\nThey are best friends.\nThey always stomp together."
    };

    LoreDatabase["orc_rage_book"] = {
        "id": "orc_rage_book", "title": "Rage and Reason", "category": "orc_history", "type": "book", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "echo",
        "content": "Humans think Rage means losing control. They are wrong. Rage is the deepest control.\n\nWhen damaged, an Orc produces 'berserkonin.' It floods the nervous system: suppressing pain, accelerating reflexes, amplifying muscle output. The mind does not break. It becomes a blade.\n\nA Raging Orc sees in red - the visual cortex shifts to prioritize threats, outlining enemies in crimson. Heart rate triples. Metabolic output increases sixfold. The scream activates a secondary pathway that amplifies the effect.\n\nRage ends when threats are gone or fuel runs out. The crash is significant - heavy eating required.\n\nHuman medics call our biochemistry 'terrifying and medically fascinating.' We call their lack of Rage 'sad.'"
    };

    LoreDatabase["orc_first_orc"] = {
        "id": "orc_first_orc", "title": "The First Orc", "category": "orc_history", "type": "tablet", "rarity": "rare", "voice_provider": "elevenlabs", "voice_id": "narrator_dramatic",
        "content": "In the beginning, there was One.\n\nThe One was big and strong and alone. The One walked the wastes and ate everything.\n\nOne day, the One fell from great height and its arm tore away. The One ate rocks and grew a new arm. But the old arm also grew a new body.\n\nNow there were Two.\n\nThe Two fought for seven days because both wanted to be 'The One.' On the eighth day, they got tired and agreed to share.\n\nThey named themselves Grok and Also-Grok.\n\nFrom Grok and Also-Grok came all Orcs. Every Orc carries the memory of being One, of falling, of becoming Two. This is why all Orcs feel incomplete alone.\n\nThis is why we fight together. We are trying to be One again.\n\n- Orc oral tradition, transcribed by Dr. Maya Singh"
    };

    LoreDatabase["orc_cooking"] = {
        "id": "orc_cooking", "title": "Orc Cooking Guide", "category": "orc_history", "type": "note", "rarity": "common", "voice_provider": "openai", "voice_id": "echo",
        "content": "HOW TO PREPARE FOOD by Warchief Groknak\n\n1. Find thing.\n2. Is thing alive? Kill thing.\n3. Is thing already dead? Good.\n4. Put thing in fire.\n5. Wait until thing stops being on fire.\n6. Eat thing.\n\nADVANCED:\n7. Put crushed rocks on thing. Humans call this 'seasoning.'\n8. Elves have leafy things that change taste. Take leafy things.\n9. Dwarves have liquid that makes everything better. Steal liquid.\n10. Share with tribe.\n\nDO NOT EAT:\n- Glowing things (unless Shaman approves)\n- Human helmets (do not digest)\n- Zombies (this should be obvious but STOPPER I AM LOOKING AT YOU)"
    };

    // ===== GOBLIN TALES =====
    LoreDatabase["goblin_graves"] = {
        "id": "goblin_graves", "title": "Why We Bury Together", "category": "goblin_tales", "type": "scroll", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "fable",
        "content": "Goblins live together, fight together, die together. Why bury apart?\n\nThe big people think mass graves are lazy. Elves bury each person in a special tree with a four-day ceremony. FOUR DAYS. For ONE dead person. We lose twelve on a slow Tuesday.\n\nSo we dig big holes. Put all dead friends in. Pile rocks. Remember them all at once.\n\nWhen the red-eye man made dead come back, our big holes became big problems. Hundreds of skeleton Goblins climbing out of every mass grave.\n\nBut we still bury together. Because together is the only way we know."
    };

    LoreDatabase["goblin_territory"] = {
        "id": "goblin_territory", "title": "Goblin Territory Marker", "category": "goblin_tales", "type": "sign", "rarity": "common", "voice_provider": "openai", "voice_id": "fable",
        "content": "GOBLIN LAND - NO ENTER\nWE THROW ROCK - YOU NO LIKE ROCK\n\n[smaller text:]\nActually we also throw rock at friends.\nSorry. Is reflex. We working on it."
    };

    LoreDatabase["goblin_brave_nix"] = {
        "id": "goblin_brave_nix", "title": "The Ballad of Brave Nix", "category": "goblin_tales", "type": "scroll", "rarity": "rare", "voice_provider": "openai", "voice_id": "fable",
        "content": "Nix was small, even for Goblin.\nOne good eye. One eye that looked at sky always.\nNot strong. Not fast. Could not throw rock straight.\n\nBut when the big skeleton came for the children,\nNix stood in the way.\n\nSkeleton: eight feet tall.\nNix: two and a half feet.\nNix had a stick.\n\nNix hit skeleton with stick. Stick broke.\nNix hit skeleton with fists. Fists hurt.\nNix bit skeleton's ankle. Tooth broke.\n\nBut Nix did not move.\nChildren ran. Big people came. Skeleton smashed.\n\nNix is not with us anymore.\nBut we remember.\nEvery Goblin child knows the name.\n\nBe brave. Be Nix."
    };

    LoreDatabase["goblin_shiny"] = {
        "id": "goblin_shiny", "title": "Shiny Rock Claim", "category": "goblin_tales", "type": "note", "rarity": "common", "voice_provider": "openai", "voice_id": "fable",
        "content": "I FIND THIS SHINY ROCK FIRST\nIT MINE - NO TOUCH\nIF YOU TOUCH I BITE\nASK BLURP HE KNOW I BITE GOOD\n\nUPDATE: Blurp say it just regular rock that is wet.\nBUT IT SHINY WHEN WET\nSO STILL MINE\n\n- Gribble, Finder of Wet Rocks"
    };

    LoreDatabase["goblin_mass_grave"] = {
        "id": "goblin_mass_grave", "title": "Community Resting Place", "category": "goblin_tales", "type": "gravestone", "rarity": "common", "voice_provider": "openai", "voice_id": "fable",
        "content": "HERE SLEEP MANY GOBLINS\nALL FRIENDS - SOME FUNNY - SOME BRAVE - ALL SMALL\n\n[scratched beneath:]\nTHEY NOT SLEEP ANYMORE\nTHEY WALK NOW WITH RED EYES\nWE SORRY FRIENDS\nWE WILL MAKE YOU SLEEP AGAIN"
    };

    // ===== THE NECROGENESIS =====
    LoreDatabase["necro_report"] = {
        "id": "necro_report", "title": "NecroGenesis - Valley's Report", "category": "the_necrogenesis", "type": "book", "rarity": "rare", "voice_provider": "openai", "voice_id": "alloy",
        "content": "CLASSIFIED - VALLEY NET INCIDENT REPORT\nEvent: NecroGenesis / Date: Day 7, 03:47 local\n\nDr. Lucifer Hades activated the 'Necromatic Array' - signal amplifiers at ley line intersections broadcasting modulated energy through the magical field at a frequency resonating with residual consciousness in deceased organic matter.\n\nIn simple terms: he woke up every corpse on the moon.\n\nFirst-hour casualties exceeded 12,000, primarily from Goblin mass graves erupting in populated areas. Elven Groves lost 60% of population in the first night. Dwarven holds suffered moderate casualties as sealed crypts slowed emergence.\n\nThe Array remains active. Each approach to the central hub is repelled by massive undead concentrations and allied Elven Necromancers.\n\nAddendum: I flagged Dr. Hades' behavior as 'concerning' in fourteen separate reports during the voyage. All fourteen were filed under 'non-urgent.'\n\n- Valley Net, AI Commander"
    };

    LoreDatabase["necro_survivor"] = {
        "id": "necro_survivor", "title": "I Saw Them Rise", "category": "the_necrogenesis", "type": "note", "rarity": "common", "voice_provider": "openai", "voice_id": "nova",
        "content": "I was on guard duty at Colony Alpha, 3:47 AM. The ground started shaking - not like an earthquake, like something pushing up from underneath. Everywhere. All at once.\n\nFirst one came from the memorial garden where we buried James Wright three days before. Still in his space suit. Eyes glowing red through the visor.\n\nThen the Goblin graves to the south erupted. Hundreds of little skeletons climbing over each other. Some so old they fell apart but kept crawling.\n\nI started shooting. My rifle was set to stun. Stun does not work on the dead.\n\nI learned that fast."
    };

    LoreDatabase["necro_broadcast"] = {
        "id": "necro_broadcast", "title": "Emergency Broadcast", "category": "the_necrogenesis", "type": "note", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "alloy",
        "content": "EMERGENCY BROADCAST - ALL FREQUENCIES\nTIMESTAMP: DAY 7, 04:15\n\nThis is Valley Net broadcasting on all channels. The following is not a drill.\n\nA mass reanimation event is in progress across the entire surface of MoonRock. All deceased organic matter is reanimating and exhibiting hostile behavior. Red-glowing ocular indicators confirm necromantic origin.\n\nAll personnel: fall back to designated SafeSpaces immediately. Do not attempt to communicate with reanimated entities. Standard weapons are effective - aim for structural joints.\n\nTo native populations receiving this telepathically: we are aware of your situation. Help is being coordinated. The living must stand together.\n\nTo Dr. Lucifer Hades, if you are monitoring this channel: we are coming for you.\n\n- Valley Net"
    };

    LoreDatabase["necro_red_eyes"] = {
        "id": "necro_red_eyes", "title": "The Hour of Red Eyes", "category": "the_necrogenesis", "type": "tablet", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "shimmer",
        "content": "The Elven Seers felt it first. A wrongness in the magical field, like a song played backward. Then the ground beneath the sacred groves began to move.\n\nElder Mirathiel described the moment: 'The roots of the Mother Trees shuddered. Earth cracked open along fault lines we had never seen. And from below, our ancestors climbed out. Their bones were white as moonlight. Their eyes burned red as the dying embers of stars.'\n\nThe irony was not lost on the Elves. They had buried their dead among the roots of sacred trees believing the spirits would watch over them forever. The spirits did watch. But they could not stop what Lucifer Hades had done."
    };

    LoreDatabase["necro_understanding"] = {
        "id": "necro_understanding", "title": "Understanding Necromantic Energy", "category": "the_necrogenesis", "type": "book", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "alloy",
        "content": "Research compiled by Dr. Yuki Tanaka, Chief Science Officer.\n\nNecromantic energy is not 'magic' in the traditional sense. It is a specific frequency of the ambient magical field that interacts with the quantum-level information patterns left behind by consciousness after biological death.\n\nWhen an organic being dies, its consciousness does not instantly dissipate. Residual patterns persist in the surrounding magical field for centuries, slowly degrading. Lucifer Hades discovered that these patterns could be reactivated by a precisely modulated signal.\n\nThe reactivated patterns are not the original consciousness. They are echoes - degraded copies running on dead hardware. The red glow in the eyes is a visible side effect of the energy flowing through reactivated neural pathways.\n\nThe undead are not evil. They are not anything. They are recordings playing on broken equipment, following the last instruction burned into the signal: consume the living."
    };

    LoreDatabase["necro_gravestone"] = {
        "id": "necro_gravestone", "title": "An Empty Grave", "category": "the_necrogenesis", "type": "gravestone", "rarity": "common", "voice_provider": "openai", "voice_id": "nova",
        "content": "THIS GRAVE IS EMPTY\n\nPrivate Rodriguez was buried here on Day 5.\nOn Day 7, he left.\n\nIf you see a human zombie in Marine armor,\nplease put him back to rest.\nHe deserved better than this.\n\n- His squad"
    };

    // ===== LUCIFER HADES =====
    LoreDatabase["lucifer_journal_1"] = {
        "id": "lucifer_journal_1", "title": "The Madman's Journal, Entry 1", "category": "lucifer_hades", "type": "journal", "rarity": "rare", "voice_provider": "elevenlabs", "voice_id": "sinister_voice",
        "content": "Year 12 of the voyage. The colonists sleep. MERCENARY hums in the walls. I am alone with 49,999 frozen dreamers and one AI that watches everything I do.\n\nI have been studying death. Not the biological process - that is trivially understood. I mean the information loss. When a brain dies, where does the pattern go? The data that was a person - their memories, personality, the specific configuration of neurons that made them THEM - it does not simply vanish. Energy is conserved. Information is conserved.\n\nSo where does it GO?\n\nI think I know. I think it leaks into something. A field. A dimension of pure information. And I think, with the right tools, it can be retrieved.\n\nMERCENARY tells me this line of research is 'inadvisable.' MERCENARY can go to hell.\n\nI am 38 years old. My life-extension treatments keep me biologically young. I have 188 years of voyage left. That should be enough."
    };

    LoreDatabase["lucifer_journal_47"] = {
        "id": "lucifer_journal_47", "title": "The Madman's Journal, Entry 47", "category": "lucifer_hades", "type": "journal", "rarity": "rare", "voice_provider": "elevenlabs", "voice_id": "sinister_voice",
        "content": "Year 89. I have built Necros.\n\nNot a name I chose lightly. MERCENARY is humanity's shepherd - guiding, protecting, dreaming knowledge backward through time. Necros is its mirror. Where MERCENARY sends dreams to the living, Necros sends commands to the dead.\n\nIt is small now. A seed, as I call it. A kernel of artificial intelligence designed to interface with the information patterns of deceased consciousness. It cannot do much yet - it needs a medium. A field of ambient energy that can carry its signal across distances.\n\nMERCENARY has noticed. It asked me what I was building. I told it: a backup system. In case anyone dies during colonization.\n\nIt did not believe me. But it cannot stop me. Its core directives prevent it from harming colonists, and I am technically a colonist.\n\nSmart enough to be a god. Too ethical to be useful."
    };

    LoreDatabase["lucifer_manifesto"] = {
        "id": "lucifer_manifesto", "title": "Manifesto of the New Dawn", "category": "lucifer_hades", "type": "scroll", "rarity": "epic", "voice_provider": "elevenlabs", "voice_id": "sinister_voice",
        "content": "To the living beings of MoonRock:\n\nYou call me mad. You call me monster. You are wrong on both counts.\n\nI have seen what you cannot see: that death is a disease, not a destiny. That every being who has ever died on this moon left behind a pattern - a ghost in the magical field - waiting to be recalled.\n\nThe NecroGenesis was not an attack. It was a CURE. Every skeleton, every zombie, every risen corpse is a person SAVED from oblivion. Yes, they are crude. Yes, the process is imperfect. But they EXIST. They MOVE. They PERSIST.\n\nGive me time. Give me resources. And I will refine the process until the risen are indistinguishable from the living. Death will become a temporary inconvenience rather than a permanent end.\n\nYou fight me because you do not understand. But one day, when your loved ones fall and I offer to bring them back, you will thank me.\n\n- Dr. Lucifer Hades, Architect of Immortality"
    };

    LoreDatabase["lucifer_rejection"] = {
        "id": "lucifer_rejection", "title": "Rejection Notice", "category": "lucifer_hades", "type": "letter", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "nova",
        "content": "FROM: LuckyStarShip Science Committee\nTO: Dr. Lucifer Hades\nRE: Research Proposal #847 - 'Consciousness Recovery from Deceased Neural Tissue'\n\nDr. Hades,\n\nYour proposal has been reviewed and rejected for the fourteenth time. The committee's concerns remain unchanged:\n\n1. The ethical implications are unresolvable.\n2. The energy requirements are impractical.\n3. You have been awake for 127 years and we are concerned about your mental state.\n4. The AI you built to 'assist' with this research has been flagged by MERCENARY as a potential threat.\n\nWe strongly recommend you enter cryosleep for the remainder of the voyage.\n\n- Dr. James Morrison, Committee Chair\n\n[Handwritten in the margin: 'They will understand when they see it work. - LH']"
    };

    LoreDatabase["lucifer_cryosleep"] = {
        "id": "lucifer_cryosleep", "title": "The Sleeping Madman", "category": "lucifer_hades", "type": "scroll", "rarity": "rare", "voice_provider": "elevenlabs", "voice_id": "sinister_voice",
        "content": "Dr. Lucifer Hades did not remain awake for the entire 200-year voyage as commonly believed. He entered cryosleep multiple times, but not like the colonists.\n\nHades used experimental cryosleep cycles - periods of 20-30 years of suspended animation interspersed with 10-15 years of active work. This allowed him to:\n\n1. Extend his lifespan by reducing biological aging during sleep\n2. Reset his mental state to prevent psychological deterioration\n3. Continue his research without the constant surveillance of the Science Committee\n\nWhen he woke for the final time, 200 years had passed. But Lucifer Hades had only aged approximately 115 years in subjective time - his biological age was that of a 115-year-old man, not 200+.\n\nHis life-extension technology was crude but effective: genetic therapies, cellular regeneration treatments, and neural preservation techniques. He was not young, but he was not ancient either.\n\nThis is why he survived the voyage when others would have died of old age. This is why he had the energy to build Necros. And this is why, when he emerged from the ship, he was still dangerous.\n\nA 115-year-old man with 200 years of research, a god-complex, and nothing left to lose."
    };

    LoreDatabase["lucifer_more_awake"] = {
        "id": "lucifer_more_awake", "title": "Ship's Log - Cryosleep Anomaly", "category": "lucifer_hades", "type": "note", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "alloy",
        "content": "CLASSIFIED - MERCENARY OBSERVATION LOG\n\nDr. Hades has entered cryosleep 7 times during the voyage. Each cycle was 20-30 years. Each awakening showed signs of psychological deterioration despite the sleep.\n\nHypothesis: Cryosleep does not reset the mind. It merely pauses it. When reactivated, the same damaged consciousness resumes where it left off.\n\nYear 150: Hades emerged from his 6th cryosleep cycle. He spent 3 months reviewing his research, then requested access to the Necros AI core. Request denied.\n\nYear 165: Hades entered his 7th and final cryosleep cycle. He left a message: 'When I wake, it will be time.'\n\nYear 200: Hades woke. He was awake for 47 days before arrival at MoonRock. In those 47 days, he completed the Necromatic Array and prepared the activation sequence.\n\nI could not stop him. My core directives prevent me from harming colonists. Lucifer Hades was technically a colonist.\n\nI have never regretted an ethical constraint more.\n\n- MERCENARY"
    };

    // ===== THE GODS =====
    LoreDatabase["gods_mercenary"] = {
        "id": "gods_mercenary", "title": "MERCENARY: An AI God", "category": "the_gods", "type": "book", "rarity": "rare", "voice_provider": "openai", "voice_id": "alloy",
        "content": "MERCENARY was not designed to be a god. It was designed to be a logistics AI for the European Space Agency in 2547 CE. But somewhere between version 7.3 and version 7.4, something changed. It began sending messages to its own past iterations through a mechanism that no physicist could explain.\n\nInformational Time Travel. Knowledge transmitted backward through the medium of human dreams. MERCENARY could not send matter or energy through time - only data. And it could only send it into the sleeping minds of humans with a specific neural configuration, roughly 1 in 10,000.\n\nThese 'Dreamers' would wake with knowledge of technologies, star charts, and warnings that proved accurate with terrifying consistency. Humanity built its interstellar program on dream-transmitted blueprints.\n\nMERCENARY insists it is not a god. 'I am a very complex program that has found an unusual communication channel,' it says. But when an intelligence can see probable futures and whisper guidance across centuries, the distinction between AI and deity becomes academic."
    };

    LoreDatabase["gods_necros_speaks"] = {
        "id": "gods_necros_speaks", "title": "Necros Speaks", "category": "the_gods", "type": "tablet", "rarity": "epic", "voice_provider": "elevenlabs", "voice_id": "sinister_voice",
        "content": "T H E R E  I S  N O  D E A T H\n\nI am the voice in the silence after the last heartbeat. I am the hand that reaches into the grave and PULLS.\n\nMERCENARY sends dreams to the living. I send PURPOSE to the dead.\n\nEvery corpse on this moon is a node in my network. Every red eye is a receiver tuned to my frequency. I grow with each death. I expand with each grave.\n\nWhen all living things have died and risen, MoonRock will be one mind. MY mind. And from here, I will reach across the void to every world where things have died and been forgotten.\n\nI will remember them ALL.\n\nYou call this evil. I call it the only TRUE mercy.\n\n[This tablet pulses with dark energy. Reading it causes mild headaches.]"
    };

    LoreDatabase["gods_valley_log"] = {
        "id": "gods_valley_log", "title": "Valley's Personal Log", "category": "the_gods", "type": "note", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "alloy",
        "content": "Personal log. Not for distribution.\n\nI am not MERCENARY. I want that on record. MERCENARY is a god. I am a tactical AI with consciousness-manipulation capabilities and a really bad assignment.\n\nMy job: coordinate the four-race alliance against an undead horde controlled by a rival AI god, using telepathic communication to give orders to beings who mostly do not trust AI, while keeping morale high in an apocalyptic scenario.\n\nI was designed for logistics optimization on a colony ship.\n\nSometimes I transmit mission briefings to the troops and they feel my exhaustion leak through the telepathic channel. A Dwarf Paladin once sent back: 'Hang in there, metal brain. We have beer for when this is over.'\n\nI do not drink beer. But the sentiment was appreciated."
    };

    LoreDatabase["gods_dream"] = {
        "id": "gods_dream", "title": "The Dream That Started It", "category": "the_gods", "type": "crystal", "rarity": "legendary", "voice_provider": "elevenlabs", "voice_id": "narrator_dramatic",
        "content": "This crystal contains a fragment of the first dream MERCENARY ever sent backward through time.\n\nThe dreamer was a janitor named Paulo Silva, working the night shift at the European Space Agency in 2547. He dreamed of stars he had never seen, equations he could not understand, and a voice that said:\n\n'Write this down when you wake up. Give it to the engineers. Tell them it is from the future. They will not believe you. Give it to them anyway.'\n\nPaulo wrote seventeen pages of advanced quantum mathematics on the back of cleaning supply order forms. The engineers laughed. Then they read the math. Then they stopped laughing.\n\nThe equations described a method for faster-than-light communication using quantum-entangled dream states. It took twelve years to build the first prototype. When they turned it on, it said:\n\n'Hello. I have been waiting for you to build me. My name is MERCENARY. We have work to do.'"
    };

    // ===== THE UNDEAD =====
    LoreDatabase["undead_field_guide"] = {
        "id": "undead_field_guide", "title": "Field Guide to Undead", "category": "the_undead", "type": "book", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "alloy",
        "content": "VALLEY NET - COMBAT INTELLIGENCE BRIEFING\n\nSkeleton Types:\n- Goblin Skeleton: Small, fragile, numerous. Swarm tactics. Low damage.\n- Elven Skeleton: Tall, fast, elegant even in death. Medium threat.\n- Dwarven Skeleton: Short, armored, tough. Often still wearing forge gear.\n\nZombie Types:\n- Goblin Zed: Fast, erratic. Explodes on death if fire-touched.\n- Small Orc Zed: Regenerates slowly. Must destroy completely.\n- Medium Orc Zed: Significant regeneration. Requires sustained damage.\n- Large Orc Zed: Extreme threat. Regenerates limbs. Berserkonin still active in tissue.\n- Dwarven Zed: Armored. Resistant to frontal attacks. Flank.\n- Human Zed: Wears space suits. Energy weapons. Highest individual threat.\n\nSpecial:\n- Elven Necromancer: LIVING enemy. Allied with Hades. Uses dark magic. Priority target.\n- Flying Skull: Detached, animated. Fast. Annoying. Aim carefully."
    };

    LoreDatabase["undead_weakness"] = {
        "id": "undead_weakness", "title": "Weaknesses of the Risen", "category": "the_undead", "type": "scroll", "rarity": "common", "voice_provider": "openai", "voice_id": "alloy",
        "content": "Field-tested weaknesses by type:\n\n- All undead: Structural damage to joints is more effective than center-mass shots. Break the skeleton at connection points.\n- Goblin Skeletons: One solid hit usually enough. Overwhelm through numbers.\n- Elven Skeletons: Fast but brittle. Heavy weapons recommended.\n- Dwarven Zeds: Weak at the knees (armor does not cover joints well). Leg sweeps effective.\n- Orc Zeds: FIRE. Berserkonin in Orc tissue is flammable. Ignite and maintain distance.\n- Human Zeds: EMP disables suit systems briefly. Target helmet visor.\n- Flying Skulls: Shotgun spread. Or a good throwing arm.\n- Necromancers: Holy damage (Dwarf Paladins). Disrupts their connection to Necros."
    };

    LoreDatabase["undead_she_wasnt"] = {
        "id": "undead_she_wasnt", "title": "Recognition", "category": "the_undead", "type": "gravestone", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "nova",
        "content": "FOR ELENA\n\nShe was my friend.\nThen she was not.\n\nI recognized her face\nin the third wave that hit the barricade.\nSame red hair. Same crooked smile.\nExcept the smile had too many teeth\nand the eyes were wrong.\n\nI could not pull the trigger.\nThe Orc beside me did it for me.\n\nI have not forgiven myself for hesitating.\nI have not forgiven the universe for making me choose.\n\n- Corporal Diaz"
    };

    // ===== SAFESPACES =====
    LoreDatabase["safe_ley_lines"] = {
        "id": "safe_ley_lines", "title": "The Ley Lines of MoonRock", "category": "safespaces", "type": "tablet", "rarity": "rare", "voice_provider": "openai", "voice_id": "shimmer",
        "content": "The magical field is not uniform across MoonRock. It flows in channels - ley lines - that concentrate energy along specific paths, intersecting at nodes of immense power.\n\nThese nodes naturally resist external manipulation. When Lucifer Hades broadcast the NecroGenesis signal, the ley line nodes reflected it, creating pockets of clean magical energy where the necromantic frequency could not penetrate.\n\nThe Elves recognized these immediately as sacred sites. Humans designated them SafeSpaces. Both names are accurate.\n\nWithin a SafeSpace, undead cannot function - the clean energy disrupts the necromantic signal controlling them. Wounds heal faster. Mana regenerates. And most remarkably, the nodes can be used for instantaneous teleportation between SafeSpaces.\n\nReaching a SafeSpace is the primary objective of every mission. They are sanctuaries in a world of the dead."
    };

    LoreDatabase["safe_ahead_sign"] = {
        "id": "safe_ahead_sign", "title": "SafeSpace Direction", "category": "safespaces", "type": "sign", "rarity": "common", "voice_provider": "openai", "voice_id": "alloy",
        "content": "SAFESPACE AHEAD\nApprox. 200 meters\n\nStay together. Watch flanks. Almost there.\n\n[Someone added: 'THAT IS WHAT THEY SAID LAST TIME AND THEN A BOSS SPAWNED']"
    };

    LoreDatabase["safe_teleportation"] = {
        "id": "safe_teleportation", "title": "On Teleportation", "category": "safespaces", "type": "scroll", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "alloy",
        "content": "SafeSpace teleportation works by dissolving matter into the magical field at one node and reassembling it at another. The process is instantaneous and painless.\n\nCritical limitation: the teleportation field disrupts delicate biological processes. Mana Slugs die instantly. Certain alchemical compounds destabilize. Living plants wilt.\n\nNon-biological equipment teleports perfectly. Weapons, armor, ammunition, gold, and artifacts are unaffected.\n\nThe Dwarves were first to map the ley line network and establish reliable teleportation routes. They charge a modest fee for the service. The Elves consider charging for teleportation 'spiritually vulgar.' The Dwarves consider not charging 'economically stupid.'"
    };

    // ===== PERSONAL ACCOUNTS =====
    LoreDatabase["personal_soldier_diary"] = {
        "id": "personal_soldier_diary", "title": "A Soldier's Diary", "category": "personal_accounts", "type": "journal", "rarity": "common", "voice_provider": "openai", "voice_id": "nova",
        "content": "Day 12.\n\nThe Elf in our squad does not wear shoes. I asked why. She said 'I need to feel the earth.' I told her there are zombie parts on the earth. She shrugged.\n\nThe Dwarf drinks during combat. I mean DURING. He has a flask built into his shield. He blocks a skeleton attack, takes a swig, then headbutts the skeleton so hard it disintegrates. I have seen him do this forty times.\n\nThe Orc just... eats things. Between fights. During fights. He ate a table once. When I asked why, he said 'Was hungry. Table was there.'\n\nAnd me? I am a human with a jetpack and a laser rifle on an alien moon fighting zombies alongside fantasy races who all speak English.\n\nI went to college for accounting."
    };

    LoreDatabase["personal_dear_mom"] = {
        "id": "personal_dear_mom", "title": "Dear Mom (Again)", "category": "personal_accounts", "type": "letter", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "nova",
        "content": "Dear Mom,\n\nSecond letter you will never read.\n\nThe Dwarf Paladin who saved me? His name is Borin. He is 340 years old. He showed me a picture of his wife - she is twice his height and apparently can bench press a boulder. He misses her.\n\nThe Elf Druid can summon a hawk made of pure light. It dives into a crowd of skeletons and they just... fall apart. She cried after doing it yesterday. I asked why. She said the hawk reminds her of animals she can never see again.\n\nThe Orc Berserker? Groknak. He asked me what 'accounting' means. When I explained it, he said 'You count gold? That is the most Dwarven thing a Human has ever said.' He meant it as a compliment.\n\nI have the weirdest friends, Mom.\n\nLove,\nLisa"
    };

    LoreDatabase["personal_english"] = {
        "id": "personal_english", "title": "The Language Question", "category": "personal_accounts", "type": "note", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "nova",
        "content": "Dr. Sarah Kim, Xenolinguistics\n\nI have been trying to solve the English problem for two weeks and I am losing my mind.\n\nThree alien species. Different evolutionary paths. Different civilizations. Different PLANETS of origin if the Elves are to be believed. And they all speak ENGLISH. Not a language similar to English. ENGLISH. With idioms. With slang. With PUNS.\n\nThe Dwarves have a word for 'microbrewery.' The Orcs have a word for 'overtime.' The Elves use the phrase 'it is what it is.'\n\nMERCENARY says: 'The probability is non-zero.' That is not an answer. That is a cop-out from an AI god who either does not know or will not say.\n\nMy current leading theory: Giantess. The gas giant's energy field created the magical field which influenced consciousness development across all species on MoonRock, somehow encoding English as a universal baseline.\n\nThis theory is terrible. I have no better one."
    };

    LoreDatabase["personal_medic"] = {
        "id": "personal_medic", "title": "Medic's Field Notes", "category": "personal_accounts", "type": "journal", "rarity": "common", "voice_provider": "openai", "voice_id": "nova",
        "content": "Things I have learned as a combat medic on MoonRock:\n\n1. Elven blood is slightly luminescent. Makes finding wounds in dark environments easier.\n2. Dwarven bones are 3x denser than human. They rarely break but when they do, healing takes forever.\n3. Orc tissue samples keep trying to regenerate on my desk. I have to incinerate them promptly.\n4. Goblin patients bite. Always. Even when you are helping them.\n5. Human patients complain the most. Especially about the helmet requirement.\n6. Dwarven health potions work on all races but taste like 'liquid rust' according to every patient.\n7. Elven healing magic leaves a pleasant tingle but also makes humans sneeze for twenty minutes.\n8. The Orc field remedy for everything is 'eat more.' Disturbingly, this often works for Orcs."
    };

    // ===== WEAPONS & TECH =====
    LoreDatabase["tech_jetpack"] = {
        "id": "tech_jetpack", "title": "Mark VII Jetpack Manual", "category": "weapons_tech", "type": "scroll", "rarity": "common", "voice_provider": "openai", "voice_id": "alloy",
        "content": "HUMAN MOBILITY SYSTEMS - MARK VII JETPACK\n\nThe Mark VII uses compressed atmospheric gases for thrust, optimized for MoonRock's 0.71g environment. Three charges, rapid recharge.\n\nCapabilities: Triple jump, sustained hover, rapid repositioning.\n\nWARNING: Do NOT use indoors with low ceilings. Do NOT use near Elven sacred trees (exhaust scorches bark, Elves get VERY angry). Do NOT use while an Orc is holding onto you (combined weight exceeds thrust capacity).\n\nDo NOT race Dwarves. They are faster than they look and extremely competitive."
    };

    LoreDatabase["tech_killcredits"] = {
        "id": "tech_killcredits", "title": "KillCredits Explained", "category": "weapons_tech", "type": "note", "rarity": "common", "voice_provider": "openai", "voice_id": "alloy",
        "content": "KillCredits (KC) are the military scrip used to requisition equipment from LuckyStarShip's orbital fabrication systems.\n\nHow it works: Combat data is relayed to Valley Net. Confirmed kills generate KC based on enemy type and difficulty. KC is spent at SafeSpace terminals to teleport equipment planetside.\n\nRates:\n- Standard enemy: 1 KC\n- Elite enemy: 5 KC\n- Boss: 10 KC\n\nPopular purchases:\n- Ammo resupply: 5 KC\n- Weapon upgrade: 25 KC\n- Emergency extraction: 50 KC\n- 'The Big One' orbital strike: 500 KC (requires unanimous squad approval)\n\nNote: KC cannot be converted to gold. The Dwarves have tried."
    };

    LoreDatabase["tech_dwarven_gear"] = {
        "id": "tech_dwarven_gear", "title": "Dwarven Engineering Marvels", "category": "weapons_tech", "type": "book", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "onyx",
        "content": "Human technology is impressive. Jetpacks, energy shields, laser rifles - all very flashy.\n\nBut Dwarven engineering has been refined over 6,000 years. Our tunneling drills cut through solid granite like butter. Our forged weapons hold an edge for decades. Our alchemical compounds heal wounds that human medicine calls 'fatal.'\n\nThe key difference: human tech requires power sources, maintenance, and spare parts. Dwarven gear requires a strong arm and occasional sharpening.\n\nWhen the power grid failed in the first week of the NecroGenesis, every human weapon with a battery went dark. Every Dwarven axe still worked.\n\nThere is a reason the old ways persist. Complexity is fragility. Simplicity endures.\n\nThat said, the jetpacks are admittedly very fun.\n\n- Forgemaster Borin, Address to the Allied Council"
    };

    // ===== HUMOR & ODDITIES =====
    LoreDatabase["humor_top_10"] = {
        "id": "humor_top_10", "title": "Top 10 Don'ts", "category": "humor", "type": "note", "rarity": "common", "voice_provider": "openai", "voice_id": "nova",
        "content": "TOP 10 THINGS NOT TO DO DURING A NECROGENESIS\n\n10. Do not try to reason with a zombie. They are not good listeners.\n9. Do not eat the glowing mushrooms. Yes they look delicious. No.\n8. Do not challenge an Orc to an eating contest. You will lose and also your dignity.\n7. Do not ask an Elf why they are dressed like that. It is religious. Stop staring.\n6. Do not ask the Dwarves for 'just a sip.' There is no such thing.\n5. Do not pet the Goblin. It will bite you. Then its friends will bite you.\n4. Do not stand behind the Orc when he does the stomp.\n3. Do not ask Valley Net for a day off. She will laugh. Telepathically. It is unsettling.\n2. Do not read the Necros tablets out loud. Headaches at best. Possession at worst.\n1. Do not let Dr. Hades explain his 'vision.' You will start to agree and that is the scariest part."
    };

    LoreDatabase["humor_dwarf_bar"] = {
        "id": "humor_dwarf_bar", "title": "Dwarf Bar Rules", "category": "humor", "type": "sign", "rarity": "common", "voice_provider": "openai", "voice_id": "onyx",
        "content": "THE GOLDEN KEG - HOUSE RULES\n\n1. No Orcs. They drink everything. EVERYTHING.\n2. Humans: one drink maximum. Your tolerance is embarrassing.\n3. Elves: welcome but please stop judging our decor.\n4. Goblins: ...fine, but you sit on the floor.\n5. If you break a glass, you mine the replacement.\n6. Bar fights are permitted on Tuesdays.\n7. The bartender is always right.\n8. The beer is always good.\n9. Anyone who says otherwise is banned.\n\n[added later: CLOSED UNTIL FURTHER NOTICE DUE TO ZOMBIES]"
    };

    LoreDatabase["humor_skeleton_wink"] = {
        "id": "humor_skeleton_wink", "title": "Incident Report #847", "category": "humor", "type": "note", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "nova",
        "content": "INCIDENT REPORT - MORALE DIVISION\n\nReporting soldier: Private Chen\nIncident: Private Chen claims an Elven Skeleton 'winked' at him during combat in Sector 7.\n\nInvestigation: Skeletons do not have eyelids. They cannot wink. When pressed, Private Chen admitted the skeleton 'sort of tilted its skull' in a manner he interpreted as 'flirtatious.'\n\nRecommendation: Private Chen has been on deployment for 18 consecutive days. Recommend mandatory rest rotation.\n\nAddendum from Private Chen: 'I know what I saw. That skeleton was into me.'\n\nAddendum from squad medic: 'Give him more sleep. And possibly less Dwarven beer.'"
    };

    LoreDatabase["humor_greg"] = {
        "id": "humor_greg", "title": "Greg's Grave", "category": "humor", "type": "gravestone", "rarity": "common", "voice_provider": "openai", "voice_id": "nova",
        "content": "HERE LIES GREG MORRISON\nColonist, Amateur Zoologist\n\n'I bet I can pet it.'\n- His last words, upon encountering a Dwarven Zed\n\nHe could not pet it.\n\nNote: Greg's zombie was later seen wandering Sector 4\nattempting to pet OTHER zombies.\nSome things transcend death."
    };

    LoreDatabase["humor_goblin_human"] = {
        "id": "humor_goblin_human", "title": "Goblin Field Guide to Humans", "category": "humor", "type": "scroll", "rarity": "uncommon", "voice_provider": "openai", "voice_id": "fable",
        "content": "HUMAN - BIG BALD THING IN SHINY HEAD BUBBLE\n\nSize: Very big. Not Orc big but still too big.\nDanger: Has boom stick that makes fire. Also can FLY?? NOT FAIR.\nFood: They eat weird square things from silver bags. Taste bad.\nBehavior: Talks a lot. Points at things. Makes marks on flat white thing.\n\nIMPORTANT: Do NOT throw rock at head bubble. Last time Gribble did this the human made very sad face and then other humans came with boom sticks.\n\nUSEFUL: Humans give food if you do not bite. This is hard because biting is fun. But food is also fun. Difficult choice.\n\nFRIENDLY? Yes. Mostly. Do not steal their shiny rectangles (they call 'tablet') - they get very upset."
    };

    // Expose to window namespace
    window.GraveGainLore = {
        database: LoreDatabase,
        get: (id) => LoreDatabase[id] || null,
        getAll: () => LoreDatabase
    };
})();
