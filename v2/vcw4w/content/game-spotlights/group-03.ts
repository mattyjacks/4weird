import type { GameSpotlight } from "./spotlight";

// Group 03 spotlights. Fill each entry: 3+ about paragraphs (60-100 words
// each) + 3+ faq pairs (answers 40-70 words). Unique prose per game.
// HARD RULE: no em-dash character (U+2014) anywhere.
export const GROUP_03_SPOTLIGHTS: GameSpotlight[] = [
  {
    slug: "gravegain3dA",
    about: [
      "GraveGain3DA drops you into a dark fantasy dungeon complex rendered in full Three.js 3D with emoji billboard monsters, real time lighting, and procedural floors that never repeat. You pick a race and class, then fight through a ten mission campaign with ten distinct bosses. Between delves you return to the LuckyStarShip hub to trade gold, repair modules, and harvest offline crops that kept growing while you fought. Voxel gore, twenty weapon models, and twelve enemy variants keep each floor tactile, while kid, teen, and adult bands tune the intensity without changing the layout.",
      "This is the GraveGain for action RPG players who want aiming, footwork, and timing in three dimensions. Movement is WASD with mouse look, left click for melee with a hold to charge option, right click to block or fire a projectile, plus sprint lunges, potions, and building interiors to enter. Early floors teach one threat at a time, then elites, ranged packs, and boss arenas demand potion discipline and hub upgrades. Replay comes from race and class builds, procedural layouts, weapon drops, and the choice between pushing the campaign or farming gold for the next module repair.",
      "Compared to GraveGain2DA, which plays as a fast top down dungeon run with dialogue and temporal modes, GraveGain3DA is slower, spatial, and deliberate: corners, sight lines, and pointer lock aim matter. Compared to GraveGain1DA: The Ley-Line March, which marches east on a single line with no jumping, this is the opposite extreme with full verticality and exploration. Per session, clear one floor, bank gold at the hub, replant crops, and repair before descending. Drink potions near half health, open packs with a charged swing, and save your class burst for elites.",
    ],
    faq: [
      {
        q: "How is GraveGain3DA different from other GraveGain games?",
        a: "GraveGain3DA is the full 3D branch: Three.js dungeons, mouse look with pointer lock, jump, and building interiors, built around a ten mission campaign and the LuckyStarShip hub. GraveGain2DA stays top down and fast, while GraveGain1DA compresses everything to a single eastbound line. If you want spatial combat, charged melee, blocking, and loot loops, start here.",
      },
      {
        q: "What is the best loop for a short session?",
        a: "Run one dungeon floor, collect gold and weapon drops, then return to the hub before pushing deeper. Sell, repair modules, harvest crops, and buy the upgrade that fixes your last death, usually survivability or a stronger melee option. Reenter fresh rather than chaining floors at low health, because bosses punish potion shortages and broken modules more than weak aim does.",
      },
      {
        q: "Is it good for new action RPG players?",
        a: "Yes, if you start on the early campaign missions and use the hub generously. The first floors introduce melee timing, blocking, and potion use without swarm pressure, and kid or teen bands soften the gore while you learn. Use lock style mouse aim in short sweeps, keep healing near half health, and treat each death as a build signal: upgrade, swap weapons, and retry.",
      },
    ],
  },
  {
    slug: "gravegain1dA",
    about: [
      "GraveGain1DA: The Ley-Line March strips the dungeon down to one dimension: a glowing ley line running east toward the spire of Hades. You pick a class, choose turn based or real time rules, then walk right through five sectors with bosses and into the endless Echo Drift. Emoji parallax scrolls past while wanderers drift by with quests, omens, and small events. You can never step left and never jump, so every decision is about timing your step, strike, ability, potion, or wait.",
      "This march suits tactics and roguelite minimalists who like readable decisions over twitch aim. Turn based mode moves one tick per step with explicit wait commands, while real time mode turns movement into intent with half, single, and double speed toggles. Touch players get STEP, ATK, ABILITY, POTION, and WAIT buttons in a bottom bar. Mastery means learning enemy ranges, potion math, and when waiting beats advancing. Replay comes from class kits, both time modes, sector bosses, and Echo Drift distance chasing.",
      "Against GraveGain3DA, which sprawls across 3D floors with pointer lock combat and a starship hub, the Ley-Line March is pure constraint: one axis, no retreat, no vertical escape. Against GraveGain2DA, which rewards kiting and dialogue driven builds in open rooms, this rewards patience and tick counting. Per session, scout one screen ahead, spend your class ability on clustered threats, hold one potion for the sector boss, and in real time mode drop to half speed rather than pausing late.",
    ],
    faq: [
      {
        q: "Do I ever move left or jump?",
        a: "No. The ley line only runs east, and the design removes left movement and jumping entirely. Progress means stepping, attacking, waiting, or using abilities while threats approach from the right. That constraint is the whole tactics game: you manage spacing with waits and speed changes instead of dodges, and every step forward commits you to whatever the next screen reveals.",
      },
      {
        q: "Should I play turn based or real time?",
        a: "Start turn based if you like chesslike clarity, because each STEP or WAIT advances exactly one tick and lets you learn ranges safely. Switch to real time once patterns click, then use the speed cycle to control pressure: half speed for dense packs and boss gates, double speed for cleared stretches. Many players learn bosses in turn based mode, then chase Echo Drift records in real time.",
      },
      {
        q: "How do I survive sector bosses?",
        a: "Enter with full health, one potion banked, and your class ability off cooldown. Clear nearby wanderer events first so the arena stays readable, then trade hits only when the boss is inside your range and step or wait otherwise. Do not burn potions early on chip damage. Save the drink for after a boss combo, then finish with ability plus basic attacks while the boss recovers.",
      },
    ],
  },
  {
    slug: "demolichdom",
    about: [
      "Demo Lichdom casts you as a modern necromancer working demolition: a high vis curse on a living city. You steer a robed contractor through emoji brick and glass, hurl skull spells by hand, and spend mana to raise skeletons who shamble toward the nearest standing wall. Buildings crack, collapse, and pay out while guards and city pressure push back. Level ups unlock heavier demolition upgrades. The joke lands because the fantasy is played straight: permits, targets, rubble, plus an undead crew that never sleeps.",
      "It clicks for players who like minion command without a slow real time strategy learning wall. The skill test is economy plus positioning: each skeleton costs twenty five mana, so early summons must earn their keep by tanking while you cast. Movement is WASD or arrows with click casting and a mobile blink button, easy to start but demanding once multiple buildings draw fire. Replay comes from faster clears, greedier summon timings, upgrade choices after level ups, and routing the perfect demolition order.",
      "Compared to Server Saver Shield, which is pure defense with a sweeping shield and repair economy, Demo Lichdom flips the job to offense: you are the disaster, and skeletons are your damage over time. Compared to AssassinAnimals, which rewards unseen takedowns in procedural facilities, this rewards noise and focus fire. Per session, summon the first skeleton as soon as mana allows, focus one building until it falls, kite guards around rubble, and spend level ups on damage before vanity.",
    ],
    faq: [
      {
        q: "How does the skeleton economy work?",
        a: "Each summon costs twenty five mana, so you start by casting skull spells yourself and banking mana for the first skeleton. Once raised, skeletons tank and chew walls while you reposition and finish structures. Summon early rather than hoarding, because one active skeleton deals damage while you earn the next. Keep pressure on a single building so payouts arrive sooner.",
      },
      {
        q: "What is the fastest way to clear buildings?",
        a: "Focus one building at a time instead of spreading skull damage across the block. Park skeletons on the target, cast from an angle where guards must circle, and kite only when pressured. Finish the weakest wall first for the payout and breathing room, then roll the army to the next structure. Splitting damage feels busy but delays every collapse and wastes mana.",
      },
      {
        q: "Is Demo Lichdom hard for strategy beginners?",
        a: "No, the controls stay arcade simple with WASD movement, click casting, one summon key, and pause. The learning curve is all judgment: when to summon, which building to focus, and when to move your own body out of guard range. Play two runs to feel the mana pacing, use blink on mobile to escape surrounds, and treat early losses as routing lessons rather than failures.",
      },
    ],
  },
  {
    slug: "discoveramerica",
    about: [
      "Madi AI: Discover America is a voyage puzzler dressed as exploration history. You sail with Madi AI aboard a wooden ship from the English Channel toward the New World, docking at ports where scattered data fragments wait on the quay. Each fragment belongs in a category bin, and only a fully sorted port charts the next leg. The interface is calm tapping: pick a fragment, pick its bin, watch the manifest clear. History provides the romance, sorting provides the challenge.",
      "It fits cozy gamers, younger players, and parents who want education without a lecture. There is no twitch timing, only reading, pattern matching, and careful taps, so the skill curve is about attention rather than reflexes. Early ports use obvious categories, later legs mix trickier fragments that punish rushing. Replay value comes from cleaner sorts, faster voyages, and showing a kid how categorization works. It is a short session palate cleanser between heavier arcade runs.",
      "Next to The AI Expedition, which tests spatial routing by drawing pipelines between agents and lakes, Discover America tests verbal sorting: reading fragments and matching them to bins. Next to Temple of Lost Revenue, which hides pickups in a maze, this keeps everything visible and makes the categories the maze. Per port, read every fragment first, clear the obvious matches, then compare the leftovers side by side before tapping. Sail only from glowing ports.",
    ],
    faq: [
      {
        q: "What do I actually do at each port?",
        a: "Tap the glowing port to gather its scattered data fragments, then sort each fragment into the correct category bin by tapping the fragment and then the bin. You must place every fragment correctly to chart the next leg of the voyage. Misclicks stall progress, so read labels carefully, finish one port completely, and only then sail onward toward the New World.",
      },
      {
        q: "Is it educational or just themed?",
        a: "It teaches sorting, categorization, and close reading through the voyage structure. Each port is a classification drill where the bins are concepts and the fragments are examples to place. Kids practice attention to wording, while adults get a gentle logic workout. The sailing narrative keeps it playful, but the cognitive skill is real and transfers to data literacy and everyday organizing.",
      },
      {
        q: "Any tips for perfect sorts?",
        a: "Slow down and read before touching anything. Group obvious fragments first to shrink the field, then handle ambiguous ones by rereading both the fragment and the bin names. If two bins look similar, compare their already sorted contents for the pattern. Never guess under time pressure because there is none. Accuracy unlocks the next leg faster than rapid tapping with corrections.",
      },
    ],
  },
  {
    slug: "orbitaldrift",
    about: [
      "Orbital Drift turns one input into an entire spaceflight model. Your satellite circles a central planet, and holding thrust expands the orbit while releasing lets gravity pull you back inward. Yellow stardust lines the lanes, purple and red debris crosses them, and hunters, stalkers, and comets pressure your altitude. Four escalating waves add risk zones where grazing pays extra. Three hulls change the feel: nimble CubeSat for scoring, balanced Dart, and tanky Harbour Station for collectors.",
      "It is built for arcade purists who love one button depth and score chasing. The skill curve starts with feeling the gravity spring, then shifts to small thrust pulses instead of long burns, then to deliberate grazing for combo multipliers. CubeSat rewards confident pilots with a scoring bonus on low hull, while Harbour Station forgives mistakes for learners. Mute, pause, and touch support keep runs accessible. Replay is pure leaderboard hunger: longer streaks, cleaner waves, higher multipliers.",
      "Beside Overtake, which spends nitro on straights and punishes corner boosts, Orbital Drift spends altitude the same way: small corrections win, panicked holds lose. Beside Neon Void Runner, which dodges forward at ever rising speed, this dodges vertically around a gravity well with scoring built into risk. Per run, pulse thrust to ride stardust bands, skip contested pickups that break combos, pick Dart until wave patterns click, then switch to CubeSat for records.",
    ],
    faq: [
      {
        q: "How do the controls really work?",
        a: "Hold Space, mouse click, or touch to fire thrusters and widen your orbit, then release to sink back toward the planet. That is the entire flight model, and everything else is timing. Keys one through three swap ships, M mutes, and P or Escape pauses. Short pulses give fine control, while holding too long flings you into outer debris lanes.",
      },
      {
        q: "Which ship should I pick?",
        a: "Start with Dart for balanced hull and neutral scoring while you learn hunter patterns and debris colors. Move to Harbour Station if you keep dying early, since its heavy hull forgives grazes while you practice stardust lines. Switch to CubeSat once you survive waves cleanly, because its fragile frame carries a scoring multiplier that turns good runs into record runs.",
      },
      {
        q: "How do I build big combos?",
        a: "Chain yellow stardust without touching debris, and favor grazing over chasing. Ride the orbit band that threads multiple dust lines, use tiny pulses to stay inside it, and skip any pickup that forces a dive through purple or red. Risk zones multiply gains but break streaks fast, so enter them only on a clean line. Protecting an active multiplier beats grabbing one extra mote.",
      },
    ],
  },
];
