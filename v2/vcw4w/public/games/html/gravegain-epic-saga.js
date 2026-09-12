/* GraveGain epic saga data (v2-native, parity-safe).
 *
 * Lives OUTSIDE the parity-locked bundles:
 *   public/games/html/gravegain-epic-saga.js
 * Injected into the generated runtime copies (public/games/<slug>/) by
 * scripts/sync-game-bundles.mjs. NEVER edit
 * public/games/html/gravegain2d/** or gravegain3d/** (lore.js, game.js,
 * campaign/m01..m10.js, index.html) — this file only READS the shared
 * mission defs (window.GraveGainStoryMissions) and campaign extras.
 *
 * Contract:
 *   - Vanilla IIFE, no imports, never throws. Idempotent.
 *   - Exposes window.GraveGainEpicSaga = { VERSION, getBeats(missionId,
 *     phase, opts), getTitlecard(missionId), LORE_UNLOCKS }.
 *   - phase: "intro" | "outro". Each beat: { speaker, portrait, text,
 *     fx } where text is already resolved for the requested content mode
 *     (kid = cozy, teen = clean/tense, all = grim + profane) and flavor
 *     ("2d" top-down squad/Lisa POV vs "3d" first-person/Mirathiel ghost).
 *   - Mode sources (priority): explicit opts.mode > ?content= >
 *     localStorage 4weird-content-mode:<slug> > window.FourweirdContentMode
 *     > "teen" (shared safe default, matches content-mode-bridge.js).
 *   - Canon: MoonRock moon of Giantess, LuckyStarShip, MERCENARY vs Necros,
 *     Lucifer Hades + Necromatic Array (Day 7, 03:47), Valley Net, Lisa Park,
 *     Aelindra / Borin / Groknak + Compact of Shared Blood (Day 8),
 *     Angel Good, Arty Fisher, Clint Oldman / Guy Young, James Wright.
 */
(function () {
    'use strict';
    if (window.GraveGainEpicSaga) return;

    var VERSION = '1.0.0';

    var MODES = ['kid', 'teen', 'all'];

    function parseMode(v) {
        try {
            v = String(v == null ? '' : v).trim().toLowerCase();
            if (v === 'kid' || v === 'teen' || v === 'all') return v;
        } catch (e) { /* ignore */ }
        return null;
    }

    function slugOf(opts) {
        try {
            if (opts && parseMode(opts.mode)) return null; // explicit mode wins, slug only for store
            if (opts && opts.slug) return String(opts.slug);
        } catch (e) { /* ignore */ }
        try {
            var m = window.location.pathname.match(/\/games\/([^/]+)\//);
            if (m) return m[1];
        } catch (e) { /* ignore */ }
        return 'gravegain2d';
    }

    function resolveMode(opts) {
        try {
            if (opts && parseMode(opts.mode)) return parseMode(opts.mode);
        } catch (e) { /* ignore */ }
        try {
            var q = new URLSearchParams(window.location.search).get('content');
            var qm = parseMode(q);
            if (qm) return qm;
        } catch (e) { /* ignore */ }
        try {
            var slug = slugOf(opts) || 'gravegain2d';
            var s = window.localStorage.getItem('4weird-content-mode:' + slug);
            var sm = parseMode(s);
            if (sm) return sm;
        } catch (e) { /* ignore */ }
        try {
            var g = window.FourweirdContentMode;
            if (g && parseMode(g.mode)) return parseMode(g.mode);
        } catch (e) { /* ignore */ }
        return 'teen';
    }

    function flavorOf(opts) {
        try {
            if (opts && (opts.flavor === '2d' || opts.flavor === '3d')) return opts.flavor;
            var p = String(window.location.pathname || '');
            if (p.indexOf('gravegain3d') !== -1) return '3d';
            if (p.indexOf('gravegain2d') !== -1) return '2d';
        } catch (e) { /* ignore */ }
        return '2d';
    }

    // Beat text tables: each beat carries kid/teen/all variants + optional
    // flavor2d / flavor3d stage directions appended by the cutscene engine.
    // Speakers/portraits reuse canon (campaign/m01..m10.js + lore.js).
    var SAGA = {
        1: {
            titlecard: { title: 'MISSION 1 — LZ CRASH SITE DEFENSE', subtitle: 'The Descent on MoonRock' },
            loreUnlocks: ['world_first_grave', 'necro_survivor', 'human_orientation'],
            intro: [
                { speaker: 'Valley Net', portrait: '🤖',
                    kid: 'Oh no, our dropship took a tumble in Sector Alpha! Fifteen sleepy skeletons woke up grumpy in the craters. Stay close to your buddies and we will tuck them back in!',
                    teen: 'Dropship 420 is down in Sector Alpha. Fifteen freshly-risen hostiles converging on the crash site. Helmet seals LOCKED — MoonRock air kills in ninety seconds.',
                    all: 'Dropship 420 ate flak from its own reanimated artillery. Fifteen corpses are crawling out of the craters — including the burial detail we put in the ground three days ago. Fuck the odds; weapons hot.' },
                { speaker: 'Private Lisa Park', portrait: '👩‍🚀',
                    kid: 'I helped carry our friend James to his flower garden. Now the flowers are wiggling — I think he wants to say hello! Let us be gentle and brave.',
                    teen: 'I carried James Wright’s coffin three days ago — the first grave we ever dug here. Now his visor glows red. We put our people back to rest, whatever it takes.',
                    all: 'I carried James Wright’s coffin three days ago — the first fucking grave we ever dug here. Now his visor glows red. We put our people back to rest. All fifteen of them.' },
                { speaker: 'Arty Fisher', portrait: '👨‍🔧',
                    kid: 'Quick tip, cadet! The sleepy skeletons are ticklish at the elbows and knees! Boop the joints and they fall apart like toy blocks!',
                    teen: 'Rifles OFF stun — stun does not work on the dead, I watched the guard tapes. Aim for the structural joints and the skeletons come apart.',
                    all: 'Rifles OFF stun — stun does not work on dead bastards. Aim for the joints and they come apart like cheap scaffolding. You learned that on the guard tapes; now bleed it into muscle memory.' }
            ],
            outro: [
                { speaker: 'Valley Net', portrait: '🤖',
                    kid: 'Yay! The crash site is tidy! The survivors are coming out with snacks and blankets. You were SO brave, cadet!',
                    teen: 'LZ secured. Fifteen hostiles neutralized, zero array signatures in the sector. Survivors falling back to the perimeter — excellent shooting, soldier.',
                    all: 'LZ secured. Fifteen hostiles back in the dirt, zero array signatures. Survivors inbound — and soldier, the first coffin we re-bury is James Wright, with full honors this time.' },
                { speaker: 'Private Lisa Park', portrait: '👩‍🚀',
                    kid: 'Night-night, James. The flowers will keep you cozy. We will visit with songs!',
                    teen: 'Rest now, James. We carried you here, and we will carry you home.',
                    all: 'Rest now, James. We carried you here in honor and put you down in hell — and God help the bastard who made us do both.' }
            ]
        },
        2: {
            titlecard: { title: 'MISSION 2 — CLEANSING THE ELVEN GROVES', subtitle: 'Echoes of the Green Chronicle' },
            loreUnlocks: ['elven_chronicle', 'elven_matriarch_grave', 'necro_red_eyes'],
            intro: [
                { speaker: 'Queen Aelindra', portrait: '🧝‍♀️',
                    kid: 'Little star-friend, our Mother Tree has a tummy-ache and our grandma-ghosts are sleepwalking! Will you help us sing them back to sleep?',
                    teen: 'The ancient Mother Tree bleeds corruption. Our fallen seers walk again, bound to Hades’ array. Help us free them.',
                    all: 'The Mother Tree bleeds corruption and my own mother walks with red eyes among roots I planted with her. Break the necro-anchors, soldier — free my ancestors or Mercy kill us all trying.' },
                { speaker: 'Private Lisa Park', portrait: '👩‍🚀',
                    kid: 'We will be super gentle with the glowy trees! Pinky promise!',
                    teen: 'We’ll destroy the necromantic anchors and free your ancestors.',
                    all: 'We’ll burn every anchor to glass and give your ancestors the peace Hades stole. That’s a blood-promise.' },
                { speaker: 'Echo of Elder Mirathiel', portrait: '👻', ghost3d: true,
                    kid: 'OooOOoo… do not be scared! I am just a glowy gardener ghost! Walk soft and the roots will tickle hello!',
                    teen: 'I felt the field tear the night the Array woke. Every root screamed at once. Strike clean — leave them something worth remembering.',
                    all: 'Damn the man who made echoes of us. I watched my own daughters rise with red eyes — so put us down hard and don’t you dare miss.' }
            ],
            outro: [
                { speaker: 'Queen Aelindra', portrait: '🧝‍♀️',
                    kid: 'The forest is humming happy songs again! The trees made you a flower crown!',
                    teen: 'The forest whispers its gratitude. The magical field is purifying in this sector.',
                    all: 'The field runs clear in this sector. My mother’s bones rest — and the Groves owe humanity a debt written in moonblossom and blood.' },
                { speaker: 'Echo of Elder Mirathiel', portrait: '👻', ghost3d: true,
                    kid: 'Hmm-hmm-hmm… thank you, brave friend! The roots are sleepy-happy now!',
                    teen: 'The Mother Tree marks your steps. Walk like you mean to come back.',
                    all: 'Hell is just a grave that won’t stay shut, soldier. You closed ours. Close all of them.' }
            ]
        },
        3: {
            titlecard: { title: 'MISSION 3 — DEEP IN THE DWARVEN VAULTS', subtitle: 'Sparkite & Steel' },
            loreUnlocks: ['dwarf_deep_forge', 'dwarf_paladin_oath', 'dwarf_brewery_report'],
            intro: [
                { speaker: 'Forgemaster Borin', portrait: '⛏️',
                    kid: 'Our downstairs treasure-room is full of grumpy bones sitting on my grandpa’s super-cool hammer! Help an old dwarf get his hammer back?',
                    teen: 'Our lower forge channels have been overrun! My ancestor’s legendary Golem Hammer lies trapped below.',
                    all: 'The lower forges are overrun and my ancestor’s Golem Hammer sits in a pile of risen shit. Get me my hammer, soldier, and I’ll show you what dwarven gratitude hits like.' },
                { speaker: 'Valley Net', portrait: '🤖',
                    kid: 'Careful around the sparkly rocks — they are extra-zappy! Hold my hand (pretend!) and tiptoe!',
                    teen: 'Detecting high concentrations of unrefined Sparkite ore. Exercise extreme caution.',
                    all: 'Raw sparkite saturating the shafts — one wrong discharge and the whole vault becomes a crematorium. Watch your fire discipline down there.' },
                { speaker: 'Arty Fisher', portrait: '👨‍🔧',
                    kid: 'I fixed the tunnel night-lights! Now it is cozy-bright for our adventure!',
                    teen: 'I’m rigging the forge lights to your visor. Stay in the lit lanes — the dark down here bites.',
                    all: 'Forge lights slaved to your visor. Stray off the lit lanes and whatever Hades left in the dark will eat you quietly.' }
            ],
            outro: [
                { speaker: 'Forgemaster Borin', portrait: '⛏️',
                    kid: 'HOORAY! Hammer back! You get the BIGGEST mug of fizzy apple juice! *happy dwarf dance*',
                    teen: 'Ha! The mines are ours again! Have a flagon of dwarf ale on me, hero!',
                    all: 'HA! The mines are OURS! Ale, gold, and first pick of the armory — the Compact pays its debts in full, hero!' },
                { speaker: 'Private Lisa Park', portrait: '👩‍🚀',
                    kid: 'The hammer is SO heavy! The dwarves say I am officially super-strong now!',
                    teen: 'Vaults clear. The Hammer rings true again — Deep Forge stands with us.',
                    all: 'Vaults clear. The Hammer rings true — and every sparkite shard Hades wanted for his Array stays in dwarven hands. Starve the bastard of fuel.' }
            ]
        },
        4: {
            titlecard: { title: 'MISSION 4 — ORC NOMAD OUTPOST SIEGE', subtitle: 'Rage of the Southern Wastes' },
            loreUnlocks: ['orc_regeneration', 'orc_rage_book', 'goblin_brave_nix'],
            intro: [
                { speaker: 'Warchief Groknak', portrait: '👹',
                    kid: 'Little cub! The grumpy bones are at our snack-gate! You, me — BEST STOMP TEAM! STOMP STOMP!',
                    teen: 'Risen orcs ahead — my own blood, wrong eyes. Give my Rage room and aim for the joints.',
                    all: 'Fuck sitting down! Orcs do not die sitting down — WE KILL STANDING UP! Thirty skulls at my gate and my own risen blood among them. GRAAAH!' },
                { speaker: 'Private Lisa Park', portrait: '👩‍🚀',
                    kid: 'Hold hands, hold the line! We can do it together-together!',
                    teen: 'Hold the line with Groknak until our heavy artillery locks target!',
                    all: 'Hold with Groknak until artillery paints the whole field. Anything with red eyes dies — even his kin. Especially his kin. That’s the price of the Compact.' },
                { speaker: 'Valley Net', portrait: '🤖',
                    kid: 'Counting grumpy bones… lots and lots! But we have the BIGGEST team! You got this!',
                    teen: 'Thirty hostiles converging on the gates, plus one huge berserker signature. Artillery clock is running — hold.',
                    all: 'Thirty zeds on the gates and a Huge Berserker leading them — Groknak’s own division-mate, risen wrong. Put the big bastard down first; the horde breaks without him.' }
            ],
            outro: [
                { speaker: 'Warchief Groknak', portrait: '👹',
                    kid: 'YOU BEST STOMPER! Groknak share ALL the snack-rocks with you! Best friends forever!',
                    teen: 'You held the gate like a warrior. Today the whole floor knows your name.',
                    all: 'GRAAAH! Good fighting, human! You hit like an Orc warrior today — I name you Blood-Bound. My Rage is yours whenever you call it.' },
                { speaker: 'Arty Fisher', portrait: '👨‍🔧',
                    kid: 'Wow, look at that crater line! High-five, heroes!',
                    teen: 'Gate holds. Artillery did its work — the Wastes are quiet for the first time in weeks.',
                    all: 'Gate holds. The Wastes are quiet — and Groknak just bled beside humans for orc dead. The Compact isn’t words anymore. It’s scar tissue.' }
            ]
        },
        5: {
            titlecard: { title: 'MISSION 5 — SIGNAL IN THE SHALLOWS', subtitle: 'Valley Net Uplink Restoration' },
            loreUnlocks: ['human_arty_fisher', 'necro_broadcast', 'world_farstar'],
            intro: [
                { speaker: 'Valley Net', portrait: '🤖',
                    kid: 'Hades is making LOUD static on all my radios and I cannot hear my friends! Can you climb up and wiggle the antenna back straight?',
                    teen: 'Dr. Hades is broadcasting jamming signals across all sub-light frequencies. I need you to manually re-align Relay 09.',
                    all: 'Hades is jamming every band with Array static — I’m blind, deaf, and navigating by hate. Climb Relay 09 and re-align it by hand while his skull-swarms chew the coils.' },
                { speaker: 'Arty Fisher', portrait: '👨‍🔧',
                    kid: 'Watch out for the buzzy skull-balloons near the glowy coils! They pop if you boop them gently!',
                    teen: 'Watch out for flying skull swarms near the energy coils!',
                    all: 'Skull swarms nest in the energy coils — they’ll strip your suit seals in seconds. Burn them off the conduits before you touch anything.' },
                { speaker: 'Private Lisa Park', portrait: '👩‍🚀',
                    kid: 'Up-up-up I go! I am the tallest climber ever! Wheee!',
                    teen: 'Climbing the relay spine now. Keep the swarm off me until the dish locks.',
                    all: 'On the spine. Feed me covering fire and keep the swarm off my seals — I realign this dish or we stay blind while Hades aims.' }
            ],
            outro: [
                { speaker: 'Valley Net', portrait: '🤖',
                    kid: 'CRACKLE… hello? HELLO! I can hear everybody again! You fixed my ears! THANK YOU!',
                    teen: 'Uplink online! Planetary sensors are now tracking Hades’ orbital movements.',
                    all: 'UPLINK LIVE! Planetary sensors tracking Hades’ sanctum in real time — his jamming just died screaming. I can see the bastard’s front door now.' },
                { speaker: 'President Angel Good', portrait: '🌿',
                    kid: 'Wonderful! Now all our friends can sing together on the radio! You are a superstar!',
                    teen: 'Colony-wide signal restored. Every SafeSpace hears this victory — well done, soldier.',
                    all: 'Colony-wide signal restored. Every SafeSpace just heard us punch through Hades’ blindfold — morale’s the highest since Day 6. Spend it wisely.' }
            ]
        },
        6: {
            titlecard: { title: 'MISSION 6 — THE ALCHEMICAL CATACOMBS', subtitle: 'President Good’s Legacy' },
            loreUnlocks: ['human_angel_good', 'necro_understanding', 'dwarf_mana_potions'],
            intro: [
                { speaker: 'President Angel Good', portrait: '🌿',
                    kid: 'Oh dear, somebody poured stinky soup in our plant-rooms and the air smells like old socks! Can you help clean the vats and shoo the grumpy golem?',
                    teen: 'Hades corrupted our botanical incubation vats to generate toxic cloud weaponry. Neutralize the Chem-Golem!',
                    all: 'Hades turned my botany vats — my life’s work — into poison factories, and his Chem-Golem squats in the middle of it. I was a botanist before I was president. Help me take my garden back with fire.' },
                { speaker: 'Private Lisa Park', portrait: '👩‍🚀',
                    kid: 'Holding my nose and putting on my super-duper safety mask! Here I go!',
                    teen: 'Visor switched to hazmat mode. Moving in!',
                    all: 'Hazmat sealed. If the filters clog I’ve got ninety seconds of MoonRock air — so we kill that golem fast or I die coughing in my own helmet.' },
                { speaker: 'Valley Net', portrait: '🤖',
                    kid: 'I drew you a map of the stinky clouds! Hop around the green puffs like a froggy! Ribbit!',
                    teen: 'Mapping toxin flow now — stick to the high lanes, the low vents are saturated.',
                    all: 'Toxin map live: low vents saturated, high lanes breathable. The golem vents poison when wounded — finish each phase on high ground or drown standing up.' }
            ],
            outro: [
                { speaker: 'President Angel Good', portrait: '🌿',
                    kid: 'Sniff sniff… fresh air! The plants are doing happy dances! You are the BEST cleaner-upper!',
                    teen: 'The air in the sub-levels is clearing. The colony owes you a great debt.',
                    all: 'Air’s clearing. The vats will grow medicine again instead of murder — and soldier, the colony doesn’t forget who gave it back its lungs.' },
                { speaker: 'Forgemaster Borin', portrait: '⛏️',
                    kid: 'Dwarves LOVE stinky smells! That golem-smell was almost as good as grandpa’s socks! *sniff* …almost!',
                    teen: 'Good work, hero! Deep Forge brewers owe you a round — nothing clears the throat like victory ale!',
                    all: 'Hah! Dwarven lungs never noticed the poison — perks of breathing forge-smoke for breakfast. Ale’s on Deep Forge tonight, hero. Drink deep.' }
            ]
        },
        7: {
            titlecard: { title: 'MISSION 7 — THE TOMB OF CLINT OLDMAN', subtitle: 'Guy Young’s Paradox' },
            loreUnlocks: ['human_clint_oldman', 'human_guy_young', 'necro_gravestone'],
            intro: [
                { speaker: 'Guy Young', portrait: '👨‍🚀',
                    kid: 'My grandpa Clint is napping in the big stone room, but the room is glowing spooky-purple and I am worried! Will you sit with me and make sure he has sweet dreams?',
                    teen: 'My grandfather Clint was the first to die naturally on MoonRock… now his tomb is pulsing with dark array energy.',
                    all: 'My grandfather Clint died clean at 258 — the only natural death this moon ever gave us. Now his tomb pulses with Array filth and his corpse wears red eyes. I’m begging you: give him back his peace.' },
                { speaker: 'Private Lisa Park', portrait: '👩‍🚀',
                    kid: 'Of course we will help! Nobody should have wiggly dreams! We will sing the softest lullaby!',
                    teen: 'We will give him back his peace, Guy. I promise.',
                    all: 'We’ll give him back his peace, Guy — I swear it on James Wright’s grave. Nobody earns a clean death on MoonRock just to have Hades steal it.' },
                { speaker: 'Valley Net', portrait: '🤖',
                    kid: 'Hmm, the tomb is humming a grumpy song… let us hum a nicer one, louder! LaaaAAaa!',
                    teen: 'Array spike confirmed inside the crypt. Thirty tomb guardians between you and the patriarch’s sarcophagus.',
                    all: 'Array spike inside the crypt — Hades wired the old man’s sarcophagus as a conduit. Thirty guardians, then the Patriarch himself. Put them all down, soldier.' }
            ],
            outro: [
                { speaker: 'Guy Young', portrait: '👨‍🚀',
                    kid: 'Grandpa is smiling in his sleep again! He gave you his shiny star-badge! Thank you-thank you!',
                    teen: 'Thank you. He’s at rest once more. Take his ancient service sidearm — it’ll serve you well.',
                    all: 'He’s at rest. Really at rest this time — I checked the sarcophagus myself. Take Clint’s service sidearm; he’d want it killing the bastards who woke him.' },
                { speaker: 'Private Lisa Park', portrait: '👩‍🚀',
                    kid: 'Night-night, Grandpa Clint! Sweet dreams forever!',
                    teen: '*salutes the empty grave* Rest easy, Patriarch. Time was cruel to you — we won’t be.',
                    all: '*salutes* Time broke you, Patriarch — born a grandpa, buried a grandson’s elder. Hades doesn’t get to break you twice. Rest easy.' }
            ]
        },
        8: {
            titlecard: { title: 'MISSION 8 — ORBITAL STRIKE CALIBRATION', subtitle: 'The MERCENARY Doctrine' },
            loreUnlocks: ['human_mercenary_doctrine', 'world_giantess_song', 'human_captains_log'],
            intro: [
                { speaker: 'Valley Net', portrait: '🤖',
                    kid: 'Our big spaceship wants to throw a GIGANTIC pillow at the bad guys, but it needs you to point the flashlight where to aim! Can you be the pointer?',
                    teen: 'Targeting coordinates for LuckyStarShip’s kinetic orbital strike require manual laser targeting from the peak.',
                    all: 'LuckyStarShip’s kinetic lance is armed and I need a human finger on the peak laser — no automation, Hades spoofs every remote. Paint the horde by hand or the strike scatters on civilians.' },
                { speaker: 'Warchief Groknak', portrait: '👹',
                    kid: 'FIRE FROM THE SKY! *happy gasp* Like birthday fireworks! But ONLY on the grumpy bones! Yay!',
                    teen: 'Bring down the fire from the sky! Burn the horde to ashes!',
                    all: 'BRING DOWN THE FIRE FROM THE SKY! Burn the horde to ASHES! Groknak wants to watch Hades’ perimeter become a glass crater!' },
                { speaker: 'President Angel Good', portrait: '🌿',
                    kid: 'I say YES to the pillow-strike! Everybody cover your ears and count to three! One… two…',
                    teen: 'Strike authorized. MERCENARY guide the lance — and guide our soldier home.',
                    all: 'Strike authorized — my signature, my responsibility. MERCENARY chose this system; today it watches us drop its sky-hammer on a madman. Paint it true, soldier.' }
            ],
            outro: [
                { speaker: 'Valley Net', portrait: '🤖',
                    kid: 'POOF! The BIGGEST pillow fight ever! The bad-guy forts are all fluffy now! Nobody we like got bonked!',
                    teen: 'Kinetic strike confirmed! 80% of Hades’ perimeter forces obliterated!',
                    all: 'STRIKE CONFIRMED! Eighty percent of Hades’ perimeter is a glass scar — the Bone Goliath Warlord included. His gate stands naked. This is the beginning of his end.' },
                { speaker: 'Forgemaster Borin', portrait: '⛏️',
                    kid: 'Did you SEE all the sparkly sky-confetti?! Best fireworks EVER! *dwarf cheer*',
                    teen: 'Ha! Did you see them fall? Deep Forge salutes the eye behind that laser!',
                    all: 'HA! The sky itself punched him! Deep Forge felt the impact through three miles of rock — and we CHEERED. On to the Citadel, hero!' }
            ]
        },
        9: {
            titlecard: { title: 'MISSION 9 — GATE OF THE NECROGENESIS', subtitle: 'The Breach of the Array' },
            loreUnlocks: ['necro_report', 'human_treaty', 'elven_druid_lament'],
            intro: [
                { speaker: 'Queen Aelindra', portrait: '🧝‍♀️',
                    kid: 'This is the big grumpy door! ALL our friends are behind you — elves, dwarves, orcs, humans! Hold my hand and we go together!',
                    teen: 'This is it. The threshold of Hades’ inner sanctum. All four races stand behind you!',
                    all: 'Beyond this gate the Array drinks twelve thousand years of ancestor-blood every hour. All four races bled into one cup on Day 8 so you would not walk in alone. End this, soldier — for every grave that won’t stay shut.' },
                { speaker: 'Forgemaster Borin', portrait: '⛏️',
                    kid: 'SMASH the door! Gently? No — SMASH! …okay, maybe knock first. NO — SMASH!',
                    teen: 'Smashed through their gates! Leave none of these monsters standing!',
                    all: 'Bring the gate DOWN! The Titan guards it — three phases of array-shielded hate. Break its conduits, crack its phases, and leave NOTHING standing between us and Hades.’' },
                { speaker: 'Dr. Lucifer Hades', portrait: '👑', vox: true,
                    kid: 'Oh, little visitors… turn around and go have juice! My door is NOT for knocking! *spooky echo*',
                    teen: 'Turn back, little soldiers. The Array is eternal — kneel, and I may let you serve it.',
                    all: 'Come, then. Kneel at the Gate of the NecroGenesis and I’ll show you what 200 years of solitude taught me: flesh is weak, but undeath is ETERNAL.' }
            ],
            outro: [
                { speaker: 'Valley Net', portrait: '🤖',
                    kid: 'The big door is OPEN! You did it! Everybody is cheering SO loud! One more door to go!',
                    teen: 'Perimeter breach successful. The doors to Lucifer Hades’ chamber are unlocked.',
                    all: 'BREACH CONFIRMED! The Titan is scrap and the sanctum doors stand open — Hades’ voice just cracked on the vox. He’s afraid, soldier. Finish it.' },
                { speaker: 'Dr. Lucifer Hades', portrait: '👑', vox: true,
                    kid: '*grumbly static* …fine! Come in! But I am NOT sharing my toys! Hmph!',
                    teen: 'So. You come to my sanctum. Witness, then, what death truly is — a door I have already opened.',
                    all: 'So you bleed through my Titan. Come into my sanctum and SEE: every corpse you “freed” waits for me here. Kill me and you kill the only man who remembers their names.' }
            ]
        },
        10: {
            titlecard: { title: 'MISSION 10 — LUCIFER’S SHADOW', subtitle: 'The Final Confrontation' },
            loreUnlocks: ['lucifer_manifesto', 'lucifer_journal_47', 'human_earth_letter'],
            intro: [
                { speaker: 'Dr. Lucifer Hades', portrait: '👑',
                    kid: 'I am the grumpy doctor and NOBODY understands my science project! My skeletons are my FRIENDS! Go away! …please stay? I am lonely…',
                    teen: 'Two centuries of solitude showed me death is a disease — and I am its cure. Kneel, and no one you love need ever stay buried.',
                    all: '200 years of solitude showed me the ultimate truth: flesh is weak, but consciousness bound to undeath is ETERNAL! I cured death itself — and you call me monster for refusing to let go!' },
                { speaker: 'Private Lisa Park', portrait: '👩‍🚀',
                    kid: 'You made a big mess and hurt everybody’s feelings! Say SORRY, clean it up, and give back the naps! NOW!',
                    teen: 'Your nightmare ends here, Lucifer. For MoonRock! For Earth! FOR THE LIVING!',
                    all: 'Your nightmare ends HERE, Lucifer. For James Wright. For Clint Oldman. For Aelindra’s mother and every goblin kid named Nix. FOR THE LIVING!' },
                { speaker: 'President Angel Good', portrait: '🌿',
                    kid: 'Everybody hold hands! Elves, dwarves, orcs, humans — BIGGEST team hug! You cannot beat hugs, grumpy doctor!',
                    teen: 'By the Compact of Shared Blood — no race abandons another. Today we end this. Together.',
                    all: 'By the Compact of Shared Blood — elf, dwarf, orc, human, one cup, one oath. Clint Oldman died clean and you defiled him. MERCENARY couldn’t stop you. VALLEY couldn’t. WE WILL.' }
            ],
            outro: [
                { speaker: 'Valley Net', portrait: '🤖',
                    kid: '…static… …sunshine? SUNSHINE! The grumpy song STOPPED! Every skeleton is napping again! YOU DID IT!',
                    teen: 'Necromantic Array DEACTIVATED. Planetary signal terminated. MoonRock is SAVED!',
                    all: 'NECROMANTIC ARRAY DEACTIVATED. The hum is gone — twelve thousand years of stolen echoes released in one breath. Planetary signal TERMINATED. MoonRock is SAVED, soldier. Breathe — helmets optional in the SafeSpaces tonight.' },
                { speaker: 'President Angel Good', portrait: '🌿',
                    kid: 'HOORAY! Biggest party EVER! Cake for elves, fizzy juice for dwarves, snack-rocks for orcs, ice cream for humans! You get the FIRST slice!',
                    teen: 'You did it! The four races are free. Humanity and MoonRock have a real future together!',
                    all: 'You did it. The four races are free — and the Compact isn’t an oath anymore, it’s a scar we all share. Humanity and MoonRock have a future now. A weird, scarred, beautiful future. Thank you, soldier. — Angel' }
            ]
        }
    };

    function getEntry(missionId) {
        try {
            var id = Math.floor(Number(missionId));
            if (SAGA[id]) return SAGA[id];
        } catch (e) { /* ignore */ }
        return null;
    }

    function resolveBeats(list, mode, flavor) {
        var out = [];
        try {
            for (var i = 0; i < list.length; i++) {
                var b = list[i] || {};
                var text = null;
                try {
                    if (mode === 'kid') text = b.kid;
                    else if (mode === 'all') text = b.all;
                    else text = b.teen;
                    if (typeof text !== 'string' || !text) text = b.teen || b.all || b.kid || '';
                } catch (e) { text = ''; }
                var stage = '';
                try {
                    if (flavor === '3d' && b.ghost3d) stage = ' (a ghost drifts through the dungeon fog)';
                    else if (flavor === '3d') stage = ' (first-person: torchlight, close stone)';
                    else if (flavor === '2d') stage = ' (top-down: squad sweep, Lisa on point)';
                } catch (e) { /* ignore */ }
                out.push({
                    speaker: String(b.speaker || 'Valley Net'),
                    portrait: String(b.portrait || '🤖'),
                    text: String(text || ''),
                    stage: stage,
                    vox: !!b.vox
                });
            }
        } catch (e) { /* never throw */ }
        return out;
    }

    function getBeats(missionId, phase, opts) {
        try {
            var entry = getEntry(missionId);
            if (!entry) return [];
            var mode = resolveMode(opts);
            var flavor = flavorOf(opts);
            var list = phase === 'outro' ? entry.outro : entry.intro;
            return resolveBeats(list || [], mode, flavor);
        } catch (e) {
            return [];
        }
    }

    function getTitlecard(missionId) {
        try {
            var entry = getEntry(missionId);
            if (entry && entry.titlecard) {
                return { title: entry.titlecard.title, subtitle: entry.titlecard.subtitle };
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    function getLoreUnlocks(missionId) {
        try {
            var entry = getEntry(missionId);
            if (entry && Array.isArray(entry.loreUnlocks)) return entry.loreUnlocks.slice();
        } catch (e) { /* ignore */ }
        return [];
    }

    try {
        window.GraveGainEpicSaga = {
            VERSION: VERSION,
            getBeats: getBeats,
            getTitlecard: getTitlecard,
            getLoreUnlocks: getLoreUnlocks,
            resolveMode: resolveMode,
            MISSION_IDS: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        };
    } catch (e) { /* window unwritable */ }
})();
