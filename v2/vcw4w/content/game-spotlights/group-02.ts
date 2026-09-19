import type { GameSpotlight } from "./spotlight";

// Group 02 spotlights. Fill each entry: 3+ about paragraphs (60-100 words
// each) + 3+ faq pairs (answers 40-70 words). Unique prose per game.
// HARD RULE: no em-dash character (U+2014) anywhere.
export const GROUP_02_SPOTLIGHTS: GameSpotlight[] = [
  {
    slug: "overtake",
    about: [
      "Overtake is a pseudo-3D arcade racer built for fast browser sessions. You pick a route and a car, then thread through traffic on a scaled road that rewards clean lines and calm steering. Coins from strong finishes feed a garage progression where faster cars unlock later routes. Nitro pickups on the road refill your boost bar, collisions scrub speed, and every race reads like an old arcade cabinet: quick menus, readable corners, and a constant choice between pushing for position or protecting momentum.",
      "Racing fans who like short, repeatable runs will feel at home, especially players who enjoy mastering one track at a time rather than memorizing a long campaign. The skill curve is honest: first you learn short steering taps instead of long holds, then you learn where nitro actually pays. Replay value comes from the garage ladder, since a new car changes every corner entry, plus route unlocks that ask for cleaner finishes. A lost run still teaches something, usually that you boosted into traffic instead of down an open straight.",
      "Compared with Neon Racer, which is a pure lane survival test where speed itself is the score, Overtake is a fuller racing game with braking zones, car choice, and route progression. Compared with The Speed Portal, which asks for gentle tunnel rotation through rings, Overtake rewards lane vision and throttle control. Session strategy is simple: warm up on an early route, spend the first lap spotting nitro refills, save boost for clear straights, tap R to restart a ruined run fast, and buy the next car before chasing perfect lines.",
    ],
    faq: [
      {
        q: "How should I use nitro in Overtake?",
        a: "Treat nitro as a straightaway tool, not a panic button. Build charge by driving cleanly and collecting refills, then fire it only when the lane ahead is open and speed is high. Boosting through traffic or into corners usually ends in a collision that erases the gain. Spend your first lap learning where the long clear sections sit, then convert them into boost gains.",
      },
      {
        q: "What is the fastest way to progress through cars and routes?",
        a: "Finish cleanly before driving heroically. Strong placements pay the coins that unlock faster cars, and faster cars open later routes sooner than perfect cornering in the starter car. Restart ruined runs with R instead of limping home, and replay your best route until the next garage purchase. Once the new car lands, return to early routes briefly to relearn braking points before pushing new ones.",
      },
      {
        q: "Overtake or Neon Racer: which should I play?",
        a: "Pick Overtake when you want braking, car upgrades, and route unlocks across sessions. Pick Neon Racer when you want a pure reaction test where survival seconds are the score. Overtake suits players who enjoy tuning lines and managing nitro, while Neon Racer suits players who want instant intensity with one input idea. Both reward calm hands, but only Overtake builds a garage that carries progress forward.",
      },
    ],
  },
  {
    slug: "assassinanimals",
    about: [
      "AssassinAnimals drops you into procedurally generated high security facilities as one of nine animal agents, each with a signature ability that changes how you solve a floor. Guard vision cones, cameras, and patrol loops turn every room into a small puzzle: watch the pattern, toss a coin to bend it, then strike from behind or slip past in a stolen uniform. DNA splices collected along the way buy mutations that deepen your build, and reaching the elevator with your target eliminated closes the loop.",
      "Stealth fans who enjoy patience over reflexes will love this, especially players who like Hitman style social stealth in short runs. Early skill is observation: crouch walk slowly, study one full patrol cycle, and distract with coins before ever drawing a blade. Replay value is strong because nine agents meet fresh floor layouts every attempt, and mutations plus gadgets like smoke, tranq darts, and decoys create different solutions. Deaths teach guard timing, and each return trip feels smarter rather than merely faster.",
      "Compared with Last Words Zombies, which tests typing speed and target priority under wave pressure, AssassinAnimals tests patience and positioning with almost no twitch demand. Compared with GraveGain2DA, which rewards direct melee, blocking, and race abilities in open dungeon fights, this game rewards never being seen at all. Session strategy: open each floor by mapping patrols, spend your first coin early to isolate a guard, drag bodies out of lanes with G, hold E for hacks and keycards, and keep your signature ability ready for the target room.",
    ],
    faq: [
      {
        q: "How do I survive the first few floors?",
        a: "Move slowly and watch before acting. Let each patrol complete a full loop so you learn vision cones and timing, then toss a coin to pull one guard away from the group. Take that isolated guard down silently with E, drag the body out of the lane with G, and only then push toward the objective. Rushing the first room is the most common way runs end early.",
      },
      {
        q: "What should I spend DNA splices on first?",
        a: "Buy mutations that cover your weakest habit first, usually detection range or escape tools rather than raw damage. If guards keep spotting you, take awareness or movement options; if takedowns go wrong, take silent damage or recovery. Pair the choice with one gadget you will actually use, like smoke for exits or tranq darts for pairs, and test the new build for a full floor before buying again.",
      },
      {
        q: "How is this different from GraveGain2DA?",
        a: "AssassinAnimals is a stealth infiltration game where the best outcome is zero alarms, while GraveGain2DA is a dark fantasy action RPG where combat is the point. Here you manage vision cones, coins, uniforms, and bodies; there you manage melee range, timed blocks, and race abilities. Play AssassinAnimals for quiet puzzle floors and agent variety, and play GraveGain2DA when you want direct dungeon fighting with loot and campaign structure.",
      },
    ],
  },
  {
    slug: "battlesharks2",
    about: [
      "Battlesharks 2 is a fast deep sea eating simulator with a cybernetic upgrade spine. You swim a hungry shark through waters full of edible fish, naval mines, depth charges, and military hunters, and every bite both heals you and banks biomass for evolution. Cyber debris and mutagens scattered through the water unlock lasers, plasma shields, jet thrusters, and toxic spikes in the R and D Lab hub. The fantasy is simple and strong: start as prey sized teeth, end as the apex cyber shark, with a ROBO-KRAKEN boss waiting at the top of the record chase.",
      "Action arcade fans who like eating, dodging, and spending will feel at home, especially players who enjoy build planning between fights. The skill curve starts with appetite control: graze small fish to heal before picking fights, then learn when to disengage from hunters instead of trading bites. Replay value comes from mutation order and the score chase, since Laser Cannon first, Jet Engine second, and missile savings for the boss each produce different runs. Short sessions work well because one clean feeding loop can fund a full upgrade visit.",
      "Compared with AssassinAnimals, which rewards silence, coins, and never being seen, Battlesharks 2 rewards appetite and timing in open water with constant contact. Compared with Neon Invaders, which is a fixed lane hold the line shooter about dodging return fire, this game adds healing by eating and a real economy of debris and biomass. Session plan: press LAUNCH SHARK, farm small fish first, visit the Lab between fights for one upgrade at a time, buy Laser Cannon early and Jet Engine for escapes, and circle the ROBO-KRAKEN while saving missiles.",
    ],
    faq: [
      {
        q: "What upgrade order works for new players?",
        a: "Open with Laser Cannon for reliable ranged damage, since it lets you kill without trading bites. Next aim for Jet Engine, because the Space dash is primarily an escape tool that breaks hunter pressure and mine traps. After that, round out shields or spikes based on what kills you most. Visit the Lab between fights and buy one upgrade per trip so you can feel exactly what changed.",
      },
      {
        q: "How do I stop dying to hunters and mines?",
        a: "Eat before you fight. Graze small fish until your health is high and your biomass is banked, then engage on your terms and leave early when the swarm thickens. Treat mines and depth charges as terrain, not targets, and swim around their fields instead of through them. Save the jet dash for breaking contact, and never open the upgrade hub while enemies are on top of you.",
      },
      {
        q: "How should I handle the ROBO-KRAKEN boss?",
        a: "Treat the warning as a command to disengage, circle wide, and watch its health bar before committing. Clear nearby small threats first so the arena stays readable, then use timed shots and saved missiles during safe windows instead of holding fire. Keep the jet dash ready for its burst patterns, graze fish to top up when it retreats, and accept a longer fight over a greedy close range trade.",
      },
    ],
  },
  {
    slug: "gravegain2dA",
    about: [
      "GraveGain2DA is a dark fantasy 2D action RPG with a playful emoji surface over serious dungeon systems. You choose a race, a class, and a temporal mode, then descend procedural dungeons across a ten mission campaign or endless runs. Gold funds both your build and the LuckyStarShip hub, where botany, exchange, repairs, and lore turn loot into long term progress. Lighting, weapon icons, wandering strangers, and random events keep floors surprising, while melee range, timed blocks, and race abilities keep every fight honest.",
      "Dungeon RPG fans who like builds, hubs, and campaigns will love this, especially players who want both a finishable ten mission story and endless procedural runs afterward. The skill curve is gentle if you start in Chrono-Lock or Realtime with a simple build: lead attacks with clicks, block elite wind ups with right click, and spend your race ability early instead of saving it forever. Replay value comes from race and class combinations, temporal modes, emergent quests, and a ship hub that grows between delves.",
      "Compared with GraveGain2dB: Breach MoonRock, which is a left to right breach shooter about running, jumping, rescuing builds, and banking salvage, 2DA is a top down dungeon RPG about melee spacing, blocking, and ship hub growth. Compared with GraveGain3DA, which adds 3D aiming, pointer lock, and potion timing, 2DA stays readable and tactical with its temporal modes. Session plan: pick one race and class, run Realtime first, use F early in the first fight, block the first elite, and return to the LuckyStarShip to bank gold and grow crops between floors.",
    ],
    faq: [
      {
        q: "Which temporal mode should a beginner choose?",
        a: "Start with Realtime for your first run, since movement and melee feel direct while you learn enemy spacing. Switch to Chrono-Lock once basics land, because the slower decision window teaches blocking and ability timing without full turn pressure. Save Turn-Based for tricky elites and bosses, where waiting a turn with Space and planning each action beats fast reactions.",
      },
      {
        q: "How do I make gold go further?",
        a: "Treat the LuckyStarShip as part of your build. Bank gold between floors instead of carrying it all into danger, keep botany and exchange ticking so crops and trades grow while you delve, and repair before a deep push rather than after a costly death. In the dungeon, finish one room fully before rushing deeper, since cleared rooms pay loot that funds the next upgrade cycle.",
      },
      {
        q: "2DA or 2dB: which GraveGain should I play first?",
        a: "Play 2DA first if you want melee dungeon crawling, timed blocks, race abilities, and a ship hub with a ten mission campaign. Play 2dB first if you want side scrolling breach runs with jumping, dashing, and crew rescues. Both share procedural builds and hub banking, but 2DA is tactical fantasy combat while 2dB is fast traversal and gunfire, so your taste in movement decides.",
      },
    ],
  },
  {
    slug: "gravegain2dB",
    about: [
      "GraveGain2dB: Breach MoonRock is a seeded left to right action roguelite set around a mission hub on the MoonRock. You pick a breacher and a stage, then run east through destructible fortresses, sealed tunnels, and wave ambushes while managing two weapons: one infinite starter and one limited ammo pickup refilled by ammo packs. Rescued crew join as random race and class builds, wall climbs and dashes keep traversal fluid, and extraction with banked salvage is the goal that ties every breach, holdout, and Wave Mode detour together.",
      "Run and gun fans who like momentum will love this, especially players who enjoy rescuing new builds mid run and adapting on the fly. The skill curve rewards movement before aim: keep sprinting since a moving breacher is harder to hit, jump debris with Space, climb with W, and slide or dash through bad spots. Replay value comes from sixteen race and class combinations, seeded fortress layouts, limited ammo routing, and optional wave, chrono lock, or turn based clocks that reshape the same mission board.",
      "Compared with GraveGain2DA, which is a top down fantasy dungeon RPG about melee range and timed blocks, 2dB is a side scroller about traversal, breach pulses, and blaster fire. Compared with Platform Wars, which tests arena jumps and dashes against another team, 2dB tests the same movement vocabulary against fortresses and waves. Session plan: open the mission board, take the first breach mission, pulse sealed doors with K before firing, swap weapons with 1 and 2, recruit linked crew with E, and bank salvage at the hub between missions.",
    ],
    faq: [
      {
        q: "How do weapons and ammo work?",
        a: "You carry two weapons: an infinite starter for steady work and a scavenged pickup with limited ammo for hard targets. Ammo packs refill the pickup, and keys 1 and 2 swap between them, so spend the finite gun where it matters and let the starter handle cleanup. If you run dry mid mission, fall back to melee with F, grenades with Q, and movement until the next pack drops.",
      },
      {
        q: "How do rescues and lives work?",
        a: "Touch linked crew or press E nearby to recruit them, and each rescue adds a random race and class build to your run. Deaths consume rescued builds last to first, which protects your early picks, and your starting build gets its final life after the rescues are spent. Recruit whenever the path allows, since a deep bench turns one mistake from a run ender into a short setback.",
      },
      {
        q: "What is the best session routine for MoonRock missions?",
        a: "Start at the hub, open the mission board, and take the first breach to warm up movement and fund salvage. In the fortress, keep running east, breach pulse shields with K before spending blaster ammo, rescue crew with E, and dash through ambush pockets instead of standing to trade. Redeploy with R after a wipe, bank salvage at the hub, and only then climb to harder stages or Wave Mode.",
      },
    ],
  },
];
